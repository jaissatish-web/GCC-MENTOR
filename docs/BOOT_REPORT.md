# PDF Pipeline — TASK-030 Load Test

Run: 2026-08-07T06:29:17.986Z
Method: 5 concurrent PDF renders, each its own headless-Chrome instance, via the real
GulfPremium template (renderToStaticMarkup + puppeteer setContent) — the route's heavy path.

| Metric | Value |
|---|---|
| Concurrent renders | 5 |
| Total wall time | 16.9s |
| PDF sizes (kB) | 57.6, 57.6, 57.6, 57.6, 57.6 |
| Node process peak RSS | 65.1 MB |
| Node RSS delta (before→after) | 0.5 MB |
| **Chrome working-set peak (all instances summed)** | **43.3 MB** |

**Verdict:** peak memory under 1GB — no hard stop triggered.

Note: node peak RSS excludes the separate Chrome processes (each render launches its own
browser, which is what the per-request route does); the Chrome working-set peak above sums all
concurrent instances and is the figure that matters for the 1GB gate.
