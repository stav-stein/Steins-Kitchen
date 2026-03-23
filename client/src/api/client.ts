import type { Recipe, RecipeExtraction, RecipeSource } from '../types/recipe';

const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  recipes: {
    list: () => req<Recipe[]>('/recipes'),
    get: (id: string) => req<Recipe>(`/recipes/${id}`),
    create: (data: RecipeExtraction & { source: RecipeSource }) =>
      req<Recipe>('/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Recipe>) =>
      req<Recipe>(`/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      req<{ ok: true }>(`/recipes/${id}`, { method: 'DELETE' }),
  },
  extract: {
    fromUrl: (url: string) =>
      req<RecipeExtraction>('/extract/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }),
    fromImage: (files: File | File[]) => {
      const list = Array.isArray(files) ? files : [files];
      const form = new FormData();
      for (const file of list) {
        form.append('images', file);
      }
      return req<RecipeExtraction>('/extract/image', { method: 'POST', body: form });
    },
  },
};
