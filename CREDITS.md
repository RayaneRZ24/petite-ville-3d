# Sources et licences

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
