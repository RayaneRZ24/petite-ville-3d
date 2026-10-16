# Circuit neuronal 3D

## Pilote universel : huit familles validées

Le pilote par défaut est désormais **« Pilote universel · 8 circuits »**. C'est un seul réseau (8 entrées, 8 neurones cachés, 2 sorties), avec les mêmes poids sur toutes les pistes. Ouvrir le laboratoire, choisir un circuit et cliquer sur **Tester le cerveau figé**. Les paramètres du pilote sont chargés automatiquement, dont une vitesse maximale de 3 et sept rayons de 180 pixels. Les pilotes personnels et l'ancien pilote de l'ovale sont conservés.

L'entraînement génétique a évalué douze candidats pendant trois générations sur **seize pistes** : les huit familles avec graine 42, largeur 90 et complexité 12, puis les huit variantes de graine 73, largeur 75 et complexité 40. La fitness combine la progression minimale sur ces pistes, la moyenne et la durée : réussir seulement l'ovale ne suffit pas à sélectionner un cerveau. Les départs sont légèrement décalés entre générations. La structure du réseau impose une symétrie gauche/droite et des caractéristiques cachées par capteur ; les coefficients de direction, le gain caché et la vitesse sont sélectionnés et mutés d'après les simulations, sans position du chemin en entrée ni force de suivi de route.

Le champion est ensuite validé avec **24 copies du même cerveau sur chacune des huit familles**, trois tours par voiture, dès le premier essai, sans mutation. Les positions et rotations sont mises à jour par Yuka. La sélection utilise une inférence sigmoid accélérée équivalente numériquement à TensorFlow et filtre seulement les murs hors de portée des rayons. La validation utilise le vrai TensorFlow avec des inférences groupées, sans changer le nombre de locomotions, les collisions ni les règles de franchissement ; les tests vérifient aussi l'inférence individuelle du jeu sur les huit pistes.

Les résultats détaillés, graines, réglages, historique et poids sont conservés dans **[`sauvegardes/entrainement-multicircuits.json`](sauvegardes/entrainement-multicircuits.json)**. Les huit contextes gagnants affichent la même empreinte du cerveau. La validation complète porte sur les huit pistes de graine 42, largeur 90, complexité 12 ; les variantes ont servi à la sélection sur un tour. Cela ne garantit pas toute combinaison possible de graines, largeurs et complexités, ni une vitesse modifiée après chargement.

Pour reproduire la campagne :

```sh
node neuro/train-multi.cjs
```

La commande conserve le pilote livré si la validation échoue ; seules huit réussites unanimes autorisent la publication locale du nouveau modèle. L'interface **Démarrer l'entraînement** reste le mode d'apprentissage d'une piste de 9b ; l'apprentissage multi-pistes s'exécute par cette commande. Le contrôle de chargement refuse toute campagne multi-circuits dont une piste a échoué ou a nécessité une relance.

## Entraînement sauvegardé dans le projet

L'ancien entraînement sur l'ovale reste disponible : **24 voitures, trois tours chacune, réussite à la génération 14**. Son pilote **« Pilote entraîné · Ovale »** reste conservé dans les banques où il a déjà été chargé et dans son fichier importable. Le chargement automatique privilégie maintenant le pilote universel, sans écraser les modèles, noms et essais personnels déjà présents ; une banque pleine n'est pas écrasée.

Le fichier durable et importable est **[`sauvegardes/entrainement-oval.json`](sauvegardes/entrainement-oval.json)**. Il contient les poids, réglages, historique de progression, circuit exact, résultats d'entraînement et de relecture. La géométrie est l'ovale de graine 42, largeur 90 et complexité 12 ; le réseau a 7 rayons de 180 pixels et une couche de 8 neurones. Cette validation concerne l'ovale, pas les autres tracés.

Pour reproduire l'entraînement sans rendu graphique, depuis la racine du projet :

```sh
node neuro/train.cjs oval
```

La commande utilise les mêmes classes Yuka, capteurs, inférences TensorFlow et règles que le jeu. Elle entraîne depuis zéro, rejoue le meilleur cerveau, puis sauvegarde le résultat. Une réussite validée met aussi à jour les données de pilote livrées au laboratoire ; une campagne échouée reste identifiée comme telle et ne remplace pas le pilote préchargé. Les anciennes sauvegardes de même famille sont copiées en `.previous` avant remplacement.

Ce laboratoire fait partie du jeu autonome Petite ville 3D. Ouvrir le jeu et cliquer sur **Circuit neuronal** en haut à droite, ou **Voir le circuit neuronal** dans les réglages puis sur la piste ou le panneau. Le circuit est situé à côté des quartiers. Le laboratoire s'ouvre en plein écran ; la ville se suspend. Retour à la ville ou Échap rétablit le cadrage et le trafic. La session d'apprentissage reste chargée et en pause : « Reprendre » la continue.

## Entraîner et comparer

