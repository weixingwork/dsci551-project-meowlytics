'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AnalysisResult } from './types';
import { useFavoritesStore } from './store/useFavoritesStore';
import IngredientPopover from './components/IngredientPopover';
import SaveFavoriteModal from './components/SaveFavoriteModal';
import { AlertIcon, CameraIcon, ChartIcon, FlaskIcon, HeartIcon, SearchIcon, SparkIcon, UploadIcon } from './components/icons';

interface RecommendationSections {
  conclusion: string;
  suitable: string;
  risks: string;
  actions: string;
}

function normalizeRecommendationText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function extractByKeyword(text: string, keywords: string[]): string | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const match = lines.find((line) => keywords.some((keyword) => line.includes(keyword)));
  if (!match) return null;

  const normalized = match.replace(/^[\d\-\.\)\s]+/, '');
  const colonIdx = Math.max(normalized.indexOf('：'), normalized.indexOf(':'));
  if (colonIdx >= 0 && colonIdx < normalized.length - 1) {
    return normalized.slice(colonIdx + 1).trim();
  }
  return normalized;
}

function buildRecommendationSections(text: string): RecommendationSections {
  const normalized = normalizeRecommendationText(text);
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const byKeyword: RecommendationSections = {
    conclusion: extractByKeyword(normalized, ['结论', '推荐购买', '谨慎购买', '不推荐购买', 'Conclusion', 'Recommended', 'Caution', 'Not recommended']) ?? '',
    suitable: extractByKeyword(normalized, ['适合对象', '适合', '适用', 'Suitable', 'Best for']) ?? '',
    risks: extractByKeyword(normalized, ['风险提示', '风险', '注意', 'Risks', 'Warning']) ?? '',
    actions: extractByKeyword(normalized, ['该怎么买', '建议', '换粮', '试吃', 'How to buy', 'Action']) ?? '',
  };

  if (byKeyword.conclusion && byKeyword.suitable && byKeyword.risks && byKeyword.actions) {
    return byKeyword;
  }

  const fallback = [...lines];
  const conclusion = byKeyword.conclusion || fallback.shift() || 'Make a careful decision based on the ingredient breakdown and your cat\u2019s condition';
  const suitable = byKeyword.suitable || fallback.shift() || 'Pick a formula that matches your cat\u2019s age and digestive sensitivity';
  const risks = byKeyword.risks || fallback.shift() || 'Watch for potential allergens and high-carb ingredients';
  const actions = byKeyword.actions || fallback.join('; ') || 'Start with a small bag and transition gradually';

  return { conclusion, suitable, risks, actions };
}

