const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../data/recipes.json');

function readRecipes() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writeRecipes(recipes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2));
}

// GET /api/recipes
router.get('/', (req, res) => {
  res.json(readRecipes());
});

// GET /api/recipes/:id
router.get('/:id', (req, res) => {
  const recipe = readRecipes().find(r => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json(recipe);
});

// POST /api/recipes
router.post('/', (req, res) => {
  const recipes = readRecipes();
  const now = new Date().toISOString();
  const { imageCandidates: _drop, ...body } = req.body || {};
  const recipe = {
    ...body,
    id: uuidv4(),
    isFavorite: false,
    rating: null,
    lastCooked: null,
    createdAt: now,
    updatedAt: now,
  };
  recipes.unshift(recipe);
  writeRecipes(recipes);
  res.status(201).json(recipe);
});

// PUT /api/recipes/:id
router.put('/:id', (req, res) => {
  const recipes = readRecipes();
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
  const { imageCandidates: _ic, ...patch } = req.body || {};
  recipes[idx] = { ...recipes[idx], ...patch, updatedAt: new Date().toISOString() };
  writeRecipes(recipes);
  res.json(recipes[idx]);
});

// DELETE /api/recipes/:id
router.delete('/:id', (req, res) => {
  const recipes = readRecipes();
  const filtered = recipes.filter(r => r.id !== req.params.id);
  if (filtered.length === recipes.length) return res.status(404).json({ error: 'Recipe not found' });
  writeRecipes(filtered);
  res.json({ ok: true });
});

module.exports = router;
