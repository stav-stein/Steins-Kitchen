const Anthropic = require('@anthropic-ai/sdk');

const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
const client = new Anthropic({ apiKey });

const DEFAULT_EXTRACTION_MODEL = 'claude-sonnet-4-20250514';

const EXTRACTION_MODEL =
  (process.env.ANTHROPIC_MODEL || '').trim() || DEFAULT_EXTRACTION_MODEL;

function mapAnthropicError(err) {
  const status = err.status ?? err.statusCode;
  const msg = String(err.message || '');
  if (status === 401 || /authentication|invalid x-api-key|api.key/i.test(msg)) {
    return new Error(
      'Anthropic API key is missing or invalid. Check ANTHROPIC_API_KEY in the project root .env and restart the server.'
    );
  }
  if (
    status === 404 ||
    (status === 400 && /model|not_found|not found/i.test(msg))
  ) {
    return new Error(
      `Anthropic rejected the extraction model (${EXTRACTION_MODEL}). Set ANTHROPIC_MODEL in the project root .env to an id your key accepts — try claude-sonnet-4-20250514 or claude-sonnet-4-6 (newer keys often only allow Sonnet 4), or older snapshots like claude-3-5-sonnet-20241022 if your org still enables them — then restart the server.`
    );
  }
  return err;
}

const SYSTEM_PROMPT = `You are a recipe extraction assistant for "Stein's Kitchen", a family recipe app.

Extract a complete, usable recipe from the provided content and return it as valid JSON with this exact structure:
{
  "title": "string",
  "description": "string (1-2 engaging sentences about the dish)",
  "servings": number,
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "difficulty": "easy" | "medium" | "hard",
  "tags": ["string"],
  "ingredients": [
    { "quantity": "string", "unit": "string", "name": "string", "note": "string (optional, omit if empty)" }
  ],
  "steps": [
    { "order": number, "text": "string" }
  ],
  "notes": "string (optional, omit if empty)",
  "language": "en" | "he"
}

Rules:
- Extract ONLY information present in the source. Never invent steps or ingredients.
- Set language to "he" if content is primarily in Hebrew, otherwise "en".
- difficulty: easy = simple, under 30 min; medium = some skill; hard = advanced techniques.
- For ingredients, split properly: "2 cups flour" → quantity:"2", unit:"cups", name:"flour".
- Tags: include category (breakfast/lunch/dinner/dessert/snack), dietary (vegan/vegetarian/gluten-free), cuisine, and key ingredients.
- Return ONLY the JSON object. No markdown fences, no explanation text.`;

function normalizeImageInputs(imageInput) {
  if (!imageInput) return [];
  const raw = Array.isArray(imageInput) ? imageInput : [imageInput];
  return raw
    .filter(Boolean)
    .map((item) =>
      typeof item === 'string'
        ? { base64: item, mediaType: 'image/jpeg' }
        : { base64: item.base64, mediaType: item.mediaType || 'image/jpeg' }
    )
    .filter((item) => item.base64 && String(item.base64).length > 0);
}

async function extractRecipe(textContent, imageInput = null) {
  const messages = [];
  const images = normalizeImageInputs(imageInput);

  if (images.length > 0) {
    const content = images.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    }));
    const promptText =
      images.length > 1
        ? 'These images are parts of the same recipe (for example split screenshots or multiple pages). Extract one complete recipe by combining all visible information. Merge overlapping text; do not duplicate ingredients or steps.'
        : 'Please extract the recipe from this image.';
    content.push({ type: 'text', text: promptText });
    messages.push({ role: 'user', content });
  } else {
    const truncated = textContent.slice(0, 10000);
    messages.push({
      role: 'user',
      content: `Please extract the recipe from this content:\n\n${truncated}`,
    });
  }

  let response;
  try {
    response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });
  } catch (err) {
    throw mapAnthropicError(err);
  }

  const textBlock = Array.isArray(response.content)
    ? response.content.find((b) => b && b.type === 'text')
    : null;
  const rawText = textBlock && typeof textBlock.text === 'string' ? textBlock.text : '';
  const text = rawText.trim();
  if (!text) {
    throw new Error('No text in Claude response; try again or shorten the source content.');
  }

  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON found in Claude response');

  return JSON.parse(jsonMatch[0]);
}

module.exports = { extractRecipe };
