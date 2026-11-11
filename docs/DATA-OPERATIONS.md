# Collecte et imports — 2026–27

Ces commandes préparent ou modifient uniquement des fichiers locaux. Elles ne créent aucun secret et ne déclenchent ni push ni déploiement. Ne jamais placer de clé dans le HTML, dans `assets/`, dans `data/`, dans une URL ou dans Git.

## Mode hébergé actuel : import par identifiant fournisseur

Depuis la simplification du 11 novembre, les statistiques Highlightly sont collectées par `playerKey: "highlightly:<providerId>"`. L’ID NBA est facultatif pour la saison courante ; il ne sert qu’au rapprochement avec l’archive et aux métadonnées vérifiées. Un nom n’est jamais utilisé comme clé ni comme preuve suffisante de fusion. Les sections API-Sports et les premières étapes Highlightly ci-dessous décrivent l’historique technique ; leurs anciennes exigences de mapping complet ne s’appliquent plus au rattrapage hébergé actuel.

- Une requête `/box-score/<match>` ramène les deux équipes. Les compteurs sont stockés une fois par match et identifiant fournisseur ; calculs fantasy, classements, fenêtres et trades sont locaux, sans appel par joueur.
- Les nouveaux snapshots utilisent le schéma 2, avec clé fournisseur stable et `nbaId` facultatif. Le lecteur accepte encore les anciennes releases de schéma 1. Les archives historiques et leurs routes NBA restent inchangées.
- Une fiche non rapprochée affiche sa saison courante et indique l’absence de liaison historique. Après ajout d’une correspondance vérifiée, la même clé fournisseur rejoint l’historique sans recopier les performances ni doubler le joueur. Le nom observé est un libellé ; les collisions entre IDs NBA et fournisseur restent interdites.
- Une ligne vide reste `missing`, avec `stats: null`, et ne compte pas dans les matchs joués. Elle ne bloque pas les performances valides des autres joueurs. Un effectif actuel ou une équipe historique ne suffit pas à invalider l’identité d’un joueur dans un ancien match.
- Les garde-fous utiles restent inchangés : deux équipes attendues, compteurs complets et cohérents, score final réconcilié, doublons refusés, classification de saison vérifiée, anomalies officielles ciblées, correction atomique d’un match entier et conservation de la version antérieure en cas d’erreur.
- Les 12 couples match/joueur déjà documentés par une coupure ou une intention annoncée de coupure restent soumis à une revue ciblée seulement si la ligne annonce une participation jouée (`official-participation-review`). Les intentions ne sont pas présentées comme des transactions définitives. Une ligne vide passe ; aucun autre match du joueur n’est interdit par cette liste et aucun DNP n’est inventé.
- La couverture des statistiques et le rapprochement historique sont deux états distincts. Un match peut être collecté alors qu’un joueur n’a pas encore d’ID NBA ; cela ne prétend pas que la saison entière est couverte ou que son historique est connu.
- Le quota demeure 90 appels maximum par jour UTC, avec 10 de marge sur l’offre 100. Aucune relance réelle ni réinitialisation de quota n’est nécessaire pour déployer le nouveau code. Les box scores déjà stockés peuvent être enrichis en identités sans requête fournisseur.

Le premier lot réel du 11 novembre a dépensé 5 appels de calendrier, 6 corrections et 79 nouveaux box scores. Sur ces 79, 3 furent publiés, 75 rejetés par l’ancienne condition de mapping et 1 par un contrôle source. Ces 75 diagnostics contiennent 273 occurrences de 77 identifiants non rapprochés, pas les compteurs permettant de reconstruire les box scores. La nouvelle règle supprime ce blocage pour les prochaines collectes, sans prétendre récupérer rétroactivement des réponses qui n’ont pas été sauvegardées durablement.

## Historique : statut API-Sports et portée initiale

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

