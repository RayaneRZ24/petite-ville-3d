# Sources et licences

## Laboratoire neuronal

`neuro/core/` reprend les modules de l'exemple `9b - Voiture suit circuit version 2` du dépôt de cours, étendus lors du laboratoire de voitures apprenantes (circuits, réseau configurable, génération, validation des trois tours, banque et interface). Le rééchantillonnage de `Track.js`, le réseau TensorFlow et l'algorithme génétique dérivent de l'exemple du professeur. Les fichiers du noyau sont copiés dans ce projet autonome et n'accèdent à aucun dossier externe.

`NeuralCar3D`, `NeuralSteering3D`, `Vector2`, `Boundary`, `CircuitView3D` et le portail de ville adaptent ce noyau au moteur Yuka et au rendu Three.js. Le pilote exemple provient d'un entraînement réel de 24 voitures sur l'ovale (une couche de 8 neurones, graine 42, réussite à la génération 14), revérifié avec la locomotion Yuka.

**TensorFlow.js 4.20.0** : Google et contributeurs, distribution locale inchangée `libraries/3d/tf.min.js` provenant de `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js`. Licence Apache 2.0 conservée dans `libraries/3d/LICENSE-TENSORFLOW`. Yuka et Three.js restent inchangés.

## Projet

La petite ville a été développée à partir de l'exemple `5-3-PathFollowingComplex` du fork [RayaneRZ24/SteeringBehavioursM2IA2_Casa_2026_2027](https://github.com/RayaneRZ24/SteeringBehavioursM2IA2_Casa_2026_2027), fondé sur le dépôt pédagogique de [Michel Buffa](https://github.com/micbuffa/SteeringBehavioursM2IA2_Casa_2026_2027). Les ajouts de ville, missions, caméras, commerces et intervention ont ensuite été développés dans ce projet.

La référence conceptuelle est Craig W. Reynolds, « Steering Behaviors for Autonomous Characters », GDC 1999.

## Bibliothèques fournies

- **Three.js 0.160.1** : auteurs Three.js, licence MIT conservée dans `libraries/3d/LICENSE-THREE`.
- **Yuka 0.7.8** : Michael Herzog et contributeurs, licence MIT conservée dans `libraries/3d/LICENSE-YUKA`.

Les distributions locales ne sont pas modifiées. Le jeu ne charge aucun CDN.

## Références de tests pédagogiques

Deux copies sont incluses uniquement pour comparer les algorithmes avec le code fourni du professeur :

- `tests/fixtures/teacher-avoidance.js` : copie inchangée de `6-ObstacleAvoidance/vehicle.js`.
- `tests/fixtures/teacher-boids.js` : copie inchangée de `7-Boids/boids.js`.

Provenance : dépôt pédagogique ci-dessus, état de travail lors de l'extraction ; commit de base `3a05555c59091a6287585fbf789bcb06f579c38e`. Ces fichiers ne sont pas chargés par le jeu. Ils évitent une dépendance aux autres dossiers de cours. Aucune nouvelle licence n'est attribuée au code pédagogique ni aux ajouts du projet.


## Enregistrements de ville

Les quatre fichiers sont conservés sans modification sonore. Les fichiers Ogg sont les distributions Commons ; le MP3 de klaxon est l’aperçu haute qualité Freesound de l’enregistrement CC0. Aucun son n’est généré par le jeu.

| Fichier local | Enregistrement / auteur | Source et licence |
| --- | --- | --- |
| `assets/audio/city/traffic.ogg` | Sunday in the city street noise3 — cori | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sunday_in_the_city_street_noise3.ogg), domaine public (PDSounds) |
| `assets/audio/city/crowd.ogg` | Festival Concert People Crowd — stephan | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Festival_concert_people_crowd.ogg), domaine public (PDSounds) |
| `assets/audio/city/siren.ogg` | American police siren in Washington DC — lezer | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:American_police_siren_i.ogg), domaine public (PDSounds) |
| `assets/audio/city/horn.mp3` | car horn.wav — keweldog | [Freesound, son 182474](https://freesound.org/people/keweldog/sounds/182474/), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

Les pages Commons indiquent une mise dans le domaine public par leurs auteurs, avec autorisation d’usage sans condition là où cet abandon n’est pas possible. Le manifeste `assets/audio/city/sources.json` conserve les URL exactes et les empreintes des téléchargements.


## Jeux de cours intégrés aux bornes

`games/seek` reprend les cinq scénarios du dossier `1-Seek` et `games/snake` le serpent du dossier `5-3-PathFollowingComplex` du dépôt de cours cité plus haut. Les scripts du jeu et leurs classes `Vehicle` sont conservés à l’identique ; `games/provenance.json` contient les empreintes de l’import. Les adaptations concernent les pages d’entrée, l’hébergement/pause et des copies de tests devenues obsolètes. Les références The Coding Train / Daniel Shiffman et Craig Reynolds sont conservées dans les fichiers originaux. Aucune nouvelle licence n’est attribuée aux ajouts de l’utilisateur ni au code pédagogique.

Les deux jeux incluent **p5.js 1.7.0**, Processing Foundation et contributeurs, distribution inchangée. Licence LGPL-2.1 conservée dans `games/LICENSE-P5.txt` ; code source correspondant : https://github.com/processing/p5.js/tree/v1.7.0 . La licence WebAudiox fournie est conservée dans `games/seek/libraries/webaudiox/MIT-LICENSE.txt`. L’échantillon Monster Kill est repris du fichier local fourni par l’utilisateur avec son jeu, avec la provenance déjà documentée dans `games/seek/README.md`.
