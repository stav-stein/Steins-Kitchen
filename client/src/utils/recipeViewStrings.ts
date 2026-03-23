import type { TFunction } from 'i18next';
import he from '../i18n/he.json';

type RecipeKey = keyof typeof he.recipe;
type ShareKey = keyof typeof he.share;

export function interpolateRecipeString(
  template: string,
  vars: Record<string, string | number>
): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{{${k}}}`).join(String(v)),
    template
  );
}

export function recipeViewStrings(t: TFunction, recipeLang: 'he' | 'en') {
  const isHe = recipeLang === 'he';
  const r = (key: RecipeKey) =>
    isHe ? String(he.recipe[key]) : t(`recipe.${key}`);
  const difficultyLabel = () => (isHe ? he.form.difficulty : t('form.difficulty'));
  const shareStr = (key: ShareKey) => (isHe ? String(he.share[key]) : t(`share.${key}`));

  return { r, difficultyLabel, shareStr, isHe };
}
