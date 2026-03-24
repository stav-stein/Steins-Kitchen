import type { NavigateFunction } from 'react-router-dom';

export function goBackOrHome(navigate: NavigateFunction) {
  const state = window.history.state as { idx?: number } | null | undefined;
  const idx = state?.idx;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
  } else {
    navigate('/');
  }
}
