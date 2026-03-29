const cheerio = require('cheerio');

const CONTENT_SELECTORS = [
  '[itemtype*="schema.org/Recipe"]',
  '.tasty-recipes',
  '.wprm-recipe-container',
  '.recipe-card',
  '.recipe-content',
  '.recipe',
  'article',
  'main',
  '.post-content',
  '.entry-content',
  '.content',
];

function resolveToAbsolute(href, baseUrl) {
  if (!href || typeof href !== 'string') return null;
  const t = href.trim();
  if (!t || t.startsWith('data:')) return null;
  try {
    return new URL(t, baseUrl).href;
  } catch {
    return null;
  }
}

function findJsonLdRecipe($) {
  let jsonLdRecipe = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLdRecipe) return false;
    try {
      const raw = $(el).html();
      if (!raw || !raw.trim()) return;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          jsonLdRecipe = item;
          return false;
        }
        if (item['@graph']) {
          const r = item['@graph'].find(
            (n) => n['@type'] === 'Recipe' || (Array.isArray(n['@type']) && n['@type'].includes('Recipe'))
          );
          if (r) {
            jsonLdRecipe = r;
            return false;
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
    return undefined;
  });
  return jsonLdRecipe;
}

function pickContentImage($, pageUrl) {
  for (const selector of CONTENT_SELECTORS) {
    const img = $(`${selector} img`).first();
    const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
    const abs = resolveToAbsolute(src, pageUrl);
    if (abs) return abs;
  }
  const hero = $('article img, main img, .post-content img').first();
  const src = hero.attr('src') || hero.attr('data-src') || hero.attr('data-lazy-src');
  return resolveToAbsolute(src, pageUrl);
}

function walkImageField(node, pageUrl, list, seen) {
  if (!node) return;
  if (typeof node === 'string') {
    const abs = resolveToAbsolute(node, pageUrl);
    if (abs && /^https?:\/\//i.test(abs) && !seen.has(abs)) {
      seen.add(abs);
      list.push(abs);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const n of node) walkImageField(n, pageUrl, list, seen);
    return;
  }
  if (typeof node === 'object') {
    walkImageField(node.url, pageUrl, list, seen);
    walkImageField(node.contentUrl, pageUrl, list, seen);
  }
}

const MAX_PAGE_IMAGE_CANDIDATES = 14;

function collectRecipeImageCandidates(jsonLdRecipe, $, pageUrl) {
  const seen = new Set();
  const list = [];
  if (jsonLdRecipe?.image) {
    walkImageField(jsonLdRecipe.image, pageUrl, list, seen);
  }
  const og = $('meta[property="og:image"]').attr('content');
  walkImageField(og, pageUrl, list, seen);
  const ogUrl = $('meta[property="og:image:url"]').attr('content');
  walkImageField(ogUrl, pageUrl, list, seen);
  const tw =
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[name="twitter:image:src"]').attr('content');
  walkImageField(tw, pageUrl, list, seen);

  for (const selector of CONTENT_SELECTORS) {
    if (list.length >= MAX_PAGE_IMAGE_CANDIDATES) break;
    $(`${selector} img`).each((_, el) => {
      if (list.length >= MAX_PAGE_IMAGE_CANDIDATES) return false;
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      walkImageField(src, pageUrl, list, seen);
      return undefined;
    });
  }

  return list.slice(0, MAX_PAGE_IMAGE_CANDIDATES);
}

function buildTextFromPage($, jsonLdRecipe) {
  if (jsonLdRecipe) {
    return `[JSON-LD Recipe Data]\n${JSON.stringify(jsonLdRecipe, null, 2)}`;
  }

  $(
    'script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, ' +
    '.comments, #comments, .social-share, .newsletter, .popup, .cookie-notice, ' +
    '.related-posts, .author-bio, [aria-label="advertisement"]'
  ).remove();

  let content = '';
  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 300) {
      content = el.text();
      break;
    }
  }

  if (!content) content = $('body').text();

  return content.replace(/\s+/g, ' ').trim();
}

const FETCH_TIMEOUT_MS = 20000;

async function extractFromUrl(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err && typeof err === 'object' ? err.name : '';
    const cause =
      err && typeof err === 'object' && err.cause && typeof err.cause === 'object'
        ? err.cause.message || err.cause.code || ''
        : '';
    if (name === 'AbortError' || String(err.message || '').toLowerCase().includes('timeout')) {
      throw new Error(
        `Timed out loading the page (${Math.round(FETCH_TIMEOUT_MS / 1000)}s). Try again or use “From image” with a screenshot.`
      );
    }
    const detail = cause ? ` ${cause}` : '';
    throw new Error(
      `Could not load the URL.${detail} Check the link and your network, or use “From image” with a screenshot.`
    );
  }

  if (response.status === 402 || response.status === 403) {
    throw new Error(
      'That site blocked automated loading (common on some food sites and social links). Try another recipe URL, or use “From image” after opening the recipe in your browser.'
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (HTTP ${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const jsonLdRecipe = findJsonLdRecipe($);
  const imageCandidates = collectRecipeImageCandidates(jsonLdRecipe, $, url);
  const imageUrl = imageCandidates[0] || pickContentImage($, url) || null;

  const text = buildTextFromPage($, jsonLdRecipe);

  return { text, imageUrl, imageCandidates };
}

async function extractTextFromUrl(url) {
  const { text } = await extractFromUrl(url);
  return text;
}

module.exports = { extractFromUrl, extractTextFromUrl };