export default function Home() {
  const user = useFavoritesStore((state) => state.user);
  const openAuthModal = useFavoritesStore((state) => state.openAuthModal);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const MAX_IMAGES = 3;

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const available = MAX_IMAGES - images.length;
    const toAdd = incoming.slice(0, available);
    if (toAdd.length === 0) return;
    setImages((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    setAnalysis(null);
    setError(null);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImages(e.target.files);
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    if (!user) {
      setError('Please sign in or create an account to use the analyzer.');
      openAuthModal('login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('image', img));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        setError('Please sign in to analyze.');
        setAnalysis(null);
        openAuthModal('login');
      } else if (data.error) {
        setError(`Analysis failed: ${data.error}`);
        setAnalysis(null);
      } else {
        setAnalysis(data.analysis);
      }
    } catch {
      setError('Analysis failed, please try again');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const getScoreStyle = (score: number) => {
    if (score >= 7)
      return {
        color: 'text-green-600',
        bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
        lightBg: 'bg-green-50',
        border: 'border-green-200',
        glow: 'score-glow-good',
        label: 'Excellent',
        barColor: 'bg-green-500',
      };
    if (score >= 5)
      return {
        color: 'text-amber-600',
        bg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
        lightBg: 'bg-amber-50',
        border: 'border-amber-200',
        glow: 'score-glow-warning',
        label: 'Average',
        barColor: 'bg-amber-500',
      };
    return {
      color: 'text-red-600',
      bg: 'bg-gradient-to-r from-red-500 to-rose-500',
      lightBg: 'bg-red-50',
      border: 'border-red-200',
      glow: 'score-glow-bad',
      label: 'Poor',
      barColor: 'bg-red-500',
    };
  };

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string; label: string; chip: string }> = {
      protein: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Protein', chip: 'PR' },
      carbohydrate: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Carbs', chip: 'CB' },
      fat: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Fat', chip: 'FT' },
      additive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Additive', chip: 'AD' },
      vitamin: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Vitamin', chip: 'VT' },
      fiber: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Fiber', chip: 'FB' },
      mineral: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Mineral', chip: 'MN' },
      other: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Other', chip: 'OT' },
    };
    return styles[category] || styles.other;
  };

  const analysisItems = analysis?.analysis ?? [];
  const positiveItems = analysisItems.filter((item) => item.healthImpact === 'good').slice(0, 3);
  const riskItems = analysisItems.filter((item) => item.healthImpact === 'bad').slice(0, 3);

  const categorySummary = Object.entries(
    analysisItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const recommendationSections = analysis ? buildRecommendationSections(analysis.recommendation) : null;

  const workflowSteps = [
    { icon: '1', title: 'Upload image', desc: 'Upload a photo of the cat food ingredient label. Common formats supported.' },
    { icon: '2', title: 'AI parses', desc: 'Ingredients are detected and cross-checked against our knowledge base.' },
    { icon: '3', title: 'Decide', desc: 'Review the conclusion, best-for, and risks before you buy.' },
  ];

  const trustSignals = ['AI + knowledge base', 'Structured report in 30s', 'Save and compare side-by-side'];

  return (
    <div className="site-container space-y-6">
      <section className="section-shell relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-orange-100/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-teal-100/70 blur-3xl" />
        <div className="max-w-4xl">
            <p className="trust-badge mb-3 inline-flex items-center gap-2 px-3 py-1">
              Pet nutrition decision platform
            </p>
            <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-5xl">
              Turn complex labels into
              <span className="bg-gradient-to-r from-orange-700 via-orange-500 to-teal-500 bg-clip-text text-transparent">
                {' '}
                actionable
              </span>
              <span className="whitespace-nowrap bg-gradient-to-r from-orange-700 via-orange-500 to-teal-500 bg-clip-text text-transparent">
                {' '}buying decisions
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
              Upload the ingredient label and get a structured nutrition report, risk flags, and fit recommendations in 30 seconds. Analyze first, then buy.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {trustSignals.map((signal) => (
                <span key={signal} className="trust-badge inline-flex items-center px-2.5 py-1">
                  {signal}
                </span>
              ))}
            </div>
        </div>
      </section>

      <section className="section-shell relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-100/70 blur-2xl" />

          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <CameraIcon className="h-5 w-5 text-orange-600" />
            <span>Upload ingredient label photo</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">Capture the full ingredient list with good lighting and clear text.</p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="sr-only"
            id="image-upload"
            aria-describedby="image-upload-help"
          />

          {images.length === 0 ? (
            <div className="relative mt-3">
              <label
                htmlFor="image-upload"
                className="flex h-52 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
              >
                <UploadIcon className="mb-2 h-9 w-9 text-orange-500" />
                <span className="text-sm font-semibold text-slate-600">Click to upload or drag images here</span>
                <span id="image-upload-help" className="mt-1 text-xs text-slate-500">
                  JPEG / PNG / WEBP, max 5MB
                </span>
              </label>
            </div>
          ) : (
            <div className="mt-3 flex flex-row items-stretch gap-3 overflow-x-auto">
              {previews.map((src, idx) => (
                <div key={src} className="relative flex-shrink-0">
                  <Image
                    src={src}
                    alt={`Ingredient label image ${idx + 1}`}
                    width={160}
                    height={160}
                    className="h-40 w-40 rounded-2xl border-2 border-orange-100 object-cover shadow-md"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md transition-colors hover:bg-red-600"
                    aria-label={`Remove image ${idx + 1}`}
                  >
                    &#10005;
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES ? (
                <label
                  htmlFor="image-upload"
                  className="flex h-40 w-40 flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 transition-all duration-200 hover:border-orange-300 hover:bg-orange-50"
                >
                  <span className="text-3xl font-light text-orange-400">+</span>
                  <span className="mt-1 text-xs font-medium text-slate-500">Add image</span>
                </label>
              ) : (
                <div className="flex h-40 w-28 flex-shrink-0 items-center justify-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Limit reached</span>
                </div>
              )}
            </div>
          )}

          <p className="mt-2 text-xs text-slate-500">
            Label too long for one shot? Upload up to 3 photos and we&apos;ll combine them.
          </p>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            {workflowSteps.map((step) => (
              <p key={step.icon} className="rounded-xl border border-orange-100 bg-white/80 px-3 py-2 font-medium text-slate-700">
                {step.icon}. {step.title}
              </p>
            ))}
          </div>

          {images.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-cat-primary mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-3 font-medium shadow-md focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <SearchIcon className="h-4 w-4" />
                  <span>Start analysis</span>
                </>
              )}
            </button>
          )}

          {!analysis && (
            <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-800">Status: waiting for analysis</p>
              <p className="mt-1 text-xs text-slate-600">Upload images and click &quot;Start analysis&quot; — the report will appear here.</p>
            </div>
          )}
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert" aria-live="polite">
          <AlertIcon className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="glass-card relative overflow-hidden rounded-3xl p-6 shadow-sm">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-orange-100 to-transparent opacity-50" />

            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-800">
              <ChartIcon className="h-5 w-5 text-orange-600" />
              Overall score
            </h2>

            <div className="mb-6 flex items-center gap-6">
              <div
                className={`h-24 w-24 rounded-2xl ${getScoreStyle(analysis.overallScore).bg} ${getScoreStyle(analysis.overallScore).glow} flex flex-col items-center justify-center text-white shadow-lg`}
              >
                <span className="text-2xl font-bold">{analysis.overallScore.toFixed(1)}</span>
                <span className="text-xs opacity-90">/ 10</span>
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`text-xl font-bold ${getScoreStyle(analysis.overallScore).color}`}>
                    {getScoreStyle(analysis.overallScore).label}
                  </span>
                  <span className="text-sm text-slate-500">Overall score</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getScoreStyle(analysis.overallScore).barColor}`}
                    style={{ width: `${analysis.overallScore * 10}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-black text-slate-800">
                <SparkIcon className="h-4.5 w-4.5 text-orange-600" />
                Summary
              </h3>
              <p className="leading-relaxed text-slate-600">{analysis.summary}</p>
            </div>

            <div className={`rounded-2xl border p-4 ${getScoreStyle(analysis.overallScore).lightBg} ${getScoreStyle(analysis.overallScore).border}`}>
              <h3 className="mb-2 flex items-center gap-2 font-black text-slate-800">
                <SparkIcon className="h-4.5 w-4.5 text-orange-600" />
                Verdict & buying decision
              </h3>
              {recommendationSections && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-500">Conclusion</p>
                    <p className={`text-sm font-semibold leading-relaxed ${getScoreStyle(analysis.overallScore).color}`}>
                      {recommendationSections.conclusion}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-500">Best for</p>
                    <p className="text-sm leading-relaxed text-slate-700">{recommendationSections.suitable}</p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-500">Risks</p>
                    <p className="text-sm leading-relaxed text-slate-700">{recommendationSections.risks}</p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-500">How to buy</p>
                    <p className="text-sm leading-relaxed text-slate-700">{recommendationSections.actions}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSaveModal(true)}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-md transition-all hover:from-teal-600 hover:to-cyan-600 hover:shadow-lg"
            >
              <HeartIcon className="h-4 w-4" />
              <span>Save this cat food</span>
            </button>
          </div>

          <div className="glass-card rounded-3xl p-6 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-slate-800">
              <FlaskIcon className="h-5 w-5 text-orange-600" />
              Identified ingredients
            </h2>
            <p className="mb-4 text-sm text-slate-500">Click an ingredient to view details</p>
            <div className="flex flex-wrap gap-2">
              {analysis.ingredients.map((ingredient, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIngredient(ingredient)}
                  className="cursor-pointer rounded-full border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2 text-sm font-medium text-orange-700 transition-all duration-200 hover:border-orange-300 hover:from-orange-100 hover:to-amber-100 hover:shadow-md"
                >
                  {ingredient}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-slate-800">
              <AlertIcon className="h-5 w-5 text-orange-600" />
              Risks & highlights
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <h3 className="mb-2 font-black text-green-700">Top strengths</h3>
                {positiveItems.length > 0 ? (
                  <div className="space-y-2">
                    {positiveItems.map((item, idx) => (
                      <button
                        key={`${item.ingredient}-${idx}`}
                        onClick={() => setSelectedIngredient(item.ingredient)}
                        className="block w-full cursor-pointer rounded-lg px-2 py-1 text-left text-sm text-green-800 transition-colors duration-200 hover:bg-green-100/70 hover:text-green-900 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      >
                        {idx + 1}. {item.ingredient}: {item.description}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-700">No notable strengths identified.</p>
                )}
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <h3 className="mb-2 font-black text-red-700">Top risks</h3>
                {riskItems.length > 0 ? (
                  <div className="space-y-2">
                    {riskItems.map((item, idx) => (
                      <button
                        key={`${item.ingredient}-${idx}`}
                        onClick={() => setSelectedIngredient(item.ingredient)}
                        className="block w-full cursor-pointer rounded-lg px-2 py-1 text-left text-sm text-red-800 transition-colors duration-200 hover:bg-red-100/70 hover:text-red-900 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      >
                        {idx + 1}. {item.ingredient}: {item.description}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-700">No clear risk ingredients identified.</p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <h3 className="mb-3 font-black text-orange-700">Ingredient breakdown</h3>
              <div className="flex flex-wrap gap-2">
                {categorySummary.map(([category, count]) => {
                  const categoryStyle = getCategoryStyle(category);
                  return (
                    <span
                      key={category}
                      className={`rounded-full border border-white/70 px-3 py-1.5 text-xs font-semibold ${categoryStyle.bg} ${categoryStyle.text}`}
                    >
                      <span className="mr-1 rounded-sm bg-white/70 px-1 py-0.5 text-[10px] font-black">{categoryStyle.chip}</span>
                      {categoryStyle.label} x {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedIngredient && <IngredientPopover ingredientName={selectedIngredient} onClose={() => setSelectedIngredient(null)} />}

      {analysis && (
        <SaveFavoriteModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          analysis={analysis}
          imageData={previews[0] || undefined}
        />
      )}
    </div>
  );
}
