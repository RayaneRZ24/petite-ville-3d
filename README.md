# Petite ville 3D — comportements autonomes et apprentissage neuronal

> **Pour jouer dans de bonnes conditions :** si vous utilisez la version en ligne, une connexion Internet stable est recommandée pour charger correctement toutes les ressources. Une connexion lente ou instable peut allonger ou interrompre le chargement. Une fois les ressources chargées, la fluidité et les FPS dépendent surtout des performances de l’appareil et de son processeur graphique. Après téléchargement, le jeu peut aussi être lancé localement sans connexion Internet.

Projet réalisé dans le cadre du module **IA générative du master IA2 en double diplomation avec l’Université Côte d’Azur**. Une ville interactive réunit les steering behaviors étudiés en cours, des missions et un circuit de voitures pilotées par réseaux de neurones.

**Pour découvrir et évaluer le projet : lancer le jeu, puis suivre le parcours de 15 minutes ci-dessous.** Les boutons cités portent les mêmes noms dans l’interface. Toutes les bibliothèques, les jeux intégrés, les sons et les cerveaux de démonstration sont inclus dans ce dépôt.

- [Lancer le jeu](#lancer-le-jeu)
- [Découvrir le projet en 15 minutes](#decouverte)
- [Repérer les comportements étudiés](#comportements)
- [Explorer les huit bornes](#bornes)
- [Tester, entraîner et sauvegarder un cerveau](#laboratoire)
- [Commandes et conseils](#commandes)
- [Code, tests et références](#code)

## Lancer le jeu

Télécharger le dépôt avec **Code → Download ZIP**, puis décompresser le dossier, ou le cloner :

```sh
git clone https://github.com/RayaneRZ24/petite-ville-3d.git
cd petite-ville-3d
```

Ouvrir **`index.html`** dans un navigateur disposant de WebGL. Pour découvrir les commandes au clavier, utiliser de préférence un ordinateur avec souris.

Pour une origine de sauvegarde stable, le serveur local fourni est recommandé. Avec **Node.js 22.13 ou plus récent**, depuis le dossier du projet :

```sh
npm start
```

Ouvrir **http://127.0.0.1:8080**. Aucune commande `npm install` n’est nécessaire. Ctrl+C arrête le serveur. Le jeu ne dépend d’aucun CDN ni du dépôt des exercices de cours.

<a id="decouverte"></a>

## Découvrir le projet en 15 minutes

La durée est indicative : terminer toute la tournée du bus ou un nouvel entraînement peut demander davantage de temps. Le parcours permet d’abord de voir les fonctionnalités, puis de revenir approfondir chacune.

### 1. Observer la ville et entrer dans un véhicule — 2 min

1. Ouvrir **Réglages** à gauche. Glisser sur la scène pour tourner autour de la ville et utiliser la molette pour zoomer.
2. Observer les voitures à différentes vitesses : elles suivent les rues, s’espacent, dépassent et contournent les barrières. Les bâtiments, arbres, abribus et véhicules possèdent des volumes solides. Observer aussi les clients entrer dans les boutiques et ressortir avec leurs achats.
3. Dans **Choisir une voiture ou un bus**, sélectionner un véhicule, puis cliquer sur **1ère personne · 1**. Observer le volant animé, le tableau de bord, les sièges et les rétroviseurs ; glisser pour regarder dans l’habitacle.
4. Essayer **3ème personne · 3**, puis **Vue 3D · 0** pour retrouver la vue générale.

**À observer :** les véhicules de la ville conduisent de manière autonome. La vue embarquée permet de les accompagner ; la conduite manuelle est proposée dans la borne de course.

### 2. Faire varier une nuée de drones — 1 min

1. Cliquer sur **Caméra drone · V**, puis **Drone suivant · N** pour changer de drone suivi.
2. Dans **Nuées de drones · Boids**, modifier un seul curseur à la fois : **Alignement**, **Cohésion**, puis **Séparation**. Comparer la direction commune, le regroupement et l’espacement.
3. Activer le debug avec **D** pour voir les liens entre voisins. **+ Nuée · B** ajoute un groupe ; **Retirer les nuées** les supprime. Revenir à la vue générale et désactiver le debug après l’essai.

**À observer :** le mouvement collectif résulte de trois règles locales distinctes, composées avec des poids réglables.

### 3. Participer à la mission bus — 2 min

1. Cliquer sur **Mission bus · M**. Un bus est sélectionné et suivi automatiquement ; le bandeau inférieur indique l’arrêt à rejoindre, les voyageurs et le score.
2. Attendre qu’il approche de l’arrêt et termine son freinage, puis cliquer sur **Portes · Espace**. Les portes ne s’ouvrent que lorsque le bus est suffisamment proche et presque immobilisé.
3. Laisser les portes ouvertes pendant les **3 secondes d’embarquement**, puis observer le départ vers l’arrêt suivant. Répéter aux arrêts suivants pour terminer la tournée.

**À observer :** arrivée avec ralentissement, arrêt, montée/descente des passagers et score de conduite. La ligne dessert quatre arrêts ; un cinquième passage termine la livraison des derniers voyageurs. Les curseurs **Suivi du bus**, **Séparation du bus** et **Wander du bus** permettent aussi d’examiner la composition des comportements, de préférence hors du service à l’arrêt.

### 4. Déclencher une intervention policière — 2 min

1. Revenir à **Vue 3D · 0**. Dans **Commerces · intervention**, cliquer sur **Voir la boutique**, puis **Lancer le braquage · H**.
2. Suivre les indications de l’interface : trois personnages entrent dans la boutique, trois voitures de police arrivent et deux barrages temporaires ferment la rue lorsque les conditions de sécurité le permettent. Le trafic concerné prend une déviation.
3. Le braquage dure **30 secondes de simulation après l’entrée dans la boutique**. À la sortie des personnages, cliquer sur **Suivre la fuite** : leur voiture est poursuivie jusqu’à la sortie Est, puis les véhicules de l’intervention disparaissent. La scène peut être relancée après sa fin.
4. Essayer aussi **Policier 1ère · P** et **Policier 3ème · O** : ces vues utilisent les policiers des postes de contrôle permanents.

**À observer :** enchaînement d’états, arrivée, poursuite prédictive, évitement et changement d’itinéraire. Les trois postes permanents sont distincts des deux barrages temporaires de l’intervention. Pour examiner tranquillement la mission bus et l’intervention, les lancer successivement.

### 5. Visiter le stade, la fête foraine et les bornes — 3 min

1. Cliquer sur **Voir le circuit neuronal** : la caméra montre le stade voisin de la fête foraine. Observer les tribunes, les entrées, les stands et le parking. Quatre visiteurs vont du parking au stade, puis reviennent à leur voiture et repartent selon un cycle autonome.
2. Cliquer sur **Monter dans la grande roue**, puis sur **Descendre de la grande roue · Échap** pour revenir à la ville.
3. Cliquer sur **Voir les 8 bornes**, puis sur une borne, ou utiliser directement **🎮 Jouer aux arcades**. Le menu permet de passer d’un jeu à l’autre.
4. Essayer **Fuite & duplication**, puis **Serpent · suivi de chemin**. Dans ce dernier, **+ Serpent · T** ajoute un serpent et **Réglages du jeu** donne accès aux poids des comportements.
5. Pour jouer soi-même, choisir **Course chrono & défi IA** et conduire avec les flèches, ou choisir **Tir aux ballons** et viser au clic. Revenir avec **Retour à la ville · Échap**.

**À observer :** les exercices de comportements sont accessibles comme de vrais jeux dans la ville. La liste des huit bornes et leurs commandes se trouve plus bas.

### 6. Tester immédiatement le cerveau livré — 3 min

1. Cliquer sur **Circuit neuronal · entraînement & courses** en haut à droite, ou sur la piste, les tribunes ou le panneau du stade.
2. Dans le laboratoire, vérifier que **Pilote universel · 8 circuits** est sélectionné. Choisir **Ovale école**, **graine 42**, **largeur 90**, **complexité 12**, puis cliquer sur **Tester le cerveau figé**.
3. Afficher les **Capteurs du leader** et observer les rayons. Augmenter **Accélération du temps** si souhaité, puis attendre **24 / 24** et **3 / 3 tours**. Le test charge automatiquement les réglages du pilote, notamment sept rayons de 180 pixels et une vitesse maximale de 3.
4. Choisir une autre famille de circuit avec les mêmes graine, largeur et complexité, puis relancer **Tester le cerveau figé** pour comparer sans modifier les poids.

**À observer :** les distances des rayons et la vitesse entrent dans le réseau ; ses sorties commandent la direction et la vitesse souhaitée. Les portes mesurent les tours et la progression, sans guider la voiture. Les voitures neuronales sont évaluées indépendamment : elles heurtent les bordures, mais ne se percutent pas entre elles.

### 7. Lancer une course de pilotes — 2 min

1. Dans **Mode de session**, choisir **Course de pilotes**.
2. Personnaliser les quatre noms et **sélectionner un cerveau sauvegardé pour chaque pilote**. Pour une première démonstration, choisir le pilote universel pour les quatre ; leurs départs sont décalés. Un cerveau laissé vide est aléatoire et n’est pas entraîné.
3. Conserver l’ovale de référence et les réglages du pilote, puis cliquer sur **Lancer la course**. Attendre la fin : le gagnant, son temps et le podium apparaissent au centre du circuit.
4. Utiliser **Retour à la ville** pour reprendre la visite. Le laboratoire conserve sa session en pause lors de sa fermeture.

<a id="comportements"></a>

## Repérer les comportements étudiés

| Comportement ou notion | Où le découvrir | Manipulation et résultat à observer |
| --- | --- | --- |
| **Seek** | Borne Poursuite & réapparition | Les vaisseaux se dirigent vers une cible mobile ; vitesse et force maximales sont réglables. |
| **Flee** | Bornes Fuite & duplication et Les vaisseaux fuient | La cible ou les vaisseaux s’éloignent du danger. La cible spécialisée utilise détection, endurance et récupération. |
| **Pursuit** | Borne Missile, cibles & leurres ; poursuite policière | Le poursuivant anticipe une position future de sa cible. |
| **Arrive** | Mission bus ; visiteurs et clients | L’agent ralentit à l’approche de son objectif avant de s’immobiliser. |
| **Wander** | Bus hors arrêt, serpent, cibles | Faire varier son poids sur le bus ou le serpent ; observer une variation directionnelle continue. |
| **FollowPath et maintien sur la route** | Trafic de la ville ; borne Serpent | Les véhicules suivent les rues ; la tête du serpent suit un chemin avec des forces complémentaires. |
| **Évitement des obstacles** | Trois postes de contrôle permanents | Observer les véhicules contourner les barrières en restant sur la chaussée. L’algorithme pédagogique du dossier 6 est adapté en 3D. |
| **Séparation** | Trafic, bus, drones et serpent | Comparer l’espacement avec les curseurs disponibles ; les contacts de sécurité complètent le steering dans la ville. |
| **Alignement et cohésion** | Nuées de drones | Régler séparément les trois poids du flocking, puis observer les liens de voisinage en debug. Adaptation du travail du dossier 7. |
| **Composition de forces** | Réglages bus, drones et serpent | Modifier un poids à la fois pour voir l’équilibre entre les comportements. |
| **Perception et états** | Cible fuyante, leurres, mission bus, intervention | Observer détection, fuite, épuisement, embarquement, fermeture de rue et poursuite. |
| **Navigation sur graphe** | Intervention et déviation | Une rue fermée change les objectifs d’itinéraire ; le déplacement reste réalisé par steering. |
| **Raycasting et réseau de neurones** | Laboratoire du stade | Afficher les rayons et tester le pilote sauvegardé ; aucune force de suivi de piste n’assiste sa conduite. |
| **Apprentissage génétique et évaluation** | Laboratoire du stade | Lancer un entraînement, suivre les générations, sauvegarder puis tester un cerveau figé sur une autre piste. |

Le monde 3D utilise des sous-classes de **`YUKA.Vehicle`**, des comportements composables et la locomotion de Yuka. Les jeux p5 intégrés conservent leurs classes **`Vehicle`** d’origine. Le rendu Three.js observe la simulation ; les formules de steering et les détails de cette adaptation sont décrits dans [ARCHITECTURE.md](ARCHITECTURE.md).

<a id="bornes"></a>

## Explorer les huit bornes

Accès : **🎮 Jouer aux arcades** ou **Voir les 8 bornes**, puis clic sur une machine. Chaque borne charge un seul jeu ; **Réglages du jeu**, **Pause**, **Recommencer** et **Retour à la ville** permettent de l’examiner. Le scénario d’une borne est verrouillé : pour changer de scénario, utiliser le menu des bornes.

| Borne | Ce qu’elle permet d’essayer |
| --- | --- |
| **Poursuite & réapparition** | Les vaisseaux suivent la cible ; à la capture, ils réapparaissent ailleurs, gagnent de l’XP et grandissent. Les curseurs de vitesse et de force affectent tous les vaisseaux. |
| **Fuite & duplication** | La cible fuit le vaisseau le plus proche dans son rayon de détection. Régler le rayon et l’endurance ; observer la barre au-dessus de la cible et sa duplication après une fuite complète sans capture. Le cercle passe du jaune au rouge en présence d’un danger ; D ajoute la distance de sortie. |
| **La cible réapparaît** | Variante de poursuite : à la capture, c’est la cible qui réapparaît ailleurs. |
| **Les vaisseaux fuient** | Observer les forces de fuite dirigées à l’opposé de la cible. |
| **Missile, cibles & leurres** | Le missile poursuit les cibles ; elles accélèrent en fuite et larguent des leurres. Régler leur capacité et leur durée de vie ; activer les effets missile pour écouter alarme, fuite, largage et explosion. |
| **Serpent · suivi de chemin** | Régler le suivi, la séparation et le wander ; T ou **+ Serpent** ajoute un serpent, glisser sur le canvas ajoute des véhicules. D affiche le debug. Le corps suit sa tête avec ralentissement à l’arrivée et séparation. |
| **Course chrono & défi IA** | Piloter avec les flèches, ZQSD/WASD ou les boutons tactiles. **Course chrono** propose trois tours ; **Défier le cerveau entraîné** ajoute un adversaire neuronal. Espace met en pause, **Recommencer** conserve le mode choisi. |
| **Tir aux ballons** | Cliquer les ballons pendant 30 secondes, enchaîner les touches pour augmenter le combo et améliorer le record local. |

Les cinq premières bornes partagent une copie autonome de `1-Seek`, la sixième reprend `5-3-PathFollowingComplex`. Les deux autres sont les jeux d’arcade du projet. Leurs bibliothèques et ressources sont locales ; les sources de comportements et les deux fichiers `vehicle.js` importés sont conservés à l’identique.

Dans les quatre premières bornes, le déplacement de la souris contrôle la modulation de fréquence et le centre du dégradé animé ; la cible conserve son déplacement autonome. **Activer la musique**, **Activer Monster Kill** et **Activer les effets missile** sont des activations distinctes, accessibles selon le scénario. Les réglages d’origine restent disponibles. Échap ferme d’abord les réglages Seek ouverts, puis la borne. La ville et ses sons sont suspendus pendant une activité ; fermer une borne décharge le jeu et coupe ses sons.

<a id="laboratoire"></a>

## Tester, entraîner et sauvegarder un cerveau

**Tester le cerveau figé** vérifie un modèle existant, **Démarrer l’entraînement** crée une nouvelle évolution sur la piste courante, et **Lancer la course** compare les pilotes sans apprentissage.

Pour créer une expérience :

1. Choisir l’une des huit familles : ovale, stadium, Grand Prix, chicanes, trèfle, côte, virages carrés ou aléatoire. Régler graine, largeur et complexité, puis **Régénérer le circuit**. L’ovale et le stadium gardent une forme fixe lorsque seule la graine change.
2. Configurer **1 à 19 rayons**, leur longueur, l’accélération maximale, la vitesse et la population. Choisir **0 à 5 couches cachées** et **2 à 64 neurones par couche**. Les entrées sont les rayons et la vitesse ; les deux sorties commandent le braquage et la vitesse souhaitée.
3. Régler la mutation et le budget de générations, puis cliquer sur **Démarrer l’entraînement**. L’interface montre la génération, les tours, la progression collective et les échecs de tentative. Une réussite exige **trois tours pour toutes les voitures d’une même génération**.
4. Nommer le pilote puis **Sauvegarder** son cerveau. Choisir un nouveau circuit et utiliser **Tester le cerveau figé** pour mesurer sa capacité d’adaptation. Ce test recharge les réglages du modèle et ne modifie pas ses poids ; changer l’architecture demande un nouvel entraînement.
5. Consulter **Circuits gagnants** et **Circuits tuants**, puis **Exporter les essais** pour conserver la campagne dans un fichier JSON. **Importer** permet de la restaurer ; exporter ses données personnelles avant un import qui les remplace.

Une **génération** est une population évaluée ; une **tentative** dispose du budget de générations choisi. Un contexte est classé tuant au **quatrième échec de tentative**. En test figé, des relances du même cerveau peuvent avoir lieu jusqu’à ce seuil : elles ne constituent pas un nouvel apprentissage. Une interruption volontaire ne compte pas comme un échec.

Le pilote **« Pilote universel · 8 circuits »** est livré avec ses poids et ses résultats. Sa validation collective concerne les huit pistes de référence : **graine 42, largeur 90, complexité 12**, avec ses réglages sauvegardés. Cela ne garantit pas toutes les nouvelles graines ou vitesses. L’entraînement multi-pistes se reproduit en ligne de commande ; le bouton d’entraînement de l’interface travaille sur la piste courante. Voir le [guide complet du laboratoire](neuro/README.md) et la [campagne sauvegardée](neuro/sauvegardes/entrainement-multicircuits.json).

La banque garde jusqu’à 10 cerveaux et l’archive 40 contextes dans le navigateur. Ces données restent liées au poste et à l’adresse du site : **exporter avant de changer de navigateur, de poste ou de passer du jeu local au site hébergé**, puis importer à destination. Le pilote de démonstration reste inclus dans le projet. Au retour dans le laboratoire après fermeture, utiliser **Reprendre** pour continuer une session suspendue.

<a id="commandes"></a>

## Commandes et conseils

Les commandes ci-dessous concernent la **ville**. Les bornes ont leurs propres commandes, décrites dans leur tableau.

| Commande | Action |
| --- | --- |
| **Réglages** | Replier ou ouvrir le panneau ; faire défiler pour accéder à tous les groupes. |
| Liste **Choisir une voiture ou un bus** | Sélectionner facilement un véhicule, même lorsqu’il se déplace. |
| Clic sur une carrosserie, sans glisser | Autre méthode de sélection ; **Pause** facilite le clic. |
| **1 / 3 / 0** | Vue habitacle / vue de poursuite / vue libre. Le bouton **Vue 3D · 0** rétablit le cadrage général. |
| Glisser / molette | Orienter / zoomer la vue libre ; glisser permet de regarder autour de soi dans l’habitacle. |
| **P / O** | Vue policier en première / troisième personne. |
| **V / N** | Suivre un drone / choisir le drone suivant. |
| **T / B** | Ajouter un bus / une nuée de drones, si une place est disponible ou la limite n’est pas atteinte. |
| **M / Espace** | Lancer la mission bus / ouvrir les portes à l’arrêt. |
| **H** | Lancer l’intervention lorsqu’elle est disponible. |
| **D** | Activer ou désactiver les diagnostics de steering. |
| Clic sur le sol / Maj + clic | Ajouter une voiture / demander un poste de contrôle si l’emplacement et la limite le permettent. |
| **Pause / Reprendre** | Suspendre / reprendre la simulation de la ville. |
| **Échap** | Quitter une activité ou revenir à la vue libre selon le contexte. |

**Si un raccourci ne répond pas :** les touches de la ville sont ignorées lorsqu’un champ, un menu ou un bouton garde le focus. Utiliser le bouton correspondant, ou cliquer d’abord sur le véhicule à suivre pour redonner le focus à la scène. Dans une borne, cliquer sur son canvas avant d’utiliser ses touches.

**Pour entendre la ville :** dans **Réglages → Ambiance sonore**, cliquer sur **Activer les sons de la ville**, puis régler le volume. Il s’agit d’enregistrements locaux de circulation, foule, klaxon et sirènes. Les sirènes accompagnent la présence des voitures de police en intervention ; les klaxons sont espacés. Les conversations sont une ambiance de foule, pas des dialogues français scénarisés. Aucun son ne démarre avant activation ; pause, onglet masqué, laboratoire et arcades suspendent l’ambiance. Les sons des bornes s’activent séparément.

**Pour examiner les missions :** garder les réglages initiaux lors de la première visite. Les trois postes de contrôle permanents sont organisés sur des portions droites ; Maj + clic ne dépasse pas cette limite. Les deux barrages temporaires du braquage sont indépendants. Une apparition demandée dans un volume occupé peut être refusée. Les durées sont mesurées en temps de simulation ; un onglet masqué ou une pause ne les fait pas avancer.

<a id="code"></a>

## Code, tests et références

| Emplacement | Contenu |
| --- | --- |
| [index.html](index.html), [style.css](style.css) | Point d’entrée et interface de la ville. |
| [3d/](3d/) | Entités Yuka, steering, contacts, navigation, missions, caméras et rendu Three.js. |
| [neuro/](neuro/) | Laboratoire, capteurs, réseaux TensorFlow, apprentissage génétique, courses et sauvegardes livrées. |
| [games/](games/), [arcade/](arcade/) | Jeux p5 importés, deux jeux classiques et hébergement des huit bornes. |
| [libraries/3d/](libraries/3d/) | Three.js, Yuka, TensorFlow et licences, distribués localement. |
| [assets/audio/city/sources.json](assets/audio/city/sources.json) | Sources, licences et empreintes des enregistrements sonores. |
| [tests/](tests/), `games/seek/tests/`, `games/snake/tests/` | Tests de la ville, du laboratoire, de l’hébergement et des comportements importés. |
| [scripts/serve.mjs](scripts/serve.mjs) | Serveur local facultatif, sans dépendance à installer. |

Depuis la racine du projet :

```sh
npm test
```

**295 tests réussis lors de la validation de livraison**, avec les vraies bibliothèques locales Yuka, Three.js et TensorFlow. Ils couvrent notamment forces et limites, collisions, missions complètes, mémoire des modèles, sauvegardes, relecture des pilotes et bornes. La suite complète prend quelques minutes selon la machine. `npm run test:quick` évite les deux simulations de trafic les plus longues ; `npm run test:behaviors` cible les bornes de comportements et leurs tests importés.

Pour approfondir : [architecture et choix techniques](ARCHITECTURE.md), [guide du laboratoire neuronal](neuro/README.md), [audit de livraison et limites](AUDIT.md), [crédits et références pédagogiques](CREDITS.md), [consignes de développement](AGENTS.md). La référence conceptuelle est l’article de Craig W. Reynolds, *Steering Behaviors for Autonomous Characters* (GDC 1999).
