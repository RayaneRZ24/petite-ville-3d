# Architecture — Petite ville 3D

## Circuit neuronal et laboratoire

`neuro/train-multi.cjs` ajoute une neuroévolution commune sur seize pistes. La sélection privilégie la progression minimale et moyenne sur toutes les familles ; le réseau dense à symétrie gauche/droite ne reçoit que les capteurs et la vitesse. Les inférences rapides de sélection sont testées contre TensorFlow. La validation finale groupe les inférences TensorFlow d'un même cerveau sur 24 agents indépendants tout en conservant une locomotion Yuka par agent et par pas. Les huit pistes de référence doivent toutes réussir trois tours avec toute la population dès le premier essai. Les tests rejouent aussi les pistes par l'inférence individuelle du jeu. La campagne, ses paramètres et ses huit résultats sont dans `neuro/sauvegardes/entrainement-multicircuits.json` ; `savedPilots.js` vérifie les huit preuves avant ajout à la banque, sans écraser les données personnelles.

`LearningCircuit3D extends YUKA.Vehicle` représente un site statique à côté des quartiers, au nord (`z=-78`), à côté de la fête foraine. `NeuralLabPortal3D` affiche sa piste et son panneau, reçoit le clic raycast de `Scene3D` et ouvre `neuro/index.html` dans un panneau plein écran. Il conserve le cadrage de la ville ; `app3d.js` suspend la simulation et le rendu de la ville tant que le laboratoire est ouvert. Le retour conserve la session du laboratoire en pause et restaure la ville sans toucher à son état Pause. Les messages sont acceptés uniquement depuis la fenêtre enfant attendue et les géométries reçues sont bornées et vérifiées. Aucun état de population n'est injecté dans le trafic urbain.

Le laboratoire reprend le noyau de l'exemple de cours 9b dans `neuro/core/`, les huit générateurs et les interfaces de réglage, résultats, banque, import/export et courses. Ces fichiers sont distribués localement ; ils ne chargent pas le dépôt de cours. Le moteur p5 n'est pas nécessaire : `Vector2.js` fournit les opérations de projection nécessaires aux rayons, portes et métriques.

`NeuralCar3D extends YUKA.Vehicle` porte le cerveau TensorFlow, les capteurs et les résultats. Son unique comportement est `NeuralSteering3D extends YUKA.SteeringBehavior`, qui calcule une force bornée à partir du réseau ; aucun suivi de chemin, maintien sur route ou correction géométrique n'aide la conduite. `Vehicle.update(1/60)` de Yuka est appelé une seule fois par pas. Les unités par pas de 9b deviennent des unités par seconde pour Yuka : vitesse ×60 et accélération ×3600 ; la projection `pos/vel` ne fait qu'observer l'état Yuka pour conserver les règles et cerveaux de 9b. Les portes servent exclusivement à la fitness et aux tours. `Boundary` hérite aussi de Yuka.Vehicle.

`CircuitView3D` observe les positions et rotations Yuka avec Three.js et des meshes instanciés. L'échelle visuelle est 0,055 unité de ville par pixel de simulation ; redimensionner ou tourner la caméra ne change pas la physique. La session utilise un pas fixe, évolue par générations, exige trois tours pour chaque voiture et classe un circuit tuant au quatrième échec de tentative. Les voitures du laboratoire sont évaluées indépendamment, sans collision entre elles. Les règles de conservation et d'essais figurent dans `neuro/README.md`.

TensorFlow.js 4.20.0 est chargé uniquement à la première ouverture du laboratoire, avec le backend CPU. Les modèles et ressources de piste sont libérés à leur remplacement. Les tests emploient les vrais Yuka et TensorFlow locaux, dont une simulation physique de 24 voitures réussissant trois tours avec le cerveau exemple de 9b. La bibliothèque Yuka et les classes de trafic existantes restent inchangées.

Le jeu est entièrement autonome. `index.html` charge les scripts classiques dans leur ordre de dépendance et les deux bibliothèques locales. `app3d.js` relie les commandes HTML et clavier à `World3D` et `Scene3D`. Les tests chargent ces mêmes fichiers avec les vrais moteurs, sans réseau ni dépendance au dépôt de cours.

## Simulation

`World3D` possède le gestionnaire Yuka, les entités et les collections spécialisées. Il prépare les voisinages, objectifs et forces de contact avant la locomotion héritée, par pas fixes de 1/60 seconde. Une entité n'est jamais mise à jour dans deux collections.

