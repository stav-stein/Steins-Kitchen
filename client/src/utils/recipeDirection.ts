import type { Language } from '../types/recipe';

export function recipeContentDir(language: Language | string | undefined | null): 'rtl' | 'ltr' {
  return language === 'he' ? 'rtl' : 'ltr';
}

export function recipeContentLang(language: Language | string | undefined | null): 'he' | 'en' {
  return language === 'he' ? 'he' : 'en';
}
