# Exploiter le tracker sans ChatGPT

Le site, les données publiées et les collectes tournent dans **votre dépôt GitHub**.
Aucun abonnement ChatGPT ni jeton OpenAI n'est utilisé à l'exécution.
Cela ne garantit pas l'absence de maintenance ou de panne.

## Ce qui fonctionne seul

- Collecte : 09:17 UTC, occasions de secours à 10:47, 12:47 et 14:47.
- Au plus une réservation de 90 appels par jour UTC, y compris après une panne.
  Une réservation n'est pas un nombre d'appels réellement consommés.
- Reprise le lendemain depuis les checkpoints normalisés conservés.
- Contrôle indépendant dans Actions : après chaque collecte terminée et à
  11:37 / 18:37 UTC. Il ne contacte **jamais Highlightly**.
- Réparation de publication : un checkpoint strictement plus récent, complet,
  valide, actuel et sans régression d'identité/match/lignes peut être publié
  sans nouvel appel. Un état ambigu, incomplet ou de même horodatage n'est pas
  remplacé automatiquement. Le précédent manifeste reste conservé.
- Si les données du dépôt ne sont pas celles servies par Pages, ce contrôle
  demande un rebuild du mode Pages existant puis compare manifeste et SHA-256.
- La page **Données et barèmes** distingue inventaire ancien, récent mais
  incomplet et récent sans anomalie signalée. Télécharger un JSON avec succès
  ne signifie plus visuellement que la collecte est récente.

## Voir une panne sans ChatGPT

Ouvrir [Actions](https://github.com/Slanyme1801/NBA-Fantasy-Stats-Tracker/actions).
Le workflow **Tracker independent health and offline publication repair**
devient rouge si l'inventaire est ancien/incomplet, si des matchs ont des
anomalies, si un checkpoint plus récent reste non publié ou si Pages ne sert
pas les données attendues. Le résumé du run explique le problème.
Le contrôle considère un inventaire de la veille acceptable avant **16:00 UTC**,
puis attend celui du jour. Une soirée sans match n'est pas une panne : c'est
la date de l'inventaire, pas celle du dernier match, qui fait foi.
Un succès est limité au périmètre connu du fournisseur, pas une garantie NBA exhaustive.

Aucune inscription aux notifications, aucun e-mail/SMS ni service tiers ajouté.
Les notifications natives Actions dépendent de vos préférences GitHub. Pour
recevoir des alertes hors ChatGPT, vous pouvez les activer dans vos paramètres
GitHub. Un moniteur externe indépendant nécessiterait un choix et une autorisation
séparés. Si GitHub n'exécute aucun workflow, son moniteur peut lui aussi se taire.

## Que faire selon l'erreur

1. **Ancien inventaire, aucune réservation aujourd'hui** : vérifier Actions et
   la variable `HIGHLIGHTLY_DAILY_ENABLED=true`. Si aucune collecte n'est active,
   lancer **Backfill and refresh Highlightly season / Run workflow**, décocher
   `validation_only` pour une vraie collecte. Le mode coché ne consomme pas d'API.
2. **Journée déjà réservée après erreur** : ne jamais effacer/modifier le fichier
   de quota pour relancer. Le prochain jour peut repartir. Le workflow de santé
   peut réparer la publication hors API, mais ne rejoue pas les réponses rejetées.
3. **Secret/API indisponible, 401/403/429, quota** : vérifier votre compte Highlightly
   et le secret du dépôt, sans coller la clé dans un issue, un log ou le code.
   Garder l'ancienne clé dans un stockage sûr avant rotation si la récupération
   des anciennes réponses chiffrées est nécessaire.
4. **Erreur de schéma, identité ou classement du match** : correction revue
   nécessaire. Pas de jointure automatique par nom, ni de classement deviné.
5. **Pages en retard** : lancer le workflow de santé via Run workflow ; il ne
   dépense aucun quota. Si le rebuild échoue, vérifier Pages sur main, chemin /,
   et les permissions existantes. Il ne change pas cette configuration.
6. **Même horodatage mais données divergentes / checkpoint incomplet** : ne pas
   forcer la récupération. Comparer les données et conserver toutes les versions.

## Sauvegardes et limites

Les versions normalisées dans `data/releases/`, le manifeste précédent et les
checkpoints sont dans Git. Les réponses brutes sont chiffrées avant l'appel
suivant ; la clé d'origine est nécessaire à leur lecture. Un crash entre une
réponse distante et son enregistrement peut encore perdre cette réponse.
Le dépôt reste le même domaine de panne : une copie Git indépendante et la
conservation sécurisée de la clé sont recommandées, non réalisées ici.

Le calendrier vérifié est statique (jusqu'au 11 avril 2027, hors dates de Coupe
non confirmées) : reports/changements d'heure/nouveaux matchs peuvent devenir
non classifiés. Le contrôle les signale, sans inventer leur type.
La saison **2026–27** est codée dans le collecteur : une nouvelle saison exige
une mise à jour revue. Aucun passage automatique à 2027–28 n'est promis.
GitHub peut retarder/omettre des événements ; fournisseur, secrets, quotas,
permissions, espace de stockage et comptes actifs restent nécessaires.

## Validation de ce changement

Tests synthétiques : matin/échéance/minuit, soirée sans match, inventaire futur
ou ancien, tentative récente incomplète, hash/live divergent, checkpoint plus
ancien/égal/futur, suppression de lignes, préservation du quota et du manifeste
précédent. Aucun appel réel au fournisseur pendant ces tests.
Le premier contrôle réel de la nouvelle collecte automatique reste à observer
lors de la prochaine journée, sans relance payante aujourd'hui.
