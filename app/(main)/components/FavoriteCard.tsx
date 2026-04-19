'use client';

import { FavoriteItem } from '../types';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { ClockIcon, TrashIcon } from './icons';

interface FavoriteCardProps {
  item: FavoriteItem;
  onClick?: () => void;
  compareMode?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onToggleSelect?: () => void;
}

export default function FavoriteCard({ item, onClick, compareMode, selected, disabled, onToggleSelect }: FavoriteCardProps) {
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);

  const getScoreStyle = (score: number) => {
    if (score >= 7) {
      return { bg: 'from-green-500 to-emerald-500', glow: 'score-glow-good', label: 'Excellent' };
    }
    if (score >= 5) {
      return { bg: 'from-amber-500 to-yellow-500', glow: 'score-glow-warning', label: 'Average' };
    }
    return { bg: 'from-red-500 to-rose-500', glow: 'score-glow-bad', label: 'Poor' };
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this favorite?')) return;
    try {
      await removeFavorite(item.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Delete failed, please try again');
    }
  };

  const scoreStyle = getScoreStyle(item.analysis.overallScore);

  return (
    <div
      onClick={compareMode ? (disabled ? undefined : onToggleSelect) : onClick}
      onKeyDown={(event) => {
        const handler = compareMode ? (disabled ? undefined : onToggleSelect) : onClick;
        if (!handler) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handler();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={compareMode ? `Select for compare: ${item.name}` : onClick ? `View favorite: ${item.name}` : undefined}
      className={`glass-card rounded-3xl p-5 card-hover-lift cursor-pointer group relative overflow-hidden ${
        compareMode && selected ? 'ring-2 ring-orange-400' : ''
      } ${compareMode && disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {compareMode && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-orange-500 border-orange-500 text-white'
                : disabled
                  ? 'border-slate-300 bg-slate-100'
                  : 'border-orange-300 bg-white'
            }`}
          >
            {selected && (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.4 4.2 4.2L19 6.8" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute -top-16 -right-12 w-36 h-36 rounded-full bg-orange-100/70 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-lg text-slate-800 truncate">{item.name}</h3>
          {item.brand && <p className="text-sm text-slate-500 mt-0.5 truncate">{item.brand}</p>}
        </div>

        <div className={`rounded-2xl px-3 py-2 text-white bg-gradient-to-r ${scoreStyle.bg} ${scoreStyle.glow}`}>
          <p className="text-xs opacity-90">{scoreStyle.label}</p>
          <p className="font-black text-lg leading-none mt-1">{item.analysis.overallScore.toFixed(1)}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">{item.analysis.recommendation}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.analysis.ingredients.slice(0, 4).map((ing, idx) => (
          <span key={idx} className="text-xs px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700">
            {ing}
          </span>
        ))}
        {item.analysis.ingredients.length > 4 && (
          <span className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-500">
            +{item.analysis.ingredients.length - 4}
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-slate-400">
          <ClockIcon className="h-3.5 w-3.5" />
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <button
          onClick={(e) => void handleDelete(e)}
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-slate-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
          aria-label={`Delete favorite ${item.name}`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
