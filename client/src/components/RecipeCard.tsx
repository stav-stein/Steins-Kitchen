import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../types/recipe';
import { useRecipeStore } from '../store/useRecipeStore';
import { recipeContentDir, recipeContentLang } from '../utils/recipeDirection';
import { recipeViewStrings } from '../utils/recipeViewStrings';
import { floatingActionIconBtn } from '../utils/floatingActionIconClasses';
import { getRecipeShareUrl, recipeShareCopiedMessage, shareRecipe } from '../utils/shareRecipe';
import { Icon } from './ui/Icon';
import { Toast } from './ui/Toast';

const CATEGORY_COLORS: Record<string, string> = {
  breakfast: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
  lunch: 'bg-primary-fixed text-on-primary-fixed',
  dinner: 'bg-primary-container text-on-primary-container',
  dessert: 'bg-secondary-fixed text-on-secondary-fixed',
  drinks: 'bg-surface-container-highest text-on-surface',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
};

const GRADIENT_BG = [
  'from-primary/20 to-primary-fixed',
  'from-secondary/20 to-secondary-fixed',
  'from-tertiary/20 to-tertiary-fixed',
  'from-primary-container to-primary-fixed',
];

interface RecipeCardProps {
  recipe: Recipe;
  size?: 'sm' | 'md' | 'lg';
}

export function RecipeCard({ recipe, size = 'md' }: RecipeCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toggleFavorite = useRecipeStore(s => s.toggleFavorite);
  const [toast, setToast] = useState<string | null>(null);

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const contentDir = recipeContentDir(recipe.language);
  const contentLang = recipeContentLang(recipe.language);
  const { r, shareStr } = recipeViewStrings(t, contentLang);
  const gradientIdx = recipe.id.charCodeAt(0) % GRADIENT_BG.length;
  const tagColor = CATEGORY_COLORS[recipe.tags?.[0]?.toLowerCase()] || CATEGORY_COLORS.dinner;

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(recipe.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await shareRecipe(recipe, t);
    if (result === 'clipboard') setToast(recipeShareCopiedMessage(t, recipe));
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getRecipeShareUrl(recipe));
      setToast(shareStr('linkCopied'));
    } catch {
      /* clipboard unavailable or denied */
    }
  };

  return (
    <div
      className="group cursor-pointer"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
    >
      {/* Image */}
      <div className={`relative overflow-hidden rounded-xl editorial-shadow bg-surface-container
        ${size === 'sm' ? 'aspect-[4/3]' : 'aspect-square'} mb-3`}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${GRADIENT_BG[gradientIdx]}
            flex items-center justify-center`}>
            <Icon name="restaurant" className="text-primary/30" size={48} />
          </div>
        )}

        <div className="absolute top-3 end-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleFav}
            className={floatingActionIconBtn}
          >
            <Icon name="favorite" filled={recipe.isFavorite} size={18} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={r('share')}
            className={floatingActionIconBtn}
          >
            <Icon name="share" size={18} />
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={shareStr('copyLink')}
            className={floatingActionIconBtn}
          >
            <Icon name="link" size={18} />
          </button>
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="absolute top-3 start-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${tagColor}`}>
              {recipe.tags[0]}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 text-center">
        <div className="flex flex-col items-center gap-2">
          <h4
            dir={contentDir}
            lang={contentLang}
            className="font-headline text-xl text-on-background group-hover:text-primary
            transition-colors leading-tight min-w-0 w-full"
          >
            {recipe.title}
          </h4>
          {recipe.rating && (
            <div className="flex items-center gap-0.5 bg-primary-fixed px-2 py-1 rounded-md shrink-0">
              <Icon name="star" filled size={12} className="text-primary" />
              <span className="text-[10px] font-bold text-primary">{recipe.rating}</span>
            </div>
          )}
        </div>
        <p className="text-on-surface-variant text-sm">
          {totalTime > 0 ? `${totalTime} ${t('recipe.min')}` : ''}{totalTime > 0 && ' • '}
          {t(`recipe.${recipe.difficulty}`)}
        </p>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// Compact horizontal card for "Recently Cooked"
export function RecipeHeroCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate();
  const contentDir = recipeContentDir(recipe.language);
  const contentLang = recipeContentLang(recipe.language);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return 'Last week';
    return `${Math.floor(days / 7)} weeks ago`;
  };

  const GRADIENT_BG = [
    'from-primary/20 to-primary-fixed',
    'from-secondary/20 to-secondary-fixed',
    'from-tertiary/20 to-tertiary-fixed',
  ];
  const gradientIdx = recipe.id.charCodeAt(0) % GRADIENT_BG.length;

  return (
    <div
      className="flex-none w-[75vw] md:w-80 group cursor-pointer"
      onClick={() => navigate(`/recipe/${recipe.id}`)}
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 editorial-shadow bg-surface-container">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${GRADIENT_BG[gradientIdx]} flex items-center justify-center`}>
            <Icon name="restaurant" className="text-primary/30" size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 start-3 end-3">
          <h4 dir={contentDir} lang={contentLang} className="text-white font-headline text-lg leading-tight">
            {recipe.title}
          </h4>
          <p className="text-white/80 font-label text-[10px] uppercase tracking-widest mt-1">
            {recipe.lastCooked ? `Made ${timeAgo(recipe.lastCooked)}` : 'Added recently'}
          </p>
        </div>
      </div>
    </div>
  );
}
