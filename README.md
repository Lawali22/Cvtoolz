# CVtools v9

Créez votre CV professionnel en 5 minutes.  
20 modèles · Sans inscription · PWA hors ligne

## Stack

- React 18 + Vite
- Zéro backend, zéro base de données
- Export PDF via html2canvas + jsPDF
- PWA — fonctionne hors ligne après le premier chargement

## Structure

```
cvtools/
├── src/
│   ├── App.jsx       ← Application complète (v9)
│   └── main.jsx      ← Point d'entrée React
├── public/
│   ├── sw.js         ← Service Worker (PWA hors ligne)
│   ├── manifest.json ← Manifest PWA
│   ├── og-image.png  ← Image réseaux sociaux
│   └── icons/        ← Icônes PWA (à générer)
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Installation locale

```bash
npm install
npm run dev
```

## Déploiement Vercel

Connecter le repo GitHub à Vercel — déploiement automatique.

## Icônes PWA

Générer deux icônes PNG et les placer dans `/public/icons/` :
- `icon-192.png` — 192×192 px
- `icon-512.png` — 512×512 px

Outil gratuit : [favicon.io](https://favicon.io) ou [realfavicongenerator.net](https://realfavicongenerator.net)

## Fonctionnalités v9

- Barre de progression horizontale (sidebar noire supprimée)
- Étapes Expériences et Références passables
- Lettre de motivation optionnelle avec génération automatique
- Nouveaux champs : Téléphone 2, Nationalité, Date de naissance, Situation matrimoniale
- Drag-and-drop pour réorganiser les expériences
- Changer la photo depuis la page résultat
- Boutons partage WhatsApp (CV + recommandation)
- Mode PWA hors ligne

---

*by lawalitoe*
