# NBA Fantasy Stats Tracker

Compagnon fantasy statique, orienté comparaison de joueurs et trades. Node.js 22+ sert uniquement aux outils locaux et aux tests ; aucune dépendance à installer, aucun backend ni compte utilisateur dans le site.

```sh
npm test
npm run validate
npm run preview
```

Ouvrir `http://127.0.0.1:4173/NBA-Fantasy-Stats-Tracker/`. Le serveur écoute uniquement sur cet ordinateur. Le sous-chemin reproduit celui de GitHub Pages. L'ouverture directe en `file://` n'est pas prise en charge : utiliser le serveur HTTP.

## Fonctionnalités

- Recherche avec clavier et noms accentués ; profils, graphiques, classements et comparaison historique de 2 à 4 joueurs.
- Archive 2021–22 à 2025–26 conservée à l'identique : 1 029 joueurs, 2 867 lignes, identifiants NBA originaux. Les 17 avertissements d'arrondi préexistants restent visibles. Les totaux reconstruits depuis ces moyennes sont approximatifs.
- Trades de 1 à 5 joueurs par côté, dont 2v1 et 3v2. Le nombre de places est celui du côté le plus grand. Chaque place libérée reçoit une hypothèse de free agent à **28,5 FPTS/match**, modifiable. Affichage de la somme des AVG, de la moyenne par place et de B − A. Cela ne mesure pas l'effet exact sur une moyenne d'équipe pondérée par matchs et ne représente pas une disponibilité réelle en free agency.
- Une même période et un même barème s'appliquent aux deux côtés. Une moyenne absente bloque le calcul ; une vraie moyenne de zéro reste valable. Exemple de référence testé : 40 + 35 contre 50 + 28,5 → 75 contre 78,5, écart +3,5 et +1,75 par place.
- 2026–27 uniquement : lignes par match, sommes brutes, moyennes, pourcentages calculés depuis les tirs cumulés, forme sur 7/14/30 jours calendaires UTC, journal et comparaison aux années antérieures.
- Similitudes selon postes ESPN compatibles, proximité d'AVG ou les deux ; période, taille d'échantillon, DNP et lignes manquantes affichés. Au moins 3 matchs complets par défaut, réglable. Les combinaisons ESPN sont des ensembles de PG/SG/SF/PF/C ; G/F/C historique ne sert jamais à les inventer.
- Initiales, aucune photo. Aucun compte ni watchlist.

## État des données

**Les données 2026-27 restent non connectées et en attente.** Le manifeste pointe vers une version vide, `not-connected`. Aucun faux joueur ou match en production. Les écrans annuels et les trades historiques sont utilisables immédiatement. Le diagnostic réel du 5 octobre 2026 a validé l’authentification API-NBA, mais l’offre gratuite a refusé les saisons 2026 et 2025 : elle indique un accès limité à 2022–2024. Attendre les premiers matchs réguliers ne garantit donc pas l’accès. Aucun box score réel n’a encore été validé.

Le barème par défaut reste :

`PTS + 3PM + 2 × FGM − FGA + FTM − FTA + REB + 2 × AST + 4 × STL + 4 × BLK − 2 × TO`

Les barèmes personnalisés sont conservés localement et signalés « Custom scoring ». Aucun arrondi intermédiaire : l'affichage seul arrondit. Avec un barème personnalisé, l'hypothèse de free agent doit être évaluée dans ce même barème.

## Architecture

- `data/history-v1.json` : archive originale extraite du HTML, vérifiée par empreinte et comparaison complète avec le commit d'origine.
- `assets/core.mjs` : calculs et validation partagés entre navigateur, collecteur et tests.
- `assets/legacy.js` : moteur historique local explicite ; aucun remplacement global de `window.fetch`.
- `assets/adapter.js`, `app.js`, `companion.js` : adaptation des fonctions existantes et interface actuelle.
- `data/manifest.json` : référence relative et SHA-256 d'un fichier immuable dans `data/releases/`.
- `tools/collect.mjs` : collecte hors navigateur, candidat local dans `.local/`, jamais de push ni déploiement.
- `tools/import-positions.mjs` : import ESPN séparé avec validation de chaque identité, date et source.
- `tools/publish.mjs` : sélection d'un JSON validé **sur disque local**, remplacement atomique du manifeste, conservation du manifeste précédent et de toutes les versions.
- `sw.js` et `assets/loader.mjs` : page et assets en priorité réseau, repli hors ligne ; données courantes validées avant mise en cache. Les JSON invalides n'écrasent pas la dernière version vérifiée. La migration depuis le cache v1 recharge une fois l'ancienne page après activation.

La première visite demande une connexion. « Offline app cache ready » dans Data & scoring confirme la préparation du cache. Une reprise sur version en cache conserve sa date de collecte et affiche un avertissement. Les requêtes expirent au bout de 8 secondes avant repli. Les chemins, icônes et manifeste sont relatifs au dossier du site.

## Connexion future et publication

Lire [le guide de collecte](docs/DATA-OPERATIONS.md) avant toute première exécution. Les exemples de configuration et de planning restent **désactivés**. Le site utilise le déploiement GitHub Pages/Jekyll existant depuis `main`. `_config.yml` exclut outils, tests, documentation, configurations et fichiers locaux du site ; aucun nouveau workflow ni cron n’est ajouté.

Prérequis avant alimentation 2026-27 : accès aux données de cette saison et droits de republication à vérifier ; champs réels des box scores à contrôler ; règles de classification de matchs et correspondances d’identités vérifiées ; source/date de l’import manuel ESPN. Une éventuelle actualisation quotidienne reste à discuter. Les clés restent exclusivement dans le processus local, hors du dépôt et du navigateur.

Résultats de validation et limites : [docs/VERIFICATION.md](docs/VERIFICATION.md).
