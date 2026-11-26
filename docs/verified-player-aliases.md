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

## Whole-ranking verification · November 26

On the 261-game release (`6b3521df5baa22da`), group the 939 player records by full name (NFKD without marks, case and whitespace normalized) only to **discover candidates**, never to adjudicate them. Compare observed secondary rows against official NBA player IDs and name on the same side of the same match (exact tip time, teams and final scores). The 82 official candidate-game boxes were matched. Require a unique existing canonical NBA ID, at least one exact 12-counter and rounded-minute anchor under the secondary key, no official identity or participation contradiction, and no played overlap with the target. The table includes one exact anchor per accepted guard. All accepted pairs happen also to have zero non-played overlap in this release, so no game or row has been lost. Official spelling variants Bobby Portis Jr., Terrence Shannon Jr and Hansen Yang were checked against their exact NBA IDs. Counter and minute differences outside the anchor remain as imported.

Excluded from automatic reconciliation: Deni Avdija (the dedicated profile is to stay unchanged), 26 secondary keys without any played row, 30 keys without a unique already-verified canonical NBA ID, and Jaylon Tyson and Jaylin Sellers whose only secondary played observation differs from the official clock by 12 and 22 minutes respectively. No player is merged by a new or approximate name search at runtime.

| Player | NBA ID | Secondary → canonical | NBA anchor |
| --- | --- | --- | --- |
| Aaron Gordon | 203932 | 15 → 45965417 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Aaron Nesmith | 1630174 | 129 → 65954702 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Aaron Wiggins | 1630598 | 334 → 65958812 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Ace Bailey | 1642846 | 367 → 73098137 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Aday Mara | 1643530 | 360 → 77625812 | [Box score 0022600048](https://www.nba.com/game/nop-vs-okc-0022600048/box-score) |
| Adem Bona | 1641737 | 225 → 76585622 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Adou Thiero | 1642876 | 460 → 75910532 | [Box score 0022600268](https://www.nba.com/game/uta-vs-lal-0022600268/box-score) |
| AJ Dybantsa | 1643407 | 249 → 77141837 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| AJ Green | 1631260 | 401 → 65963192 | [Box score 0022600274](https://www.nba.com/game/mil-vs-phi-0022600274/box-score) |
| AJ Johnson | 1642358 | 314 → 77565272 | [Box score 0022600278](https://www.nba.com/game/nop-vs-sas-0022600278/box-score) |
| Ajay Mitchell | 1642349 | 357 → 73511132 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Al Horford | 201143 | 35 → 49262 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Alex Caruso | 1627936 | 424 → 44871317 | [Box score 0022600265](https://www.nba.com/game/atl-vs-okc-0022600265/box-score) |
| Alex Karaban | 1642284 | 320 → 73758302 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Alex Morales | 1631457 | 160 → 68896577 | [Box score 0022600282](https://www.nba.com/game/orl-vs-was-0022600282/box-score) |
| Alex Sarr | 1642259 | 251 → 77415947 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Alijah Martin | 1642918 | 150 → 70540907 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Allen Graves | 1643512 | 146 → 77237792 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Alperen Sengun | 1630578 | 108 → 73068227 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Alpha Diallo | 1643813 | 453 → 60988262 | [Box score 0022600054](https://www.nba.com/game/dal-vs-den-0022600054/box-score) |
| Amen Thompson | 1641708 | 101 → 70272167 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Andre Drummond | 203083 | 237 → 99842 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Andrew Nembhard | 1629614 | 128 → 65936747 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Andrew Wiggins | 203952 | 112 → 45890852 | [Box score 0022600249](https://www.nba.com/game/hou-vs-mia-0022600249/box-score) |
| Anfernee Simons | 1629014 | 227 → 65278832 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Anthony Black | 1641710 | 154 → 70693802 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Anthony Davis | 203076 | 248 → 99812 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Anthony Gill | 1630264 | 260 → 38718827 | [Box score 0022600247](https://www.nba.com/game/mem-vs-was-0022600247/box-score) |
| Ausar Thompson | 1641709 | 209 → 70272197 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Ayo Dosunmu | 1630245 | 59 → 65956097 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Baba Miller | 1642394 | 74 → 76135457 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Bam Adebayo | 1628389 | 113 → 60994982 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Baylor Scheierman | 1631248 | 174 → 68908682 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Bennett Stirtz | 1642892 | 363 → 78621527 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Bilal Coulibaly | 1641731 | 257 → 76563392 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Bobby Portis | 1626171 | 116 → 45968297 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Bogdan Bogdanovic | 203992 | 105 → 45567902 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Bones Hyland | 1630538 | 67 → 68888447 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Braden Smith | 1643552 | 135 → 76588877 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Branden Carlson | 1642382 | 281 → 68887592 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Brandin Podziemski | 1641764 | 32 → 70638137 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Brandon Miller | 1641706 | 262 → 66500372 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Brayden Burries | 1643415 | 402 → 76234157 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Brice Sensabaugh | 1641729 | 369 → 76588652 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Bronny James | 1642355 | 51 → 70257677 | [Box score 0022600268](https://www.nba.com/game/uta-vs-lal-0022600268/box-score) |
| Brook Lopez | 201572 | 76 → 52787 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Brooks Barnhizer | 1642964 | 359 → 70264187 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Bruce Thornton | 1643570 | 110 → 76588622 | [Box score 0022600259](https://www.nba.com/game/hou-vs-ind-0022600259/box-score) |
| Bryce McGowens | 1631121 | 310 → 68642357 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Bub Carrington | 1642267 | 256 → 72681677 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Buddy Hield | 1627741 | 187 → 44865827 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Caleb Love | 1631126 | 230 → 66498227 | [Box score 0022600261](https://www.nba.com/game/phi-vs-orl-0022600261/box-score) |
| Caleb Martin | 1628997 | 88 → 47073467 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Cam Christie | 1642353 | 79 → 72681512 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Cam Spencer | 1642285 | 301 → 66497312 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Cameron Boozer | 1643409 | 288 → 75630092 | [Box score 0022600270](https://www.nba.com/game/gsw-vs-mem-0022600270/box-score) |
| Cameron Carr | 1643418 | 463 → 76710602 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Cameron Johnson | 1629661 | 16 → 47074007 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Caris LeVert | 1627747 | 404 → 44866712 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Carson Cooper | 1643721 | 432 → 76588322 | [Box score 0022600268](https://www.nba.com/game/uta-vs-lal-0022600268/box-score) |
| Carter Bryant | 1642868 | 384 → 75924587 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Cedric Coward | 1642907 | 287 → 73546472 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Chaney Johnson | 1643052 | 194 → 77620892 | [Box score 0022600262](https://www.nba.com/game/chi-vs-bkn-0022600262/box-score) |
| Charles Bassey | 1629646 | 36 → 65969357 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Chaz Lanier | 1642404 | 215 → 70513847 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Chris Cenac Jr. | 1643416 | 169 → 77140382 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Christian Anderson | 1643515 | 272 → 75911582 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Christian Braun | 1631128 | 19 → 66477572 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Coby White | 1629632 | 679 → 65935832 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Cody Williams | 1642262 | 62 → 73437437 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Collin Gillespie | 1631221 | 10 → 64179842 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Collin Murray-Boyles | 1642867 | 145 → 76400072 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Collin Sexton | 1629012 | 49 → 64168232 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Cooper Flagg | 1642843 | 85 → 75630152 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Corey Kispert | 1630557 | 337 → 64203332 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Craig Porter Jr. | 1641854 | 348 → 70519562 | [Box score 0022600258](https://www.nba.com/game/mem-vs-cle-0022600258/box-score) |
| Daeqwon Plowden | 1631342 | 326 → 64190837 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Dailyn Swain | 1643517 | 405 → 72730442 | [Box score 0022600262](https://www.nba.com/game/chi-vs-bkn-0022600262/box-score) |
| Dalton Knecht | 1642261 | 243 → 73470212 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Damian Lillard | 203081 | 277 → 100157 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Daniel Gafford | 1629655 | 83 → 64171802 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Daniss Jenkins | 1642450 | 216 → 76609052 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Danny Wolf | 1642874 | 199 → 76608662 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Darius Acuff Jr. | 1643411 | 319 → 77140367 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Darius Garland | 1629636 | 73 → 65954672 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| DaRon Holmes II | 1641747 | 25 → 66505172 | [Box score 0022600054](https://www.nba.com/game/dal-vs-den-0022600054/box-score) |
| Darryn Peterson | 1643408 | 368 → 75630392 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| David Jones Garcia | 1642357 | 387 → 70696217 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Davion Mitchell | 1630558 | 115 → 64171862 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Day'Ron Sharpe | 1630549 | 195 → 66483977 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| De'Aaron Fox | 1628368 | 378 → 60994952 | [Box score 0022600278](https://www.nba.com/game/nop-vs-sas-0022600278/box-score) |
| De'Andre Hunter | 1629631 | 316 → 60987047 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| De'Anthony Melton | 1629001 | 38 → 60997607 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Dean Wade | 1629731 | 221 → 58693787 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Deandre Ayton | 1629028 | 254 → 64173002 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| DeAndre Jordan | 201599 | 313 → 52697 | [Box score 0022600264](https://www.nba.com/game/det-vs-nop-0022600264/box-score) |
| DeMar DeRozan | 201942 | 22 → 60737 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Derik Queen | 1642852 | 308 → 73047767 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Derrick Jones Jr. | 1627884 | 69 → 59042552 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Derrick White | 1628401 | 166 → 46179707 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Desmond Bane | 1630217 | 153 → 60995867 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Devin Booker | 1626164 | 4 → 47043962 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Devin Vassell | 1630170 | 379 → 65935517 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Dillon Brooks | 1628415 | 1 → 47333957 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Domantas Sabonis | 1627734 | 315 → 47340197 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Donovan Clingan | 1642270 | 276 → 76584542 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Donovan Mitchell | 1628378 | 343 → 58633202 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Dorian Finney-Smith | 1627827 | 336 → 38673842 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Draymond Green | 203110 | 28 → 99902 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Dylan Cardwell | 1642928 | 532 → 66498677 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Dylan Harper | 1642844 | 381 → 75569132 | [Box score 0022600255](https://www.nba.com/game/det-vs-sas-0022600255/box-score) |
| Dyson Daniels | 1630700 | 331 → 73041197 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Egor Demin | 1642856 | 418 → 77635712 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Elijah Harkless | 1641989 | 219 → 65962802 | [Box score 0022600264](https://www.nba.com/game/det-vs-nop-0022600264/box-score) |
| Emanuel Sharp | 1643567 | 323 → 76591937 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Franz Wagner | 1630532 | 151 → 68497577 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Fred VanVleet | 1627832 | 100 → 44869517 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Gary Payton II | 1627780 | 37 → 47024612 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Gary Trent Jr. | 1629018 | 400 → 64168712 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Georges Niang | 1627777 | 33 → 44865602 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Goga Bitadze | 1629048 | 159 → 65231567 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Gradey Dick | 1641711 | 80 → 76594937 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Graham Ike | 1643633 | 407 → 70552007 | [Box score 0022600270](https://www.nba.com/game/gsw-vs-mem-0022600270/box-score) |
| Grayson Allen | 1628960 | 271 → 47026742 | [Box score 0022600238](https://www.nba.com/game/cha-vs-lac-0022600238/box-score) |
| Gui Santos | 1630611 | 29 → 74964107 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Hannes Steinbach | 1643419 | 268 → 79221617 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Harrison Barnes | 203084 | 386 → 99737 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Harrison Ingram | 1631127 | 456 → 66505337 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Herbert Jones | 1630529 | 302 → 64168262 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Hugo González | 1642864 | 175 → 77635772 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Immanuel Quickley | 1630193 | 141 → 65936927 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Isaac Okoro | 1630171 | 183 → 66493397 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Isaiah Collier | 1642268 | 373 → 70257557 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Isaiah Crawford | 1642384 | 107 → 68893922 | [Box score 0022600259](https://www.nba.com/game/hou-vs-ind-0022600259/box-score) |
| Isaiah Evans | 1642912 | 63 → 75924842 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Isaiah Hartenstein | 1628392 | 353 → 63334847 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Isaiah Jackson | 1630543 | 71 → 66483617 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Isaiah Joe | 1630198 | 434 → 65936597 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Isaiah Stewart | 1630191 | 298 → 66493217 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Ivica Zubac | 1627826 | 137 → 60268622 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Ja'Kobe Walter | 1642266 | 142 → 70265147 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Ja'Kobi Gillespie | 1643551 | 443 → 76620587 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Jabari Smith Jr. | 1631095 | 98 → 66490652 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Jabari Walker | 1631133 | 445 → 66487757 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Jaden Hardy | 1630702 | 53 → 73027412 | [Box score 0022600268](https://www.nba.com/game/uta-vs-lal-0022600268/box-score) |
| Jaden McDaniels | 1630183 | 56 → 66476132 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Jae'Sean Tate | 1630256 | 106 → 47052722 | [Box score 0022600259](https://www.nba.com/game/hou-vs-ind-0022600259/box-score) |
| Jahmai Mashack | 1642942 | 433 → 70260077 | [Box score 0022600277](https://www.nba.com/game/mem-vs-min-0022600277/box-score) |
| Jaime Jaquez Jr. | 1631170 | 391 → 66493787 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Jake LaRavia | 1631222 | 42 → 68891432 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Jakob Poeltl | 1627751 | 140 → 47024687 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Jalen Brunson | 1628973 | 236 → 59021147 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Jalen Green | 1630224 | 5 → 66559727 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Jalen Johnson | 1630552 | 328 → 70519517 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Jalen Pickett | 1629618 | 82 → 65976917 | [Box score 0022600273](https://www.nba.com/game/lac-vs-sas-0022600273/box-score) |
| Jalen Slawson | 1641771 | 131 → 65974172 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Jalen Smith | 1630188 | 177 → 65958902 | [Box score 0022600262](https://www.nba.com/game/chi-vs-bkn-0022600262/box-score) |
| Jalen Suggs | 1630591 | 435 → 66483542 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Jamal Cain | 1631288 | 156 → 64179647 | [Box score 0022600261](https://www.nba.com/game/phi-vs-orl-0022600261/box-score) |
| Jamal Murray | 1627750 | 18 → 59045552 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Jamal Shead | 1642347 | 147 → 66484682 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Jamaree Bouyea | 1631123 | 14 → 64204742 | [Box score 0022600269](https://www.nba.com/game/phx-vs-sac-0022600269/box-score) |
| James Harden | 201935 | 342 → 60947 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| James Wiseman | 1630164 | 246 → 66493187 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Jamison Battle | 1642419 | 144 → 66479462 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Jarace Walker | 1641716 | 132 → 76591967 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Jared McCain | 1642272 | 356 → 70257737 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Jarred Vanderbilt | 1629020 | 47 → 64172222 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Jarrett Allen | 1628386 | 340 → 60995987 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Jase Richardson | 1642859 | 155 → 78594482 | [Box score 0022600282](https://www.nba.com/game/orl-vs-was-0022600282/box-score) |
| Javon Small | 1642914 | 483 → 71727257 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Javonte Green | 1629750 | 213 → 38942747 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Jaxson Hayes | 1629637 | 364 → 65957222 | [Box score 0022600049](https://www.nba.com/game/phx-vs-uta-0022600049/box-score) |
| Jay Huff | 1630643 | 126 → 60987032 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Jaylen Brown | 1627759 | 411 → 58761707 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Jaylen Wells | 1642377 | 289 → 76682372 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Jaylin Williams | 1631119 | 358 → 66493412 | [Box score 0022600048](https://www.nba.com/game/nop-vs-okc-0022600048/box-score) |
| Jayson Kent | 1643257 | 454 → 70559402 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Jayson Tatum | 1628369 | 164 → 60985787 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Jerami Grant | 203924 | 292 → 44867117 | [Box score 0022600270](https://www.nba.com/game/gsw-vs-mem-0022600270/box-score) |
| Jeremiah Fears | 1642847 | 306 → 77162432 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Jericho Sims | 1630579 | 398 → 64169897 | [Box score 0022600271](https://www.nba.com/game/por-vs-mil-0022600271/box-score) |
| Jett Howard | 1641724 | 96 → 76588157 | [Box score 0022600240](https://www.nba.com/game/dal-vs-bos-0022600240/box-score) |
| Jevon Carter | 1628975 | 162 → 47005592 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Joan Beringer | 1642866 | 64 → 79188062 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Joel Embiid | 203954 | 222 → 45890837 | [Box score 0022600274](https://www.nba.com/game/mil-vs-phi-0022600274/box-score) |
| John Collins | 1628381 | 206 → 58633742 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| John Tonje | 1642910 | 279 → 68896712 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Jonathan Kuminga | 1630228 | 57 → 66499772 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Jordan Clarkson | 203903 | 238 → 37927457 | [Box score 0022600253](https://www.nba.com/game/nyk-vs-tor-0022600253/box-score) |
| Jordan Goodwin | 1630692 | 9 → 64177097 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Jordan Hawkins | 1641722 | 189 → 70257317 | [Box score 0022600246](https://www.nba.com/game/chi-vs-cle-0022600246/box-score) |
| Jordan McLaughlin | 1629162 | 389 → 47024807 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Jordan Poole | 1629673 | 409 → 64170407 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Jordan Walsh | 1641775 | 167 → 70256402 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Jose Alvarado | 1630631 | 451 → 64169102 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Josh Dix | 1643717 | 362 → 76588067 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Josh Giddey | 1630581 | 181 → 73068242 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Josh Green | 1630182 | 365 → 66493232 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Josh Hart | 1628404 | 234 → 45941252 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Josh Minott | 1631169 | 197 → 70316837 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Josh Okogie | 1629006 | 372 → 60986012 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Jrue Holiday | 201950 | 283 → 60992 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Julian Champagnie | 1630577 | 383 → 68888252 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Julius Randle | 203944 | 192 → 45968777 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Justin Edwards | 1642348 | 229 → 70670522 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Karim Lopez | 1643510 | 297 → 78479852 | [Box score 0022600270](https://www.nba.com/game/gsw-vs-mem-0022600270/box-score) |
| Karl-Anthony Towns | 1626157 | 233 → 47043992 | [Box score 0022600272](https://www.nba.com/game/nyk-vs-min-0022600272/box-score) |
| Karlo Matkovic | 1631255 | 305 → 74964137 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Kasparas Jakucionis | 1642857 | 403 → 78220667 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Keaton Wagler | 1643413 | 81 → 78813542 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Keegan Murray | 1631099 | 446 → 68915972 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Kel'el Ware | 1642276 | 399 → 76585412 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Keldon Johnson | 1629640 | 382 → 65936912 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Kelly Oubre Jr. | 1626162 | 127 → 47005112 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Kenrich Williams | 1629026 | 354 → 47005457 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Kentavious Caldwell-Pope | 203484 | 226 → 38716337 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Keon Ellis | 1631165 | 202 → 70533722 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Kevin Durant | 201142 | 97 → 49097 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Kevin Huerter | 1628989 | 214 → 60996647 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Kevon Looney | 1626172 | 54 → 47334092 | [Box score 0022600256](https://www.nba.com/game/cha-vs-lal-0022600256/box-score) |
| Keyonte George | 1641718 | 366 → 66505472 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Khaman Maluach | 1642863 | 3 → 78056342 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Khris Middleton | 203114 | 253 → 100202 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Kingston Flemings | 1643412 | 335 → 77237222 | [Box score 0022600280](https://www.nba.com/game/det-vs-atl-0022600280/box-score) |
| Klay Thompson | 202691 | 114 → 98192 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Koa Peat | 1643520 | 11 → 75630362 | [Box score 0022600049](https://www.nba.com/game/phx-vs-uta-0022600049/box-score) |
| Kobe Brown | 1641738 | 133 → 66477347 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Kobe Bufkin | 1641723 | 519 → 70257107 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Kobe Sanders | 1642920 | 78 → 70536347 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Kris Dunn | 1627739 | 72 → 44868152 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Kris Murray | 1631200 | 293 → 68915957 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Kyle Anderson | 203937 | 148 → 44909177 | [Box score 0022600263](https://www.nba.com/game/was-vs-tor-0022600263/box-score) |
| Kyle Filipowski | 1642271 | 375 → 70272962 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Kyle Kuzma | 1628398 | 390 → 47024672 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Kyrie Irving | 202681 | 86 → 97697 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Kyshawn George | 1642273 | 250 → 77619512 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Labaron Philon Jr. | 1642889 | 228 → 73097417 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| LaMelo Ball | 1630163 | 60 → 66493307 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Landry Shamet | 1629013 | 239 → 58711727 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Larry Nance Jr. | 1626204 | 130 → 38706542 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Leaky Black | 1641778 | 324 → 65935817 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| LeBron James | 2544 | 220 → 30557 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Leonard Miller | 1631159 | 184 → 75666842 | [Box score 0022600262](https://www.nba.com/game/chi-vs-bkn-0022600262/box-score) |
| Liam McNeeley | 1642862 | 273 → 78594917 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| LJ Cryer | 1643018 | 40 → 66498302 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Luguentz Dort | 1629652 | 333 → 65956367 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Luka Doncic | 1629029 | 45 → 59180177 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Luka Garza | 1630568 | 170 → 64170332 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Luke Kennard | 1628379 | 8 → 58698677 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Luke Kornet | 1628436 | 385 → 45969467 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Malachi Smith | 1641869 | 541 → 65967827 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Malevy Leons | 1642502 | 34 → 73462802 | [Box score 0022600270](https://www.nba.com/game/gsw-vs-mem-0022600270/box-score) |
| Malik Monk | 1628370 | 321 → 60994997 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Maliq Brown | 1643576 | 457 → 76581122 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Marcus Sasser | 1631204 | 91 → 66482672 | [Box score 0022600267](https://www.nba.com/game/gsw-vs-dal-0022600267/box-score) |
| Marcus Smart | 203935 | 104 → 44865947 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Mario Hezonja | 1626209 | 345 → 44936657 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Marvin Bagley III | 1628963 | 20 → 64168787 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Matas Buzelis | 1641824 | 178 → 70670477 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Matisse Thybulle | 1629680 | 44 → 58613537 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Max Christie | 1631108 | 87 → 66489797 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Max Strus | 1629622 | 591 → 60987737 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Meleek Thomas | 1643509 | 412 → 75630332 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Micah Peavy | 1642877 | 361 → 66483842 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Micah Potter | 1630695 | 280 → 60997052 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Michael Porter Jr. | 1629008 | 193 → 64172627 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Mikal Bridges | 1628969 | 235 → 47215922 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Mike Conley | 201144 | 176 → 48992 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Mikel Brown Jr. | 1643414 | 204 → 76527482 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Miles Bridges | 1628970 | 2 → 60996812 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Miles McBride | 1630540 | 240 → 66478412 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Mitchell Robinson | 1629011 | 165 → 65278847 | [Box score 0022600266](https://www.nba.com/game/bos-vs-den-0022600266/box-score) |
| Mo Bamba | 1628964 | 370 → 64169852 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Mohamed Diawara | 1642885 | 245 → 79349567 | [Box score 0022600285](https://www.nba.com/game/ind-vs-nyk-0022600285/box-score) |
| Morez Johnson Jr. | 1643516 | 89 → 73098362 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Moritz Wagner | 1629021 | 200 → 47263727 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Moussa Cisse | 1630619 | 95 → 70519187 | [Box score 0022600267](https://www.nba.com/game/gsw-vs-dal-0022600267/box-score) |
| Moussa Diabate | 1631217 | 261 → 66499802 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Myles Turner | 1626167 | 392 → 47005487 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Myron Gardner | 1642066 | 118 → 66477647 | [Box score 0022600249](https://www.nba.com/game/hou-vs-mia-0022600249/box-score) |
| Naji Marshall | 1630230 | 93 → 64179977 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Nate Ament | 1643417 | 396 → 77469452 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Naz Reid | 1629675 | 263 → 65955632 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Neemias Queta | 1629674 | 171 → 65962427 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Nic Claxton | 1629651 | 492 → 64172072 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Nick Martinelli | 1643568 | 75 → 76588547 | [Box score 0022600257](https://www.nba.com/game/uta-vs-lac-0022600257/box-score) |
| Nick Richards | 1630208 | 120 → 64172207 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Nickeil Alexander-Walker | 1629638 | 330 → 64171652 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Nikola Jovic | 1631107 | 119 → 74963987 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Nikola Vučević | 202696 | 158 → 98237 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Nique Clifford | 1642363 | 322 → 70536827 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Noa Essengue | 1642855 | 186 → 78638507 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Noah Clowney | 1641730 | 198 → 70694507 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Nolan Traore | 1642849 | 196 → 79188017 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Norchad Omier | 1641807 | 497 → 70533077 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Norman Powell | 1626181 | 180 → 38933807 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Obi Toppin | 1630167 | 136 → 64176392 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| OG Anunoby | 1628384 | 232 → 59021852 | [Box score 0022600272](https://www.nba.com/game/nyk-vs-min-0022600272/box-score) |
| Olivier-Maxence Prosper | 1641765 | 294 → 68932067 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Onyeka Okongwu | 1630168 | 327 → 66476267 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Oscar Tshiebwe | 1631131 | 103 → 66493472 | [Box score 0022600259](https://www.nba.com/game/hou-vs-ind-0022600259/box-score) |
| Oso Ighodaro | 1642345 | 6 → 69016412 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| P.J. Washington | 1629023 | 84 → 64172237 | [Box score 0022600267](https://www.nba.com/game/gsw-vs-dal-0022600267/box-score) |
| Pacôme Dadiet | 1642359 | 244 → 78180812 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Pascal Siakam | 1627783 | 125 → 47246162 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Patrick Williams | 1630172 | 191 → 66476372 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Paul George | 202331 | 163 → 64832 | [Box score 0022600279](https://www.nba.com/game/bos-vs-sac-0022600279/box-score) |
| Paul Reed | 1630194 | 207 → 64179497 | [Box score 0022600046](https://www.nba.com/game/tor-vs-det-0022600046/box-score) |
| Payton Pritchard | 1630202 | 172 → 60996377 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Pelle Larsson | 1641796 | 123 → 69016442 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Peyton Watson | 1631212 | 344 → 68642372 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Precious Achiuwa | 1630173 | 317 → 66476252 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Quentin Grimes | 1629656 | 50 → 65956277 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Quenton Jackson | 1631245 | 134 → 68893502 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Quinten Post | 1642366 | 299 → 68896307 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Rasheer Fleming | 1642853 | 12 → 76590722 | [Box score 0022600269](https://www.nba.com/game/phx-vs-sac-0022600269/box-score) |
| Reed Sheppard | 1642263 | 109 → 70670147 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| RJ Barrett | 1629628 | 138 → 65935442 | [Box score 0022600253](https://www.nba.com/game/nyk-vs-tor-0022600253/box-score) |
| Robert Williams III | 1629057 | 416 → 60994232 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Ron Harper Jr. | 1631199 | 173 → 65959832 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Ronald Holland II | 1641842 | 211 → 70257632 | [Box score 0022600280](https://www.nba.com/game/det-vs-atl-0022600280/box-score) |
| Royce O'Neale | 1626220 | 266 → 38755547 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Rudy Gobert | 203497 | 58 → 45495707 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Rui Hachimura | 1629060 | 70 → 61000787 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Ryan Conwell | 1643553 | 124 → 76608422 | [Box score 0022600260](https://www.nba.com/game/mil-vs-mia-0022600260/box-score) |
| Ryan Dunn | 1642346 | 7 → 73331942 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Ryan Kalkbrenner | 1641750 | 269 → 68641967 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Ryan Rollins | 1631157 | 394 → 68876942 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Saddiq Bey | 1630180 | 309 → 65958107 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Sam Hauser | 1630573 | 168 → 60988127 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Sam Merrill | 1630241 | 346 → 61002422 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Sandro Mamukelashvili | 1630572 | 48 → 64179767 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Santi Aldama | 1630583 | 632 → 68897942 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Scoot Henderson | 1630703 | 285 → 70256237 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Scottie Barnes | 1630567 | 139 → 66498077 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Shai Gilgeous-Alexander | 1628983 | 355 → 64172162 | [Box score 0022600289](https://www.nba.com/game/0022600289/box-score) |
| Sidy Cissoko | 1631321 | 286 → 76226972 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Simone Fontecchio | 1631323 | 117 → 58496027 | [Box score 0022600249](https://www.nba.com/game/hou-vs-mia-0022600249/box-score) |
| Sion James | 1642883 | 265 → 69031442 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Spencer Jones | 1642461 | 466 → 68887472 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Stephon Castle | 1642264 | 380 → 72681572 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Steven Adams | 203500 | 448 → 44869592 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Svi Mykhailiuk | 1629004 | 371 → 47005097 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| T.J. McConnell | 204456 | 707 → 37959017 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Tari Eason | 1631106 | 102 → 66498947 | [Box score 0022600294](https://www.nba.com/game/0022600294/box-score) |
| Tarris Reed Jr. | 1643542 | 388 → 76588202 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Taylor Hendricks | 1641707 | 295 → 70273157 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Terance Mann | 1629611 | 201 → 58618412 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Terrence Shannon Jr. | 1630545 | 66 → 66493772 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Thomas Bryant | 1628418 | 351 → 59021912 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Tidjane Salaün | 1642275 | 267 → 78168707 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Tobi Lawal | 1643588 | 94 → 76591667 | [Box score 0022600240](https://www.nba.com/game/dal-vs-bos-0022600240/box-score) |
| Tolu Smith | 1642449 | 210 → 65969297 | [Box score 0022600264](https://www.nba.com/game/det-vs-nop-0022600264/box-score) |
| Tony Bradley | 1628396 | 376 → 60986162 | [Box score 0022600257](https://www.nba.com/game/uta-vs-lac-0022600257/box-score) |
| Toumani Camara | 1641739 | 274 → 66477107 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Trae Young | 1629027 | 252 → 64169642 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Trayce Jackson-Davis | 1631218 | 143 → 66476327 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Tre Johnson | 1642848 | 259 → 78574517 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Tre Jones | 1630200 | 188 → 65935457 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Tre Mann | 1630544 | 255 → 66493352 | [Box score 0022600247](https://www.nba.com/game/mem-vs-was-0022600247/box-score) |
| Trevon Brazile | 1642350 | 21 → 70481852 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| Trey Lyles | 1626168 | 61 → 47044007 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
| Trey Murphy III | 1630530 | 304 → 65966387 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Tristan da Silva | 1641783 | 157 → 70536797 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Ty Jerome | 1629660 | 291 → 60987062 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Tyler Herro | 1629639 | 393 → 65936942 | [Box score 0022600290](https://www.nba.com/game/0022600290/box-score) |
| Tyler Kolek | 1642278 | 241 → 66499442 | [Box score 0022600275](https://www.nba.com/game/por-vs-nyk-0022600275/box-score) |
| Tyrese Maxey | 1630178 | 223 → 66476237 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Tyrese Proctor | 1642878 | 349 → 75356462 | [Box score 0022600045](https://www.nba.com/game/ind-vs-cle-0022600045/box-score) |
| Tyus Jones | 1626145 | 23 → 47026757 | [Box score 0022600050](https://www.nba.com/game/hou-vs-den-0022600050/box-score) |
| VJ Edgecombe | 1642845 | 224 → 76870247 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Walker Kessler | 1631117 | 43 → 66498107 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Walter Clayton Jr. | 1642383 | 92 → 73446647 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Wendell Carter Jr. | 1628976 | 152 → 64168772 | [Box score 0022600044](https://www.nba.com/game/orl-vs-bkn-0022600044/box-score) |
| Will Richard | 1642954 | 41 → 73459997 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Will Riley | 1642860 | 258 → 77162957 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Yang Hansen | 1642905 | 282 → 78267257 | [Box score 0022600288](https://www.nba.com/game/0022600288/box-score) |
| Yaxel Lendeborg | 1642865 | 30 → 77637122 | [Box score 0022600286](https://www.nba.com/game/bos-vs-gsw-0022600286/box-score) |
| Yves Missi | 1642274 | 447 → 75924902 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Zaccharie Risacher | 1642258 | 90 → 78168692 | [Box score 0022600276](https://www.nba.com/game/lac-vs-dal-0022600276/box-score) |
| Zach Collins | 1628380 | 182 → 61000817 | [Box score 0022600047](https://www.nba.com/game/was-vs-chi-0022600047/box-score) |
| Zach Edey | 1641744 | 290 → 69011012 | [Box score 0022600287](https://www.nba.com/game/0022600287/box-score) |
| Zach LaVine | 203897 | 318 → 45967667 | [Box score 0022600296](https://www.nba.com/game/0022600296/box-score) |
| Zeke Nnaji | 1630192 | 24 → 66476417 | [Box score 0022600054](https://www.nba.com/game/dal-vs-den-0022600054/box-score) |
| Ziaire Williams | 1630533 | 414 → 66498122 | [Box score 0022600295](https://www.nba.com/game/0022600295/box-score) |
| Zion Williamson | 1629627 | 303 → 65935487 | [Box score 0022600293](https://www.nba.com/game/0022600293/box-score) |
| Zuby Ejiofor | 1643544 | 339 → 76594997 | [Box score 0022600043](https://www.nba.com/game/cha-vs-atl-0022600043/box-score) |
| Zyon Pullin | 1642389 | 68 → 68895752 | [Box score 0022600291](https://www.nba.com/game/0022600291/box-score) |