Le diagnostic manuel du 10 novembre 2026 a reçu un calendrier et un box score via Highlightly BASIC. Références du schéma : [matchs](https://highlightly.net/nba-api/documentation/matches/), [box scores](https://highlightly.net/nba-api/documentation/box-score/) et [profils joueurs](https://highlightly.net/nba-api/documentation/players/by-id/). La convention observée est `season=2027` pour 2026–27. Les 26 identités du match témoin ont ensuite été vérifiées par nom, date de naissance et identifiant NBA sourcé ; sa classification régulière a été corroborée séparément. Le box score normalisé, ses calculs et sa reprise depuis le cache ont été vérifiés en privé. Cela ne valide pas toute la saison ni les droits de republication. Les restrictions générales des [conditions Highlightly, §6.1](https://highlightly.net/terms/) imposent une permission pour le fichier public. Le propriétaire indique avoir obtenu cette permission ; le programme exige une attestation explicite avant de publier les seules statistiques normalisées. Sans attestation, le refus reste actif. Les réponses brutes, profils privés, caches et secrets restent exclus du site et des fixtures. Tous les tests restent synthétiques.

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

La fusion refuse les collisions NBA/Highlightly, les équipes contradictoires, un retour de `finished` vers un état non terminé et les provenances d’identité/classification plus anciennes. Un match absent d’un nouveau calendrier ne supprime jamais un match terminé conservé : son ID figure dans `preservedAbsentFinishedGameIds` de l’intervalle concerné. L’absence d’une classification dans un fichier partiel ne vaut pas instruction de suppression : une régression de type connu vers `unknown` est refusée et le candidat précédent reste intact. Aucun mécanisme de suppression de classification n’est fourni ; une telle opération nécessite une décision explicite et sourcée, puis une évolution séparée. Pour corriger une classification hors du lot, relancer explicitement l’intervalle de ce match. Les matchs des autres lots restent inchangés. La fusion privée ne constitue pas une autorisation de publication ; la vérification séparée décrite ci-dessous reste obligatoire.

Le snapshot précédent, sa couverture et ses compteurs sont validés avant le premier appel réseau. Lors d’un rafraîchissement explicite, l’intégrité du cache ancien reste exigée, mais sa cohérence avec un score final nouvellement corrigé ne bloque pas son remplacement : la nouvelle réponse doit se réconcilier avec le nouveau calendrier avant toute écriture. Hors rafraîchissement, une réponse réutilisée doit rester compatible avec le contexte courant.


## Publication Highlightly autorisée et fréquence

Le propriétaire peut renseigner une copie privée de `config/highlightly-publication.example.json` avec sa confirmation de permission couvrant expressément le fichier normalisé accessible publiquement : `publicationAllowed: true`, `publicDatasetAllowed: true`, date ISO `confirmedAt` et référence `source`. Le modèle est refusé par défaut. Cette attestation est une déclaration du propriétaire, pas une vérification juridique indépendante par le programme.

```sh
node tools/publish.mjs .local/highlightly-candidate.json --authorization config/highlightly-publication.local.json
npm run validate
```

Seule une projection contrôlée est écrite : identifiants fournisseur, libellés observés, correspondances NBA vérifiées lorsqu’elles existent, matchs, compteurs fantasy, provenance des identités/types et couverture partielle. Les champs inconnus, corps de réponses, clés de cache, checkpoints et commentaires privés ne sont pas recopiés. Les minutes restent marquées approximatives. Le site affiche le nombre réel de matchs/joueurs importés, les périodes demandées, les dates sources distinctes de la normalisation et le fait que les moyennes concernent uniquement cet échantillon.

### Runner quotidien prêt à planifier, mais non activé

`config/highlightly-daily.example.json` est désactivé. Une copie privée peut choisir trois journées terminées à New York (jusqu’à sept maximum), une réserve de dix appels et `publishLocally: true` avec le chemin de l’attestation. La révision `daily-YYYY-MM-DD` permet une reprise le même jour UTC. Les identités et classifications doivent rester vérifiées ; une date, à elle seule, ne prouve jamais la saison régulière. Les matchs inconnus sont exclus. Le runner quotidien écarte intégralement le box score d’un match dont au moins une identité manque, sans publier ses autres joueurs isolément ; le collecteur manuel conserve son refus strict par défaut.

```sh
node tools/highlightly-daily.mjs --config config/highlightly-daily.local.json
```

Fréquence proposée : **une tentative par jour à 09:00 UTC**, portant sur les trois dernières journées terminées à New York. Ce programme n’installe aucun cron/workflow et ne pousse ni ne déploie. Il prépare les fichiers locaux à transmettre au déploiement existant. Ne pas annoncer un rafraîchissement actif avant d’avoir vérifié le scheduler, son secret, son déploiement et au moins un essai réel. Le bandeau affiche « aucun rafraîchissement automatique configuré » par défaut ; seuls `refreshSchedule.configured: true` et `verified: true` dans l’attestation permettent d’annoncer une description contrôlée du scheduler.

Pour une machine persistante, conserver `.local/` en privé. Pour un futur runner GitHub Actions éphémère, `bootstrapFromPublished: true` reconstruit le candidat privé à partir du snapshot public normalisé déjà validé, sans profil brut ni date de naissance. Les réponses récentes peuvent ensuite être téléchargées à nouveau dans le budget. Le ledger de quota reste obligatoire : restaurer sa version courante et tenir compte des appels externes, ne jamais le réinitialiser silencieusement lors d’un retry. Seul ce ledger sans secret peut être persisté séparément si nécessaire ; ne pas uploader `.local/` ou le cache brut en artifact. Prévoir une concurrence unique, un secret `HIGHLIGHTLY_API_KEY`, les maps sourcées et une étape de déploiement explicite. Aucun de ces réglages GitHub n’est réalisé par le runner.

Le rapport privé `.local/highlightly-daily-report.json` distingue tentative, échec, candidat collecté et publication locale. Il garde `deployed: false`, car un succès local ne prouve pas une mise en ligne. Si les sources restent partielles, une exécution quotidienne améliore la fraîcheur de l’échantillon mais ne garantit pas la couverture de toute la NBA.

### Workflow GitHub Actions : 09:17 UTC

`.github/workflows/highlightly-daily.yml` définit le cron `17 9 * * *` et une exécution manuelle. Il n’est autorisé à travailler que sur `main` et si la variable de dépôt `HIGHLIGHTLY_DAILY_ENABLED` vaut exactement `true`. Le secret `HIGHLIGHTLY_API_KEY` est obligatoire. La présence du fichier n’est pas une preuve que ces réglages, le secret ou une première exécution sont en place. Les horaires Actions peuvent être retardés par GitHub.

Avant tout appel fournisseur, le workflow **commite et pousse** une réservation complète de 90 appels dans `.github/highlightly-quota.json`. Ce petit état public ne contient que la journée UTC, l’ID du run, la date et le budget réservé. Toute deuxième tentative le même jour est refusée, même après échec, annulation ou interruption. La réservation n’est jamais réduite en fonction du nombre réel d’appels ; elle protège donc aussi une consommation impossible à reconstruire après crash. Une journée suivante peut réserver un nouveau budget. Les démarrages manuels à partir de 23:00 UTC sont refusés afin que le timeout de trente minutes ne traverse pas minuit. Une réservation corrompue/future bloque le travail. Un push rejeté avant réservation interdit la collecte ; un push rejeté après collecte conserve l’ancienne version publique et la réservation. Ne pas effacer ce fichier pour forcer un retry.

Le runner éphémère reconstruit les identités et classifications uniquement depuis le snapshot public normalisé : `unknown` n’est jamais reclassifié selon sa date. Il ne récupère aucun profil DOB. Le cache brut reste temporaire et n’est jamais envoyé en artifact ou commit. Le ledger détaillé local est neuf uniquement après que ce run a obtenu sa réservation durable exclusive ; les headers du fournisseur réconcilient les appels externes. Si des appels manuels partagent cette clé, vérifier leur consommation et ne pas supposer que la réservation leur attribue un quota supplémentaire. Le résultat demeure un échantillon limité aux identités et classifications disponibles.

Le workflow conserve le mode Pages existant `legacy`, branche `main`, chemin `/`. Il le vérifie avant collecte et refuse une configuration différente au lieu de la changer. Comme le push `GITHUB_TOKEN` ne garantit pas un déclenchement Pages, il appelle explicitement [Request a GitHub Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build), `POST /repos/{owner}/{repo}/pages/builds`, avec la permission `pages: write`. Il contrôle ensuite que le build réussi concerne exactement le commit publié, dans une limite de dix minutes. Aucun nouvel artifact de déploiement n’est créé ; Jekyll conserve les exclusions existantes de `.local`, secrets, outils et configurations.

Si les règles de branche refusent les commits du bot, le job échoue sans contourner ces règles. L’activation demande donc aussi de vérifier les permissions du bot et le premier build. Ne marquer `refreshSchedule.verified` qu’après cette vérification réelle. La confirmation de fréquence devra distinguer « planifié à 09:17 UTC » de « première actualisation et déploiement vérifiés ».

#### Amorçage du 10 novembre et validation sans API

Le fichier `.github/highlightly-quota.json` réserve volontairement toute la journée UTC du 10 novembre 2026, pour tenir compte des appels déjà faits hors Actions. Il ne prétend pas que 90 appels ont été effectués : c’est un blocage conservateur. Une collecte aujourd’hui est donc refusée ; la première tentative planifiée pourra se faire le 11 novembre à 09:00 UTC si l’activation et le secret sont réellement prêts.

Le dispatch manuel propose `validation_only: true` par défaut. Ce mode fonctionne même sans secret fournisseur et sans activation quotidienne : il vérifie le code et le snapshot public, ne réserve aucun quota supplémentaire, ne prépare pas de candidat privé, n’appelle pas Highlightly et ne pousse aucune donnée. Il demande seulement un build Pages du commit existant et en vérifie le résultat. Cela permet de tester réellement les permissions Pages du `GITHUB_TOKEN` avant le premier refresh. Ne décocher cette option que pour une collecte autorisée ; la réservation quotidienne reste obligatoire.

La documentation REST GitHub accepte les tokens d’installation GitHub App pour `POST /pages/builds` avec `Pages: write`, ce qui correspond au mécanisme du `GITHUB_TOKEN`. L’accès effectif dépend toutefois des règles du dépôt et doit être testé par ce dispatch. Un 403/422 ou un timeout reste un échec explicite ; le workflow ne change jamais le mode Pages et ne revendique pas un déploiement réussi sans le build correspondant au commit exact.


### Ancienne règle de mapping intégral, remplacée le 11 novembre

La première version refusait tout un box score dès qu’un identifiant NBA manquait, y compris sur une ligne sans statistiques. Ce choix protégeait la liaison à l’archive mais empêchait inutilement la collecte et les calculs courants. Le mode fournisseur décrit en tête du document remplace cette règle. Les anciens diagnostics `unmapped-players` restent lisibles comme traces d’import antérieur ; les matchs concernés sont candidats au rattrapage, sans attendre un changement de table d’identités.

## Rattrapage saison avec reprise durable (10 novembre 2026)

Ce mode remplace la collecte hébergée limitée aux trois dernières journées. Le runner `tools/highlightly-season-runner.mjs` réutilise le workflow quotidien existant, sans second cron ni augmentation du quota.

- Réservation de 90 appels inscrite et poussée avant tout appel fournisseur. Une seconde exécution ou un retry le même jour UTC échoue sans réseau ; la réservation ne diminue jamais après une panne. Le 10 novembre reste bloqué pour tenir compte des appels manuels déjà effectués. Aucun appel manuel concurrent n’est autorisé par ce mécanisme.
- Inventaire paginé de toute la saison, vérification des identités et de chaque box score, corrections récentes limitées à six matchs, puis retard du plus ancien au plus récent. Trois nouvelles tentatives de données fournisseur invalides au maximum en fin de file. Une absence de liaison NBA ne bloque plus un box score valide ; seules les anomalies de données font l’objet des reprises bornées.
- Après chaque page et chaque match vérifié, le runner pousse un checkpoint **normalisé** dans `.github/highlightly-inventory.json` / `.github/highlightly-backfill.json`. Ces fichiers sont publics dans GitHub, mais exclus du site par Jekyll. Ils ne contiennent ni réponse brute, ni clé, ni cache privé. La projection applique des listes de champs autorisés. Les anciennes releases immuables restent intactes.
- L’appel suivant n’a lieu qu’après succès du push. Un push incertain ou refusé arrête le runner sans retry automatique, y compris dans l’étape de publication finale. Un arrêt entre la réponse fournisseur et la confirmation du checkpoint peut nécessiter de relire ce seul match plus tard ; aucune sauvegarde non confirmée n’est présentée comme durable.
- Un échec réseau ultérieur conserve tous les checkpoints confirmés. La publication finale peut reprendre le dernier checkpoint poussé de la même exécution, même après une interruption réseau. Les box scores déjà validés ne sont pas supprimés par une lacune de calendrier, une identité inconnue ou une correction invalide.
- Le calendrier officiel fournit 1 200 matchs réguliers définis, 80 par équipe. Date **et heure New York**, équipes et provenance doivent correspondre exactement pour classer un nouveau match. Les 30 rencontres dépendant de la NBA Cup ne sont pas encore définies dans le PDF du 13 août ; elles nécessiteront une mise à jour vérifiée. Les changements d’horaire restent non classés jusqu’à revue, sauf classification déjà vérifiée conservée.

`workflow_dispatch` reste en validation seule par défaut et ne consomme aucun appel. Le workflow est protégé par une concurrence unique et une durée maximum de 30 minutes. Une réservation après 23:00 UTC est refusée pour éviter de traverser la remise à zéro quotidienne.

Tests : fixtures synthétiques uniquement, quota UTC, conservation, collision d’identité, reprise à cache vide, interruption, invalidité fournisseur, projection publique et push incertain. Aucune promesse de saison complète : consulter `backfillProgress` et les états de couverture du snapshot courant.


### Reprise du 11 novembre

À 10:59 UTC, aucun événement planifié du 11 novembre ne figurait dans Actions, malgré le workflow actif, le secret présent et la variable activée. La cause côté ordonnanceur n’est pas établie. Le cron est décalé à 09:17 UTC pour éviter le début d’heure, conformément aux recommandations GitHub. Cela réenregistre la planification, sans garantir l’émission de chaque événement. Un lancement manuel autorisé peut amorcer le rattrapage, toujours soumis à la même réservation exclusive de 90 appels. Ne pas supprimer ni réduire une réservation pour compenser un retard.

Le test d’amorçage utilise une réservation synthétique, et non le fichier de quota vivant : l’avancement de ce dernier ne doit pas faire échouer les tests du lendemain.

### Correspondances supplémentaires et reprise des anciens box scores en attente

Le complément `config/highlightly-identities.verified.json` contient uniquement des correspondances corroborées par des profils, effectifs ou annonces officiels NBA et une observation Highlightly. `prepareRunner` le fusionne avec les identités déjà publiées, sans jointure sur un nom et en refusant toute collision NBA/fournisseur. Les anciennes preuves restent conservées. Les associations d’équipe contradictoires restent en revue ; une ligne inactive n’est pas assimilée à une participation au match.

Le mécanisme de transition conserve les anciens box scores en attente dans `.github/highlightly-pending-boxes.json`. Ce fichier exclu du site contient uniquement des compteurs normalisés, IDs fournisseur/équipe, noms bornés et horodatages, jamais une réponse brute, un NBA ID supposé ou une clé. Il ne fait pas partie des statistiques publiées. Le runner les relit sans appel fournisseur, revalide le match, le score et les références officielles, puis importe le match entier sous ses IDs fournisseur, sans exiger un rapprochement NBA. L’entrée n’est supprimée qu’après confirmation du checkpoint d’import. Un conflit de match/score bloque la reprise pour revue. Le changement d’horloge pendant une collecte et l’interruption entre sauvegarde d’un box score et de son état sont testés.

Les anomalies fournisseur ont un code stable autorisé, sans message brut. Le contrôle Knicks–Celtics du 23 octobre reste obligatoire ; aucun compteur n’est réécrit pour le faire passer. Une preuve officielle supplémentaire établit le début NBA de Carson Cooper au 31 octobre : une ligne `played` antérieure est bloquée, sans inventer de DNP. Les box scores déjà publiés restent conservés lors d’une correction invalide.

Bilan du premier lot réel du 11 novembre : 90 appels, 25 box scores sur 160 matchs réguliers recensés, 656 lignes. Les 576 anciennes lignes sont inchangées. Les diagnostics révèlent 75 matchs non attribués, un échec de validation source et 59 matchs restant à interroger. Ces derniers ne sont pas présentés comme importés. Le complément vérifié prépare la reprise quotidienne suivante ; il ne modifie pas rétroactivement les chiffres publiés sans relire les box scores nécessaires.

Validation locale du changement fournisseur : 220 tests réussis, 656 lignes publiées et métadonnées de 160 matchs conservées lors de la migration, 6 384 comparaisons d’agrégats identiques entre les moteurs avant/après (399 joueurs, saison et 7/14/30 jours, barèmes par défaut/personnalisé, accès NBA/fournisseur). Aucun appel Highlightly consommé par ces vérifications. Les tests d’interface utilisent un environnement DOM simulé ; la vérification visuelle des futurs profils non rapprochés reste distincte.
