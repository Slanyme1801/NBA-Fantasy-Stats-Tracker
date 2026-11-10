# Collecte et imports — 2026–27

Ces commandes préparent ou modifient uniquement des fichiers locaux. Elles ne créent aucun secret et ne déclenchent ni push ni déploiement. Ne jamais placer de clé dans le HTML, dans `assets/`, dans `data/`, dans une URL ou dans Git.

## Statut et portée

L'adaptateur suit la documentation API-Sports consultée le 5 octobre 2026 : [guide API-NBA](https://www.api-football.com/news/post/how-to-get-started-with-api-nba-the-complete-beginners-guide) et [guide de saison 2026–27](https://www.api-football.com/news/post/2026-2027-nba-season-guide-to-using-data-with-api-sports).

Le fournisseur annonce 100 requêtes/jour et 10/minute sur l'offre gratuite. Le collecteur impose au moins 6,1 secondes entre appels, au plus 90 par exécution par défaut, un journal local quotidien de requêtes et un verrou empêchant deux exécutions simultanées. Il respecte également les quotas restants renvoyés en en-têtes. Ce journal ne connaît pas les appels faits ailleurs sur le compte : vérifier la consommation globale côté fournisseur avant de lancer une collecte.

La base est `https://v2.nba.api-sports.io`, authentification par en-tête `x-apisports-key`. `/leagues` et `/seasons` sont vérifiés à chaque exécution, puis `/games?league=standard&season=2026` charge le calendrier. `/players/statistics?game=ID` récupère toutes les lignes d'un match. Un diagnostic réel et isolé du 5 octobre 2026 a validé l’authentification, `/leagues` et `/seasons`. Les appels `/games` pour 2026 puis 2025 ont renvoyé HTTP 200 avec une erreur `plan` : l’offre gratuite limite l’accès aux saisons 2022–2024. La liste `/seasons` ne prouve donc pas le droit d’accès. Aucun calendrier ni box score n’a été récupéré ; les champs réels, DNP, minutes et classifications restent à valider. Le site conserve `not-connected`, et la collecte reste désactivée.

## Configuration manuelle préalable

Copier `config/collector.example.json` vers `config/collector.local.json` et les deux autres modèles vers des fichiers `.local.json`. Ceux-ci sont ignorés par Git. Renseigner les chemins dans le collecteur. `enabled` reste `false` jusqu'à la décision de réaliser une collecte manuelle. La clé est lue uniquement depuis la variable d'environnement `API_SPORTS_KEY`, que l'opérateur devra fournir ultérieurement ; le programme ne l'enregistre pas.

Le fichier d'identités contient `season: "2026-27"` et une liste `players`. Chaque entrée doit avoir :

| Champ | Rôle |
|---|---|
| `nbaId` | Identifiant NBA entier positif, identique à l'archive si le joueur y figure |
| `providerId` | Identifiant API-NBA entier positif |
| `name` | Nom d'affichage vérifié |
| `source` | Référence ayant servi à établir cette correspondance |
| `verifiedAt` | Date ISO avec fuseau de vérification |

Vérifier les identités par plusieurs éléments disponibles : IDs documentés, équipe, date de naissance ou profil. **Aucune jointure uniquement par nom.** Une ligne API non mappée bloque le candidat en indiquant l'ID du fournisseur ; aucune correspondance automatique approximative n'est créée. Les nouveaux joueurs utilisent leur ID NBA vérifié et n'obtiennent aucun historique inventé.

Le fichier de types contient `season: "2026-27"` et une liste `games`, avec `id`, `type`, `source`, `verifiedAt`. Les types autorisés sont `regular`, `preseason`, `playoffs`, `play-in`, `cup-final`, `all-star`. Un match sans entrée reste `unknown`, exclu des moyennes. Le champ brut `stage` est conservé pour contrôle mais ne constitue pas une classification suffisante. La finale NBA Cup doit être marquée `cup-final` ; les autres matchs comptant réellement en saison régulière peuvent être `regular`, après vérification. Cette revue explicite est une limite assumée de la V1, en attendant la validation des champs réels du fournisseur.

## Exécution et contrôles

