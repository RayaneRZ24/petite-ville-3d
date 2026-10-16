# Petite ville 3D

## Nouveau : circuit neuronal 3D

Cliquer sur **« Circuit neuronal · entraînement & courses »** en haut à droite. Pour le trouver dans la ville, utiliser **« Voir le circuit neuronal »** dans les réglages, puis cliquer sur la piste ou son panneau. Le laboratoire s'ouvre avec un vrai rendu 3D et des voitures Yuka pilotées par un réseau TensorFlow, reprenant le travail de l'exemple 9b.

On peut régler les rayons, l'accélération, la vitesse, la population, les couches et les neurones, choisir huit familles de pistes, entraîner des cerveaux, conserver les résultats gagnants/tuants et organiser une course avec quatre pilotes nommés. Le bouton **Retour à la ville** ou Échap ferme le panneau ; le trafic et les missions reprennent. Le laboratoire garde sa session en pause jusqu'à « Reprendre ».

Le jeu reste entièrement autonome et sans CDN. [Mode d'emploi détaillé et pilote appris importable](neuro/README.md).

Jeu de simulation autonome en JavaScript, Three.js et Yuka : une ville de huit quartiers, du trafic routier, des bus, des commerces et clients, des nuées de drones et une scène de braquage avec intervention policière.

## Jouer

Télécharger ou cloner ce dépôt, puis ouvrir **`index.html`** dans un navigateur avec WebGL. Toutes les bibliothèques sont fournies : pas d'installation, de CDN ni de téléchargement au lancement.

Pour utiliser un serveur local, avec **Node.js 22.13 ou plus récent** :

```sh
npm start
```

Ouvrir ensuite **http://127.0.0.1:8080**. Aucune commande `npm install` n'est nécessaire. Le serveur utilise uniquement les modules inclus dans Node.js et s'arrête avec Ctrl+C.

## Commandes

Ouvrir **Réglages** pour les curseurs, la sélection des véhicules et les boutons.

La ville dispose de **trois postes de contrôle maximum**, placés sur des portions droites distinctes, alignés avec la route et décalés sur le côté pour conserver un passage. Maj + clic n'en ajoute pas au-delà de cette limite. Les barricades temporaires de la mission de braquage sont indépendantes de ces postes permanents.

| Commande | Action |
| --- | --- |
| Liste voiture / bus | Choisir un véhicule et le suivre |
| `1` / `3` / `0` ou Échap | Habitacle / suivi derrière / vue libre |
| Glisser / molette | Orienter / zoomer la vue libre ; regarder dans l'habitacle en vue 1 |
| `P` / `O` | Policier d'un barrage en première / troisième personne |
| `V` / `N` | Caméra drone / drone suivant |
| `T` / `B` | Ajouter un bus / une nuée de drones |
| `M` / Espace | Démarrer la mission bus / ouvrir les portes une fois arrêté |
| `H` | Lancer le braquage de la bijouterie |
| `D` | Activer les diagnostics de steering |
| Clic sol / Maj + clic | Ajouter une voiture / un barrage si la place est libre |

**Voir la boutique** rapproche la caméra ; **Suivre la fuite** suit la voiture des personnages ; **Vue 3D · 0** retrouve le cadrage de la ville. Les raccourcis ne s'activent pas pendant la saisie dans les commandes HTML. Pause et l'onglet masqué suspendent la simulation.

## Ce que contient le jeu

- Huit itinéraires urbains, chaussées marquées, passages piétons, arbres, lampadaires, ciel, soleil, nuages et fête foraine.
- Voitures à vitesses différentes, évitement des obstacles, séparation, dépassements et collisions entre voitures, bus, piétons et décor solide.
- Habitacles avec volant animé, tableau de bord, levier, sièges, roues et rétroviseurs ; caméra embarquée et caméra drone stabilisée.
- Mission bus avec quatre arrêts, embarquement et livraison de passagers, portes et score de conduite.
- Trois boutiques et leurs clients, avec entrées par les portes et sacs d'achats.
- Braquage de **30 secondes de simulation** par trois personnages cagoulés, équipés d'accessoires d'armes stylisés ; intervention de trois voitures de police, stationnement, deux barrages et déviation des véhicules concernés. Les personnages ressortent, montent dans leur voiture et fuient vers la nouvelle sortie Est, suivis des policiers. Les véhicules disparaissent à la sortie et la scène peut être relancée.

## Développer et tester

```sh
npm test
```

Les tests utilisent le vrai Yuka et Three.js fournis, ainsi que `node:test`, sans dépendance à installer. Les tests longs vérifient une minute de circulation avec six barrages et l'intervention avec le trafic complet. Pour une vérification rapide hors de ces deux tests longs : `npm run test:quick`.

Validation de l’ensemble actuel : **295 tests**, incluant ville, laboratoire neuronal, huit bornes et comportements importés. L’audit de livraison, ses vérifications navigateur et ses limites sont consignés dans [AUDIT.md](AUDIT.md).

Le dépôt contient ses propres références de test : aucun fichier du dépôt de cours n'est nécessaire. Voir [ARCHITECTURE.md](ARCHITECTURE.md), [AGENTS.md](AGENTS.md) et [CREDITS.md](CREDITS.md).

## Organisation

- `index.html`, `style.css` : interface et point d'entrée.
- `3d/` : entités, comportements, contrôleurs de scène et rendu.
- `libraries/3d/` : Three.js 0.160.1, Yuka 0.7.8 et leurs licences.
- `tests/` : tests de simulation, rendu, interface et distribution autonome.
- `scripts/serve.mjs` : serveur local facultatif, sans dépendance.

Ce dépôt contient le jeu de la petite ville et ses outils. Les exercices p5.js du dépôt de cours ne sont pas des dépendances externes : les copies autonomes Seek et PathFollowing nécessaires aux bornes sont intégrées dans `games/`.


## Stade et bornes de tes comportements

« Voir le circuit neuronal » centre la caméra sur le stade, à côté de la fête foraine. Cliquer sa piste, ses tribunes ou son panneau ouvre le laboratoire. Les courses affichent le gagnant, son temps et le podium. Le parking et ses quatre visiteurs gardent leur cycle d’arrivée, visite et départ.

« Voir les 8 bornes » rapproche la caméra et replie les réglages de la ville. Cliquer une borne ouvre directement son jeu. « 🎮 Jouer aux arcades » donne aussi accès aux huit boutons du même panneau :

1. Poursuite et réapparition des vaisseaux (`pursuit`).
2. Fuite et duplication (`endurance`).
3. La cible réapparaît (`targetRespawn`).
4. Les vaisseaux fuient (`flee`).
5. Missile, cibles et leurres (`missile`).
6. Serpent, suivi de chemin, séparation et wander (`snake`, jeu 5.3).
7. Course chrono / défi contre le cerveau entraîné (`race`, avec choix interne `ghost`).
8. Tir aux ballons (`balloons`).

Les cinq premières bornes partagent une seule copie de `1-Seek` dans `games/seek`. La sixième utilise `games/snake`, importée de `5-3-PathFollowingComplex`. Tous les fichiers et bibliothèques sont locaux : aucun serveur du dépôt de cours ni site externe n’est nécessaire. Les copies de `vehicle.js` et les scripts de comportement sont intacts ; les fichiers de départ du dépôt de cours restent inchangés.

Le scénario de la borne est présélectionné et verrouillé, ses réglages d’origine restent accessibles via « Réglages du jeu ». Pause/Reprendre arrête l’animation et le son ; Recommencer remet le jeu à zéro. La ville et son ambiance sont suspendues pendant le jeu. Fermer la borne décharge son iframe et coupe ses sons. Échap ferme d’abord les réglages Seek ouverts, puis revient à la ville. D active le debug ; pour le serpent, T ou « + Serpent » en ajoute un, et glisser sur le canvas crée des véhicules. Le bouton « Monter dans la grande roue » et sa caméra restent disponibles dans la ville.

Les deux bornes d’origine sont de nouveau proposées à côté des six bornes de comportements, via `games/classic`. Course manuelle et défi IA partagent la borne Turbo City ; Ballon Pop conserve ses 30 secondes, combos et records. Flèches/ZQSD/WASD ou boutons tactiles pour conduire ; cliquer les ballons pour tirer. Les records locaux précédents sont réutilisés. Recommencer conserve le mode course/IA sélectionné. Le laboratoire neuronal reste accessible séparément.

Tests : `npm test` inclut la ville, l’hébergement et les 128 tests des jeux importés. `npm run test:behaviors` vérifie uniquement les bornes et les comportements importés. Dans les copies de tests Seek, les doubles audio/DOM et les attentes relatives aux nouveaux sliders, marges de wrap et contextes VM ont été remis en cohérence ; aucun comportement n’a été changé pour faire passer les tests.

## Sons de la ville

Dans Réglages → Ambiance sonore, cliquer « Activer les sons de la ville », puis régler le volume. Quatre véritables enregistrements locaux remplacent toute la synthèse précédente : circulation et oiseaux dans une rue, conversations de foule, klaxon de voiture et sirènes de police enregistrées dans la rue. Les conversations sont celles d’une foule de festival germanophone, pas des dialogues français scénarisés. Sources et licences : `assets/audio/city/sources.json` et `CREDITS.md`.

Lecture HTMLAudio, sans oscillateurs, musique générée ni transposition. La foule devient plus audible près des passants et du stade ; les sirènes ne jouent qu’en présence des voitures de police en intervention. Les klaxons sont espacés de 8 à 16 secondes, sans superposition.

Aucun son avant activation explicite. Pause, onglet masqué, laboratoire et arcade suspendent l’ambiance ; les ambiances reprennent leur position au retour, sans relancer un klaxon interrompu. Les quatre fichiers sont distribués dans le projet : aucun téléchargement externe pendant le jeu, aucun microphone, fonctionnement aussi à l’ouverture directe de `index.html`.
