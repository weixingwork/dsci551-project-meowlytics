'use client';

import { useState } from 'react';
import { FavoriteItem } from '../types';
import { useFavoritesStore } from '../store/useFavoritesStore';
import IngredientPopover from './IngredientPopover';
import { BookmarkIcon, CheckIcon, ClockIcon, CloseIcon, FlaskIcon, NotesIcon, TrashIcon } from './icons';

interface FavoriteDetailModalProps {
  item: FavoriteItem;
  onClose: () => void;
}

export default function FavoriteDetailModal({
  item,
  onClose,
}: FavoriteDetailModalProps) {
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  const getScoreStyle = (score: number) => {
    if (score >= 7) return {
      color: 'text-green-600',
      bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
      glow: 'score-glow-good',
      label: 'Excellent'
    };
    if (score >= 5) return {
      color: 'text-amber-600',
      bg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
      glow: 'score-glow-warning',
      label: 'Average'
    };
    return {
      color: 'text-red-600',
      bg: 'bg-gradient-to-r from-red-500 to-rose-500',
      glow: 'score-glow-bad',
      label: 'Poor'
    };
  };

  const handleDelete = async () => {
    if (confirm('Delete this favorite?')) {
      try {
        await removeFavorite(item.id);
        onClose();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Delete failed, please try again');
      }
    }
  };

  const scoreStyle = getScoreStyle(item.analysis.overallScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-orange-200 bg-white/95 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Favorite details"
        onClick={(event) => event.stopPropagation()}
      >

        <div className="sticky top-0 flex items-center justify-between rounded-t-3xl border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <BookmarkIcon className="h-6 w-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-black text-slate-800">{item.name}</h2>
              {item.brand && <p className="text-sm text-orange-500">{item.brand}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm
              text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl">
            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white
              ${scoreStyle.bg} ${scoreStyle.glow} shadow-lg`}>
              <span className="text-xl font-bold">{item.analysis.overallScore.toFixed(1)}</span>
              <span className="text-xs opacity-90">/ 10</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg font-bold ${scoreStyle.color}`}>{scoreStyle.label}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 text-sm">out of 10</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{item.analysis.recommendation}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm">
            <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2">
              <NotesIcon className="h-4.5 w-4.5 text-orange-600" />
              Summary
            </h3>
            <p className="text-slate-600 leading-relaxed">{item.analysis.summary}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm">
            <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2">
              <FlaskIcon className="h-4.5 w-4.5 text-orange-600" />
              Identified ingredients
            </h3>
            <p className="text-sm text-slate-400 mb-3">Click an ingredient to view details</p>
            <div className="flex flex-wrap gap-2">
              {item.analysis.ingredients.map((ingredient, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIngredient(ingredient)}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700
                    rounded-full text-sm font-medium border border-orange-200
                    hover:from-orange-100 hover:to-amber-100 hover:border-orange-300
                    hover:shadow-sm transition-all duration-200 cursor-pointer"
                >
                  {ingredient}
                </button>
              ))}
            </div>
          </div>

          {item.notes && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2">
                <NotesIcon className="h-4.5 w-4.5 text-amber-700" />
                My notes
              </h3>
              <p className="text-slate-600">{item.notes}</p>
            </div>
          )}

          <div className="text-sm text-slate-400 flex items-center gap-2 justify-center">
            <ClockIcon className="h-4 w-4" />
            Saved {new Date(item.createdAt).toLocaleString('en-US')}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-orange-100 px-6 py-4 flex justify-between rounded-b-3xl">
          <button
            onClick={() => void handleDelete()}
            className="flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-red-500 transition-colors hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" />
            Delete favorite
          </button>
          <button
            onClick={onClose}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-400 px-6 py-2 text-white transition-all shadow-md hover:from-orange-500 hover:to-amber-500 hover:shadow-lg"
          >
            <CheckIcon className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {selectedIngredient && (
        <IngredientPopover
          ingredientName={selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
        />
      )}
    </div>
  );
}