Après autorisation et configuration réelle :

```sh
npm run collect -- --config config/collector.local.json
```

Le résultat est `.local/candidate.json`. Les matchs terminés déjà collectés sont relus sur les 7 derniers jours ; les matchs plus anciens sans box score restent candidats au rattrapage. Une passe avec `correctionDays: 30` peut contrôler un intervalle plus large. Les corrections plus anciennes que la fenêtre requièrent une revue spécifique. Si le budget est insuffisant, l'exécution échoue sans remplacer le candidat précédent ni les données publiées : réduire le lot de matchs classifiés pour le premier rattrapage ou planifier plusieurs passes manuelles, sans augmenter les limites gratuites.

HTTP 403, erreurs présentes dans l'enveloppe API, quotas atteints, réponse mal formée, mapping manquant, duplication ou compteurs incohérents bloquent la publication. HTTP 429 et erreurs réseau/5xx bénéficient de retries bornés. Une réponse vide inattendue ne supprime pas un calendrier ou un box score déjà valide. Un premier résultat vide est enregistré comme données manquantes, pas comme performances nulles.

Une seule ligne par `(gameId, nbaId)`. Une correction remplace toutes les lignes du match concerné, y compris celles retirées par le fournisseur. Les compteurs sont des entiers bruts ; les points doivent se réconcilier avec les tirs. Une ligne `played` doit avoir les compteurs complets et une preuve de participation. Une mention explicite DNP sans activité devient `dnp` ; une ligne incomplète ou une participation incertaine devient `missing`. Les DNP et données manquantes ont `stats: null` et ne comptent pas dans GP. Une performance entièrement à zéro avec temps de jeu positif compte normalement. L'absence totale d'une ligne ne permet pas de conclure à un DNP ou à l'absence d'un match prévu.

Les moyennes, fenêtres et trades utilisent uniquement les lignes complètes de matchs `finished` et `regular`. Une journée calendaire est définie en UTC, borne basse incluse et borne haute = date courante. Exemple : fenêtre de 7 jours au 5 octobre = 29 septembre–5 octobre. La fenêtre ne se recale pas sur le dernier match importé ; des données anciennes restent visiblement anciennes.

## Import ESPN séparé

Le fichier `config/espn-positions.example.json` est un modèle vide. Fournir un snapshot de toute l'éligibilité connue pour cette saison :

- `season: "2026-27"`, `source` mentionnant ESPN, `importedAt` daté en ISO avec fuseau.
- Chaque entrée `entries` contient `nbaId`, `espnId`, `positions` (tableau sans doublons parmi PG, SG, SF, PF, C), `source` et `observedAt`.
- Les IDs ESPN et NBA doivent être uniques. La date d'observation ne doit pas être postérieure à l'import. Une absence d'entrée signifie « non importé », jamais une éligibilité déduite depuis G/F/C.

```sh
node tools/import-positions.mjs chemin/positions.json .local/candidate.json
```

Sans second argument, l'import part du snapshot actuellement publié. Il crée `.local/positions-candidate.json`, valide toutes les entrées et remplace le snapshot ESPN complet. Les entrées retirées ne restent pas actives. Aucune collecte automatique ESPN/NBA.com n'est implémentée. La provenance et la date d'observation sont affichées sur les profils.

## Sélection locale d'une version et retour arrière

Après revue du candidat :

```sh
node tools/publish.mjs .local/positions-candidate.json
npm run validate
```

La validation précède tout changement de manifeste. Un fichier JSON immuable nommé par SHA-256 est écrit dans `data/releases/`, puis le manifeste est remplacé atomiquement. `data/manifest.previous.json` conserve le précédent manifeste valide et les anciennes releases restent disponibles. Pour revenir en arrière, recopier le manifeste précédent vers `data/manifest.json`, puis exécuter `npm run validate`. Le navigateur refuse un hash ou schéma incohérent et garde sa dernière copie vérifiée.

La commande `publish:data` signifie uniquement « choisir les fichiers du site local ». La mise en ligne nécessite une autorisation séparée, et un contrôle des droits de republication. `config/schedule.example.json` est documentaire et désactivé ; aucun ordonnanceur n'est actif.

