# Seek — population de véhicules

Ouvrir `index.html` dans un navigateur (ou servir ce dossier avec un serveur HTTP local).

Cliquer sur **☰ Réglages** pour ouvrir le panneau vertical à gauche. Il se referme avec **✕**, **Échap** ou un clic à l'extérieur et ne réduit pas le canvas. Choisir **2 — Fuite et duplication** pour les clones. Activer **Monster Kill** dans la section Captures pour écouter le son et autoriser les effets suivants.

- 20 véhicules au démarrage, réglables de 1 à 200 avec le slider, pendant le glissement.
- `creerVehicules(nb)` dans `sketch.js` ajuste l'effectif et applique les réglages courants aux nouveaux véhicules.
- Deux sliders p5.js (`createSlider`) règlent tous les véhicules : vitesse maximale de 1 à 20 (10 au départ), force maximale de 0.01 à 2 par pas de 0.01 (0.10 au départ).
- La vitesse maximale limite le déplacement par image ; la force maximale règle la rapidité avec laquelle les véhicules changent de direction. Les réglages sont appliqués pendant le glissement, sans recréer les véhicules.
- La cible ronde rouge de 28 px est entourée d'un halo blanc de 50 px, toujours visible. Elle se déplace seule : direction initiale aléatoire, puis errance douce (`wander`) à 3 px/image. Elle n'est plus placée par la souris.
- La cible reste affichée au premier plan et réutilise `Vehicle.edges()` pour traverser les bords. Sa vitesse maximale de fuite vaut 1.6 fois celle des flèches (minimum 4). Sa force maximale est le maximum de 1.5, de 0.45 fois la vitesse des flèches et de 3 fois leur force : elle peut accélérer rapidement même avec le slider de force au minimum.
- Le menu « Scénario » regroupe les modes ; changer de scénario conserve les vaisseaux, leur XP, les sliders, la position et la vitesse de la première cible, mais revient à une seule cible avec un état et une endurance neufs.
- Le fond affiche des anneaux arc-en-ciel vifs et fondus. Son centre oscille autour de la souris selon les paramètres FM, avec un mouvement volontairement huit fois plus lent que le modulateur sonore. La profondeur FM règle aussi l'amplitude du mouvement ; à profondeur nulle, le centre est exactement sur la souris. Les couleurs défilent indépendamment avec le slider du dégradé.
- « Vitesse du dégradé » règle l'animation de 0 (pause) à 2, avec 0.35 au départ ; « Intensité » règle la saturation et la luminosité de 0 à 1, avec 0.75 au départ. Ces réglages n'affectent pas les forces ni les vitesses des flèches.
- Les véhicules réapparaissent au bord opposé grâce à `Vehicle.edges()`.
- Le seuil de capture est le rayon courant du vaisseau (16 px initialement). Le véhicule réapparaît ailleurs avec une vitesse et une accélération nulles (scénarios 1, 2 et 4). Dans la variante 3, la cible réapparaît ailleurs et repart dans une direction aléatoire. Les réapparitions évitent toutes les cibles ou tous les véhicules selon la variante ; si le canvas est trop petit, elles sont différées. Une cible ne réapparaît qu'une fois par image, même avec des arrivées simultanées.
- Une capture donne **10 XP**, affichés au-dessus du vaisseau, et une indication « +10 XP » qui s'efface progressivement. Le rayon visé vaut `16 + 5 × log2(1 + captures)` : chaque capture augmente la taille, avec des gains décroissants. La croissance est lissée en secondes, sans saut de taille, et l'XP est conservée après réapparition. Un contact persistant ne rapporte pas d'XP à chaque image.
- Les véhicules conservés lors d'un changement d'effectif gardent leur état.
- « Activer la musique » démarre une ambiance synthétisée : accord doux monté d'une octave (220 à 659 Hz), notes hautes au timbre triangulaire plus lumineux, ondulations lentes et écho discret. Le filtre ouvert à 2800 Hz donne un son plus clair. Le bouton devient « Couper la musique » ; le slider Volume règle le son de 0 à 100 %, avec 35 % au départ. Le démarrage nécessite un clic et les transitions de volume sont progressives.
- La musique est produite localement par Web Audio dans `hypnoticAudio.js`, sans fichier musical. Couper la musique suspend le moteur audio ; la relancer réutilise les mêmes oscillateurs. Le bouton et le volume ne modifient ni les véhicules ni le dégradé.
- L'effet **Monster Kill** provient exactement du [lien fourni](https://www.youtube.com/watch?v=v4I6mMilmio). Le fichier local `assets/monster-kill.m4a` dure environ 5.04 s. Son bouton d'activation joue une préécoute et autorise les captures suivantes ; le volume est indépendant de la musique, à 55 % initialement. Des captures très rapprochées partagent le son en cours pour laisser la phrase audible, sans superposition ni file d'attente.
- `frequencyModulation.js` partage les paramètres entre le son et le fond : souris de gauche à droite → fréquence du modulateur de 0.25 à 12 Hz ; souris de bas en haut → profondeur de 0 à 80 Hz. Un oscillateur sinusoïdal traverse un gain de profondeur puis se connecte aux `frequency` des cinq notes : c'est une modulation de fréquence, en plus des ondulations de volume existantes. Les changements sonores sont lissés sur 80 ms environ.
- La position réelle de la souris règle la FM et l'animation du fond même lorsque la cible fuit. Les paramètres sont conservés avant le premier clic et pendant la coupure du son. Les véhicules poursuivent uniquement la cible rouge, indépendamment du centre du dégradé.

