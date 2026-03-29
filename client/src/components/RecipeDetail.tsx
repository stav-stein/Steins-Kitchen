import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../types/recipe';
import { useRecipeStore } from '../store/useRecipeStore';
import { recipeContentDir, recipeContentLang } from '../utils/recipeDirection';
import { interpolateRecipeString, recipeViewStrings } from '../utils/recipeViewStrings';
import { floatingActionIconBtn } from '../utils/floatingActionIconClasses';
import { getRecipeShareUrl, recipeShareCopiedMessage, shareRecipe } from '../utils/shareRecipe';
import { goBackOrHome } from '../utils/navigation';
import { scaleIngredientQuantity } from '../utils/scaleIngredientQuantity';
import {
  formatCountdownClock,
  formatTimerButtonLabel,
  parseStepTimerDurations,
} from '../utils/stepTimerParse';
import { Icon } from './ui/Icon';
import { Toast } from './ui/Toast';

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
  const [ingredientMultiplier, setIngredientMultiplier] = useState<1 | 2 | 3>(1);
  const [stepTimerEndsAt, setStepTimerEndsAt] = useState<number | null>(null);
  const [stepTimerRemainingSec, setStepTimerRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    setIngredientMultiplier(1);
  }, [recipe.id]);

  const playableSteps = useMemo(() => {
    return [...recipe.steps]
      .sort((a, b) => a.order - b.order)
      .filter(s => s.text.trim().length > 0);
  }, [recipe.steps]);
  const canPlay = playableSteps.length > 0;

  const currentStepText = playableSteps[playStepIndex]?.text ?? '';
  const stepTimerOptions = useMemo(
    () => parseStepTimerDurations(currentStepText),
    [currentStepText],
  );

  const contentDir = recipeContentDir(recipe.language);
  const contentLang = recipeContentLang(recipe.language);
  const isRecipeRtl = contentDir === 'rtl';
  const { r, difficultyLabel, shareStr } = recipeViewStrings(t, contentLang);
  const rTimerRef = useRef(r);
  rTimerRef.current = r;

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

  useEffect(() => {
    if (!playMode) {
      setStepTimerEndsAt(null);
      setStepTimerRemainingSec(null);
    }
  }, [playMode]);

  useEffect(() => {
    if (stepTimerEndsAt == null) {
      setStepTimerRemainingSec(null);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((stepTimerEndsAt - Date.now()) / 1000));
      if (rem <= 0) {
        setStepTimerEndsAt(null);
        setStepTimerRemainingSec(null);
        setToast(rTimerRef.current('playStepTimerDone'));
        try {
          navigator.vibrate?.(200);
        } catch {
          /* no vibrate */
        }
        return;
      }
      setStepTimerRemainingSec(rem);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [stepTimerEndsAt]);

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

  const closePlayMode = () => {
    setStepTimerEndsAt(null);
    setPlayMode(false);
  };

  const startStepTimer = (seconds: number) => {
    setStepTimerEndsAt(Date.now() + seconds * 1000);
  };

  const cancelStepTimer = () => {
    setStepTimerEndsAt(null);
    setStepTimerRemainingSec(null);
  };

  const timerButtonLabel = (seconds: number) =>
    formatTimerButtonLabel(seconds, {
      hour: r('playTimerHourSuffix'),
      min: ` ${r('min')}`,
      sec: r('playTimerSecSuffix'),
    });

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
    const result = await shareRecipe(recipe, t);
    if (result === 'clipboard') setToast(recipeShareCopiedMessage(t, recipe));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getRecipeShareUrl(recipe));
      setToast(shareStr('linkCopied'));
    } catch {
      /* clipboard unavailable or denied */
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
    navigate('/');
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
          type="button"
          onClick={() => goBackOrHome(navigate)}
          className="absolute top-4 start-4 bg-white/70 backdrop-blur-md p-2.5 rounded-full
            text-on-surface hover:bg-white transition-colors"
        >
          <Icon name="arrow_back" size={22} />
        </button>

        <div className="absolute top-4 end-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/edit/${recipe.id}`)}
            aria-label={r('edit')}
            className={floatingActionIconBtn}
          >
            <Icon name="edit" size={20} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={r('share')}
            className={floatingActionIconBtn}
          >
            <Icon name="share" size={20} />
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={shareStr('copyLink')}
            className={floatingActionIconBtn}
          >
            <Icon name="link" size={20} />
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(recipe.id)}
            className={floatingActionIconBtn}
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
            { icon: 'schedule', label: r('prep'), value: `${recipe.prepTimeMinutes}` },
            { icon: 'local_fire_department', label: r('cook'), value: `${recipe.cookTimeMinutes}` },
            { icon: 'timer', label: r('total'), value: `${totalTime}` },
            { icon: 'people', label: r('servings'), value: `${recipe.servings}` },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <Icon name={stat.icon} className="text-primary mb-1" size={20} />
              <span className="font-headline text-xl text-on-background">{stat.value}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                {stat.label}
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
          <div
            dir={contentDir}
            lang={contentLang}
            className="flex flex-wrap items-center justify-between gap-3 mb-4"
          >
            <h2 className="font-headline text-2xl italic text-on-background m-0">
              {r('ingredients')}
            </h2>
            <div
              className="flex items-center gap-1.5 shrink-0"
              role="group"
              aria-label={r('ingredientScaleGroup')}
            >
              {([1, 2, 3] as const).map((m) => {
                const selected = ingredientMultiplier === m;
                const ariaKey =
                  m === 1 ? 'ingredientScaleOne' : m === 2 ? 'ingredientScaleTwo' : 'ingredientScaleThree';
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setIngredientMultiplier(m)}
                    aria-pressed={selected}
                    aria-label={r(ariaKey)}
                    className={`min-w-[2.5rem] px-2.5 py-1.5 rounded-full font-label font-bold text-xs uppercase tracking-wider transition-colors
                      ${selected
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    ×{m}
                  </button>
                );
              })}
            </div>
          </div>
          <div dir={contentDir} lang={contentLang} className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-outline-variant/40 last:border-0">
                <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <div>
                  <span className="text-on-background font-medium">
                    {[
                      scaleIngredientQuantity(ing.quantity, ingredientMultiplier),
                      ing.unit,
                      ing.name,
                    ]
                      .filter(Boolean)
                      .join(' ')}
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

        {/* Actions: primary labeled buttons, then separator, then icon-only */}
        <div dir={contentDir} lang={contentLang} className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
            <button
              type="button"
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
            <button
              type="button"
              onClick={() => navigate(`/edit/${recipe.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full
                bg-surface-container text-on-surface font-label font-bold uppercase tracking-wider text-xs
                hover:bg-surface-container-high transition-colors"
            >
              <Icon name="edit" size={16} />
              {r('edit')}
            </button>
            <span
              className="hidden sm:block w-px shrink-0 self-stretch min-h-[2.75rem] bg-outline-variant/50 sm:my-0.5"
              aria-hidden
            />
            <span className="sm:hidden w-full h-px bg-outline-variant/50 shrink-0" aria-hidden />
            <div className="flex items-center justify-center gap-2 shrink-0 sm:ps-1">
              <button
                type="button"
                onClick={handleShare}
                aria-label={r('share')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/35
                  text-primary transition-colors hover:bg-primary-fixed/35 active:scale-95"
              >
                <Icon name="share" size={20} />
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label={shareStr('copyLink')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/35
                  text-primary transition-colors hover:bg-primary-fixed/35 active:scale-95"
              >
                <Icon name="link" size={20} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label={r('delete')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-error/30
                  text-error transition-colors hover:bg-error-container active:scale-95"
              >
                <Icon name="delete" size={20} />
              </button>
            </div>
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
                          const line = [
                            scaleIngredientQuantity(ing.quantity, ingredientMultiplier),
                            ing.unit,
                            ing.name,
                          ]
                            .filter(Boolean)
                            .join(' ');
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
                  {stepTimerOptions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/25">
                      <p className="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                        {r('playStepTimerTitle')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stepTimerOptions.map(opt => (
                          <button
                            key={opt.seconds}
                            type="button"
                            onClick={() => startStepTimer(opt.seconds)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-surface-container-lowest/80
                              px-3 py-2 text-xs font-label font-bold uppercase tracking-wider text-primary
                              hover:bg-primary-fixed/30 transition-colors focus:outline-none focus-visible:ring-2
                              focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
                            aria-label={interpolateRecipeString(r('playStepTimerStartAria'), {
                              label: timerButtonLabel(opt.seconds),
                            })}
                          >
                            <Icon name="timer" size={18} />
                            {interpolateRecipeString(r('playStepTimerStart'), {
                              label: timerButtonLabel(opt.seconds),
                            })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div
              dir={contentDir}
              className="shrink-0 border-t border-outline-variant/30 bg-surface-container-low"
            >
              {stepTimerRemainingSec !== null && stepTimerRemainingSec > 0 && (
                <div
                  className="flex items-center justify-between gap-3 px-5 pt-3 pb-2"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="timer" className="text-primary shrink-0" size={22} />
                    <span className="font-headline text-2xl tabular-nums text-on-background tracking-tight">
                      {formatCountdownClock(stepTimerRemainingSec)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelStepTimer}
                    className="shrink-0 rounded-full border border-outline px-3 py-2 text-xs font-label font-bold uppercase
                      tracking-wider text-on-surface hover:bg-surface-container transition-colors
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                      focus-visible:ring-offset-surface-container-low"
                  >
                    {r('playStepTimerCancel')}
                  </button>
                </div>
              )}
              <div
                className={`flex gap-3 px-5 ${stepTimerRemainingSec !== null && stepTimerRemainingSec > 0 ? 'pt-1' : 'pt-3'}
                  pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
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
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
