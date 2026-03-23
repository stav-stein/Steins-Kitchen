import { create } from 'zustand';
import type { Recipe, RecipeExtraction, RecipeSource } from '../types/recipe';
import { api } from '../api/client';

interface RecipeStore {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  loadRecipes: () => Promise<void>;
  saveRecipe: (extraction: RecipeExtraction, source: RecipeSource) => Promise<Recipe>;
  updateRecipe: (id: string, data: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  markCooked: (id: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  loading: false,
  error: null,

  loadRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const recipes = await api.recipes.list();
      set({ recipes, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  saveRecipe: async (extraction, source) => {
    const recipe = await api.recipes.create({ ...extraction, source });
    set(state => ({ recipes: [recipe, ...state.recipes] }));
    return recipe;
  },

  updateRecipe: async (id, data) => {
    const updated = await api.recipes.update(id, data);
    set(state => ({
      recipes: state.recipes.map(r => (r.id === id ? updated : r)),
    }));
  },

  deleteRecipe: async (id) => {
    await api.recipes.delete(id);
    set(state => ({ recipes: state.recipes.filter(r => r.id !== id) }));
  },

  toggleFavorite: async (id) => {
    const recipe = get().recipes.find(r => r.id === id);
    if (!recipe) return;
    await get().updateRecipe(id, { isFavorite: !recipe.isFavorite });
  },

  markCooked: async (id) => {
    await get().updateRecipe(id, { lastCooked: new Date().toISOString() });
  },
}));
