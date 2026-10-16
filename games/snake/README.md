# Suivi de chemin — serpents p5.js

Le jeu de la petite ville 3D a été extrait dans son dépôt autonome : [https://github.com/RayaneRZ24/petite-ville-3d](https://github.com/RayaneRZ24/petite-ville-3d).
Sa copie locale se trouve dans le dossier voisin `../petite-ville-3d` à partir de la racine de ce dépôt.

Ce dossier conserve l'exemple p5.js : ouvrir `index.html` ou `index-2d.html`.
Les curseurs règlent follow, séparation et wander ; **T** ajoute un serpent et **D** affiche le debug.
Les bibliothèques p5 locales et le fichier `vehicle.js` fourni restent inchangés.

Tests de cet exemple :

```sh
node --test 5-3-PathFollowingComplex/tests/*.test.mjs
```

Le code 3D, les bibliothèques Three.js/Yuka et leurs tests sont uniquement dans le nouveau dépôt.
