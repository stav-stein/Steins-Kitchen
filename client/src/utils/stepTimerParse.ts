const MINUTE_SEC = 60;
const HOUR_SEC = 3600;
const MAX_SEC = 48 * HOUR_SEC;

const HE_UNIT_END = String.raw`(?=\s|$|[,.;:!?…'")\]\-]|\u05be)`;
const HE_NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const HE_APPROX = String.raw`(?:כ[-–\u05be]?\s*|בערך\s+)?`;

export interface StepTimerCandidate {
  seconds: number;
  startIndex: number;
}

function parseFloatLocalized(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function parseStepTimerDurations(text: string): StepTimerCandidate[] {
  const raw: StepTimerCandidate[] = [];
  if (!text || !text.trim()) return [];

  const push = (seconds: number, startIndex: number) => {
    const s = Math.round(seconds);
    if (s > 0 && s <= MAX_SEC) raw.push({ seconds: s, startIndex });
  };

  const fixedPhrases: { re: RegExp; seconds: number }[] = [
    { re: /חצי\s*שעה/g, seconds: 30 * MINUTE_SEC },
    { re: /רבע\s*שעה/g, seconds: 15 * MINUTE_SEC },
    { re: /שעתיים/g, seconds: 2 * HOUR_SEC },
  ];
  for (const { re, seconds } of fixedPhrases) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      push(seconds, m.index);
    }
  }

  const patterns: { re: RegExp; unitSeconds: number }[] = [
    { re: /(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?)\b/gi, unitSeconds: HOUR_SEC },
    { re: /(\d+(?:[.,]\d+)?)\s*h\b/gi, unitSeconds: HOUR_SEC },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:minutes?|mins?)\b/gi, unitSeconds: MINUTE_SEC },
    { re: /(\d+(?:[.,]\d+)?)\s*min\b/gi, unitSeconds: MINUTE_SEC },
    { re: /(\d+(?:[.,]\d+)?)\s*(?:seconds?|secs?)\b/gi, unitSeconds: 1 },
    { re: /(\d+(?:[.,]\d+)?)\s*sec\b/gi, unitSeconds: 1 },
    { re: new RegExp(`${HE_APPROX}${HE_NUM}\\s*שעות?${HE_UNIT_END}`, 'gu'), unitSeconds: HOUR_SEC },
    { re: new RegExp(`${HE_APPROX}${HE_NUM}\\s*דק(?:ות|׳|')?${HE_UNIT_END}`, 'gu'), unitSeconds: MINUTE_SEC },
    { re: new RegExp(`${HE_APPROX}${HE_NUM}\\s*שניות?${HE_UNIT_END}`, 'gu'), unitSeconds: 1 },
  ];

  for (const { re, unitSeconds } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const val = parseFloatLocalized(m[1]);
      if (!Number.isNaN(val) && val > 0) push(val * unitSeconds, m.index);
    }
  }

  raw.sort((a, b) => a.startIndex - b.startIndex);

  const seen = new Set<number>();
  const out: StepTimerCandidate[] = [];
  for (const c of raw) {
    if (seen.has(c.seconds)) continue;
    seen.add(c.seconds);
    out.push(c);
  }
  return out;
}

export function formatTimerButtonLabel(
  seconds: number,
  labels: { hour: string; min: string; sec: string },
): string {
  const h = Math.floor(seconds / HOUR_SEC);
  const m = Math.floor((seconds % HOUR_SEC) / MINUTE_SEC);
  const s = seconds % MINUTE_SEC;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}${labels.hour}`);
  if (m > 0) parts.push(`${m}${labels.min}`);
  if (s > 0) parts.push(`${s}${labels.sec}`);
  if (parts.length === 0) return `0${labels.sec}`;
  return parts.join(' ');
}

export function formatCountdownClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / HOUR_SEC);
  const m = Math.floor((totalSeconds % HOUR_SEC) / MINUTE_SEC);
  const s = totalSeconds % MINUTE_SEC;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
