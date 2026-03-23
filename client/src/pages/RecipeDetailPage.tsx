import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../store/useRecipeStore';
import { RecipeDetail } from '../components/RecipeDetail';
import { Spinner } from '../components/ui/Spinner';

export function RecipeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, loadRecipes } = useRecipeStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recipes.length === 0) {
      setLoading(true);
      loadRecipes().finally(() => setLoading(false));
    }
  }, [loadRecipes, recipes.length]);

  const recipe = recipes.find(r => r.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-on-surface-variant text-lg">Recipe not found.</p>
        <button
          onClick={() => navigate('/')}
          className="text-primary font-medium hover:opacity-70"
        >
          {t('recipe.notFoundBack')}
        </button>
      </div>
    );
  }

  return <RecipeDetail recipe={recipe} />;
}
