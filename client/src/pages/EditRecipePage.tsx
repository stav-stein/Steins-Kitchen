import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../store/useRecipeStore';
import { RecipeForm } from '../components/RecipeForm';
import type { RecipeExtraction } from '../types/recipe';
import { Spinner } from '../components/ui/Spinner';
import { Icon } from '../components/ui/Icon';

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { recipes, loadRecipes, updateRecipe } = useRecipeStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
      navigate(`/recipe/${recipe.id}`);
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
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/recipe/${recipe.id}`, { replace: true })}
          className="p-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <h2 className="font-headline text-2xl italic text-on-background">
          {t('recipe.edit')} Recipe
        </h2>
      </div>
      {saveError ? (
        <div
          className="mb-4 flex gap-2 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          <Icon name="error" size={20} className="shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      ) : null}
      <RecipeForm initial={recipe} onSave={handleSave} saving={saving} />
    </div>
  );
}
