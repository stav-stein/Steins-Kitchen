import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../store/useRecipeStore';
import { RecipeCard, RecipeHeroCard } from '../components/RecipeCard';
import { Icon } from '../components/ui/Icon';

const CATEGORIES = [
  { key: 'breakfast', icon: 'sunny', color: 'bg-tertiary-fixed/50' },
  { key: 'lunch',     icon: 'lunch_dining', color: 'bg-primary-fixed/50' },
  { key: 'dinner',    icon: 'dinner_dining', color: 'bg-primary-container/30' },
  { key: 'dessert',   icon: 'cake', color: 'bg-secondary-fixed/50' },
  { key: 'drinks',    icon: 'local_cafe', color: 'bg-surface-container-highest' },
  { key: 'snack',     icon: 'cookie', color: 'bg-tertiary-fixed-dim/30' },
];

export function Discover() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { recipes, loadRecipes } = useRecipeStore();

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const recentlyCooked = recipes
    .filter(r => r.lastCooked)
    .sort((a, b) => new Date(b.lastCooked!).getTime() - new Date(a.lastCooked!).getTime())
    .slice(0, 5);

  const recentlyAdded = recipes.slice(0, 3);

  const favorites = recipes.filter(r => r.isFavorite).slice(0, 6);
  const forYou = favorites.length >= 3 ? favorites : recentlyAdded;

  const getByCategory = (cat: string) =>
    recipes.filter(r => r.tags?.some(t => t.toLowerCase() === cat)).length;

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center mb-6">
          <Icon name="menu_book" className="text-primary" size={40} />
        </div>
        <h2 className="font-headline text-3xl italic text-on-background mb-3">
          {t('discover.noRecipes')}
        </h2>
        <p className="text-on-surface-variant mb-8">{t('discover.addFirst')}</p>
        <button
          onClick={() => navigate('/add')}
          className="bg-primary text-on-primary px-8 py-4 rounded-full font-label font-bold
            uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-transform"
        >
          {t('nav.add')} Recipe
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Recently Cooked */}
      {recentlyCooked.length > 0 && (
        <section className="mt-6 px-6">
          <h3 className="font-headline text-2xl italic text-on-surface mb-4">
            {t('discover.recentlyCooked')}
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
            {recentlyCooked.map(r => (
              <RecipeHeroCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      {/* Seasonal Collections / Categories */}
      <section
        className={`bg-surface-container-low pb-8 pt-4 ${
          recentlyCooked.length > 0 ? 'mt-8' : 'mt-0'
        }`}
      >
        <div className="px-6">
          <h3 className="font-headline text-2xl italic text-on-surface">
            {t('discover.seasonal')}
          </h3>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 hide-scrollbar pt-2 pb-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => navigate(`/?category=${cat.key}`)}
              className="flex-none flex flex-col items-center gap-2 group"
            >
              <div className={`w-20 h-20 rounded-full ${cat.color} flex items-center justify-center
                ring-2 ring-transparent group-hover:ring-primary transition-all`}>
                <Icon name={cat.icon} className="text-primary" size={28} />
              </div>
              <span className="text-center font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t(`discover.categories.${cat.key}`)}
              </span>
              {getByCategory(cat.key) > 0 && (
                <span className="text-[10px] text-on-surface-variant/60">
                  {getByCategory(cat.key)}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Curated For You */}
      {forYou.length > 0 && (
        <section className="px-6 mt-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="font-headline text-3xl italic text-on-background">
                {t('discover.forYou')}
              </h3>
              <p className="text-on-surface-variant font-body text-sm mt-1">
                {t('discover.forYouSubtitle')}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-primary font-label text-xs font-bold uppercase tracking-widest
                border-b border-primary-container pb-1 hover:opacity-70 transition-opacity"
            >
              {t('discover.viewAll')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {forYou.map(r => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      {/* All recipes if nothing special to show */}
      {recentlyCooked.length === 0 && forYou.length === 0 && recentlyAdded.length > 0 && (
        <section className="px-6 mt-10">
          <h3 className="font-headline text-3xl italic text-on-background mb-6">
            Your Recipes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentlyAdded.map(r => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="mx-6 mt-14 p-8 bg-surface-variant rounded-xl text-center">
        <h3 className="font-headline text-2xl italic text-on-background mb-3">Add a Recipe</h3>
        <p className="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto">
          Import from a website, social media, or upload a photo of a recipe card.
        </p>
        <button
          onClick={() => navigate('/add')}
          className="bg-primary text-on-primary px-8 py-3.5 rounded-full font-label font-bold
            uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-transform"
        >
          {t('nav.add')} Recipe
        </button>
      </section>
    </>
  );
}
