import puppeteer from "puppeteer-core";
const base = "https://gcc-mentor.vercel.app";

// 1. wait until the deploy serving the new landing CSS is live
let live = false;
for (let i = 0; i < 40; i++) {
  try {
    const html = await (await fetch(base + "/login", { cache: "no-store" })).text();
    const links = [...new Set([...html.matchAll(/href="(\/_next\/static\/css\/[^"]+)"/g)].map(m => m[1]))];
    for (const l of links) {
      const css = await (await fetch(base + l, { cache: "no-store" })).text();
      if (css.includes("46vw") && css.includes("clamp(180px")) { live = true; break; }
    }
    console.log(new Date().toISOString().slice(11,19), live ? "NEW LANDING CSS IS LIVE" : "waiting for deploy…");
    if (live) break;
  } catch (e) { console.log("fetch error", e.message); }
  await new Promise(r => setTimeout(r, 20000));
}
if (!live) { console.log("deploy not detected in time"); process.exit(1); }

// 2. measure the live landing at phone width
const b = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args:["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await p.goto(base + "/", { waitUntil: "networkidle2", timeout: 90000 });
await new Promise(r => setTimeout(r, 2500));
const m = await p.evaluate(() => {
  const g = (s) => document.querySelector(s);
  const cs = (n) => n ? getComputedStyle(n) : null;
  const h1 = g("h1"), sec = g("#templates-title"), hero = g('[class*="heroImage"]'),
        grid = g('[class*="countryGrid"]'), cards = [...document.querySelectorAll('[class*="countryCard"]')],
        cta = g('[class*="goldCta"]');
  let wrapped = 0;
  for (const n of document.querySelectorAll('[class*="countryName"]')) if (n.getClientRects().length > 1) wrapped++;
  return { page: document.documentElement.scrollHeight, hero: hero ? Math.round(hero.getBoundingClientRect().height) : null,
    h1size: h1 ? parseFloat(cs(h1).fontSize) : null, h1weight: h1 ? cs(h1).fontWeight : null,
    sec: sec ? parseFloat(cs(sec).fontSize) : null, ctaBg: cta ? cs(cta).backgroundColor : null,
    cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : null,
    tileH: cards.length ? Math.round(cards[0].getBoundingClientRect().height) : null, wrapped,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 };
});
console.log("\n=== LIVE PRODUCTION LANDING at 390x844 ===");
console.log(JSON.stringify(m, null, 2));
console.log("\n=== against the before values ===");
const checks = [
  ["hero photo band", "257px", m.hero + "px", m.hero <= 200],
  ["headline size", "36px", m.h1size + "px", m.h1size === 30],
  ["headline weight", "700", m.h1weight, true],
  ["section heading", "18px", m.sec + "px", m.sec === 24],
  ["primary button", "teal rgb(0,127,120)", m.ctaBg, m.ctaBg === "rgb(10, 74, 63)"],
  ["country columns", "3", String(m.cols), m.cols === 2],
  ["country tile", "84px", m.tileH + "px", m.tileH === 44],
  ["names wrapping", "1 (Saudi Arabia)", String(m.wrapped), m.wrapped === 0],
  ["sideways scroll", "false", String(m.overflowX), m.overflowX === false],
];
for (const [k, before, now, pass] of checks) console.log(`${(pass ? "OK  " : "FAIL")} ${k.padEnd(20)} before ${String(before).padEnd(22)} now ${now}`);
await b.close();