## Highlightly : mode privé expérimental, désactivé

Le diagnostic manuel du 10 novembre 2026 a reçu un calendrier et un box score via Highlightly BASIC. Références du schéma : [matchs](https://highlightly.net/nba-api/documentation/matches/), [box scores](https://highlightly.net/nba-api/documentation/box-score/) et [profils joueurs](https://highlightly.net/nba-api/documentation/players/by-id/). La convention observée est `season=2027` pour 2026–27. Les 26 identités du match témoin ont ensuite été vérifiées par nom, date de naissance et identifiant NBA sourcé ; sa classification régulière a été corroborée séparément. Le box score normalisé, ses calculs et sa reprise depuis le cache ont été vérifiés en privé. Cela ne valide pas toute la saison ni les droits de republication. Les [conditions Highlightly, §6.1](https://highlightly.net/terms/) interdisant la redistribution de datasets/feeds, **aucune donnée Highlightly ne doit être copiée dans `data/`, les fixtures de tests ou le site**. `tools/publish.mjs` refuse ce fournisseur et les marqueurs de provenance privés, sans option de contournement. Une évolution légale/technique séparée serait nécessaire avant toute publication. Les tests du nouvel adaptateur sont exclusivement synthétiques.

`tools/highlightly.mjs` et `tools/collect-highlightly.mjs` sont séparés d'API-Sports. Aucun changement de l'interface, du manifeste, de l'historique ou du barème. Le collecteur valide un lot privé pour l’intervalle choisi, puis le fusionne avec son candidat Highlightly précédent. Il ne lit ni ne fusionne de snapshot API-Sports et ne prétend jamais couvrir une saison complète. Un échec de collecte, de validation ou de fusion conserve le candidat précédent. Seuls les matchs présents dans le lot validé remplacent leurs lignes antérieures, intégralement, sans cumul.

Préparation avant une exécution manuelle autorisée :

1. Copier `config/highlightly.example.json` en fichier `config/*.local.json`. Renseigner `startDate` et `endDate` ISO, inclusifs (maximum 31 jours, saison 2026–27), puis les chemins des correspondances et classifications. Conserver `enabled: false` tant que la revue n'est pas terminée.
2. Remplir les modèles d'identités et de types, avec `provider: "Highlightly"` obligatoire. Le `providerId` d'une identité et l'`id` d'un match sont exclusivement Highlightly. Les mêmes exigences NBA, provenance et date que ci-dessus s'appliquent ; aucune jointure par nom. `/players/{id}` ne fournit pas directement d'ID NBA dans le profil observé. Aucun mapping réel n'est fourni avec ce code.
3. Fournir `HIGHLIGHTLY_API_KEY` uniquement dans l'environnement du processus. Le collecteur ne charge pas automatiquement les fichiers `.env`, n'écrit jamais la clé et ne la met pas dans une URL. L'en-tête envoyé est `x-rapidapi-key`, uniquement à `https://nba.highlightly.net` ; les redirections sont refusées. Ne pas lancer de commande contenant littéralement la clé ni activer de trace shell.
4. Créer/revoir **manuellement** `.local/highlightly-request-ledger.json` de forme `{"provider":"Highlightly","requests":[...]}`, où chaque valeur est l'horodatage Unix en millisecondes d'un appel consommé pendant la journée UTC courante, y compris diagnostics et autres clients. Le format historique avec des timestamps de plusieurs jours reste accepté : seuls les jours passés valides sont écartés lors de la migration, jamais la consommation du jour. Un timestamp invalide ou futur bloque toute collecte et exige une revue manuelle ; aucune consommation inconnue n’est transformée en zéro. Ne jamais réinitialiser le ledger pour contourner un quota. Le programme exige ce fichier et ne l'initialise pas silencieusement.
5. Après revue, activer uniquement la configuration privée, puis exécuter `node tools/collect-highlightly.mjs --config config/highlightly.local.json`.

Le client réserve chaque appel dans le ledger **avant** le réseau, y compris les échecs. Limites : 20 appels/exécution et 90 par journée UTC par défaut, maximum dur 100 pour les deux, espacement minimum 6,1 secondes, verrou exclusif local et refus de requêtes concurrentes. Aucun retry automatique, y compris 429/5xx. Le compte direct BASIC annonce 100 appels/jour et 100/minute ; les [conditions §4.2](https://highlightly.net/terms/) fixent la remise à zéro quotidienne à 00:00 UTC. Le ledger migré conserve `dayUTC`, les timestamps du jour et les contraintes serveur. Le changement de jour réinitialise aussi un `remaining: 0` de la veille, y compris dans un processus déjà actif. Un appel dont la réponse ou le timeout traverse minuit laisse le nouveau jour bloqué par prudence : ses compteurs ne permettent pas de déterminer le jour facturé. Un HTTP 429 bloque également la journée ; aucun contournement ou nouvel essai automatique. Ce ledger ne connaît pas les appels faits ailleurs après sa revue : l'opérateur doit vérifier la consommation globale et réserver une marge. Un timeout ou une réponse invalide bloque le lot, sans publication.

La pagination de `/matches` utilise `league=NBA`, `season=2027`, `date`, `timezone=America/New_York`, `limit=100` et `offset`. Chaque match doit correspondre à la date locale demandée ; les doublons, totaux de pagination changeants et enveloppes de plan inattendues sont refusés. Seuls les statuts observé `Finished` et explicitement pris en charge `Scheduled` sont reconnus ; tout autre statut bloque la passe en attendant une validation de son schéma. Les matchs non classifiés sont `unknown`, non collectés et exclus des moyennes.

Le box score doit contenir deux équipes distinctes appartenant au match. Tous les compteurs fantasy, rebonds offensifs/défensifs et minutes sont exigés si la liste des statistiques n'est pas vide. Le total des rebonds, les tirs, les points par joueur et la somme des points d'équipe doivent se réconcilier. Une liste vide reste `missing`, jamais DNP ; une absence complète de joueur ne permet aucune conclusion. Les minutes reçues sont des **entiers arrondis**, pas des secondes exactes : `seconds` est une conversion de compatibilité, accompagnée de `minutesPrecision: "rounded-whole-minute"`. Le total observé peut être 239 plutôt que 240 minutes et n'est pas utilisé comme preuve d'incohérence.

Les erreurs de CLI sont volontairement génériques pour éviter de reproduire une valeur privée issue d'un fichier ou d'une réponse. Les fonctions de parsing ont des erreurs fixes plus précises pour les tests locaux. Aucun outil du mode privé n'est chargé dans le navigateur.

Les en-têtes `x-ratelimit-requests-limit` et `x-ratelimit-requests-remaining`, lorsqu'ils sont présents, sont contrôlés comme entiers. Un compteur restant nul ou un en-tête mal formé bloque les appels suivants. La consommation globale indiquée par le serveur est reportée conservativement dans le ledger à l'instant de lecture ; elle est conservée jusqu’à la remise à zéro UTC et survit au redémarrage. Un échec de persistance interdit tout nouvel appel. Les fichiers temporaires et finaux de candidat/ledger sont créés avec permissions `0600`.


### Reprise d’un lot et cache privé

Le cache `.local/highlightly-cache/` contient uniquement des réponses validées, identifiées par SHA-256 de la requête sans clé, avec provenance, date et empreinte du contenu. Chaque écriture temporaire/finale utilise `0600`, puis remplacement atomique ; les répertoires nouveaux utilisent `0700`. Les liens symboliques dans les chemins privés sont refusés. Une réponse JSON corrompue, une empreinte différente, une date future ou un contenu incompatible bloque la reprise, sans refetch implicite. Après diagnostic, l’opérateur peut retirer seulement l’entrée incriminée pour autoriser sa récupération lors d’une prochaine collecte. Ne jamais déplacer ce cache vers les fichiers publics.

Un box score est contrôlé (compteurs, équipes, totaux) et enregistré **avant** de résoudre les identités NBA. Une identité manquante bloque le candidat, mais une reprise après correction du mapping réutilise la réponse déjà payée. Les pages de calendrier et box scores réussis avant épuisement du budget sont aussi réutilisés. La réservation du quota précède l’appel : si le processus s’arrête entre la réponse réseau et sa persistance, cette réponse peut devoir être téléchargée à nouveau. Aucun système de cache local ne peut garantir une transaction atomique avec le fournisseur distant.

`.local/highlightly-checkpoint.json` indique l’intervalle, la révision de rafraîchissement, les requêtes enregistrées, leur date réelle de récupération et les matchs normalisés. `active` signifie passe en cours (ou processus interrompu brutalement), `interrupted` signifie arrêt contrôlé, `validated` signifie lot validé prêt à l’écriture du candidat. La source de reprise est le cache vérifié, pas un simple compteur du checkpoint. Le verrou `.local/highlightly.lock` empêche deux CLI simultanées. Après un arrêt brutal, retirer ce verrou uniquement après avoir vérifié qu’aucun collecteur ne tourne encore.

Pour reprendre après épuisement du budget, attendre la prochaine journée UTC, garder la même configuration et relancer :

```sh
node tools/collect-highlightly.mjs --config config/highlightly.local.json
```

Pour un backfill plus long, limiter chaque lot à 31 jours maximum et modifier `startDate`/`endDate` entre lots en gardant le même chemin `candidate`. Aucun snapshot intermédiaire non validé n’est écrit dans le candidat. Les bornes globales ne signifient pas qu’il n’y a aucun trou : `scope.completeSeason` reste `false`, `scope.mayHaveGaps` signale les unions, et `coverage` conserve chaque intervalle avec les dates réelles des réponses, reprises du cache comprises. `updatedAt` indique la normalisation, pas la fraîcheur réseau de toutes les données.

### Fraîcheur et corrections explicites

- Les box scores terminés validés sont réutilisés sans expiration automatique. Les corrections requièrent un rafraîchissement explicite.
- Une page de calendrier datée de plus de sept jours dont tous les matchs sont terminés est également réutilisée sans expiration. Une page vide, même ancienne, expire après cinq minutes pour permettre la découverte d’un ajout tardif.
- Les calendriers récents, futurs ou contenant un match non terminé expirent après cinq minutes. Une reprise peut donc relire le calendrier récent, mais pas les box scores déjà conservés. Un statut live non pris en charge échoue avant mise en cache, sans figer de résultat.

Pour corriger des matchs récents, renseigner un `refreshFrom` inclus dans la saison et un `refreshId` inédit, par exemple `review-2026-11-20`. Dans le lot courant, les requêtes à partir de cette date sont relues une fois pour cette révision ; conserver cet identifiant lors d’une reprise évite de repayer les box scores déjà corrigés. Utiliser un nouvel identifiant pour une nouvelle campagne de correction. La version corrigée devient la version courante du cache, y compris lorsqu’on remet ensuite les deux champs à `null`. Les modèles restent désactivés par défaut.

La fusion refuse les collisions NBA/Highlightly, les équipes contradictoires, un retour de `finished` vers un état non terminé et les provenances d’identité/classification plus anciennes. Un match absent d’un nouveau calendrier ne supprime jamais un match terminé conservé : son ID figure dans `preservedAbsentFinishedGameIds` de l’intervalle concerné. L’absence d’une classification dans un fichier partiel ne vaut pas instruction de suppression : une régression de type connu vers `unknown` est refusée et le candidat précédent reste intact. Aucun mécanisme de suppression de classification n’est fourni ; une telle opération nécessite une décision explicite et sourcée, puis une évolution séparée. Pour corriger une classification hors du lot, relancer explicitement l’intervalle de ce match. Les matchs des autres lots restent inchangés. Aucun comportement ne contourne l’interdiction de publication Highlightly.

Le snapshot précédent, sa couverture et ses compteurs sont validés avant le premier appel réseau. Lors d’un rafraîchissement explicite, l’intégrité du cache ancien reste exigée, mais sa cohérence avec un score final nouvellement corrigé ne bloque pas son remplacement : la nouvelle réponse doit se réconcilier avec le nouveau calendrier avant toute écriture. Hors rafraîchissement, une réponse réutilisée doit rester compatible avec le contexte courant.
