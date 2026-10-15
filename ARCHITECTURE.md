# Architecture — Petite ville 3D

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
