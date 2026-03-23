const DEFAULT_BASE = 'http://localhost:5173';

const BLOCKED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools:',
  'view-source:',
  'moz-extension://',
  'opera://',
];

function isBlockedUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return BLOCKED_PREFIXES.some((p) => lower.startsWith(p));
}

async function getBaseUrl() {
  const { baseUrl } = await chrome.storage.sync.get('baseUrl');
  const trimmed = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : '';
  return trimmed || DEFAULT_BASE;
}

chrome.action.onClicked.addListener(async (tab) => {
  const url = tab?.url;
  if (!url || isBlockedUrl(url)) return;

  const base = await getBaseUrl();
  const target = `${base}/add?url=${encodeURIComponent(url)}`;
  await chrome.tabs.create({ url: target });
});
