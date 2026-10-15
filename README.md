# Petite ville 3D

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

Validation de l'extraction : **101 tests réussis**, sans échec ni test ignoré, avec `npm test`. Edge/WebGL confirme l'ouverture directe du jeu, 56 ressources toutes locales, le braquage complet avec le trafic, les barrages, la sortie et le retrait des véhicules, ainsi que l'habitacle sur un écran de 390 pixels. Les 17 tests de l'ancien exemple p5 restent dans le dépôt de cours.

Le dépôt contient ses propres références de test : aucun fichier du dépôt de cours n'est nécessaire. Voir [ARCHITECTURE.md](ARCHITECTURE.md), [AGENTS.md](AGENTS.md) et [CREDITS.md](CREDITS.md).

## Organisation

- `index.html`, `style.css` : interface et point d'entrée.
- `3d/` : entités, comportements, contrôleurs de scène et rendu.
- `libraries/3d/` : Three.js 0.160.1, Yuka 0.7.8 et leurs licences.
- `tests/` : tests de simulation, rendu, interface et distribution autonome.
- `scripts/serve.mjs` : serveur local facultatif, sans dépendance.

Ce dépôt contient seulement le jeu de la petite ville et ses outils. Les exercices p5.js du dépôt de cours n'en font pas partie.
