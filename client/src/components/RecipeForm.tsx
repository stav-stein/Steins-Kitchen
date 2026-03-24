import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecipeExtraction, Ingredient, Step, Difficulty, Language } from '../types/recipe';
import { EMPTY_EXTRACTION } from '../types/recipe';
import { recipeContentDir, recipeContentLang } from '../utils/recipeDirection';
import { Icon } from './ui/Icon';
import { Spinner } from './ui/Spinner';

function forFormState(initial: RecipeExtraction): RecipeExtraction {
  const { imageCandidates: _omit, ...rest } = initial;
  const raw = rest.imageUrl;
  const imageUrl =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : '';
  return { ...EMPTY_EXTRACTION, ...rest, imageUrl };
}

function inferImageModeFromUrl(imageUrl: string): 'url' | 'upload' {
  const u = imageUrl.trim();
  if (u.startsWith('/uploads/')) return 'upload';
  return 'url';
}

interface RecipeFormProps {
  initial?: RecipeExtraction;
  onSave: (data: RecipeExtraction) => void;
  saving?: boolean;
  submitLabel?: string;
  urlImageChoices?: string[];
}

export function RecipeForm({
  initial = EMPTY_EXTRACTION,
  onSave,
  saving,
  submitLabel,
  urlImageChoices,
}: RecipeFormProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<RecipeExtraction>(() => forFormState(initial));
  const [imageMode, setImageMode] = useState<'url' | 'upload'>(() =>
    inferImageModeFromUrl(forFormState(initial).imageUrl || ''),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const imageFileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof RecipeExtraction>(key: K, val: RecipeExtraction[K]) =>
    setData(d => ({ ...d, [key]: val }));

  // Ingredients
  const updateIngredient = (idx: number, field: keyof Ingredient, val: string) => {
    const updated = [...data.ingredients];
    updated[idx] = { ...updated[idx], [field]: val };
    set('ingredients', updated);
  };
  const addIngredient = () =>
    set('ingredients', [...data.ingredients, { quantity: '', unit: '', name: '' }]);
  const removeIngredient = (idx: number) =>
    set('ingredients', data.ingredients.filter((_, i) => i !== idx));

  // Steps
  const updateStep = (idx: number, val: string) => {
    const updated = [...data.steps];
    updated[idx] = { ...updated[idx], text: val };
    set('steps', updated);
  };
  const addStep = () =>
    set('steps', [...data.steps, { order: data.steps.length + 1, text: '' }]);
  const removeStep = (idx: number) =>
    set('steps', data.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const body = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) {
        const msg = body?.error?.trim() || `Upload failed (${res.status})`;
        throw new Error(msg);
      }
      const url = body && typeof body === 'object' && 'url' in body ? String((body as { url: string }).url) : '';
      if (!url) throw new Error(t('form.imageUploadFailed'));
      set('imageUrl', url);
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim() ? e.message : t('form.imageUploadFailed');
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  const inputCls = `w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant
    text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2
    focus:ring-primary focus:border-transparent transition text-base md:text-sm font-body`;
  const labelCls = `block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5`;
  const contentDir = recipeContentDir(data.language);
  const contentLang = recipeContentLang(data.language);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className={labelCls}>{t('form.title')} *</label>
        <input
          required
          value={data.title}
          onChange={e => set('title', e.target.value)}
          placeholder={t('form.title')}
          dir={contentDir}
          lang={contentLang}
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>{t('form.description')}</label>
        <textarea
          rows={3}
          value={data.description}
          onChange={e => set('description', e.target.value)}
          placeholder={t('form.description')}
          dir={contentDir}
          lang={contentLang}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Image */}
      <div>
        <label className={labelCls}>{t('form.image')}</label>

        {urlImageChoices && urlImageChoices.length > 0 ? (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
              {t('form.pickImageFromPage')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {urlImageChoices.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    set('imageUrl', u);
                    setImageMode('url');
                  }}
                  className={`shrink-0 w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden border-2 transition-all
                    ${data.imageUrl === u
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-outline-variant opacity-90 hover:opacity-100'}`}
                >
                  <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <>
            <div className="flex bg-surface-container-high rounded-xl p-0.5 mb-3 w-fit gap-0.5">
              {(['url', 'upload'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setImageMode(mode);
                    setUploadError('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    uppercase tracking-wider transition-all
                    ${imageMode === mode
                      ? 'bg-white shadow-sm text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  <Icon name={mode === 'url' ? 'link' : 'upload'} size={14} />
                  {mode === 'url' ? t('form.imageModeUrl') : t('form.imageModeUpload')}
                </button>
              ))}
            </div>

            {imageMode === 'url' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={data.imageUrl || ''}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder={t('form.imageUrlPlaceholder')}
                  dir="ltr"
                  lang="en"
                  className={inputCls}
                />
                {data.imageUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant">
                    <img
                      src={data.imageUrl}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg shrink-0 bg-surface-container-high"
                    />
                    <p className="text-xs text-on-surface-variant truncate min-w-0">{data.imageUrl}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) void handleImageUpload(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
                {data.imageUrl && !uploading ? (
                  <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant">
                    <img
                      src={data.imageUrl}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface font-medium truncate">{t('form.imageUploadedLabel')}</p>
                      <p className="text-xs text-on-surface-variant truncate">{data.imageUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        set('imageUrl', '');
                        if (imageFileRef.current) imageFileRef.current.value = '';
                      }}
                      className="text-on-surface-variant hover:text-error transition-colors p-1 shrink-0"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageFileRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-3 py-5 rounded-xl
                      border-2 border-dashed border-outline-variant hover:border-primary
                      hover:bg-primary-fixed/10 transition-all disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Spinner className="scale-75" />
                        <span className="text-sm text-on-surface-variant">{t('form.uploadingImage')}</span>
                      </>
                    ) : (
                      <>
                        <Icon name="add_photo_alternate" className="text-primary" size={24} />
                        <span className="text-sm text-on-surface-variant">{t('form.tapToChoosePhoto')}</span>
                      </>
                    )}
                  </button>
                )}
                {uploadError ? (
                  <p className="mt-2 text-error text-xs flex items-center gap-1">
                    <Icon name="error" size={14} />
                    {uploadError}
                  </p>
                ) : null}
              </div>
            )}
        </>
      </div>

      {/* Time & Servings */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>{t('form.prepTime')}</label>
          <input
            type="number"
            min={0}
            value={data.prepTimeMinutes}
            onChange={e => set('prepTimeMinutes', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t('form.cookTime')}</label>
          <input
            type="number"
            min={0}
            value={data.cookTimeMinutes}
            onChange={e => set('cookTimeMinutes', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t('form.servings')}</label>
          <input
            type="number"
            min={1}
            value={data.servings}
            onChange={e => set('servings', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>

      {/* Difficulty & Language */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('form.difficulty')}</label>
          <select
            value={data.difficulty}
            onChange={e => set('difficulty', e.target.value as Difficulty)}
            className={inputCls}
          >
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <option key={d} value={d}>{t(`form.${d}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('form.language')}</label>
          <select
            value={data.language}
            onChange={e => set('language', e.target.value as Language)}
            dir="ltr"
            lang="en"
            className={inputCls}
          >
            <option value="en">{t('form.english')}</option>
            <option value="he">{t('form.hebrew')}</option>
          </select>
          <p className="mt-1.5 text-xs text-on-surface-variant leading-snug">{t('form.languageHint')}</p>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelCls}>{t('form.tags')}</label>
        <input
          value={data.tags.join(', ')}
          onChange={e => set('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="dinner, italian, quick..."
          dir={contentDir}
          lang={contentLang}
          className={inputCls}
        />
      </div>

      {/* Ingredients */}
      <div>
        <h3 className="font-headline text-xl italic text-on-background mb-3">{t('form.ingredients')}</h3>
        <div className="space-y-3">
          {data.ingredients.map((ing, i) => (
            <div
              key={i}
              className="rounded-xl border border-outline-variant bg-surface-container/40 p-3 space-y-3"
            >
              <div className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <label className={labelCls} htmlFor={`ing-name-${i}`}>
                    {t('form.ingredientName')}
                  </label>
                  <input
                    id={`ing-name-${i}`}
                    value={ing.name}
                    onChange={e => updateIngredient(i, 'name', e.target.value)}
                    placeholder={t('form.ingredientNamePlaceholder')}
                    dir={contentDir}
                    lang={contentLang}
                    className={inputCls}
                  />
                </div>
                {data.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="text-on-surface-variant hover:text-error transition-colors p-2 shrink-0 rounded-lg
                      hover:bg-surface-container-high mb-1"
                    aria-label={t('form.removeIngredient')}
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} htmlFor={`ing-qty-${i}`}>
                    {t('form.quantity')}
                  </label>
                  <input
                    id={`ing-qty-${i}`}
                    value={ing.quantity}
                    onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                    placeholder={t('form.quantityPlaceholder')}
                    dir="ltr"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`ing-unit-${i}`}>
                    {t('form.unit')}
                  </label>
                  <input
                    id={`ing-unit-${i}`}
                    value={ing.unit}
                    onChange={e => updateIngredient(i, 'unit', e.target.value)}
                    placeholder={t('form.unitPlaceholder')}
                    dir="ltr"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`ing-note-${i}`}>
                    {t('form.note')}
                  </label>
                  <input
                    id={`ing-note-${i}`}
                    value={ing.note || ''}
                    onChange={e => updateIngredient(i, 'note', e.target.value)}
                    placeholder={t('form.notePlaceholder')}
                    dir={contentDir}
                    lang={contentLang}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-3 flex items-center gap-1.5 text-primary text-sm font-medium hover:opacity-70 transition-opacity"
        >
          <Icon name="add_circle" size={18} />
          {t('form.addIngredient')}
        </button>
      </div>

      {/* Steps */}
      <div>
        <h3 className="font-headline text-xl italic text-on-background mb-3">{t('form.steps')}</h3>
        <div className="space-y-3">
          {data.steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="shrink-0 w-7 h-7 mt-2 rounded-full bg-primary text-on-primary
                flex items-center justify-center font-bold text-sm">
                {step.order}
              </div>
              <textarea
                rows={2}
                value={step.text}
                onChange={e => updateStep(i, e.target.value)}
                placeholder={t('form.stepPlaceholder')}
                dir={contentDir}
                lang={contentLang}
                className={`${inputCls} flex-1 resize-none`}
              />
              {data.steps.length > 1 && (
                <button type="button" onClick={() => removeStep(i)}
                  className="text-on-surface-variant hover:text-error transition-colors p-1 mt-2 shrink-0">
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStep}
          className="mt-3 flex items-center gap-1.5 text-primary text-sm font-medium hover:opacity-70 transition-opacity"
        >
          <Icon name="add_circle" size={18} />
          {t('form.addStep')}
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>{t('form.notes')}</label>
        <textarea
          rows={3}
          value={data.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder={t('form.notes')}
          dir={contentDir}
          lang={contentLang}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || !data.title.trim()}
        className="w-full py-4 rounded-full bg-primary text-on-primary font-label font-bold
          uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98]
          disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {saving ? t('add.saving') : (submitLabel || t('form.save'))}
      </button>
    </form>
  );
}
