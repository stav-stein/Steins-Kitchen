# Stein's Kitchen — Setup Guide

## Prerequisites
- Node.js 18+
- An Anthropic API key (get one at https://console.anthropic.com)

## 1. Install dependencies
```bash
npm run install:all
```

## 2. Add your API key
Edit the `.env` file in the root:
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
PORT=3001
```

## 3. Start the app
```bash
npm run dev
```

This starts:
- **Backend** on http://localhost:3001 (Express + Claude AI)
- **Frontend** on http://localhost:5173 (React + Vite)

Open http://localhost:5173 in your browser.

---

## Features

### Add a Recipe
- **From URL** — paste any recipe link (food blogs, NYT Cooking, AllRecipes, Instagram, TikTok...)
- **From Image** — upload a photo of a cookbook page or recipe card
- **Manual** — type it in yourself

### Cookbook
- Search by title, ingredients, or tags
- Filter by Favorites or Recently Added
- Browse by category (Dinner, Breakfast, Desserts...)

### Recipe Detail
- Full ingredients & step-by-step instructions
- Mark as Cooked (tracks history)
- Share via native share sheet or copy to clipboard
- Edit or delete

### Hebrew / RTL Support
Click the **עב / EN** button in the top-right header to switch between English and Hebrew. The entire layout flips to RTL when in Hebrew mode.

---

## Folder Structure
```
├── server/          Express API (recipe storage + Claude extraction)
│   ├── routes/      API routes (/api/recipes, /api/extract)
│   ├── services/    Claude client + URL scraper
│   └── data/        recipes.json (local storage) + uploads/
└── client/          React + Vite frontend
    └── src/
        ├── pages/   Discover, Cookbook, AddRecipe, RecipeDetail
        ├── components/
        ├── store/   Zustand state
        ├── api/     Fetch wrappers
        └── i18n/    English + Hebrew translations
```
