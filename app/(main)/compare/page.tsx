'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { FavoriteItem } from '../types';
import { CompareIcon } from '../components/icons';

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Protein',
  carbohydrate: 'Carbs',
  fat: 'Fat',
  additive: 'Additive',
  vitamin: 'Vitamin',
  fiber: 'Fiber',
  mineral: 'Mineral',
  other: 'Other',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

function getScoreColor(score: number) {
  if (score >= 7) return 'bg-green-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreStyle(score: number) {
  if (score >= 7) return 'from-green-500 to-emerald-500';
  if (score >= 5) return 'from-amber-500 to-yellow-500';
  return 'from-red-500 to-rose-500';
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids')?.split(',') ?? [];
  const getFavoriteById = useFavoritesStore((state) => state.getFavoriteById);
  const items = ids.map((id) => getFavoriteById(id)).filter(Boolean) as FavoriteItem[];

  if (items.length < 2) {
    return (
      <div className="site-container py-10">
        <div className="glass-card rounded-3xl text-center py-16 px-8">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Cannot compare</h2>
          <p className="text-slate-500 mb-6">Please select at least 2 cat foods to compare</p>
          <Link
            href="/favorites"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white"
          >
            Back to favorites
          </Link>
        </div>
      </div>
    );
  }

  // Collect all bad ingredients across all products
  const allBadIngredients = Array.from(
    new Set(
      items.flatMap((item) =>
        item.analysis.analysis
          .filter((a) => a.healthImpact === 'bad')
          .map((a) => a.ingredient)
      )
    )
  );

  // Collect all good ingredients across all products
  const allGoodIngredients = Array.from(
    new Set(
      items.flatMap((item) =>
        item.analysis.analysis
          .filter((a) => a.healthImpact === 'good')
          .map((a) => a.ingredient)
      )
    )
  );

  // Count ingredients per category per product
  function getCategoryCounts(item: FavoriteItem) {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = 0;
    }
    for (const a of item.analysis.analysis) {
      const cat = a.category in CATEGORY_LABELS ? a.category : 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }

  // Check if a product contains a specific ingredient
  function hasIngredient(item: FavoriteItem, ingredient: string) {
    return item.analysis.analysis.some((a) => a.ingredient === ingredient);
  }

  return (
    <div className="site-container py-8 space-y-7">
      {/* Header */}
      <section className="glass-card rounded-3xl p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-teal-100/60 blur-3xl" />
        <h1 className="text-3xl font-black bg-gradient-to-r from-orange-700 via-orange-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-3">
          <CompareIcon className="h-8 w-8 text-orange-500" />
          Cat food comparison
        </h1>
        <Link
          href="/favorites"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to favorites
        </Link>
      </section>

      {/* Product summary row */}
      <section className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <div key={item.id} className="glass-card rounded-3xl p-5 text-center">
            <h3 className="font-black text-lg text-slate-800 truncate">{item.name}</h3>
            {item.brand && <p className="text-sm text-slate-500 mt-0.5 truncate">{item.brand}</p>}
            <div className="mt-3 inline-flex items-center justify-center">
              <div className={`rounded-2xl px-4 py-2 text-white bg-gradient-to-r ${getScoreStyle(item.analysis.overallScore)}`}>
                <p className="font-black text-2xl leading-none">{item.analysis.overallScore.toFixed(1)}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Score comparison */}
      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-xl font-black text-slate-800 mb-5">Score comparison</h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 truncate mr-3">{item.name}</span>
                <span className="font-black text-slate-800">{item.analysis.overallScore.toFixed(1)}</span>
              </div>
              <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreColor(item.analysis.overallScore)} transition-all`}
                  style={{ width: `${item.analysis.overallScore * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category structure table */}
      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-xl font-black text-slate-800 mb-5">Ingredient breakdown</h2>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-100">
                <th className="text-left py-3 pr-4 font-semibold text-slate-500">Category</th>
                {items.map((item) => (
                  <th key={item.id} className="text-center py-3 px-3 font-semibold text-slate-700 truncate max-w-[120px]">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_CATEGORIES.map((cat) => (
                <tr key={cat} className="border-b border-orange-50">
                  <td className="py-3 pr-4 font-medium text-slate-600">{CATEGORY_LABELS[cat]}</td>
                  {items.map((item) => {
                    const counts = getCategoryCounts(item);
                    const count = counts[cat];
                    return (
                      <td key={item.id} className="text-center py-3 px-3">
                        <span className={`font-black ${count > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Risk ingredients table */}
      {allBadIngredients.length > 0 && (
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-black text-slate-800 mb-5">Risk ingredients</h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-100">
                  <th className="text-left py-3 pr-4 font-semibold text-slate-500">Ingredient</th>
                  {items.map((item) => (
                    <th key={item.id} className="text-center py-3 px-3 font-semibold text-slate-700 truncate max-w-[120px]">
                      {item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allBadIngredients.map((ingredient) => (
                  <tr key={ingredient} className="border-b border-orange-50">
                    <td className="py-3 pr-4 font-medium text-slate-600">{ingredient}</td>
                    {items.map((item) => (
                      <td key={item.id} className="text-center py-3 px-3">
                        {hasIngredient(item, ingredient) ? (
                          <span className="text-base" title="Contains this ingredient">&#x26A0;&#xFE0F;</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Positive ingredients table */}
      {allGoodIngredients.length > 0 && (
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-black text-slate-800 mb-5">Beneficial ingredients</h2>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-100">
                  <th className="text-left py-3 pr-4 font-semibold text-slate-500">Ingredient</th>
                  {items.map((item) => (
                    <th key={item.id} className="text-center py-3 px-3 font-semibold text-slate-700 truncate max-w-[120px]">
                      {item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allGoodIngredients.map((ingredient) => (
                  <tr key={ingredient} className="border-b border-orange-50">
                    <td className="py-3 pr-4 font-medium text-slate-600">{ingredient}</td>
                    {items.map((item) => (
                      <td key={item.id} className="text-center py-3 px-3">
                        {hasIngredient(item, ingredient) ? (
                          <span className="text-base" title="Contains this ingredient">&#x2705;</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bottom back link */}
      <div className="text-center pb-4">
        <Link
          href="/favorites"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white"
        >
          Back to favorites
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="site-container py-20 text-center text-slate-500">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  );
}
