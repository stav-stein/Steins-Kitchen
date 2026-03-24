import type { NavigateFunction } from 'react-router-dom';

function canPopHistory(): boolean {
  const state = window.history.state as { idx?: number } | null | undefined;
  const idx = state?.idx;
  return typeof idx === 'number' && idx > 0;
}

export function goBackOrHome(navigate: NavigateFunction) {
  if (canPopHistory()) {
    navigate(-1);
  } else {
    navigate('/');
  }
}

export function exitRecipeEditor(navigate: NavigateFunction, recipeId: string) {
  if (canPopHistory()) {
    navigate(-1);
  } else {
    navigate(`/recipe/${recipeId}`, { replace: true });
  }
}
