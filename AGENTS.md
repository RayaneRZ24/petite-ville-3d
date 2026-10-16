# Consignes — Petite ville 3D

## Laboratoire neuronal

- Les voitures apprenantes héritent de `YUKA.Vehicle` et utilisent exclusivement le comportement `NeuralSteering3D` : aucune aide par FollowPath ou par les portes de validation. Les capteurs et la vitesse sont les seules entrées du cerveau.
- Conserver les unités par pas du noyau 9b : vitesse Yuka = vitesse 9b ×60, force pour masse 1 = accélération 9b ×3600. La projection plane observe l'état Yuka ; elle ne déplace pas les entités. Appeler la locomotion héritée une seule fois.
- Suspendre la ville pendant l'ouverture du laboratoire ; suspendre le laboratoire à la fermeture et à l'onglet masqué. Garder banques et résultats séparés du trafic et valider l'origine de fenêtre des messages du panneau.
- Valider trois tours pour toute la population de la même génération. Le quatrième échec de tentative classe le contexte tuant ; les courses et tests figés ne mutent pas les poids. Les expériences conservent graine, circuit, architecture et cerveau/lignée.
- Tester avec les vrais Yuka et TensorFlow, vérifier la libération des modèles et conserver la réussite physique du pilote 9b importable. Vérifier le vrai WebGL, les ouvertures/fermetures et la reprise du jeu.

Lire aussi `ARCHITECTURE.md` avant de modifier le projet.

- Séparer sélection des objectifs, calcul des forces et locomotion. Utiliser `YUKA.Vector3`, des sous-classes de `YUKA.Vehicle` et la locomotion héritée une seule fois par pas. Pour un steering classique : vitesse désirée moins vitesse actuelle, avec force limitée à `maxForce`.
- Ne jamais corriger les contacts en écrivant directement les positions ou vitesses. Les positions initiales et le retrait d'une entité sont des règles du contrôleur ; le déplacement utilise des forces.
- Garder une classe par entité et des comportements indépendants et composables. Le rendu Three.js observe la simulation sans la piloter. Les modèles et accessoires ne sont pas des agents supplémentaires.
- Les empreintes du décor appartiennent à `CitySolids3D` et les contacts communs à `TrafficContacts3D`. Conserver les portes praticables à pied et les boutiques solides pour les véhicules. Ne pas créer une entité dans un volume occupé.
- Les détours utilisent le graphe des rues et des objectifs suivis par steering. Les barrages attendent des marges d'arrêt libres. Suspendre le service d'un bus pendant une déviation.
- Les durées utilisent le temps du monde à pas fixe, sans timer par entité ; Pause et l'onglet masqué suspendent aussi le braquage de 30 secondes.
- Nettoyer moteur, listes, voisinage, références de caméra et de poursuite et ressources graphiques au retrait. Garder le scénario rejouable et les scènes de porte sans superposition.
- Conserver les bibliothèques locales et leurs licences. Ne pas modifier les références pédagogiques dans `tests/fixtures/` pour faire passer un test.
- Ajouter des tests reproductibles pour chaque fonctionnalité et exécuter `npm test` avant de présenter le résultat. Vérifier forces et limites, cas proches et éloignés, contacts, transitions, échecs de création et répétition. Compléter les changements de rendu/interface par un vrai navigateur WebGL.
- Indiquer les fichiers modifiés, le comportement et les tests exécutés. Ne jamais committer de secret, de fichier temporaire, de profil de navigateur ou de dépendance installée.

Référence conceptuelle : Craig W. Reynolds, « Steering Behaviors for Autonomous Characters », GDC 1999. Le code de comparaison du professeur est conservé sous forme de fixtures locales avec sa provenance dans `CREDITS.md`.


## Bornes des jeux de cours

- `games/seek` et `games/snake` sont autonomes et isolés dans un iframe ; les jeux conservent leurs `Vehicle` p5 d’origine. Ne pas les convertir en Yuka pour l’hébergement.
- Garder une seule copie Seek pour les cinq scénarios. Le catalogue central sélectionne le jeu ; `arcadeBridge` ne modifie que l’hébergement, les réglages et le cycle de pause.
- Ne pas modifier les fichiers `vehicle.js`. Conserver la provenance des imports et les bibliothèques locales/licences. Les dossiers du dépôt de cours ne sont pas des dépendances d’exécution.
- Accepter les messages uniquement de la fenêtre attendue et pour l’identifiant de jeu et de session courants. Une seule iframe de jeu active, déchargée à la fermeture ; suspendre ville, sons et animation du jeu selon leur visibilité.
- `npm test` doit inclure les tests importés et ceux de l’hébergement ; valider les huit bornes et leurs variantes dans le vrai navigateur, les réglages, T, la pause audio et le retour à la ville.

- Conserver les deux bornes classiques (course chrono/défi IA et ballons) en complément des six jeux de comportements ; garder le catalogue à huit bornes. Réutiliser ArcadeSession/ArcadeView et les records locaux, avec le même iframe exclusif.
