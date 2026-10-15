# Evoly

Carnet personnel de progression, en français. PWA React et TypeScript au design « Carnet doux », destinée à un usage adulte. Aucun compte ni backend : les données restent dans IndexedDB, sur chaque appareil et pour chaque origine web.

## Développement

Node.js 22 ou ultérieur recommandé.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
npm run test:e2e
```

Les tests de navigateur utilisent Microsoft Edge installé localement. Pour un autre environnement, adapter le `channel` dans `playwright.config.ts`. Les données de test sont isolées dans un contexte de navigateur temporaire. Les captures et sauvegardes de test ne sont pas versionnées.

## Fonctionnalités

- Profil local : prénom facultatif, silhouette, taille, objectif facultatif sans date limite, zones suivies.
- Pesées datées, historique, modification et suppression. Une pesée par jour avec confirmation de remplacement.
- Courbes du poids et de l’IMC ; la correction de taille recalcule tous les IMC.
- Silhouettes SVG masculine et féminine, repères tactiles, six zones de mensurations et consignes. Ces illustrations sont des repères généraux, pas des mesures anatomiques personnalisées.
- Photos par date et vue (face/profil/dos), capture ou import, modification et suppression, masquage visuel, comparaison côte à côte ou par superposition.
- Réduction des photos à 1 600 pixels, JPEG, suppression des métadonnées via réencodage sur canvas. Les originaux ne sont pas conservés par Evoly.
- Export ZIP complet (JSON + photos) et restauration validée, avec confirmation avant remplacement atomique du carnet.
- Application installable, ressources précachées pour fonctionner hors connexion, proposition de mise à jour.

## Déploiement Vercel

1. Publier ce projet dans le dépôt personnel GitHub `Lionel-Feuga/Evoly`.
2. Dans Vercel, importer le dépôt, choisir le preset **Vite**, branche de production `main`.
3. Commande de build : `npm run build`. Dossier de sortie : `dist`. Aucune variable d’environnement requise.
4. Utiliser l’adresse **de production stable**, pas une adresse d’aperçu, pour les carnets réels.

L’offre Hobby convient à cet usage personnel non commercial. Chaque mise à jour de `main` déclenche une publication. Aucun service de données ou stockage de photos chez Vercel n’est nécessaire.

## Installation et conservation des données

Sur iPhone : ouvrir l’adresse de production dans Safari, Partager → Sur l’écran d’accueil. Sur Android : Chrome → menu → Installer l’application. Installer avant de saisir les données ; si le carnet a déjà été commencé dans le navigateur, exporter puis restaurer dans l’app installée. Le stockage peut être distinct, notamment sur iPhone.

L’hébergement n’est pas une sauvegarde. Un effacement du site, une réinitialisation du téléphone ou une éviction du stockage peut supprimer le carnet. Exporter régulièrement et vérifier que le ZIP est bien enregistré. Les archives ne sont pas chiffrées. Le masquage des photos est seulement visuel, pas un verrouillage de sécurité.

Une restauration remplace tout le carnet : elle ne fusionne pas deux historiques. Les archives importées sont limitées à 250 Mo et 2 000 photos. Les photos individuelles importées sont limitées à 30 Mo. HEIC dépend des capacités du navigateur ; utiliser JPEG en cas d’échec.

L’IMC est un indicateur complémentaire pour les adultes et non un diagnostic médical. Les fonctionnalités ne proposent pas de prescription alimentaire ou de poids idéal.

## Vérifications à effectuer sur les téléphones réels

Les tests automatisés Chromium ne remplacent pas une validation Safari iOS : installation, lancement hors connexion, prise de photo, export ZIP dans Fichiers et restauration doivent être essayés sur l’iPhone et le Nothing Phone 2.

## Organisation

- `src/App.tsx` : navigation, écrans, opérations sur le carnet.
- `src/forms.tsx` : formulaires et import photo.
- `src/components.tsx` : silhouette, courbe, modales et images.
- `src/model.ts` : types, calculs, validation.
- `src/storage.ts` : IndexedDB, images, sauvegardes ZIP.
- `src/style.css` : design responsive, sans police distante.
- `design/maquettes/` : concepts visuels initiaux.

Les icônes sont dérivées du logo approuvé (`design/logo-ev-source.png`) avec `node generate-icons.mjs` (Edge requis).
