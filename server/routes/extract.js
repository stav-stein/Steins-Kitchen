const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractRecipe } = require('../services/claudeClient');
const { extractFromUrl } = require('../services/urlExtractor');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_IMAGE_FILES = 15;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: MAX_IMAGE_FILES }, // 15MB per file
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/extract/url
router.post('/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Extracting from URL: ${url}`);
    const { text, imageUrl, imageCandidates } = await extractFromUrl(url);
    const recipe = await extractRecipe(`Source URL: ${url}\n\n${text}`);
    recipe.sourceUrl = url;
    const scraped = imageUrl && String(imageUrl).trim();
    const fromModel = recipe.imageUrl && String(recipe.imageUrl).trim();
    if (scraped && !fromModel) recipe.imageUrl = scraped;
    recipe.imageCandidates = Array.isArray(imageCandidates) ? imageCandidates : [];

    res.json(recipe);
  } catch (err) {
    console.error('URL extraction error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to extract recipe from URL' });
  }
});

// POST /api/extract/image — field name "images" (multiple) or legacy "image" (single)
router.post(
  '/image',
  (req, res, next) => {
    upload.fields([
      { name: 'images', maxCount: MAX_IMAGE_FILES },
      { name: 'image', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      next();
    });
  },
  async (req, res) => {
    try {
      const fromMulti = req.files?.images || [];
      const fromLegacy = req.files?.image || [];
      const files = [...fromMulti, ...fromLegacy].filter(Boolean);
      if (files.length === 0) {
        return res.status(400).json({ error: 'At least one image file is required' });
      }

      const imagePayload = files.map((f) => ({
        base64: f.buffer.toString('base64'),
        mediaType: f.mimetype,
      }));

      console.log(
        `Extracting from ${files.length} image(s): ${files.map((f) => f.originalname).join(', ')}`
      );

      const recipe = await extractRecipe(null, imagePayload);

      const first = files[0];
      const ext = path.extname(first.originalname || '') || '.jpg';
      const safeExt = ext.match(/^\.\w{1,8}$/i) ? ext : '.jpg';
      const filename = `${Date.now()}-screenshot${safeExt}`;
      fs.writeFileSync(path.join(uploadsDir, filename), first.buffer);
      recipe.imageUrl = `/uploads/${filename}`;

      res.json(recipe);
    } catch (err) {
      console.error('Image extraction error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to extract recipe from image' });
    }
  }
);

module.exports = router;
