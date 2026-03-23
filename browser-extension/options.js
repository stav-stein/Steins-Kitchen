const DEFAULT_BASE = 'http://localhost:5173';

const form = document.getElementById('form');
const input = document.getElementById('baseUrl');
const statusEl = document.getElementById('status');

async function load() {
  const { baseUrl } = await chrome.storage.sync.get('baseUrl');
  input.value = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : DEFAULT_BASE;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let value = input.value.trim().replace(/\/+$/, '');
  if (!value) value = DEFAULT_BASE;
  try {
    new URL(value);
  } catch {
    statusEl.hidden = false;
    statusEl.textContent = 'Invalid URL.';
    statusEl.style.color = '#b71c1c';
    return;
  }
  await chrome.storage.sync.set({ baseUrl: value });
  statusEl.hidden = false;
  statusEl.style.color = '#1b5e20';
  statusEl.textContent = 'Saved.';
});

load();