## Scénarios

| Scénario | Cible | Vaisseaux | Arrivée |
|---|---|---|---|
| 1 — Poursuite | `Target`, wander normal | Seek | Le vaisseau réapparaît |
| 2 — Fuite et duplication | Plusieurs `TargetFuyante`, wander ou fuite limitée | Seek de la cible la plus proche | Le vaisseau réapparaît, gagne de l'XP et interrompt la fuite de la cible |
| 3 — Variante cible | `Target`, wander normal | Seek | La cible réapparaît |
| 4 — Variante fuite | `Target`, wander normal | Flee | Le vaisseau réapparaît |

Le scénario 2 utilise un **rayon** de détection de 200 px, réglable de 50 à 290 px. Les distances portent sur les centres. La cible fuit le vaisseau le plus proche dès qu'il entre dans ce rayon (seuil inclusif), et continue tant qu'un prédateur est à moins de 300 px. À 300 px ou plus, elle reprend le mouvement normal de `Target`. La vitesse de fuite augmente progressivement pendant 0.4 s, avec lissage des forces ; elle revient progressivement à la vitesse de croisière après la fuite.

Le curseur **Fuite avant duplication** vaut 3 s par défaut, réglable de 0.5 à 10 s. Cette durée est aussi l'endurance maximale. Elle utilise les secondes réelles transmises par `draw()`, pas le nombre d'images. Changer de prédateur ne remet pas le compteur à zéro. Une fois épuisée, la cible reprend son wander et doit se recharger complètement avant de fuir à nouveau. La recharge rend une seconde d'endurance par seconde hors fuite. Le slider de durée conserve le temps déjà consommé. Un changement de scénario remet l'endurance à neuf. Revenir d'un onglet masqué ne donne pas de temps de survie supplémentaire.

Une fuite **continue complète**, sans capture ni sortie de portée, crée un clone. Une capture interrompt la série et place la cible en récupération ; elle annule aussi une duplication à l'image du seuil. Une fuite trop courte, suivie d'une seconde fuite avec l'énergie restante, ne compte pas comme une seule fuite complète. Le clone apparaît au même endroit, grandit sur 0.7 s, émet une onde blanche puis se sépare par sa vitesse initiale et son steering normal. Il ne peut pas être capturé pendant ces 0.7 s et commence avec son endurance à recharger. Les réglages s'appliquent à toutes les cibles et sont transmis aux clones. La limite de **24 cibles** est affichée ; aucune duplication n'est mise en attente lorsque cette limite est atteinte.

La barre au-dessus de la cible et son cercle de détection sont toujours visibles dans le scénario 2. La barre est verte pendant le fonctionnement normal, orange en récupération. Le cercle est jaune sans vaisseau dans la zone, rouge dès qu'un vaisseau s'y trouve, même si la cible est épuisée. **D** ajoute le cercle de sortie de portée à 300 px. Le debug ne modifie pas la simulation. Les répétitions de touche et les frappes dans un champ texte sont ignorées.

`vehicle.js` reste inchangé. `Follower extends Vehicle` réutilise seek et corrige flee ; `Target extends Vehicle` fournit le mouvement normal. `TargetFuyante extends Target`, dans le fichier demandé `targetFutante.js`, appelle **`this.flee()` hérité de `Target`**. Cette méthode délègue au calcul corrigé de `FleeBehavior`. `update()` et `edges()` restent ceux de `Vehicle`. Aucun timer par entité ; `applyForce()` est le seul point d'application des forces. L'ancienne `MouseTarget` reste disponible mais n'est plus chargée dans la scène.

