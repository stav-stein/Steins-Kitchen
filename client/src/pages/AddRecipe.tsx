import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useRecipeStore } from '../store/useRecipeStore';
import type { RecipeExtraction, RecipeSource } from '../types/recipe';
import { EMPTY_EXTRACTION } from '../types/recipe';
import { RecipeForm } from '../components/RecipeForm';
import { Spinner } from '../components/ui/Spinner';
import { Icon } from '../components/ui/Icon';

type Tab = 'url' | 'image' | 'manual';
type Stage = 'input' | 'preview';

const MAX_EXTRACT_IMAGES = 15;
const MAX_BATCH = 20;

type ImagePick = { id: string; file: File; preview: string };
type ImageRecipeGroup = { id: string; images: ImagePick[] };
type UrlRow = { id: string; value: string };

type BatchResultItem = {
  key: string;
  ok: boolean;
  title?: string;
  subtitle?: string;
  error?: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function collectUrlsFromRows(rows: UrlRow[]): {
  urls: string[];
  invalidNonEmpty: number;
  truncated: boolean;
} {
  const seen = new Set<string>();
  const urls: string[] = [];
  let invalidNonEmpty = 0;
  for (const row of rows) {
    const trimmed = row.value.trim();
    if (!trimmed) continue;
    let href: string | null = null;
    try {
      href = new URL(trimmed).href;
    } catch {
      try {
        href = new URL(`https://${trimmed.replace(/^\/+/, '')}`).href;
      } catch {
        invalidNonEmpty += 1;
        continue;
      }
    }
    if (seen.has(href)) continue;
    seen.add(href);
    urls.push(href);
  }
  const truncated = urls.length > MAX_BATCH;
  return {
    urls: urls.slice(0, MAX_BATCH),
    invalidNonEmpty,
    truncated,
  };
}

export function AddRecipe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const saveRecipe = useRecipeStore(s => s.saveRecipe);

  const [tab, setTab] = useState<Tab>('url');
  const [stage, setStage] = useState<Stage>('input');
  const [extracted, setExtracted] = useState<RecipeExtraction | null>(null);
  const [source, setSource] = useState<RecipeSource>('url');

  const [urlRows, setUrlRows] = useState<UrlRow[]>(() => [{ id: makeId('url'), value: '' }]);
  const [urlError, setUrlError] = useState('');
  const [urlNotice, setUrlNotice] = useState('');
  const [extracting, setExtracting] = useState(false);

  const [imageGroups, setImageGroups] = useState<ImageRecipeGroup[]>(() => [{ id: makeId('grp'), images: [] }]);
  const [imageError, setImageError] = useState('');
  const [imageNotice, setImageNotice] = useState('');
  const [processingImage, setProcessingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResultItem[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTargetGroupIdRef = useRef<string | null>(null);
  const imageGroupsRef = useRef(imageGroups);
  imageGroupsRef.current = imageGroups;

  useEffect(
    () => () => {
      imageGroupsRef.current.forEach((g) => g.images.forEach((i) => URL.revokeObjectURL(i.preview)));
    },
    []
  );

  useEffect(() => {
    const raw = searchParams.get('url')?.trim();
    if (!raw) return;
    let normalized: string;
    try {
      normalized = new URL(raw).href;
    } catch {
      return;
    }
    setUrlRows((prev) => {
      const next = prev.length ? [...prev] : [{ id: makeId('url'), value: '' }];
      next[0] = { ...next[0], value: normalized };
      return next;
    });
    setTab('url');
    const next = new URLSearchParams(searchParams);
    next.delete('url');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const busy = batchRunning || extracting || processingImage;

  const appendImagesToGroup = (groupId: string, fileList: FileList | File[]) => {
    setImageError('');
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;
    setImageGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextImgs = [...g.images];
        for (const file of incoming) {
          if (nextImgs.length >= MAX_EXTRACT_IMAGES) break;
          nextImgs.push({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
            file,
            preview: URL.createObjectURL(file),
          });
        }
        return { ...g, images: nextImgs };
      })
    );
  };

  const removeImageFromGroup = (groupId: string, imageId: string) => {
    setImageGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const item = g.images.find((i) => i.id === imageId);
        if (item) URL.revokeObjectURL(item.preview);
        return { ...g, images: g.images.filter((i) => i.id !== imageId) };
      })
    );
  };

  const clearGroupImages = (groupId: string) => {
    setImageGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        g.images.forEach((i) => URL.revokeObjectURL(i.preview));
        return { ...g, images: [] };
      })
    );
  };

  const addUrlRow = () => {
    setUrlRows((prev) => [...prev, { id: makeId('url'), value: '' }]);
    setUrlError('');
    setUrlNotice('');
    setBatchResults(null);
  };

  const removeUrlRow = (id: string) => {
    setUrlRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
    setUrlError('');
    setBatchResults(null);
  };

  const addImageRecipeGroup = () => {
    setImageGroups((prev) => [...prev, { id: makeId('grp'), images: [] }]);
    setImageError('');
    setImageNotice('');
    setBatchResults(null);
  };

  const removeImageRecipeGroup = (groupId: string) => {
    setImageGroups((prev) => {
      const g = prev.find((x) => x.id === groupId);
      if (g) g.images.forEach((i) => URL.revokeObjectURL(i.preview));
      const next = prev.filter((x) => x.id !== groupId);
      return next.length === 0 ? [{ id: makeId('grp'), images: [] }] : next;
    });
    setImageError('');
    setBatchResults(null);
  };

  const openFilePickerForGroup = (groupId: string) => {
    fileTargetGroupIdRef.current = groupId;
    fileInputRef.current?.click();
  };

  const handleDropOnGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    appendImagesToGroup(groupId, e.dataTransfer.files);
  };

  const handleExtractUrls = async () => {
    setUrlError('');
    setUrlNotice('');
    setBatchResults(null);
    const { urls, invalidNonEmpty, truncated } = collectUrlsFromRows(urlRows);
    if (urls.length === 0) {
      const anyText = urlRows.some((r) => r.value.trim());
      setUrlError(anyText ? t('errors.noValidUrlsInRows') : t('errors.noValidUrl'));
      return;
    }
    const notices: string[] = [];
    if (truncated) notices.push(t('add.bulkTruncated', { max: MAX_BATCH }));
    if (invalidNonEmpty > 0) notices.push(t('add.bulkSkippedInvalid', { count: invalidNonEmpty }));
    if (notices.length > 0) setUrlNotice(notices.join(' '));

    if (urls.length === 1) {
      setExtracting(true);
      try {
        const recipe = await api.extract.fromUrl(urls[0]);
        setExtracted(recipe);
        setSource('url');
        setStage('preview');
        setUrlNotice('');
      } catch (err) {
        setUrlError(`${t('errors.extractFailed')} ${(err as Error).message}`);
      } finally {
        setExtracting(false);
      }
      return;
    }

    setBatchRunning(true);
    setBatchProgress({ current: 0, total: urls.length });
    const results: BatchResultItem[] = [];
    try {
      for (let i = 0; i < urls.length; i += 1) {
        const u = urls[i];
        setBatchProgress({ current: i + 1, total: urls.length });
        try {
          const ex = await api.extract.fromUrl(u);
          const { imageCandidates: _ic, ...clean } = ex;
          await saveRecipe(clean, 'url');
          results.push({ key: u, ok: true, title: clean.title || u, subtitle: u });
        } catch (err) {
          results.push({ key: u, ok: false, subtitle: u, error: (err as Error).message });
        }
      }
      setUrlNotice('');
      setBatchResults(results);
    } finally {
      setBatchRunning(false);
      setBatchProgress(null);
    }
  };

  const handleExtractImages = async () => {
    const nonEmpty = imageGroups.filter((g) => g.images.length > 0);
    if (nonEmpty.length === 0) {
      setImageError(t('errors.imageRequired'));
      return;
    }

    setImageError('');
    setImageNotice('');
    setBatchResults(null);

    let groupsToRun = nonEmpty;
    if (nonEmpty.length > MAX_BATCH) {
      setImageNotice(t('add.bulkTruncatedGroups', { max: MAX_BATCH }));
      groupsToRun = nonEmpty.slice(0, MAX_BATCH);
    }

    if (groupsToRun.length === 1) {
      setProcessingImage(true);
      try {
        const recipe = await api.extract.fromImage(groupsToRun[0].images.map((i) => i.file));
        setExtracted(recipe);
        setSource('image');
        setStage('preview');
        setImageNotice('');
      } catch (err) {
        setImageError(`${t('errors.extractFailed')} ${(err as Error).message}`);
      } finally {
        setProcessingImage(false);
      }
      return;
    }

    setBatchRunning(true);
    setBatchProgress({ current: 0, total: groupsToRun.length });
    const results: BatchResultItem[] = [];
    try {
      for (let i = 0; i < groupsToRun.length; i += 1) {
        const g = groupsToRun[i];
        setBatchProgress({ current: i + 1, total: groupsToRun.length });
        const subtitle = g.images.map((x) => x.file.name).join(', ');
        try {
          const ex = await api.extract.fromImage(g.images.map((x) => x.file));
          const { imageCandidates: _ic, ...clean } = ex;
          await saveRecipe(clean, 'image');
          results.push({ key: g.id, ok: true, title: clean.title || subtitle, subtitle });
        } catch (err) {
          results.push({ key: g.id, ok: false, subtitle, error: (err as Error).message });
        }
      }
      setImageNotice('');
      setBatchResults(results);
    } finally {
      setBatchRunning(false);
      setBatchProgress(null);
    }
  };

  const handleSave = async (data: RecipeExtraction) => {
    setSaving(true);
    try {
      const { imageCandidates: _ic, ...clean } = data;
      const recipe = await saveRecipe(clean, source);
      navigate(`/recipe/${recipe.id}`);
    } catch {
      alert(t('errors.saveFailed'));
      setSaving(false);
    }
  };

  const resetUrlFlow = () => {
    setBatchResults(null);
    setUrlRows([{ id: makeId('url'), value: '' }]);
    setUrlError('');
    setUrlNotice('');
  };

  const resetImageFlow = () => {
    setBatchResults(null);
    imageGroups.forEach((g) => g.images.forEach((i) => URL.revokeObjectURL(i.preview)));
    setImageGroups([{ id: makeId('grp'), images: [] }]);
    setImageError('');
    setImageNotice('');
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'url', label: t('add.fromUrl'), icon: 'link' },
    { key: 'image', label: t('add.fromImage'), icon: 'photo_camera' },
    { key: 'manual', label: t('add.manual'), icon: 'edit_note' },
  ];

  const urlHasMultipleValid =
    collectUrlsFromRows(urlRows).urls.length > 1;
  const imageHasMultipleRecipes =
    imageGroups.filter((g) => g.images.length > 0).length > 1;

  if (stage === 'preview' && extracted) {
    return (
      <div className="px-6 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setStage('input');
              setExtracted(null);
            }}
            className="p-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <h2 className="font-headline text-2xl italic text-on-background">
            {t('add.previewTitle')}
          </h2>
        </div>

        <div className="p-4 bg-primary-fixed/30 rounded-xl mb-6 flex items-center gap-3">
          <Icon name="auto_awesome" className="text-primary shrink-0" size={20} />
          <p className="text-sm text-on-surface-variant">
            {source === 'image' ? t('add.previewHintScreenshot') : t('add.previewHintUrl')}
          </p>
        </div>

        <RecipeForm
          initial={extracted}
          onSave={handleSave}
          saving={saving}
          submitLabel={t('add.saveButton')}
          urlImageChoices={
            source === 'url' && extracted.imageCandidates && extracted.imageCandidates.length > 0
              ? extracted.imageCandidates
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="px-6 pt-6">
      <h2 className="font-headline text-3xl italic text-on-background mb-6">
        {t('add.title')}
      </h2>

      <div className="flex bg-surface-container rounded-2xl p-1 mb-8 gap-1">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              setBatchResults(null);
              setUrlNotice('');
              setImageNotice('');
              setTab(key);
              setUrlError('');
              setImageError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl
              font-label font-bold uppercase tracking-wider text-xs transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              ${tab === key
                ? 'bg-white shadow-editorial text-primary'
                : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Icon name={icon} size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'url' && (
        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">{t('add.urlIntro', { max: MAX_BATCH })}</p>
          <p className="text-on-surface-variant text-xs">{t('add.bulkMaxNote', { max: MAX_BATCH })}</p>

          <div className="space-y-3">
            {urlRows.map((row) => (
              <div key={row.id} className="flex gap-2 items-center">
                <div className="relative flex-1 min-w-0">
                  <Icon
                    name="link"
                    className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    size={20}
                  />
                  <input
                    type="url"
                    value={row.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setUrlRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: v } : r)));
                      setUrlError('');
                      setBatchResults(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleExtractUrls();
                    }}
                    placeholder={t('add.urlPlaceholder')}
                    disabled={batchRunning}
                    className="w-full ps-10 pe-3 py-3.5 rounded-xl bg-surface-container border border-outline-variant
                      text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2
                      focus:ring-primary focus:border-transparent text-sm font-body"
                  />
                </div>
                {urlRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUrlRow(row.id)}
                    disabled={batchRunning}
                    aria-label={t('add.urlRemoveRow')}
                    className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container-high
                      text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                  >
                    <Icon name="close" size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addUrlRow}
            disabled={batchRunning}
            className="flex w-full items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-outline-variant
              text-on-surface-variant font-label font-bold uppercase tracking-wider text-xs
              hover:border-primary hover:bg-primary-fixed/10 transition-all disabled:opacity-50"
          >
            <Icon name="add" size={20} />
            {t('add.urlAddAnother')}
          </button>

          {urlNotice && !urlError && (
            <p className="text-on-surface-variant text-xs">{urlNotice}</p>
          )}
          {urlError && (
            <p className="text-error text-sm flex items-center gap-1.5">
              <Icon name="error" size={16} />
              {urlError}
            </p>
          )}
          {batchProgress && (
            <p className="text-sm text-on-surface-variant flex items-center gap-2">
              <Spinner className="scale-75" />
              {t('add.bulkProcessing', { current: batchProgress.current, total: batchProgress.total })}
            </p>
          )}
          {batchResults && tab === 'url' && !batchRunning && (
            <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
              <p className="font-label font-bold text-sm text-on-background">
                {t('add.bulkDoneSummary', {
                  saved: batchResults.filter((r) => r.ok).length,
                  failed: batchResults.filter((r) => !r.ok).length,
                })}
              </p>
              <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
                {batchResults.map((r) => (
                  <li
                    key={r.key}
                    className={`flex flex-col gap-0.5 rounded-lg px-2 py-1.5 ${
                      r.ok ? 'bg-primary-fixed/20' : 'bg-error/10'
                    }`}
                  >
                    <span className="font-bold text-on-surface">
                      {r.ok ? t('add.bulkSavedTitle') : t('add.bulkFailedTitle')}: {r.title || r.subtitle}
                    </span>
                    {!r.ok && r.error && <span className="text-error break-all">{r.error}</span>}
                    <span className="text-on-surface-variant truncate" title={r.subtitle}>
                      {r.subtitle}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/cookbook')}
                  className="flex-1 py-3 rounded-full bg-primary text-on-primary font-label font-bold
                    uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t('add.bulkViewCookbook')}
                </button>
                <button
                  type="button"
                  onClick={resetUrlFlow}
                  className="flex-1 py-3 rounded-full bg-surface-container-high text-on-surface font-label font-bold
                    uppercase tracking-widest text-xs transition-all hover:opacity-90"
                >
                  {t('add.bulkAddMore')}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleExtractUrls}
            disabled={
              batchRunning ||
              extracting ||
              !!batchResults ||
              !urlRows.some((r) => r.value.trim())
            }
            className="w-full py-4 rounded-full bg-primary text-on-primary font-label font-bold
              uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center justify-center gap-3"
          >
            {extracting ? (
              <>
                <Spinner className="scale-75" />
                {t('add.extracting')}
              </>
            ) : batchRunning ? (
              <>
                <Spinner className="scale-75" />
                {batchProgress
                  ? t('add.bulkProcessing', { current: batchProgress.current, total: batchProgress.total })
                  : t('add.extracting')}
              </>
            ) : (
              <>
                <Icon name={urlHasMultipleValid ? 'playlist_add' : 'auto_awesome'} size={18} />
                {urlHasMultipleValid ? t('add.bulkButton') : t('add.urlButton')}
              </>
            )}
          </button>
        </div>
      )}

      {tab === 'image' && (
        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">{t('add.imageIntro')}</p>
          <p className="text-on-surface-variant text-xs">{t('add.imageBatchIntro', { max: MAX_BATCH })}</p>
          <p className="text-on-surface-variant text-xs">{t('add.bulkMaxNote', { max: MAX_BATCH })}</p>

          <div className="space-y-4">
            {imageGroups.map((group, idx) => (
              <div
                key={group.id}
                className="rounded-xl border border-outline-variant bg-surface-container/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label font-bold text-xs uppercase tracking-wider text-on-background">
                    {t('add.imageRecipeHeading', { n: idx + 1 })}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {group.images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearGroupImages(group.id)}
                        disabled={batchRunning || processingImage}
                        className="text-xs text-error hover:underline disabled:opacity-50"
                      >
                        {t('add.imageClearGroup')}
                      </button>
                    )}
                    {imageGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageRecipeGroup(group.id)}
                        disabled={batchRunning || processingImage}
                        className="text-xs text-on-surface-variant hover:text-error disabled:opacity-50"
                      >
                        {t('add.imageRemoveRecipe')}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  onDrop={(e) => handleDropOnGroup(e, group.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => openFilePickerForGroup(group.id)}
                  className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center
                    cursor-pointer hover:border-primary hover:bg-primary-fixed/10 transition-all"
                >
                  {group.images.length > 0 ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {group.images.map((item) => (
                          <div
                            key={item.id}
                            className="relative w-28 shrink-0 rounded-lg overflow-hidden border border-outline-variant bg-surface-container"
                          >
                            <img src={item.preview} alt="" className="h-28 w-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImageFromGroup(group.id, item.id);
                              }}
                              className="absolute top-1 end-1 flex size-7 shrink-0 items-center justify-center
                                rounded-full border-0 bg-black/60 p-0 text-white hover:bg-black/80"
                              aria-label={t('add.imageRemoveOne')}
                            >
                              <Icon name="close" size={18} className="block leading-none" />
                            </button>
                            <p className="text-[10px] text-on-surface-variant truncate px-1 py-0.5">
                              {item.file.name}
                            </p>
                          </div>
                        ))}
                        {group.images.length < MAX_EXTRACT_IMAGES && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFilePickerForGroup(group.id);
                            }}
                            className="w-28 h-28 shrink-0 rounded-lg border-2 border-dashed border-outline-variant
                              flex flex-col items-center justify-center gap-1 text-on-surface-variant
                              hover:border-primary hover:bg-primary-fixed/10 transition-all"
                          >
                            <Icon name="add" size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1">
                              {t('add.imageAddMore')}
                            </span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">{t('add.imageTapToAdd')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="w-14 h-14 rounded-full bg-primary-fixed/30 flex items-center justify-center mx-auto">
                        <Icon name="add_photo_alternate" className="text-primary" size={28} />
                      </div>
                      <p className="text-on-surface-variant text-sm">{t('add.imageDrop')}</p>
                      <button
                        type="button"
                        onClick={() => openFilePickerForGroup(group.id)}
                        className="inline-block bg-surface-container-high px-4 py-2 rounded-full
                          text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                      >
                        {t('add.imageBrowse')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addImageRecipeGroup}
            disabled={batchRunning || processingImage}
            className="flex w-full items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-outline-variant
              text-on-surface-variant font-label font-bold uppercase tracking-wider text-xs
              hover:border-primary hover:bg-primary-fixed/10 transition-all disabled:opacity-50"
          >
            <Icon name="add" size={20} />
            {t('add.imageAddRecipe')}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const gid = fileTargetGroupIdRef.current;
              if (e.target.files?.length && gid) appendImagesToGroup(gid, e.target.files);
              e.target.value = '';
              fileTargetGroupIdRef.current = null;
            }}
          />

          {imageNotice && !imageError && (
            <p className="text-on-surface-variant text-xs">{imageNotice}</p>
          )}
          {imageError && (
            <p className="text-error text-sm flex items-center gap-1.5">
              <Icon name="error" size={16} />
              {imageError}
            </p>
          )}
          {batchProgress && tab === 'image' && (
            <p className="text-sm text-on-surface-variant flex items-center gap-2">
              <Spinner className="scale-75" />
              {t('add.bulkProcessing', { current: batchProgress.current, total: batchProgress.total })}
            </p>
          )}
          {batchResults && tab === 'image' && !batchRunning && (
            <div className="rounded-xl border border-outline-variant bg-surface-container p-4 space-y-3">
              <p className="font-label font-bold text-sm text-on-background">
                {t('add.bulkDoneSummary', {
                  saved: batchResults.filter((r) => r.ok).length,
                  failed: batchResults.filter((r) => !r.ok).length,
                })}
              </p>
              <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
                {batchResults.map((r) => (
                  <li
                    key={r.key}
                    className={`flex flex-col gap-0.5 rounded-lg px-2 py-1.5 ${
                      r.ok ? 'bg-primary-fixed/20' : 'bg-error/10'
                    }`}
                  >
                    <span className="font-bold text-on-surface">
                      {r.ok ? t('add.bulkSavedTitle') : t('add.bulkFailedTitle')}: {r.title || r.subtitle}
                    </span>
                    {!r.ok && r.error && <span className="text-error break-all">{r.error}</span>}
                    <span className="text-on-surface-variant break-all">{r.subtitle}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/cookbook')}
                  className="flex-1 py-3 rounded-full bg-primary text-on-primary font-label font-bold
                    uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t('add.bulkViewCookbook')}
                </button>
                <button
                  type="button"
                  onClick={resetImageFlow}
                  className="flex-1 py-3 rounded-full bg-surface-container-high text-on-surface font-label font-bold
                    uppercase tracking-widest text-xs transition-all hover:opacity-90"
                >
                  {t('add.bulkAddMore')}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleExtractImages}
            disabled={
              batchRunning ||
              processingImage ||
              !!batchResults ||
              !imageGroups.some((g) => g.images.length > 0)
            }
            className="w-full py-4 rounded-full bg-primary text-on-primary font-label font-bold
              uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center justify-center gap-3"
          >
            {processingImage ? (
              <>
                <Spinner className="scale-75" />
                {t('add.imageProcessing')}
              </>
            ) : batchRunning ? (
              <>
                <Spinner className="scale-75" />
                {batchProgress
                  ? t('add.bulkProcessing', { current: batchProgress.current, total: batchProgress.total })
                  : t('add.imageProcessing')}
              </>
            ) : (
              <>
                <Icon name={imageHasMultipleRecipes ? 'playlist_add' : 'document_scanner'} size={18} />
                {imageHasMultipleRecipes ? t('add.bulkButton') : t('add.extractScreenshotRecipe')}
              </>
            )}
          </button>
        </div>
      )}

      {tab === 'manual' && (
        <div>
          <p className="text-on-surface-variant text-sm mb-6">
            Type in your recipe manually — great for family recipes passed down from generations.
          </p>
          <RecipeForm
            initial={EMPTY_EXTRACTION}
            onSave={(data) => {
              setSource('manual');
              handleSave(data);
            }}
            saving={saving}
            submitLabel={t('add.saveButton')}
          />
        </div>
      )}
    </div>
  );
}
