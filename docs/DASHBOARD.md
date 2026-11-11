# Performance dashboard (prepared locally, not published)

The home dashboard shows up to ten players for the selected latest imported night,
7, 14 or 30 calendar days. The category heading and “View these rankings” open
Rankings with the same period and scoring. Player buttons open existing profiles.
No fabricated or padded entries appear when fewer than ten eligible players exist.

## Calculation contract

- Sort by exact FPTS per complete game, not cumulative FPTS. GP, recorded DNP and
  missing lines are visible. The minimum is one complete game. Rankings can change
  the minimum GP, team, verified ESPN position and sort order.
- The night is the latest imported completed regular-season game date in
  America/New_York. Its actual date is shown, even for an old import. It is never
  described as “tonight”. A newer night with missing box scores stays empty,
  rather than silently falling back to an older night with available scores.
- 7/14/30 days include today and use UTC calendar dates, like existing profiles.
  Future games and non-finished/non-regular/non-standard games are excluded.
- Custom scoring is applied before sorting, without intermediate rounding.
  Genuine zero or negative scores are retained; missing/DNP is not zero.
- All results are explicitly described as imported samples. The dashboard reports
  imported completed-game box-score coverage and snapshot time, without claiming
  a full-season import or inferring missing schedules or player participation.
- Historical rankings, trades, search, profiles and app-update drafts retain their
  existing implementation. Home period and ranking controls survive app updates.

## Files and release isolation

The implementation lives in assets/dashboard.mjs, dashboard.js and dashboard.css.
Only assets/boot.mjs, index.html and sw.js integrate these files. No production data,
collector or workflows are changed by this UI work. Keep this set separate from
backfill publication until the import is finished or the owner explicitly approves.

## Verification

Run `node --test tests/dashboard*.test.mjs` for twelve focused tests: calendar and night
boundaries, missing games, zero, exclusions, custom weights, filters, top-ten cap,
ranking navigation, historical fallback, session restoration and offline assets.
The UI harness tests rendering/event contracts, not actual browser layout.

Local headless Chromium could not start in the available execution sandbox:
`socket() failed: Operation not permitted`, including the elevated attempt.
Therefore screenshots, actual mobile/desktop layout, browser keyboard interaction,
reduced-motion rendering and real service-worker integration for this dashboard
remain to be verified before release. The implementation includes responsive CSS,
native keyboard-operable buttons, focus styles and prefers-reduced-motion handling.


## Integration verification — 2026-11-11

Prepared on `68b006de1ecbec83f4aeb56a1292563d4099b2e9` in the separate
`codex/dashboard-integration-current-main` branch. Only the dashboard, its shell
integration, its tests and this documentation differ from that base. This does
not deploy the dashboard or authorize a merge while the import is incomplete.

- Complete test suite: 199 passed, 0 failed. Data validation and dashboard syntax
  checks passed. Existing 17 historical rounding warnings are unchanged.
- Public snapshot remains `data/releases/2026-27-db4fac6ea024a37f.json` with
  160 imported games, 25 available box scores, 399 players and 656 lines.
- The verified identity file retains all 69 entries.
- `data/`, `config/`, `tools/`, `.github/`, the adapter and the companion UI are
  byte-for-byte unchanged relative to the base. This preserves the quota ledger,
  restart/backfill logic, game coverage and source-failure handling.
- The daily workflow retains `17 9 * * *` (09:17 UTC) and its main-only job guard.
- Latest browser attempt still fails at Chromium startup in this execution
  environment. Actual desktop/mobile layout and browser interaction QA remain
  outstanding; the passing VM harness verifies event/rendering contracts only.
