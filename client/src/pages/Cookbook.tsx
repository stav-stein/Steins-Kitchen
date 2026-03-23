import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../store/useRecipeStore';
import { RecipeCard } from '../components/RecipeCard';
import { Spinner } from '../components/ui/Spinner';
import { Icon } from '../components/ui/Icon';

type Filter = 'all' | 'favorites' | 'recent';

export function Cookbook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const { recipes, loading, loadRecipes } = useRecipeStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  let filtered = recipes;

  // Category filter from URL param
  if (categoryParam) {
    filtered = filtered.filter(r =>
      r.tags?.some(tag => tag.toLowerCase() === categoryParam.toLowerCase())
    );
  }

  // Tab filter
  if (filter === 'favorites') filtered = filtered.filter(r => r.isFavorite);
  if (filter === 'recent') {
    const week = Date.now() - 7 * 86400000;
    filtered = filtered.filter(r => new Date(r.createdAt).getTime() > week);
  }

  // Search
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.tags?.some(t => t.toLowerCase().includes(q)) ||
      r.ingredients?.some(i => i.name.toLowerCase().includes(q))
    );
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('cookbook.all') },
    { key: 'favorites', label: t('cookbook.favorites') },
    { key: 'recent', label: t('cookbook.recent') },
  ];

  return (
    <div className="px-6 pt-6">
      {/* Title */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-headline text-3xl italic text-on-background">
          {categoryParam
            ? categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)
            : t('cookbook.title')}
        </h2>
        {categoryParam && (
          <button
            onClick={() => navigate('/')}
            className="text-sm text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" size={20} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Icon name="search" className="absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('cookbook.search')}
          className="w-full ps-11 pe-4 py-3.5 rounded-full bg-surface-container border border-outline-variant
            text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2
            focus:ring-primary focus:border-transparent text-sm font-body"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full font-label font-bold uppercase tracking-wider text-xs
              transition-colors ${filter === f.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {f.label}
          </button>
        ))}
        <span className="ms-auto text-xs text-on-surface-variant self-center">
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Icon name="search_off" className="text-outline-variant mb-4" size={48} />
          <p className="text-on-surface-variant font-body">
            {search ? `No recipes matching "${search}"` : t('cookbook.empty')}
          </p>
          {!search && (
            <button
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
    </div>
  );
}
