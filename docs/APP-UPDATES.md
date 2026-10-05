# Application updates — local verification, 5 October 2026

The existing GitHub Pages Jekyll build renders `site.github.build_revision` into
`sw.js`. Every published commit therefore has a distinct worker and shell cache.
Keep Jekyll enabled. `npm run preview` renders a local content version using the
same template; a generic static file server cannot serve the raw worker template.

The app checks at startup, on return/focus, after reconnection, and every five
minutes while visible and online. Repeated automatic checks are throttled to
30 seconds. This is browser activity, not a server job or data collection schedule.
The Data & scoring screen also offers **Check for app updates** and shows the
active version. Each complete application is downloaded before activation;
a failed install leaves the prior application available. The last two complete
shell generations are retained. Current data still uses its separate verified
cache and manifest validator.

Updates pause while an edited field remains focused and for five seconds after
interaction. A small tab-local session snapshot preserves the page, player,
trade/comparison selections and input values before reload. It expires after
30 minutes and is removed after successful restoration. It never saves a scoring
form automatically or clears `nbafs.scoring`. If session storage is unavailable,
automatic activation/reload is deferred. **Update now** allows an earlier change;
the controller transition still observes the brief interaction grace period.
A per-version tab guard prevents reload loops.

## First migration from an older installation

An already-loaded v1/v2 document has none of the new update handlers. Its worker
can discover and install the new release, but that document is not forcibly
navigated: the next normal opening/reload loads the new application. A browser
may delay its background update check. Save work, close/reopen the site, and
refresh once if the old page persists. Deleting site data is unnecessary and
would risk deleting custom scoring.

No website can update a closed, offline or suspended device immediately. On each
device, checks resume when the site is opened and connectivity is available.

## Executed verification

- `npm test`: 62 passing tests, including failed installation, isolated cache
  cleanup, explicit activation, offline shell, startup coordination, input delay,
  one-use restoration, blocked storage, first installation, focus/reconnection,
  and reload guards. Existing stats/collector/history tests still pass.
- `npm run validate`: 1,029 players, 2,867 historical rows, all five seasons
  preserved. Current season remains not connected with zero games/lines/positions.
- Real integrated Chromium browser on localhost port 4175, at the Pages subpath:
  served the **unmodified** index and worker from commit `181bded`, installed and
  confirmed `nbafs-shell-v1`, and saved PTS=2 through the original UI.
- Switched the local server to release A. The old tab retained an unsaved PTS=3
  while migration proceeded; saved that value, then a normal reload showed Trades,
  active `migration-a`, no v1 cache, and custom scoring PTS=3.
- With release A open, typed **PTS=4 without saving**, switched to B and checked
  updates. The banner waited while that input was focused. After **Update now**,
  the page restored PTS=4; diagnostics confirmed active `migration-b` and saved
  scoring still PTS=3. A repeated check stayed on B without another reload.
  Browser console: no errors or warnings during this sequence.
- Browser harness: `node tests/migration-server.mjs`; set the ignored file
  `.local/migration-phase.txt` to `v1`, `a`, `b`, etc. Diagnostic page is outside
  the app scope at `/diagnostics`. It is a local test tool excluded from Pages.

Screenshots: [version after update](screenshots/update-version.jpg) and
[update notice while editing](screenshots/update-notice.jpg).

The attempted 390px viewport override remained at 1280px in the integrated
browser. These new screenshots are desktop evidence; the new notice has not
been visually verified on mobile. The earlier app's mobile checks are recorded
separately in VERIFICATION.md.

Not executed: native installed iOS/Android PWA migration, other browsers, or a
new production deployment. The local harness substitutes explicit release IDs
for the Jekyll metadata token; the next real Pages build must be checked after
publication to confirm its rendered worker contains the published commit SHA.
No API requests, new schedule, secrets, account changes, push or PR were made
for this correction.

References: [worker lifecycle](https://web.dev/articles/service-worker-lifecycle)
and [GitHub Jekyll metadata](https://jekyll.github.io/github-metadata/site.github/).
