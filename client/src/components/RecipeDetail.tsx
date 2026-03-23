import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../types/recipe';
import { useRecipeStore } from '../store/useRecipeStore';
import { recipeContentDir, recipeContentLang } from '../utils/recipeDirection';
import { interpolateRecipeString, recipeViewStrings } from '../utils/recipeViewStrings';
import { Icon } from './ui/Icon';
import { Toast } from './ui/Toast';

function formatRecipeText(recipe: Recipe): string {
  const lines: string[] = [
    recipe.title,
    recipe.description || '',
    '',
    `Prep: ${recipe.prepTimeMinutes} min | Cook: ${recipe.cookTimeMinutes} min | Serves: ${recipe.servings}`,
    '',
    '— INGREDIENTS —',
    ...recipe.ingredients.map(
      i => `• ${i.quantity} ${i.unit} ${i.name}${i.note ? ` (${i.note})` : ''}`.trim()
    ),
    '',
    '— INSTRUCTIONS —',
    ...recipe.steps.map(s => `${s.order}. ${s.text}`),
  ];
  if (recipe.notes) lines.push('', `Notes: ${recipe.notes}`);
  if (recipe.sourceUrl) lines.push('', `Source: ${recipe.sourceUrl}`);
  return lines.join('\n');
}

interface RecipeDetailProps {
  recipe: Recipe;
}

