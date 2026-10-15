# Consignes — Petite ville 3D

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
