# Audit de préparation à la livraison — 16 octobre 2026

## Conclusion

Le périmètre actuel est suffisant pour la présentation : comportements classiques, ville et missions, huit bornes jouables, apprentissage neuronal et courses. **Recommandation : terminer et livrer cette version, sans ajouter de nouvelle mécanique.** Les prochaines étapes utiles sont la synchronisation GitHub, l’hébergement et la vidéo de démonstration.

L’audit couvre le code, les dépendances et ressources locales, la suite automatisée et les parcours ci-dessous dans Edge/WebGL. Il ne constitue pas une garantie d’absence de bug dans toute combinaison de réglages, tout navigateur ou toute durée d’utilisation.

## Corrections effectuées

- Une borne Seek en pause permettait de démarrer la musique ou l’effet Monster Kill depuis ses réglages. Reproduction dans Edge : `paused=true`, musique active et AudioContext `running`. L’adaptateur d’hébergement intercepte maintenant les trois boutons d’activation sonore en pause/masquage et signale leur indisponibilité. Les réglages et les volumes restent accessibles. Le jeu et ses comportements d’origine restent intacts.
- Le serveur local renvoyait le fichier Monster Kill M4A comme binaire générique. Il utilise maintenant `audio/mp4`, avec conservation des requêtes partielles HTTP.
- Ajout d’une icône locale aux deux pages principales pour supprimer leur requête d’icône absente.
- Documentation actualisée : huit bornes, emplacement du stade, périmètre des jeux intégrés et nombre de tests.

## Vérifications automatisées

Commande : `npm test` (Node.js, vraies bibliothèques locales Yuka, Three.js et TensorFlow).

**295 tests réussis, 0 échec, 0 ignoré** après correction ; 291 tests avant correction. Quatre tests de régression ajoutés : trois pour les activations audio en pause, un pour le type MIME et la lecture partielle du M4A.

| Domaine | Règles vérifiées par les tests |
| --- | --- |
| Mouvement et steering | Héritage, forces composées et bornées, une locomotion par pas, suivi, wander, arrivée, évitement, dépassement |
| Collisions | Voiture/bus dans les deux sens, face-à-face, croisement, dépassement, barrières, limites de route, bâtiments, arbres, arrêts et portes |
| Ville et bus | Quartiers/rues, voisins, création dans un espace libre, arrêts, portes, embarquement, livraison et score |
| Police et commerces | Clients, trois braqueurs/trois voitures, braquage de 30 s, barrages, détours, poursuite, sortie et retrait ; simulation avec trafic complet |
| Drones et caméras | Alignement/cohésion/séparation distincts, groupes bornés, caméra stabilisée, habitacles, rétroviseurs et sélection |
| Stade et fête foraine | Solides, visiteurs et voitures du parking, cycle prolongé avec population bornée, caméra de grande roue |
| Réseaux neuronaux | Rayons, inférence, copies, mutations, architecture/import, nombre de tenseurs, critères de tours, tentatives et classement |
| Cerveaux livrés | Huit familles de référence, preuves collectives sauvegardées ; rejeu physique individuel sur chaque famille ; absence de mutation en test/course |
| Bornes | Catalogue, provenance des sources, messages de fenêtre/session, huit volumes solides, pauses, redémarrages et déchargement |
| Jeux importés | Forces et limites, fuite/endurance/capture/duplication/XP, missiles/leurres/sons, serpent et suivi/séparation/wander |
| Distribution et son | Bibliothèques/licences locales, fichiers audio/empreintes, activation, pauses, erreurs de lecture, types MIME et plages HTTP |

Contrôles de fichiers : 239 fichiers initiaux examinés par inventaire ; les 194 scripts JavaScript initiaux passent `node --check`. Les cinq pages d’entrée ont été contrôlées pour leurs références locales : aucune ressource manquante, aucun CDN d’exécution et aucun identifiant DOM dupliqué. Les scripts des jeux importés correspondent aux empreintes de `games/provenance.json`. Les quatre enregistrements de ville correspondent aux empreintes de `assets/audio/city/sources.json`.

## Vérifications dans le navigateur

Edge sans fenêtre avec vrai WebGL via SwiftShader, profil de test isolé ; HTTP local et ouverture directe par fichier. Les données personnelles du navigateur de l’utilisateur n’ont pas été utilisées.

