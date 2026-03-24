import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../store/useRecipeStore';
import { RecipeCard } from '../components/RecipeCard';
import { Spinner } from '../components/ui/Spinner';
import { Icon } from '../components/ui/Icon';

type MainFilter = 'all' | 'favorites' | 'recent' | 'cooked';

const CATEGORY_CHIPS = [
  { key: 'breakfast', icon: 'sunny', color: 'bg-tertiary-fixed/50' },
  { key: 'lunch', icon: 'lunch_dining', color: 'bg-primary-fixed/50' },
  { key: 'dinner', icon: 'dinner_dining', color: 'bg-primary-container/30' },
  { key: 'dessert', icon: 'cake', color: 'bg-secondary-fixed/50' },
  { key: 'drinks', icon: 'local_cafe', color: 'bg-surface-container-highest' },
  { key: 'snack', icon: 'cookie', color: 'bg-tertiary-fixed-dim/30' },
] as const;

export function Cookbook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const { recipes, loading, loadRecipes } = useRecipeStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MainFilter>('all');
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const getByCategory = (cat: string) =>
    recipes.filter(r => r.tags?.some(t => t.toLowerCase() === cat)).length;

  let filtered = recipes;

  if (categoryParam) {
    filtered = filtered.filter(r =>
      r.tags?.some(tag => tag.toLowerCase() === categoryParam.toLowerCase())
    );
  }

  if (filter === 'favorites') filtered = filtered.filter(r => r.isFavorite);
  if (filter === 'recent') {
    const week = Date.now() - 7 * 86400000;
    filtered = filtered.filter(r => new Date(r.createdAt).getTime() > week);
  }
  if (filter === 'cooked') {
    filtered = filtered.filter(r => Boolean(r.lastCooked));
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.tags?.some(tag => tag.toLowerCase().includes(q)) ||
      r.ingredients?.some(i => i.name.toLowerCase().includes(q))
    );
  }

  const mainFilters = useMemo(
    () =>
      [
        { key: 'all' as const, label: t('cookbook.all') },
        { key: 'favorites' as const, label: t('cookbook.favorites') },
        { key: 'recent' as const, label: t('cookbook.recent') },
        { key: 'cooked' as const, label: t('cookbook.cooked') },
      ],
    [t]
  );

  const selectCategory = (key: string) => {
    setSearchParams({ category: key });
    setMoreOpen(false);
  };

  const clearCategoryFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    setSearchParams(next);
  };

  const clearCategory = () => {
    clearCategoryFilter();
    setMoreOpen(false);
  };

  const categoryChipLabel =
    categoryParam &&
    (CATEGORY_CHIPS.some(c => c.key === categoryParam)
      ? t(`discover.categories.${categoryParam}`)
      : categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1));

  const emptyMessage = () => {
    if (search.trim()) return t('cookbook.emptySearch', { query: search });
    if (filter === 'cooked') return t('cookbook.emptyCooked');
    if (filter === 'favorites') return t('cookbook.emptyFavorites');
    if (filter === 'recent') return t('cookbook.emptyRecent');
    if (categoryParam) return t('cookbook.emptyCategory');
    return t('cookbook.empty');
  };

  return (
    <div className="pt-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-headline text-3xl italic text-on-background">
          {categoryParam
            ? categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)
            : t('cookbook.title')}
        </h2>
      </div>

      <div className="relative mb-5">
        <Icon name="search" className="absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('cookbook.search')}
          className="w-full ps-11 pe-4 py-3.5 rounded-full bg-surface-container border border-outline-variant
            text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2
            focus:ring-primary focus:border-transparent text-base md:text-sm font-body"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex gap-2 overflow-x-auto py-3 px-2 pe-5 hide-scrollbar flex-1 min-w-0">
          {mainFilters.map(f => {
            const active = filter === f.key;
            const chipClass = active
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high';
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`flex-none px-4 py-2 rounded-full font-label font-bold uppercase tracking-wider text-xs
                  transition-colors ${chipClass}`}
              >
                {f.label}
              </button>
            );
          })}
          {categoryParam && categoryChipLabel && (
            <span
              className="flex-none inline-flex items-center gap-1 ps-4 pe-1 py-2 rounded-full
                bg-primary-fixed/90 text-on-primary-fixed border border-primary/25"
            >
              <span className="font-label font-bold uppercase tracking-wider text-xs max-w-[140px] truncate">
                {categoryChipLabel}
              </span>
              <button
                type="button"
                onClick={clearCategoryFilter}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full p-0 leading-none
                  text-on-primary-fixed-variant transition-colors hover:bg-primary/15
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                aria-label={t('cookbook.removeCategoryFilter')}
              >
                <Icon name="close" size={14} className="block leading-none" />
              </button>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex-none flex items-center gap-1 px-4 py-2 rounded-full font-label font-bold uppercase tracking-wider text-xs
            transition-colors border border-outline-variant
            ${categoryParam ? 'bg-primary-container/40 text-primary border-primary/30' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
        >
          <Icon name="tune" size={18} />
          {t('cookbook.more')}
        </button>
        <span className="basis-full sm:basis-auto sm:ms-auto text-xs text-on-surface-variant self-center">
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Icon name="search_off" className="text-outline-variant mb-4" size={48} />
          <p className="text-on-surface-variant font-body max-w-sm">
            {emptyMessage()}
          </p>
          {!search && filter === 'all' && !categoryParam && (
            <button
              type="button"
              onClick={() => navigate('/add')}
              className="mt-6 bg-primary text-on-primary px-6 py-3 rounded-full font-label
                font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform"
            >
              {t('nav.add')} Recipe
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-4">
          {filtered.map(r => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}

      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookbook-filter-panel-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
            aria-label={t('cookbook.closeFilters')}
          />
          <div
            className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl sm:max-w-lg
              bg-background shadow-2xl border-t sm:border border-outline-variant"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 pt-5 pb-3 bg-background border-b border-outline-variant/60">
              <h3 id="cookbook-filter-panel-title" className="font-headline text-xl italic text-on-surface">
                {t('cookbook.filterByCategory')}
              </h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={22} />
              </button>
            </div>
            <section className="bg-surface-container-low pb-8 pt-4 mt-0">
              <div className="px-6">
                <h4 className="font-headline text-2xl italic text-on-surface">
                  {t('discover.seasonal')}
                </h4>
              </div>
              <div className="flex gap-4 overflow-x-auto px-6 hide-scrollbar pt-2 pb-3">
                {CATEGORY_CHIPS.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => selectCategory(cat.key)}
                    className="flex-none flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-20 h-20 rounded-full ${cat.color} flex items-center justify-center
                      ring-2 ${categoryParam === cat.key ? 'ring-primary' : 'ring-transparent group-hover:ring-primary'} transition-all`}
                    >
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
            {categoryParam && (
              <div className="px-6 pb-8 pt-2">
                <button
                  type="button"
                  onClick={clearCategory}
                  className="w-full py-3.5 rounded-full font-label font-bold uppercase tracking-widest text-xs
                    border-2 border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
                >
                  {t('cookbook.clearCategory')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