`TrafficVehicle3D`, `Bus3D`, `TownPerson3D`, `Robber3D`, `IncidentCar3D`, `ResponseCar3D` et les drones héritent de Vehicle. Les bâtiments, boutiques, arbres, abribus et autres entités statiques en héritent aussi. Les anciennes classes de serpent 3D restent des composants de référence utilisés par les tests ; le jeu utilise des bus rigides.

## Comportements et contacts

Le suivi, le maintien sur le chemin, wander, arrivée, séparation, dépassement, alignement, cohésion et poursuite sont des forces distinctes. `WeightedSteering3D` compose les forces ; Yuka conserve la locomotion. `TeacherAvoidance3D` adapte l'algorithme pédagogique, comparé aux fixtures locales.

`CollisionSafety3D` anticipe les obstacles et les bords ; son choix coûteux de passage reste valable au plus 80 ms sous conditions de proximité. `TrafficSteering3D` consomme une force planifiée une seule fois. `TrafficContacts3D` prépare les contraintes communes entre véhicules et personnes, obstacles statiques et bords à chaque pas.

`CitySolids3D` décrit les empreintes du décor par rectangles orientés et cercles, indépendamment des meshes. Une boutique possède un volume complet pour les véhicules et des murs laissant une porte aux personnes. Les voyageurs en attente ont un volume tant qu'ils sont présents.

## Ville et missions

`CityMap3D` possède quartiers, rues et entités statiques. `StreetNetwork3D` choisit les objectifs par Dijkstra, exclut les rues fermées et pénalise les tronçons portant des obstacles. `StreetNavigation3D` suit ces objectifs avec Arrive, sélection locale de voie libre et espacement de convoi. Les points du graphe ne déplacent jamais directement les entités.

`BusMission3D` et `BusService3D` gèrent arrêts, freinage, portes, embarquement et score. Le service est suspendu pendant une déviation. `CityIncident3D` gère approche, braquage, embarquement, poursuite et fin ; il déploie les barrières seulement après évacuation et vérification des marges de freinage. Les voitures de police composent navigation et Pursuit, avec départs espacés. Les références aux meneurs retirés sont libérées.

## Rendu

`Scene3D`, `CityView3D`, `CityLifeView3D`, `CityActorsView3D` et `CityAtmosphere3D` dessinent la simulation. `VehicleModel3D` et `VehicleVisualState3D` animent habitacle, roues et volant à partir du déplacement réel, sans modifier l'entité. `VehicleMirrors3D` réalise des vues arrière à cadence limitée. `VehicleCamera3D` gère les caméras ; retirer un véhicule suivi restaure la vue libre.

## Outils et tests

`npm test` utilise uniquement Node.js et les bibliothèques locales. Les fixtures pédagogiques sont autonomes et immuables ; leurs chemins ne sortent pas du dépôt. `tests/distribution.test.mjs` vérifie les ressources HTML, l'absence de référence externe de fichiers et le serveur local. `scripts/serve.mjs` sert uniquement ce dossier sur l'interface locale ; le navigateur peut aussi ouvrir directement `index.html`.


## Stade et arcades

`StadiumVenueView3D` compose les tribunes, entrées, stands, éclairages, spectateurs instanciés et parking autour du portail, partagé avec `neuro/CircuitView3D`. Les accessoires restent du rendu de `VenueProp3D`, une sous-classe statique de Yuka.Vehicle ; leurs volumes sont intégrés aux solides de la ville.

`VenueLife3D` possède quatre `VenueCar3D` et quatre `VenueVisitor3D`, hors du gestionnaire du trafic. Un seul contrôleur applique leur locomotion Yuka à pas fixe. Arrive et séparation pilotent les visiteurs, deux couloirs évitent les face-à-face au portail ; un seul véhicule quitte le parking à la fois. Aucun déplacement correctif pendant la locomotion : seul le retour masqué hors scène réinitialise la position. Les solides suivent les positions et la visibilité.

`Attractions3D` gère les bornes et la caméra de cabine avec interpolation persistante. Les mini-jeux d’origine `ArcadeSession`/`ArcadeView`, leurs entités Yuka et `NeuralPolicy` sont réutilisés sans modification par `games/classic`, en complément des jeux p5. `RaceResult` reste utilisé par le laboratoire neuronal : seuls les finisseurs valides sont classés, avec traitement des égalités.

Validation : `npm test`, notamment `tests/arcade.test.mjs`, `tests/venueLife.test.mjs` et `tests/neuroPortal.test.mjs`. Les bibliothèques et tous les fichiers nommés `vehicle.js` restent intacts.


## Ambiance enregistrée

