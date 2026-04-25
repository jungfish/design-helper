# Design Helper - Palette Appartement

Mini app front reconstruite à partir de la version existante `Palette Appartement Interactive.jsx`, avec une structure Vite + React + Tailwind.

## Lancer le projet

```bash
npm install
npm run dev
```

Pour utiliser le bouton IA, lance aussi le petit serveur local dans un second terminal:

```bash
OPENAI_API_KEY=sk-proj-... npm run api
```

Options:

```bash
OPENAI_IMAGE_MODEL=gpt-image-2
API_PORT=5175
```

Build de validation:

```bash
npm run build
```

## Déployer sur Vercel

Le projet est compatible Vercel avec Vite:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Ajoute ces variables dans Vercel, dans `Project Settings > Environment Variables`:

```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_ANALYSIS_MODEL=gpt-4.1-mini
```

Les routes IA utilisées par l'app sont servies par les fonctions Vercel:

- `/api/analyze-image`
- `/api/generate-image`

Note: les images uploadées dans l'app sont sauvegardées dans le navigateur de la personne qui utilise la page. Les images du repo restent dans `public/images/...`.

## Où trouver la page palette

- `http://localhost:5173/`
- `http://localhost:5173/palette/`
- `http://localhost:5173/appartement-palette/`

## Où déposer les images

Dépose les vraies images dans:

- `public/images/plan/`
- `public/images/salon/`
- `public/images/cuisine/`
- `public/images/entree/`
- `public/images/parents/`
- `public/images/enfant/`
- `public/images/bureau/`
- `public/images/vinyle/`
- `public/images/cellier/`
- `public/images/sdb/`
- `public/images/materials/`

Formats recommandés:

- `webp` ou `avif` pour les images servies par le repo
- `jpg` ou `png` uniquement si tu dois garder une source non compressée

Chemins attendus dans l'app:

- Plan: `public/images/plan/<nom-du-plan>.webp`
- Inspirations: `public/images/<piece>/01.webp`, `02.webp`, `03.webp`
- Matériaux (exemples):  
  `public/images/materials/cuisine-sol.webp`,  
  `public/images/materials/cuisine-credence.webp`,  
  `public/images/materials/cuisine-plan-travail.webp`,  
  `public/images/materials/sdb-credence.webp`,  
  `public/images/materials/sdb-carrelage.webp`,  
  `public/images/materials/sdb-lavabo.webp`
