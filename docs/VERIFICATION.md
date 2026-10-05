# Vérification locale — 5 octobre 2026

Branche : `feature/fantasy-companion-2026`. Base : `181bded7d09c21992bd2068a6fa38298f015a1ab`.

## Résultats automatisés

`npm test` : **49 tests passés, 0 échec, 0 ignoré**. Résultat brut : [test-results.txt](test-results.txt).

| Domaine | Vérification |
|---|---|
| Archive | Comparaison complète des objets avec le HTML au commit d'origine ; 1 029 joueurs, 2 867 lignes, cinq saisons inchangés |
| ESPN | Formule complète, barèmes personnalisés, absence d'arrondi intermédiaire |
| Trades | 2v1, 3v2, égalité des places, 28,5 modifiable, exemple 75 vs 78,5, null distinct de zéro |
| Temps | Bornes 7/14/30 jours, inclusivité, changement de mois/année et conversion des offsets en UTC |
| Matchs | Présaison, playoffs, play-in, finale Cup, All-Star, inconnus, matchs non terminés et autres saisons exclus |
| Qualité | DNP, absence de ligne, compteurs manquants, vraie performance à zéro, pourcentages cumulés, doublons et remplacements de corrections |
| Identités/postes | Mapping explicite NBA/fournisseur, unicité, provenance, date, combinaisons ESPN exactes et absence de conversion depuis G/F/C |
| Collecteur | Réponses simulées, portée saison/ligue, clé absente, exécution désactivée, HTTP 403/429, erreurs API 200, erreurs réseau, quotas, corrections vides |
| Chargement | Sous-chemin GitHub Pages, SHA-256, JSON invalide, erreurs HTTP, premier accès hors ligne, dernière version vérifiée conservée |
| Publication locale | Versions immuables, ancien manifeste conservé, validation avant remplacement |
| PWA | Priorité réseau, repli cache, périmètre des URL, migration v1 simulée sans suppression des caches sans rapport |

`npm run validate` : réussi. Production : **not-connected, 0 match, 0 ligne, 0 poste ESPN importé**. Les 17 avertissements historiques d'arrondi sont conservés ; aucune correction inventée.

Contrôles de syntaxe JavaScript et `git diff --check` : réussis.

## Vérifications dans le navigateur intégré

Les parcours ont été réellement exécutés dans le navigateur sur `http://127.0.0.1:4173/NBA-Fantasy-Stats-Tracker/` :

- Recherche accentuée (« Jokic » → Nikola Jokić), sélection à la souris et au clavier. Correction du défaut existant où Entrée effaçait la sélection avant de l'ouvrir ; les résultats périmés sont masqués pendant une nouvelle recherche.
- Trade 2v1 : LeBron James + Stephen Curry vs Nikola Jokić + hypothèse 28,5, saison 2025–26 : **85,80 vs 94,70**, écart **+8,90** en somme et **+4,45** par place. À 29 : 95,20 côté B.
- Trade 3v2 : ajout de Jayson Tatum côté A et Luka Dončić côté B : **128,80 vs 153,50**, écart **+24,70** en somme et **+8,23** affiché par place. Les moyennes proviennent de l'archive fournie.
- Passage à une période courante sans données : comparaison bloquée avec un message explicite, pas de faux zéro.
- Profil et trades sur viewport mobile **390 × 844** : largeur de page ne dépassant pas le viewport ; tableaux larges défilants dans leur conteneur. Aucun téléphone physique testé.
- Comparaison historique et graphique de deux joueurs. Barème PTS passant de 1 à 2 : valeur LeBron 2025–26 passant de 43,0 à 63,9 ; affichage « Custom scoring ». Retour aux valeurs par défaut effectué.
- Tous les filtres 2021–22 à 2025–26 et 2026–27 vérifiés ; classement actuel vide et explicite. Trois cycles Home → Trades → Rankings → Compare → Home exécutés sans erreur JavaScript observée.
- **Hors ligne réel** : serveur 4173 arrêté, page rechargée via le service worker, avertissement de dernière copie vérifiée visible, recherche et profil historique fonctionnels. Serveur redémarré ensuite.

Un serveur distinct sur le port 4174, avec un bandeau « SYNTHETIC TEST FIXTURES ONLY », a servi uniquement aux vérifications des données courantes : 3 matchs complets à 41 AVG, total 123, DNP exclu, ligne manquante signalée, pourcentages 50 % / 33,3 % / 80 %, journal de matchs et suggestions SG/SF compatibles avec PG/SG. Le filtre ESPN SG sélectionne ces deux combinaisons. Le mode AVG seul inclut aussi un joueur C. Ce serveur est arrêté et son onglet fermé. Ses fichiers restent dans `.local/`, ignorés par Git, et ne sont pas servis par l'aperçu normal.

## Captures

- [Trade desktop](screenshots/trade-desktop.jpg)
- [Trade mobile](screenshots/trade-mobile.jpg)
- [Profil mobile](screenshots/profile-mobile.jpg)

L'aperçu normal est laissé ouvert sur un trade historique. Aucun compte ni watchlist, aucune photo. Aucun logiciel ajouté.

## Non exécuté / limites restantes

- Diagnostic réel API-NBA terminé le 5 octobre 2026 à 15:34:30 UTC : 4 requêtes, authentification et listes ligues/saisons validées. Les calendriers 2026 et 2025 sont refusés par l’offre gratuite (erreur `plan`, accès annoncé 2022–2024). Quotas confirmés : 100/jour et 10/minute ; dernier solde exposé après le deuxième appel : 98/jour. Aucun box score récupéré : compteurs ESPN, minutes, DNP et classifications réels restent non vérifiés. Les réponses sont dans `.local/`, jamais dans les fichiers suivis ou publiés.
- Import d'éligibilités ESPN réelles et validation des droits de republication : **non réalisés**. Les modèles d'import restent vides.
- Première classification de matchs et mapping des joueurs réels : restent à établir avec des sources vérifiées. La V1 exclut les types inconnus ; elle ne déduit pas la finale de Cup depuis une date ou un code stage.
- Migration depuis une installation v1 sur un téléphone réel : non exécutée ; logique de migration couverte par tests simulés. Installation native iOS/Android et navigateurs autres que celui intégré : non testés.
- Aucun planning, compte, abonnement, clé ni permission créé ou modifié. La publication autorisée réutilise le déploiement Pages existant ; outils, tests, configurations et fichiers locaux sont exclus par `_config.yml`. Le manifeste 2026-27 reste vide et non connecté.

Le guide [DATA-OPERATIONS.md](DATA-OPERATIONS.md) explique les contrôles et décisions nécessaires avant collecte et publication.