1. Choisir une famille parmi ovale, stadium, Grand Prix, chicanes, trèfle, côte, virages carrés ou aléatoire. Régler graine, largeur et complexité. L'ovale et le stadium ont une forme fixe ; leur graine ne change pas la géométrie.
2. Choisir 1–19 rayons, une longueur de 40–600 pixels de simulation, l'accélération maximale et la vitesse. Le monde affiché en 3D a une échelle fixe de 0,055 : caméra et taille de fenêtre n'affectent pas les mesures.
3. Choisir 0–5 couches cachées et 2–64 neurones dans chaque couche. Les entrées sont les distances normalisées des rayons et la vitesse ; les sorties sont le braquage et la vitesse souhaitée. Choisir population, taux de mutation et budget de générations par tentative.
4. Cliquer sur **Démarrer l'entraînement**. Les mutations et la sélection font évoluer les poids. Les réglages modifiés s'appliquent explicitement au redémarrage ; une interruption manuelle ne compte pas comme échec.
5. Sauvegarder le meilleur cerveau avec un nom. Régénérer une piste puis **Tester le cerveau figé** pour mesurer sa généralisation : le test restaure ses paramètres et ne modifie jamais ses poids. Changer l'architecture demande un nouvel entraînement.

La réussite exige **trois tours pour toute la population de la même génération**. Les portes doivent être franchies dans l'ordre et dans le bon sens ; les premiers arrivés attendent les autres. Les bordures utilisent une collision continue sur tout le déplacement. Une voiture sans progression pendant 600 pas est éliminée ; chaque génération a aussi un temps maximal.

Une tentative d'entraînement dispose du budget de générations choisi. Si aucune génération ne réussit unanimement, elle compte comme un échec ; l'évolution continue jusqu'à la réussite ou au quatrième échec. Un test figé relance des copies du même cerveau avec des décalages initiaux reproductibles ; une seule voiture éliminée rend l'unanimité impossible. **Au quatrième échec**, le contexte est classé tuant et la session s'arrête. Les gagnants ont au moins une réussite unanime. Les contextes sont distingués par géométrie, paramètres et empreinte du cerveau ou lignée d'apprentissage.

Les voitures apprennent réellement : aucune force de suivi du chemin, maintien sur route ou conduite manuelle ne les assiste. Les portes ne servent qu'à mesurer la progression et la fitness. Une architecture ou une graine peut échouer ; aucun succès n'est garanti sur toutes les pistes.

## Courses et conservation

Choisir **Course de pilotes**, personnaliser les quatre noms et leurs cerveaux sauvegardés, puis lancer la course. Les réseaux doivent utiliser le même nombre de rayons ; les couches peuvent différer. Un choix vide utilise un cerveau aléatoire non entraîné. La course ne mute pas les modèles et n'alimente pas l'archive d'apprentissage. Comme dans 9b, les voitures du laboratoire sont évaluées indépendamment : elles rencontrent les bordures mais ne se percutent pas entre elles.

La banque conserve 10 cerveaux ; l'archive conserve 40 contextes et 12 comptes rendus récents par contexte, dans le stockage local. Exporter pour garder une campagne complète ou transférer les modèles. L'import JSON vérifie les poids, architectures et résultats avant remplacement ; exporter d'abord sa campagne personnelle. Un message avertit si le stockage est plein ou indisponible. Le serveur local `npm start` donne une origine de stockage stable ; avec `file://`, la conservation dépend du navigateur.

Pour une démonstration immédiate, **Importer** [`examples/pilote-ovale.json`](examples/pilote-ovale.json), sélectionner **Nora — ovale appris**, choisir l'ovale de graine 42, largeur 90, complexité 12, et tester le cerveau figé. Cela remplace la banque et l'historique : exporter d'abord ses données. Ce cerveau réellement entraîné dans 9b réussit aussi trois tours avec les 24 voitures Yuka ; les tests et le navigateur l'ont vérifié. Cette réussite ne valide pas les autres circuits.

Glisser et utiliser la molette pour déplacer la caméra ; **Vue dessus / perspective** change le cadrage. L'accélération du temps ajoute des pas dans le budget disponible pour garder l'interface réactive. Les capteurs du leader et les portes sont affichables. Fermer le laboratoire et masquer l'onglet suspendent l'apprentissage.

## Architecture et tests

`NeuralCar3D` hérite de `YUKA.Vehicle`. `NeuralSteering3D` calcule la force issue du réseau ; Yuka effectue une locomotion par pas fixe de 1/60 s. La conversion des unités conserve la dynamique de 9b : vitesse ×60 et accélération ×3600. Le noyau `core/` réutilise TensorFlow, générations, géométrie, résultats et interface de 9b. `Vector2.js` est une projection de calcul, sans moteur p5. `CircuitView3D` observe les entités, sans modifier leurs positions. Yuka et Three.js sont distribués inchangés.

Depuis la racine du jeu :

```sh
npm test
```

Tests ciblés : `node --test tests/neuro.test.mjs tests/neuroPortal.test.mjs`. Ils couvrent forces, vraie locomotion Yuka, raycasting, architecture, inférence et mutation TensorFlow, tours, classement, pause, courses nommées, mémoire, portail, ressources locales et relecture physique des 24 pilotes sur trois tours. Aucun package à installer.
