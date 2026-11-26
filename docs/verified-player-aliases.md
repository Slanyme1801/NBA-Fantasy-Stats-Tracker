# Verified Highlightly player aliases · 2026–27

These pairs refer to the same NBA player. Evidence: official scorer reports for the played rows under the secondary keys, checked against the named player, team and game. These are identity corrections, not corrections to the box-score counters.

| Player | NBA ID | Secondary → canonical | Verified played game IDs and NBA evidence |
| --- | --- | --- | --- |
| Cade Cunningham | 1630595 | 208 → 66483557 | 1575084 [Nov 17](https://statsdmz.nba.com/pdfs/20261117/20261117_DETSAS.pdf), 1581017 [Nov 20](https://statsdmz.nba.com/pdfs/20261120/20261120_TORDET.pdf), 1583698 [Nov 22](https://statsdmz.nba.com/pdfs/20261122/20261122_DETATL.pdf) |
| Victor Wembanyama | 1641705 | 377 → 76563422 | 1572033 [Nov 15](https://statsdmz.nba.com/pdfs/20261115/20261115_SASUTA.pdf), 1575084 [Nov 17](https://statsdmz.nba.com/pdfs/20261117/20261117_DETSAS.pdf), 1579766 [Nov 19](https://statsdmz.nba.com/pdfs/20261119/20261119_LACSAS.pdf), 1582331 [Nov 21](https://statsdmz.nba.com/pdfs/20261121/20261121_NOPSAS.pdf) |
| Giannis Antetokounmpo | 203507 | 111 → 45495722 | 1573807 [Nov 16](https://statsdmz.nba.com/pdfs/20261116/20261116_HOUMIA.pdf), 1577338 [Nov 18](https://statsdmz.nba.com/pdfs/20261118/20261118_MILMIA.pdf) |
| Nikola Jokić | 203999 | 17 → 46686092 | 1577344 [Nov 18](https://statsdmz.nba.com/pdfs/20261118/20261118_BOSDEN.pdf), 1581021 [Nov 20](https://statsdmz.nba.com/pdfs/20261120/20261120_HOUDEN.pdf), 1583701 [Nov 22](https://statsdmz.nba.com/pdfs/20261122/20261122_DENCHI.pdf), 1588057 [Nov 24](https://www.nba.com/game/dal-vs-den-0022600054) |

The browser reconciles these explicit keys after validating the release and keeping a verified raw cache. All views consume that same reconciled dataset. Old secondary links resolve to the NBA profile. New releases and offline loads apply the same rules. The collector, raw data, fantasy scoring, historical archive, and photos are not modified.

A row with evidence of play takes precedence over DNP or missing. If both rows have the same participation status, the canonical key wins. Different same-game observations appear under “Données et barème” for review, and are never added together or deleted from the raw data. A conflicting NBA identity or changed name suspends the affected pair. No other players are matched by name.
