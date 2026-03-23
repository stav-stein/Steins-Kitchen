export type RecipeSource = 'url' | 'image' | 'manual';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'en' | 'he';

export interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note?: string;
}

export interface Step {
  order: number;
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: Difficulty;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  notes?: string;
  source: RecipeSource;
  sourceUrl?: string;
  language: Language;
  isFavorite: boolean;
  rating?: number | null;
  lastCooked?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecipeExtraction = Omit<
  Recipe,
  'id' | 'createdAt' | 'updatedAt' | 'source' | 'isFavorite' | 'rating' | 'lastCooked'
> & {
  imageCandidates?: string[];
};

export const EMPTY_EXTRACTION: RecipeExtraction = {
  title: '',
  description: '',
  imageUrl: '',
  servings: 4,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  difficulty: 'easy',
  tags: [],
  ingredients: [{ quantity: '', unit: '', name: '' }],
  steps: [{ order: 1, text: '' }],
  notes: '',
  sourceUrl: '',
  language: 'en',
};