- Ville initiale : 16 véhicules dont un bus, 18 drones, trois postes de contrôle permanents et huit bornes ; positions finies.
- Sélection d’un véhicule et passages en première/troisième personne, vues policier, drone, drone suivant, vue libre et vue du dessus. Retirer une nuée suivie revient à la vue libre ; ajouter une nuée fonctionne ensuite.
- Entrée/sortie de la grande roue ; démarrage de la mission bus avec sélection du bus ; démarrage du braquage avec création de ses véhicules. Le déroulement physique complet des missions est couvert par les tests automatisés, pas par une partie manuelle complète dans ce passage navigateur.
- Activation réelle des quatre échantillons sonores : fichiers décodés (`readyState=4`), boucles actives et klaxon distinct ; pauses et retour entre activités.
- Ouverture des huit bornes, canvas présents, pause/reprise et retour à la ville. Vérification des réglages Seek, de l’ajout de serpent, du mode défi IA conservé au redémarrage et d’un tir donnant des points dans Ballon Pop.
- Reproduction puis correction de l’activation audio pendant la pause ; musique ensuite activée, suspendue et reprise dans le vrai AudioContext.
- Laboratoire : génération des huit familles de circuits, architecture sans couche cachée et architecture à cinq couches, lancement d’un entraînement et lecture des entrées/sorties du réseau.
- Test figé du cerveau livré sur l’ovale : **24 voitures, trois tours chacune, succès dès la génération 1**.
- Course avec quatre pilotes nommés : chacun termine trois tours ; gagnant et podium visibles au centre (Oscar dans cet essai, 49,97 s).
- Huit cycles de création/remplacement des populations : retour à **0 tenseur** après libération, à chaque cycle. Banque et résultats rechargeables depuis le stockage local isolé.
- Affichage à 390 × 844 : aucune largeur de document excédentaire ; panneau arcade à la taille de l’écran.
- Ouverture directe sans serveur : ville et bornes Seek, serpent et course chargées via leurs messages d’hébergement.

Aucune exception JavaScript non gérée observée pendant ces parcours. Les annulations de chargement lors du déchargement volontaire des iframes sont attendues. Three.js émet un avertissement de dépréciation pour son ancien format de script ; la version locale actuelle fonctionne. Aucun changement de bibliothèque n’a été introduit pour masquer cet avertissement.

## Limites et préparation de la remise

- Le cerveau « universel » est validé sur les huit pistes de référence livrées, avec leurs réglages. Cela ne prouve pas qu’il réussira toute nouvelle graine, toute largeur ou toute architecture choisie ensuite. Changer l’architecture exige un entraînement compatible.
- Les voitures neuronales sont évaluées indépendamment et ne se heurtent pas entre elles ; les collisions entre véhicules concernent la ville. Cette séparation est volontaire et documentée dans l’architecture.
- La simulation utilise du temps simulé à pas fixe, avec rattrapage plafonné. Une machine très lente peut ralentir la simulation par rapport au temps mural. Les essais SwiftShader ne permettent pas de promettre un nombre d’images par seconde sur le matériel du destinataire.
- Cet audit n’inclut pas de campagne Safari/Firefox, de test sur téléphone physique ni de session continue de plusieurs heures. Avant remise, faire un dernier parcours sur le lien réellement hébergé : chargement, audio après clic, banque/export et retour de chaque activité.
- Les sauvegardes personnelles restent propres au navigateur et à l’origine du site. **Exporter le JSON avant de changer de poste ou de passer du serveur local au site publié**, puis l’importer sur la destination. Les cerveaux livrés restent inclus dans le dépôt.
- Le dépôt local avait de nombreuses modifications et de nouveaux fichiers non enregistrés dans Git au début de l’audit. Rien n’a été committé, poussé ou publié par cet audit : vérifier que GitHub contient bien l’intégralité du jeu avant d’envoyer son lien.
- Les licences des dépendances et les sources audio sont conservées dans `CREDITS.md` et les fichiers associés. Le son Monster Kill est celui fourni par l’utilisateur ; sa présence et sa lecture sont vérifiées, ses droits de redistribution n’ont pas été établis par cet audit.
- Après synchronisation et hébergement : enregistrer une démonstration courte couvrant ville, collisions/caméras, mission bus, intervention, drones, une borne et test/course neuronale. Aucun besoin d’ajouter une mécanique pour démontrer les objectifs pédagogiques.

## Fichiers concernés

Modifiés : `games/arcadeBridge.js`, `games/arcadeBridge.css`, `scripts/serve.mjs`, `tests/behaviorArcades.test.mjs`, `tests/distribution.test.mjs`, `index.html`, `neuro/index.html`, `README.md`, `ARCHITECTURE.md`.

Ajoutés : `favicon.svg`, `AUDIT.md`.

Les deux fichiers **`vehicle.js`**, les bibliothèques, les cerveaux sauvegardés et les scripts de comportement importés sont restés **inchangés**. Aucune nouvelle fonctionnalité de jeu n’a été ajoutée.
