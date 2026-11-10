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

Run `node --test tests/dashboard*.test.mjs` for ten focused tests: calendar and night
boundaries, missing games, zero, exclusions, custom weights, filters, top-ten cap,
ranking navigation, historical fallback, session restoration and offline assets.
The UI harness tests rendering/event contracts, not actual browser layout.

Local headless Chromium could not start in the available execution sandbox:
`socket() failed: Operation not permitted`, including the elevated attempt.
Therefore screenshots, actual mobile/desktop layout, browser keyboard interaction,
reduced-motion rendering and real service-worker integration for this dashboard
remain to be verified before release. The implementation includes responsive CSS,
native keyboard-operable buttons, focus styles and prefers-reduced-motion handling.
