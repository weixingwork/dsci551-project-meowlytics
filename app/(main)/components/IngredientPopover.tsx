'use client';

import { useState, useEffect } from 'react';
import { IngredientKnowledge } from '@/lib/knowledge/types';
import { AlertIcon, BookIcon, CheckIcon, ClockIcon, CloseIcon, NotesIcon } from './icons';

interface IngredientPopoverProps {
  ingredientName: string;
  onClose: () => void;
}

export default function IngredientPopover({ ingredientName, onClose }: IngredientPopoverProps) {
  const [ingredient, setIngredient] = useState<IngredientKnowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIngredientInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/knowledge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ingredientName }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          setError(errorPayload?.error || `Lookup failed (${response.status})`);
          return;
        }

        const data = await response.json();
        setIngredient(data);
      } catch (err) {
        setError('Unable to fetch ingredient info, please try again');
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIngredientInfo();
  }, [ingredientName]);

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { label: string; color: string; chip: string }> = {
      protein: { label: 'Protein', color: 'bg-purple-100 text-purple-700 border-purple-200', chip: 'PR' },
      carbohydrate: { label: 'Carbs', color: 'bg-orange-100 text-orange-700 border-orange-200', chip: 'CB' },
      fat: { label: 'Fat', color: 'bg-pink-100 text-pink-700 border-pink-200', chip: 'FT' },
      vitamin: { label: 'Vitamin', color: 'bg-green-100 text-green-700 border-green-200', chip: 'VT' },
      mineral: { label: 'Mineral', color: 'bg-blue-100 text-blue-700 border-blue-200', chip: 'MN' },
      additive: { label: 'Additive', color: 'bg-gray-100 text-gray-700 border-gray-200', chip: 'AD' },
      fiber: { label: 'Fiber', color: 'bg-teal-100 text-teal-700 border-teal-200', chip: 'FB' },
      other: { label: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200', chip: 'OT' },
    };
    return badges[category] || badges.other;
  };

  const getHealthImpactBadge = (impact: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      good: { label: 'Beneficial', color: 'bg-green-100 text-green-700 border-green-200' },
      neutral: { label: 'Neutral', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      bad: { label: 'Avoid', color: 'bg-red-100 text-red-700 border-red-200' },
    };
    return badges[impact] || badges.neutral;
  };

  const getSourceBadge = (source: string) => {
    return source === 'knowledge_base'
      ? { label: 'Knowledge base', color: 'bg-blue-50 text-blue-600 border-blue-100' }
      : { label: 'AI generated', color: 'bg-violet-50 text-violet-600 border-violet-100' };
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-orange-200 bg-white/95 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Ingredient details"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
            <p className="text-slate-500">Looking up ingredient info...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertIcon className="mx-auto mb-4 h-8 w-8 text-red-600" />
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="min-h-11 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-6 py-2 text-white
                hover:from-orange-500 hover:to-amber-500 transition-all"
            >
              Close
            </button>
          </div>
        ) : ingredient ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-xs font-black text-orange-700">
                    {getCategoryBadge(ingredient.category).chip}
                  </span>
                  {ingredient.name}
                </h2>
                <p className="text-slate-400 text-sm mt-1">{ingredient.nameEn}</p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100
                  text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getCategoryBadge(ingredient.category).color}`}>
                {getCategoryBadge(ingredient.category).label}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getHealthImpactBadge(ingredient.healthImpact).color}`}>
                <CheckIcon className="h-3.5 w-3.5" />
                {getHealthImpactBadge(ingredient.healthImpact).label}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getSourceBadge(ingredient.source).color}`}>
                <BookIcon className="h-3.5 w-3.5" />
                {getSourceBadge(ingredient.source).label}
              </span>
            </div>

            <hr className="border-orange-100 my-4" />

            {/* Description */}
            <div className="mb-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4">
              <h3 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                <NotesIcon className="h-4 w-4 text-orange-600" />
                Overview
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">{ingredient.description}</p>
            </div>

            {/* Benefits */}
            {ingredient.benefits.length > 0 && (
              <div className="mb-5 bg-green-50 rounded-2xl p-4 border border-green-100">
                <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                  <CheckIcon className="h-4 w-4" />
                  Benefits
                </h3>
                <ul className="space-y-1.5">
                  {ingredient.benefits.map((benefit, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {ingredient.concerns.length > 0 && (
              <div className="mb-5 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
                  <AlertIcon className="h-4 w-4" />
                  Concerns
                </h3>
                <ul className="space-y-1.5">
                  {ingredient.concerns.map((concern, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suitable For */}
            {ingredient.suitableFor.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                  Suitable for
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ingredient.suitableFor.map((item, index) => (
                    <span key={index} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Not Suitable For */}
            {ingredient.notSuitableFor.length > 0 && ingredient.notSuitableFor[0] !== '无' && ingredient.notSuitableFor[0] !== 'None' && (
              <div className="mb-5">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <AlertIcon className="h-4 w-4 text-red-600" />
                  Not suitable for
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ingredient.notSuitableFor.map((item, index) => (
                    <span key={index} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs border border-red-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-orange-100 my-4" />

            {/* Footer */}
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <BookIcon className="h-3.5 w-3.5" />
                Source: {ingredient.source === 'knowledge_base' ? 'Knowledge base' : 'AI generated'}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                Updated: {ingredient.lastUpdated}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
