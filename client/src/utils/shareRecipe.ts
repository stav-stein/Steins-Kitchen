import type { TFunction } from 'i18next';
import type { Recipe } from '../types/recipe';
import { recipeContentLang } from './recipeDirection';
import { interpolateRecipeString, recipeViewStrings } from './recipeViewStrings';

function absoluteRecipeImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${window.location.origin}${path}`;
}

async function recipeImageFile(imageUrl: string): Promise<File | null> {
  try {
    const res = await fetch(absoluteRecipeImageUrl(imageUrl));
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    const sub = blob.type.split('/')[1] || 'jpeg';
    const ext = sub === 'svg+xml' ? 'svg' : sub;
    return new File([blob], `recipe.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

export type ShareRecipeResult = 'native' | 'clipboard' | 'cancelled';

export function getRecipeShareUrl(recipe: Pick<Recipe, 'id'>): string {
  return `${window.location.origin}/recipe/${recipe.id}`;
}

export async function shareRecipe(recipe: Recipe, t: TFunction): Promise<ShareRecipeResult> {
  const contentLang = recipeContentLang(recipe.language);
  const { shareStr } = recipeViewStrings(t, contentLang);
  const url = getRecipeShareUrl(recipe);
  const text = interpolateRecipeString(shareStr('blurb'), {
    title: recipe.title,
    url,
  });
  const shareData: ShareData = {
    title: recipe.title,
    text,
    url,
  };
  let file: File | null = null;
  if (recipe.imageUrl?.trim()) {
    file = await recipeImageFile(recipe.imageUrl.trim());
  }
  if (file && navigator.canShare?.({ files: [file] })) {
    shareData.files = [file];
  }
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return 'native';
    } catch {
      return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'clipboard';
}

export function recipeShareCopiedMessage(t: TFunction, recipe: Recipe): string {
  const { shareStr } = recipeViewStrings(t, recipeContentLang(recipe.language));
  return shareStr('copied');
}
