const UNICODE_FRACTIONS: Record<string, [number, number]> = {
  '½': [1, 2],
  '⅓': [1, 3],
  '⅔': [2, 3],
  '¼': [1, 4],
  '¾': [3, 4],
  '⅛': [1, 8],
  '⅜': [3, 8],
  '⅝': [5, 8],
  '⅞': [7, 8],
  '⅕': [1, 5],
  '⅖': [2, 5],
  '⅗': [3, 5],
  '⅘': [4, 5],
  '⅙': [1, 6],
  '⅚': [5, 6],
};

function formatScaledAmount(n: number): string {
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-5) return String(rounded);
  const s = n.toFixed(2).replace(/\.?0+$/, '');
  return s;
}

function parseLeadingAmount(quantity: string): { value: number; rest: string } | null {
  const q = quantity.trim();
  if (!q) return null;

  const u = UNICODE_FRACTIONS[q[0]];
  if (u) {
    const [a, b] = u;
    return { value: a / b, rest: q.slice(1) };
  }

  let m = q.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)(.*)$/);
  if (m) {
    const whole = parseInt(m[1], 10);
    const a = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    if (b === 0 || Number.isNaN(whole) || Number.isNaN(a)) return null;
    return { value: whole + a / b, rest: m[4] };
  }

  m = q.match(/^(\d+)\s*\/\s*(\d+)(.*)$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (b === 0 || Number.isNaN(a)) return null;
    return { value: a / b, rest: m[3] };
  }

  m = q.match(/^(\d+[.,]\d+)(.*)$/);
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    if (!Number.isNaN(num)) return { value: num, rest: m[2] };
  }

  m = q.match(/^(\d+)(.*)$/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (!Number.isNaN(num)) return { value: num, rest: m[2] };
  }

  return null;
}

export function scaleIngredientQuantity(quantity: string, multiplier: number): string {
  if (multiplier === 1 || !quantity.trim()) return quantity;
  const parsed = parseLeadingAmount(quantity);
  if (parsed == null) return quantity;
  const scaled = parsed.value * multiplier;
  const formatted = formatScaledAmount(scaled);
  const rest = parsed.rest.trim();
  return rest ? `${formatted} ${rest}` : formatted;
}