`scenarios.js` décrit les variantes ; `fleeingTargetBehavior.js` isole la perception et la montée en vitesse ; `targetFutante.js` gère l'endurance, les transitions et leur rendu. `targetMotion.js` calcule wander ; `arrivalRules.js` compose les mises à jour et transmet le temps. `population.js` gère les réapparitions. `hypnoticBackground.js` dessine le fond animé indépendamment des véhicules.

`targetAvoidance.js` conserve les comportements de la protection précédente et réutilise son filtre de force pour la nouvelle cible. La perception du scénario 2 utilise les seuils 200/300 px et choisit le plus proche à chaque décision. La direction d'errance varie d'au plus 0.06 rad par image ; le retour à la vitesse de croisière applique un gain de 0.12, limité à `maxForce`.

## Pourquoi inverser la vitesse désirée dans flee ?

L'article de Reynolds fourni au dépôt (page 8) définit flee par une vitesse désirée opposée à celle de seek. L'étape naïve est disponible pour comparaison : `FleeBehavior.invertedSeek(vehicle, position)` retourne `vehicle.seek(position).mult(-1)`. Le flee fourni dans `vehicle.js` suit déjà cette étape, mais n'est pas utilisé pour la fuite corrigée.

Si seek calcule `desired - velocity`, inverser toute cette force donne `-desired + velocity` : la vitesse actuelle a alors le mauvais signe. La correction utilisée par `Follower.flee()` est :

```js
const desired = p5.Vector.sub(vehicle.pos, position); // direction opposée à la cible
desired.setMag(vehicle.maxSpeed);
const steering = p5.Vector.sub(desired, vehicle.vel);
steering.limit(vehicle.maxForce);
```

Exemple : vitesse désirée de seek `(10, 0)`, vitesse actuelle `(2, 3)`. L'inversion naïve donne `(-8, 3)` ; la fuite correcte donne `(-12, -3)` avant limitation. Les deux coïncident seulement lorsque la vitesse actuelle est nulle. La force corrigée est appliquée avec `applyForce()`, sans déplacement direct.

## Fichiers de cet ajout

| Fichiers | Changement |
|---|---|
| `targetPopulation.js` | Créé : duplication, héritage des paramètres et plafond |
| `captureAudio.js`, `assets/monster-kill.m4a`, `assets/README.md` | Créés : effet sonore local, commande et provenance |
| `settingsPanel.js` | Créé : ouverture/fermeture du panneau et accès clavier |
| `targetFutante.js`, `target.js` | Modifiés : fuite complète, capture, halo permanent et naissance animée |
| `follower.js`, `arrivalRules.js`, `population.js` | Modifiés : XP, croissance, captures uniques et gestion de plusieurs cibles |
| `sketch.js`, `index.html`, `style.css` | Modifiés : panneau latéral, durée 3 s, liste de cibles et compteurs |
| `tests/progression.test.mjs`, `tests/captureAudio.test.mjs`, `tests/settingsPanel.test.mjs` | Créés : duplication, XP, contacts, son et panneau |
| `tests/endurance.test.mjs`, `tests/sketch.test.mjs`, `tests/visuals.test.mjs` | Modifiés : durée, halo et intégration des nouvelles règles |
| `README.md`, `../AGENTS.md`, `../ARCHITECTURE.md` | Modifiés : usage, directives et frontières entre les classes |

Tous les fichiers `vehicle.js` restent inchangés. Les tests couvrent notamment le temps injecté à plusieurs cadences, les deux côtés des seuils, les changements de prédateur/scénario, les sliders pendant la fuite et l'indépendance du debug.

Validation de cet ajout : 93 tests réussis ; vérification dans Edge du panneau (ouverture, Échap, focus et mobile 390 px), du cercle visible hors debug, de la touche D réelle, des clones à 3 s, des sliders appliqués à toutes les cibles, de l'XP, de la croissance, de la lecture effective du fichier Monster Kill, de la musique FM, des variantes et de 200 vaisseaux, sans erreur JavaScript.

## Tests

Depuis ce dossier, avec Node.js (18 ou plus) :

```sh
node --test tests/*.test.mjs
```

Aucune dépendance à installer. Les tests exécutent le vrai `vehicle.js` avec un adaptateur vectoriel minimal et un aléatoire déterministe. La validation du rendu avec p5 et du glissement réel se fait également dans le navigateur.

La [spécification](EXO1_SPECIFICATION.md) décrit les règles, le workflow et les cas limites. Elle constitue le document de conception initial ; l'implémentation et les tests sont maintenant présents.
