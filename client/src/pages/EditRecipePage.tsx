import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../store/useRecipeStore';
import { RecipeForm } from '../components/RecipeForm';
import type { RecipeExtraction } from '../types/recipe';
import { Spinner } from '../components/ui/Spinner';
import { Icon } from '../components/ui/Icon';
import { exitRecipeEditor } from '../utils/navigation';

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { recipes, loadRecipes, updateRecipe } = useRecipeStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editorPageDir, setEditorPageDir] = useState<'rtl' | 'ltr'>('rtl');

  useEffect(() => {
    if (recipes.length === 0) {
      setLoading(true);
      loadRecipes().finally(() => setLoading(false));
    }
  }, [loadRecipes, recipes.length]);

  const recipe = recipes.find(r => r.id === id);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <p className="text-on-surface-variant">Recipe not found.</p>
        <button onClick={() => navigate('/')} className="text-primary hover:opacity-70">
          ← Back
        </button>
      </div>
    );
  }

  const handleSave = async (data: RecipeExtraction) => {
    setSaveError('');
    setSaving(true);
    try {
      await updateRecipe(recipe.id, data);
      exitRecipeEditor(navigate, recipe.id);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t('errors.saveFailed');
      setSaveError(message);
      setSaving(false);
    }
  };

  return (
    <div className="px-6 pt-6 pb-10">
      <div className="mb-6 flex items-center gap-3" dir="ltr">
        <button
          type="button"
          onClick={() => exitRecipeEditor(navigate, recipe.id)}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-container p-2 text-on-surface hover:bg-surface-container-high"
          aria-label={t('add.back')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="block shrink-0 leading-none"
            aria-hidden
          >
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2 className="font-headline min-w-0 truncate text-2xl italic text-on-background">
            {t('recipe.editPageTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setEditorPageDir(d => (d === 'rtl' ? 'ltr' : 'rtl'))}
            className="shrink-0 rounded-full border border-outline-variant/40 bg-surface-container px-3 py-1.5
              text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-high"
            aria-label={
              editorPageDir === 'rtl'
                ? t('recipe.editorLayoutAriaToLtr')
                : t('recipe.editorLayoutAriaToRtl')
            }
          >
            {editorPageDir === 'rtl' ? t('recipe.editorLayoutEn') : t('recipe.editorLayoutHe')}
          </button>
        </div>
      </div>
      <div dir={editorPageDir}>
        {saveError ? (
          <div
            className="mb-4 flex gap-2 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            <Icon name="error" size={20} className="mt-0.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        ) : null}
        <RecipeForm initial={recipe} onSave={handleSave} saving={saving} />
      </div>
    </div>
  );
}