`CityAudio3D` observe le monde et la caméra sans modifier les entités. Quatre lecteurs HTMLAudio créés au premier clic jouent uniquement des enregistrements locaux (rue, foule, klaxon, sirène), à vitesse et hauteur d’origine. Aucun AudioContext, oscillateur ou bruit généré. Les boucles rue/foule sont mélangées avec une transition de volume progressive ; la sirène est conditionnée par les policiers, le klaxon est unique et espacé de 8 à 16 secondes. Distance à la caméra et présence des passants contrôlent seulement le volume. Le lecteur ne prétend pas synchroniser chaque voiture audible d’un enregistrement avec un véhicule précis de la simulation.

Pause, masquage et dialogues arrêtent les quatre lecteurs, conservent le temps des ambiances et annulent le klaxon interrompu ; aucun rattrapage des événements au retour. Le volume général est borné ; `dispose()` retire les sources. Sources originales, auteurs, licences et SHA-256 sont conservés dans `assets/audio/city/sources.json`. Le serveur local sert Ogg et MP3 avec leurs types audio. Tests : `tests/cityAudio.test.mjs` (lectures, pauses, erreurs, licences et fichiers), plus navigateur réel par HTTP et ouverture directe.


## Bornes des comportements p5

`BehaviorArcadeCatalog` décrit huit bornes : cinq identifiants de scénario `1-Seek`, le serpent de `5-3-PathFollowingComplex` et les deux bornes classiques. `Attractions3D` crée huit `ArcadeCabinet3D extends YUKA.Vehicle` espacées devant la fête foraine et inscrit leurs volumes dans les solides. Le raycast ouvre le scénario associé ; le menu et le bouton « Voir les 8 bornes » complètent la sélection.

`EmbeddedBehaviorGame` possède un seul iframe, ne charge qu’un document et n’accepte des messages que de cette fenêtre, pour le jeu et le numéro de session courants. Chaque ouverture/reprise à zéro change le numéro de session : les messages retardés d’une instance précédente sont ignorés. Fermer navigue vers `about:blank`, restaure le focus et la ville. Le portail neuronal et les bornes s’excluent mutuellement.

`games/seek` et `games/snake` sont des copies autonomes des jeux de cours, avec leurs p5 et ressources locales. Leurs classes `Vehicle` p5 ne sont pas remplacées par Yuka ; l’iframe isole ces moteurs. `games/provenance.json` conserve les empreintes originales ; les scripts d’exécution, notamment les deux `vehicle.js`, sont inchangés. Seuls les points d’entrée ajoutent `arcadeBridge.js`/CSS et des copies de tests ont été actualisées. Les originaux du dépôt de cours ne sont jamais chargés à l’exécution ni modifiés.

`BehaviorArcadeBridge` attend le vrai setup p5, sélectionne puis verrouille le scénario, relaie réglages et ajout de serpent. La pause utilise `noLoop()` et suspend les contextes sonores ; les trois boutons d’activation sonore sont neutralisés pendant la pause, y compris si les réglages restent ouverts ; la reprise remet l’horloge Seek à l’heure courante avant `loop()`. Le masquage de l’onglet utilise le même mécanisme en conservant la pause explicite. Le déchargement ferme les contextes et arrête les captures. Aucun steering ni locomotion n’est recopié dans cet adaptateur. Les tests couvrent les forces des jeux importés, leurs limites, le catalogue, les ressources/provenance, les messages invalides, le cycle pause/reprise et les huit colliders/raycasts réels Three/Yuka.


## Retour des deux bornes classiques

`games/classic/ClassicArcade` héberge le moteur d’origine dans le même iframe exclusif que les jeux p5. La borne `race` propose course chrono et défi `ghost`, la borne `balloons` propose le tir aux ballons. Les contrôles clavier/tactiles, scores, combos et records `city-arcade-records` sont conservés. Les messages utilisent les mêmes contrôles de fenêtre, identifiant et session ; `behavior-arcade-state` synchronise la pause déclenchée au clavier avec le bouton parent. Recommencer conserve le mode natif sélectionné. À la fermeture, l’animation est annulée et l’iframe déchargé. Huit empreintes solides restent espacées devant la fête foraine. Aucun changement aux forces ni à la locomotion des jeux.


Le sol urbain utilise une seule surface de Scene3D, habillée par CityActorsView3D avec mipmaps et filtrage anisotrope. Aucun second plan vert ne concurrence le pavage dans les vues éloignées. CityView3D affiche le panneau Mission bus uniquement pendant une tournée ou son bilan final ; aucun bandeau de mission ne reste affiché au repos.