export function RecipeDetail({ recipe }: RecipeDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toggleFavorite, markCooked, deleteRecipe } = useRecipeStore();
  const [toast, setToast] = useState<string | null>(null);
  const [cookMarked, setCookMarked] = useState(false);
  const [playMode, setPlayMode] = useState(false);
  const [playStepIndex, setPlayStepIndex] = useState(0);
  const [playCheckedIngredients, setPlayCheckedIngredients] = useState<Record<number, boolean>>({});
  const [gatherExpanded, setGatherExpanded] = useState(true);

  const playableSteps = useMemo(() => {
    return [...recipe.steps]
      .sort((a, b) => a.order - b.order)
      .filter(s => s.text.trim().length > 0);
  }, [recipe.steps]);
  const canPlay = playableSteps.length > 0;

  const contentDir = recipeContentDir(recipe.language);
  const contentLang = recipeContentLang(recipe.language);
  const isRecipeRtl = contentDir === 'rtl';
  const { r, difficultyLabel, shareStr } = recipeViewStrings(t, contentLang);

  useEffect(() => {
    if (!playMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [playMode]);

  useEffect(() => {
    if (!playMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlayMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playMode]);

  const openPlayMode = () => {
    if (!canPlay) {
      setToast(r('noStepsForPlay'));
      return;
    }
    setPlayStepIndex(0);
    setPlayCheckedIngredients({});
    setGatherExpanded(true);
    setPlayMode(true);
  };

  const togglePlayIngredient = (index: number) => {
    setPlayCheckedIngredients(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const ingredientsInPlay = recipe.ingredients;
  const playIngReadyCount = ingredientsInPlay.filter((_, i) => playCheckedIngredients[i]).length;
  const stepProgressPct =
    playableSteps.length > 0 ? ((playStepIndex + 1) / playableSteps.length) * 100 : 0;

  const closePlayMode = () => setPlayMode(false);

  const goNext = () => {
    if (playStepIndex >= playableSteps.length - 1) {
      closePlayMode();
      return;
    }
    setPlayStepIndex(i => i + 1);
  };

  const goPrev = () => {
    setPlayStepIndex(i => Math.max(0, i - 1));
  };

  const handleShare = async () => {
    const text = formatRecipeText(recipe);
    const url = `${window.location.origin}/recipe/${recipe.id}`;
    const textWithLink = `${text}\n\n${url}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text,
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(textWithLink);
      setToast(shareStr('copied'));
    }
  };

  const handleMarkCooked = async () => {
    await markCooked(recipe.id);
    setCookMarked(true);
    setToast(r('markedCooked'));
  };

  const handleDelete = async () => {
    if (!window.confirm(r('deleteConfirm'))) return;
    await deleteRecipe(recipe.id);
    navigate(-1);
  };

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const GRADIENT_BG = [
    'from-primary/20 to-primary-fixed',
    'from-secondary/20 to-secondary-fixed',
    'from-tertiary/20 to-tertiary-fixed',
  ];
  const gradientIdx = recipe.id.charCodeAt(0) % GRADIENT_BG.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative aspect-[4/3] md:aspect-[16/7] overflow-hidden bg-surface-container">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${GRADIENT_BG[gradientIdx]} flex items-center justify-center`}>
            <Icon name="restaurant" className="text-primary/20" size={80} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 start-4 bg-white/70 backdrop-blur-md p-2.5 rounded-full
            text-on-surface hover:bg-white transition-colors"
        >
          <Icon name="arrow_back" size={22} />
        </button>

        <div className="absolute top-4 end-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            aria-label={r('share')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70
              backdrop-blur-md text-secondary transition-colors hover:bg-secondary hover:text-white"
          >
            <Icon name="share" size={20} />
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70
              backdrop-blur-md text-secondary transition-colors hover:bg-secondary hover:text-white"
          >
            <Icon name="favorite" filled={recipe.isFavorite} size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={openPlayMode}
          disabled={!canPlay}
          aria-label={r('playCook')}
          className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full
            font-label font-bold uppercase tracking-wider text-xs shadow-lg transition-colors
            ${canPlay
              ? 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
              : 'bg-white/40 text-on-surface/50 cursor-not-allowed'}`}
        >
          <Icon name="play_circle" filled size={22} />
          {r('playCook')}
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-10 -mt-6 relative">
        <div dir={contentDir} lang={contentLang}>
          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.tags.slice(0, 4).map(tag => (
                <span key={tag}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1
                    bg-primary-fixed text-on-primary-fixed rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="font-headline text-3xl md:text-4xl italic text-on-background leading-tight mb-3">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-on-surface-variant text-base leading-relaxed mb-6">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Stats Bar */}
        <div
          dir={contentDir}
          lang={contentLang}
          className="grid grid-cols-4 gap-3 p-4 bg-surface-container-low rounded-xl mb-8"
        >
          {[
            { icon: 'schedule', label: r('prep'), value: `${recipe.prepTimeMinutes}`, unit: r('min') },
            { icon: 'local_fire_department', label: r('cook'), value: `${recipe.cookTimeMinutes}`, unit: r('min') },
            { icon: 'timer', label: r('total'), value: `${totalTime}`, unit: r('min') },
            { icon: 'people', label: r('servings'), value: `${recipe.servings}`, unit: '' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <Icon name={stat.icon} className="text-primary mb-1" size={20} />
              <span className="font-headline text-xl text-on-background">{stat.value}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                {stat.unit || stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Difficulty */}
        <div dir={contentDir} lang={contentLang} className="flex items-center gap-2 mb-8">
          <span className="text-sm text-on-surface-variant">{difficultyLabel()}:</span>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
            ${recipe.difficulty === 'easy'
              ? 'bg-primary-fixed text-on-primary-fixed'
              : recipe.difficulty === 'medium'
              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
              : 'bg-error-container text-on-error-container'}`}>
            {r(recipe.difficulty)}
          </span>
        </div>

        {/* Ingredients */}
        <section className="mb-8">
          <h2 dir={contentDir} lang={contentLang} className="font-headline text-2xl italic text-on-background mb-4">
            {r('ingredients')}
          </h2>
          <div dir={contentDir} lang={contentLang} className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-outline-variant/40 last:border-0">
                <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <div>
                  <span className="text-on-background font-medium">
                    {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}
                  </span>
                  {ing.note && (
                    <span className="text-on-surface-variant text-sm"> — {ing.note}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="mb-8">
          <h2 dir={contentDir} lang={contentLang} className="font-headline text-2xl italic text-on-background mb-4">
            {r('instructions')}
          </h2>
          <div dir={contentDir} lang={contentLang} className="space-y-6">
            {recipe.steps.map((step) => (
              <div key={step.order} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary
                  flex items-center justify-center font-bold text-sm">
                  {step.order}
                </div>
                <p className="text-on-surface leading-relaxed pt-1">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Notes */}
        {recipe.notes && (
          <section className="mb-8 p-4 bg-tertiary-fixed/30 rounded-xl border-s-4 border-tertiary">
            <h3 dir={contentDir} lang={contentLang} className="font-label font-bold uppercase tracking-wider text-tertiary text-xs mb-2">
              {r('notes')}
            </h3>
            <div dir={contentDir} lang={contentLang}>
              <p className="text-on-surface-variant text-sm leading-relaxed">{recipe.notes}</p>
            </div>
          </section>
        )}

        {/* Source link */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            dir={contentDir}
            lang={contentLang}
            className="flex items-center gap-2 text-primary text-sm font-medium mb-8 hover:opacity-70"
          >
            <Icon name="open_in_new" size={16} />
            {r('source')}
          </a>
        )}

        {/* Last cooked */}
        {recipe.lastCooked && (
          <p dir={contentDir} lang={contentLang} className="text-on-surface-variant text-xs mb-8">
            {r('madeOn')}: {new Date(recipe.lastCooked).toLocaleDateString()}
          </p>
        )}

        {/* Action Buttons */}
        <div dir={contentDir} lang={contentLang} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full
                border border-outline text-on-surface font-label font-bold uppercase tracking-wider text-xs
                hover:bg-surface-container transition-colors"
            >
              <Icon name="share" size={18} />
              {r('share')}
            </button>
            <button
              onClick={handleMarkCooked}
              disabled={cookMarked}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full
                font-label font-bold uppercase tracking-wider text-xs transition-colors
                ${cookMarked
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'}`}
            >
              <Icon name={cookMarked ? 'check_circle' : 'outdoor_grill'} filled={cookMarked} size={18} />
              {cookMarked ? r('markedCooked') : r('markCooked')}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/edit/${recipe.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full
                bg-surface-container text-on-surface font-label font-bold uppercase tracking-wider text-xs
                hover:bg-surface-container-high transition-colors"
            >
              <Icon name="edit" size={16} />
              {r('edit')}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-full
                text-error border border-error/30 font-label font-bold uppercase tracking-wider text-xs
                hover:bg-error-container transition-colors"
            >
              <Icon name="delete" size={16} />
              {r('delete')}
            </button>
          </div>
        </div>
      </div>

      {playMode && canPlay && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-background min-h-[100dvh]"
          role="region"
          aria-label={r('playCook')}
          aria-labelledby="cook-mode-title"
        >
          <div
            dir={contentDir}
            lang={contentLang}
            className="flex flex-col flex-1 min-h-0 w-full overflow-hidden"
          >
            <div
              className="flex items-center justify-between gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 border-b border-outline-variant/30
                bg-gradient-to-b from-primary-fixed/25 to-transparent shrink-0"
            >
              <h2
                id="cook-mode-title"
                className="font-headline text-xl italic text-on-background leading-tight min-w-0 flex-1 truncate"
              >
                {recipe.title}
              </h2>
              <button
                type="button"
                onClick={closePlayMode}
                className="shrink-0 p-2.5 rounded-full bg-surface-container-high text-on-surface-variant
                  hover:bg-surface-container-highest transition-colors"
                aria-label={r('playExit')}
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {ingredientsInPlay.length > 0 && (
                <section className="px-5 pt-5 pb-2" aria-labelledby="cook-gather-heading">
                  <div
                    dir={contentDir}
                    className="flex items-end justify-between gap-3 mb-3"
                  >
                    <h3
                      id="cook-gather-heading"
                      className="font-label font-bold uppercase tracking-wider text-xs text-on-surface-variant min-w-0"
                    >
                      {r('playGatherTitle')}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-label font-bold tabular-nums text-primary pe-1">
                        {interpolateRecipeString(r('playIngredientsCount'), {
                          checked: playIngReadyCount,
                          total: ingredientsInPlay.length,
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGatherExpanded((v) => !v)}
                        aria-expanded={gatherExpanded}
                        aria-controls="cook-gather-panel"
                        aria-label={gatherExpanded ? r('playGatherCollapse') : r('playGatherExpand')}
                        className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high
                          transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <Icon name={gatherExpanded ? 'expand_less' : 'expand_more'} size={22} />
                      </button>
                    </div>
                  </div>
                  {gatherExpanded && (
                    <div
                      id="cook-gather-panel"
                      dir={contentDir}
                      lang={contentLang}
                      className="rounded-2xl border border-outline-variant/35 bg-gradient-to-b from-surface-container-low
                        to-surface-container p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                      role="region"
                      aria-labelledby="cook-gather-heading"
                    >
                      <ul className="space-y-0.5">
                        {ingredientsInPlay.map((ing, i) => {
                          const line = [ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ');
                          const checked = !!playCheckedIngredients[i];
                          const id = `cook-ing-${recipe.id}-${i}`;
                          return (
                            <li key={i}>
                              <label
                                htmlFor={id}
                                className={`flex items-start gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition-colors
                                  ${checked ? 'bg-white/25' : 'hover:bg-white/40'}`}
                              >
                                <input
                                  id={id}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePlayIngredient(i)}
                                  className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-primary
                                    bg-surface-container-lowest text-primary accent-primary focus:ring-2
                                    focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-surface-container-low"
                                />
                                <span
                                  className={`text-sm leading-relaxed pt-0.5 ${
                                    checked
                                      ? 'line-through text-on-surface-variant'
                                      : 'text-on-background font-medium'
                                  }`}
                                >
                                  {line}
                                  {ing.note && (
                                    <span className="text-on-surface-variant font-normal"> — {ing.note}</span>
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              <section
                className={`px-5 ${ingredientsInPlay.length > 0 ? 'pt-6 pb-5' : 'pt-5 pb-5'}`}
                aria-labelledby="cook-steps-heading"
              >
                {ingredientsInPlay.length > 0 && (
                  <div
                    className="h-px bg-gradient-to-r from-transparent via-outline-variant/80 to-transparent mb-6"
                    aria-hidden
                  />
                )}
                <div dir={contentDir} className="flex items-end justify-between gap-3 mb-3">
                  <h3
                    id="cook-steps-heading"
                    className="font-label font-bold uppercase tracking-wider text-xs text-on-surface-variant"
                  >
                    {r('playStepsTitle')}
                  </h3>
                </div>

                <div className="relative h-2 rounded-full bg-outline-variant/35 overflow-hidden mb-4">
                  <div
                    className="absolute top-0 bottom-0 start-0 h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${stepProgressPct}%` }}
                  />
                </div>

                <div
                  dir={contentDir}
                  lang={contentLang}
                  className="rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-primary-fixed/40
                    via-surface-container-low to-surface-container p-5 shadow-editorial"
                >
                  <p
                    className="text-xs font-label font-bold uppercase tracking-wider text-primary mb-3"
                    aria-live="polite"
                  >
                    {interpolateRecipeString(r('playStep'), {
                      current: playStepIndex + 1,
                      total: playableSteps.length,
                    })}
                  </p>
                  <p className="font-headline text-xl md:text-2xl italic text-on-background leading-snug">
                    {playableSteps[playStepIndex]?.text}
                  </p>
                </div>
              </section>
            </div>

            <div
              dir={contentDir}
              className="flex gap-3 p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-outline-variant/30
                bg-surface-container-low shrink-0"
            >
              <button
                type="button"
                onClick={goPrev}
                disabled={playStepIndex === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full
                  border border-outline font-label font-bold uppercase tracking-wider text-xs transition-colors
                  ${playStepIndex === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-on-surface hover:bg-surface-container'}`}
              >
                <Icon name={isRecipeRtl ? 'arrow_forward' : 'arrow_back'} size={18} />
                {r('playPrevious')}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full
                  bg-primary text-on-primary font-label font-bold uppercase tracking-wider text-xs
                  hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-md"
              >
                {playStepIndex >= playableSteps.length - 1 ? (
                  <span className="flex items-center justify-center gap-2">
                    {r('playFinish')}
                    <Icon name="check_circle" size={18} />
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {r('playNext')}
                    <Icon name={isRecipeRtl ? 'arrow_back' : 'arrow_forward'} size={18} />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
