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

---

# PDF Pipeline — TASK-030 Load Test (CTO-corrected re-run)

Run: 2026-08-07T06:46:50.322Z
Method: 5 concurrent PDF renders, each its own headless-Chrome instance, via the real
GulfPremium template (renderToStaticMarkup + puppeteer setContent) — the route's heavy path.
A barrier holds all 5 pages loaded (post-setContent, pre-pdf()) together for 2000ms so
they are GUARANTEED to overlap, and a single long-running PowerShell loop samples every
~120ms instead of spawning a new process per sample.

**This corrects the original run in this file** (below the divider), which measured only
43.3MB peak for 5 concurrent instances — implausible on its own (a single idle Chrome
instance alone typically uses 100MB+), and confirmed too low by a manual sanity check
during CTO review. Root cause: no synchronisation forced the 5 renders to actually overlap,
and spawn-per-sample polling had enough real latency to miss the peak in a ~17s run.

| Metric | Value |
|---|---|
| Concurrent renders | 5 |
| Total wall time | 23.0s |
| PDF sizes (kB) | 57.6, 57.6, 57.6, 57.6, 57.6 |
| Node process peak RSS | 66.6 MB |
| Node RSS delta (before→after) | -18.5 MB |
| **Chrome working-set peak (all instances summed)** | **730.0 MB** |

**Verdict:** peak memory under 1GB — no hard stop triggered.

Caveats, for an honest reading of this number:
- Node peak RSS excludes the separate Chrome processes; the Chrome working-set figure is
  the one that matters for the 1GB gate.
- `Get-Process chrome` matches every process literally named "chrome" on this machine, not
  only ones this script launched — fine for this dev-machine sanity check (no other Chrome
  was running), but a production capacity decision should scope by parent PID, and should be
  re-measured on the actual target VPS hardware, not this dev machine — CPU/memory
  characteristics differ and this number should not be taken as the production figure.
