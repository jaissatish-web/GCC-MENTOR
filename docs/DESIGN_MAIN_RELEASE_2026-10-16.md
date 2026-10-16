# Home design release — 16 October 2026

Scope: integrate the approved combined Home/profile presentation into main, with numeric readiness statistics and horizontal colour progress bars. Earlier branch workflow work is intentionally excluded.

The existing main profile fetches, readiness calculations, next-action decisions, API routes, service generation, authentication, billing, database and save validation are preserved. Profile editor entry and Home navigation are presentation/navigation changes. The existing save path protects unsaved edits when returning Home.

Readiness numbers retain the former ring’s rounding and 0–100 bounds. The full-scale fill fades red below 50, changes yellow at 50, transitions toward green at 70, and becomes deeper green near 95. Unavailable scores show a dash without a numeric progress value. Both score cards retain their detail links.

Validation: 64/64 existing main regression checks passed; added dashboard rendering checks passed for 0, 49, 50, 55, 69, 70, 95 and 100, unknown states, actual profile facts and deep links. Typecheck and lint passed. Browser review of compiled main-based UI with synthetic data passed at 320px and 390px frames. Physical devices and all paid AI service generation were not exercised by this design release.
