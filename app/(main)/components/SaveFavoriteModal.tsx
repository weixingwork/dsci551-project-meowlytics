'use client';

import { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { BookmarkIcon, BuildingIcon, CloseIcon, HeartIcon, NotesIcon, TagIcon, FolderIcon, ChevronDownIcon, PlusIcon, CheckIcon } from './icons';

const FOLDER_COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

interface SaveFavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult;
  imageData?: string;
}

export default function SaveFavoriteModal({
  isOpen,
  onClose,
  analysis,
  imageData,
}: SaveFavoriteModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const addFavorite = useFavoritesStore((state) => state.addFavorite);
  const user = useFavoritesStore((state) => state.user);
  const folders = useFavoritesStore((state) => state.folders);
  const createFolder = useFavoritesStore((state) => state.createFolder);
  const fetchFolders = useFavoritesStore((state) => state.fetchFolders);

  useEffect(() => {
    if (isOpen && user) {
      void fetchFolders();
    }
  }, [isOpen, user, fetchFolders]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFolderDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const selectedFolder = folders.find((f) => f.id === folderId);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(newFolderName.trim(), newFolderColor);
      setFolderId(folder.id);
      setNewFolderName('');
      setNewFolderColor(FOLDER_COLORS[0]);
      setShowNewFolder(false);
      setFolderDropdownOpen(false);
    } catch {
      alert('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert('Please sign in to save favorites');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }

    setSaving(true);

    try {
      await addFavorite({
        name: name.trim(),
        brand: brand.trim() || undefined,
        notes: notes.trim() || undefined,
        analysis,
        imageData,
        folderId,
      });

      setName('');
      setBrand('');
      setNotes('');
      setFolderId(undefined);
      setShowNewFolder(false);
      setNewFolderName('');
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Save failed, please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-orange-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Save favorite"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-16 -right-14 w-36 h-36 rounded-full bg-orange-100/80 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 w-40 h-40 rounded-full bg-teal-100/45 blur-3xl" />

        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-slate-800">
              <BookmarkIcon className="h-5 w-5 text-orange-600" />
              Save this cat food
            </h2>
            <p className="mt-1 text-sm text-slate-500">Save this analysis so you can compare later.</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <TagIcon className="h-4 w-4 text-orange-600" />
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Canin Kitten"
              className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-2.5
                focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                placeholder:text-slate-400 transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <BuildingIcon className="h-4 w-4 text-orange-600" />
              Brand (optional)
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Royal Canin"
              className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-2.5
                focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                placeholder:text-slate-400 transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <NotesIcon className="h-4 w-4 text-orange-600" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes..."
              rows={2}
              className="w-full resize-none rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-2.5
                focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Folder picker */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <FolderIcon className="h-4 w-4 text-orange-600" />
              Folder (optional)
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setFolderDropdownOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-2.5
                  focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all text-left"
              >
                <span className="flex items-center gap-2">
                  {selectedFolder ? (
                    <>
                      <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedFolder.color }} />
                      <span className="text-slate-700">{selectedFolder.name}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Uncategorized (default)</span>
                  )}
                </span>
                <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${folderDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {folderDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-orange-200 bg-white shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setFolderId(undefined); setFolderDropdownOpen(false); }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-orange-50 ${
                      folderId === undefined ? 'bg-orange-50 font-semibold text-orange-700' : 'text-slate-600'
                    }`}
                  >
                    Uncategorized (default)
                  </button>
                  {folders.map((folder) => (
                    <button
                      type="button"
                      key={folder.id}
                      onClick={() => { setFolderId(folder.id); setFolderDropdownOpen(false); }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-orange-50 ${
                        folderId === folder.id ? 'bg-orange-50 font-semibold text-orange-700' : 'text-slate-600'
                      }`}
                    >
                      <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                      {folder.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setShowNewFolder(true); setFolderDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left text-orange-600 font-semibold transition-colors hover:bg-orange-50 border-t border-orange-100"
                  >
                    <PlusIcon className="h-4 w-4" />
                    New folder...
                  </button>
                </div>
              )}
            </div>

            {showNewFolder && (
              <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50/30 p-3 space-y-2.5">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm
                    focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                    placeholder:text-slate-400 transition-all"
                />
                <div className="flex items-center gap-1.5">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                        newFolderColor === color ? 'ring-2 ring-offset-1 ring-orange-400 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {newFolderColor === color && <CheckIcon className="h-3 w-3 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateFolder()}
                    disabled={!newFolderName.trim() || creatingFolder}
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white
                      disabled:opacity-50 transition-all"
                  >
                    {creatingFolder ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold
            ${analysis.overallScore >= 7 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
              analysis.overallScore >= 5 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
              'bg-gradient-to-r from-red-400 to-rose-500'}`}>
            {analysis.overallScore.toFixed(1)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600 line-clamp-2">{analysis.recommendation}</p>
          </div>
        </div>

        {!user && (
          <p className="mt-3 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Sign in to save favorites and analyses to your account.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 transition-all hover:bg-slate-50"
          >
            <CloseIcon className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 font-semibold text-white
              hover:from-orange-500 hover:to-amber-500 transition-all shadow-md hover:shadow-lg
              disabled:opacity-50"
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" /> : <HeartIcon className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save favorite'}
          </button>
        </div>
      </div>
    </div>
  );
}
