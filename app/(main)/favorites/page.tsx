'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFavoritesStore } from '../store/useFavoritesStore';
import FavoriteCard from '../components/FavoriteCard';
import FavoriteDetailModal from '../components/FavoriteDetailModal';
import { FavoriteItem } from '../types';
import { HeartIcon, UserIcon, CompareIcon, FolderIcon, PlusIcon, CheckIcon, EditIcon, TrashIcon } from '../components/icons';

const FOLDER_COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export default function FavoritesPage() {
  const router = useRouter();
  const user = useFavoritesStore((state) => state.user);
  const favorites = useFavoritesStore((state) => state.favorites);
  const folders = useFavoritesStore((state) => state.folders);
  const initialized = useFavoritesStore((state) => state.initialized);
  const initialize = useFavoritesStore((state) => state.initialize);
  const fetchFolders = useFavoritesStore((state) => state.fetchFolders);
  const createFolder = useFavoritesStore((state) => state.createFolder);
  const updateFolder = useFavoritesStore((state) => state.updateFolder);
  const deleteFolder = useFavoritesStore((state) => state.deleteFolder);

  const [selectedItem, setSelectedItem] = useState<FavoriteItem | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // New folder creation state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const newFolderRef = useRef<HTMLDivElement>(null);

  // Folder rename state
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  useEffect(() => {
    if (initialized && user) {
      void fetchFolders();
    }
  }, [initialized, user, fetchFolders]);

  // Close new folder popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newFolderRef.current && !newFolderRef.current.contains(e.target as Node)) {
        setShowNewFolder(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFolderData = folders.find((f) => f.id === activeFolder);

  // Filter favorites by active folder
  const filteredFavorites = activeFolder === null
    ? favorites
    : favorites.filter((item) => item.folderId === activeFolder);

  // Count favorites per folder
  const folderCounts = (fId: string) => favorites.filter((item) => item.folderId === fId).length;

  const handleToggleCompare = () => {
    setCompareMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleStartCompare = () => {
    if (selectedIds.length >= 2) {
      router.push(`/compare?ids=${selectedIds.join(',')}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(newFolderName.trim(), newFolderColor);
      setActiveFolder(folder.id);
      setNewFolderName('');
      setNewFolderColor(FOLDER_COLORS[0]);
      setShowNewFolder(false);
    } catch {
      alert('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!activeFolder || !renameValue.trim()) return;
    try {
      await updateFolder(activeFolder, { name: renameValue.trim() });
      setRenamingFolder(false);
    } catch {
      alert('Rename failed');
    }
  };

  const handleDeleteFolder = async () => {
    if (!activeFolder) return;
    try {
      await deleteFolder(activeFolder);
      setActiveFolder(null);
      setConfirmDelete(false);
    } catch {
      alert('Failed to delete folder');
    }
  };

  // Reset compare selection when folder changes
  useEffect(() => {
    setSelectedIds([]);
  }, [activeFolder]);

  if (!initialized) {
    return <div className="site-container py-20 text-center text-slate-500">Loading favorites...</div>;
  }

  if (!user) {
    return (
      <div className="site-container py-10">
        <div className="glass-card rounded-3xl text-center py-16 px-8">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <UserIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Please sign in</h2>
          <p className="text-slate-500 mb-6">Sign in to sync favorites and analyses across devices</p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white"
          >
            Back to home to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container py-8">
      {/* Header section */}
      <section className="glass-card rounded-3xl p-6 mb-7 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-teal-100/60 blur-3xl" />
        <h1 className="text-3xl font-black bg-gradient-to-r from-orange-700 via-orange-500 to-teal-500 bg-clip-text text-transparent">
          My Favorites
        </h1>
        <p className="mt-2 text-slate-500">All your saved cat food analyses, synced across devices.</p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black">
              {favorites.length}
            </span>
            <span className="text-sm font-semibold text-slate-600">{favorites.length} saved</span>
          </div>
          {favorites.length >= 2 && (
            <button
              onClick={handleToggleCompare}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                compareMode
                  ? 'bg-orange-500 text-white'
                  : 'border border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
              }`}
            >
              <CompareIcon className="h-4 w-4" />
              {compareMode ? 'Exit compare' : 'Compare mode'}
            </button>
          )}
        </div>
      </section>

      {/* Folder tabs */}
      {favorites.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* "All" pill */}
            <button
              onClick={() => setActiveFolder(null)}
              className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                activeFolder === null
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                  : 'border border-orange-200 bg-white text-slate-600 hover:bg-orange-50'
              }`}
            >
              All
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-black ${
                activeFolder === null ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700'
              }`}>
                {favorites.length}
              </span>
            </button>

            {/* Folder pills */}
            {folders.map((folder) => {
              const isActive = activeFolder === folder.id;
              const count = folderCounts(folder.id);
              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'border border-orange-200 bg-white text-slate-600 hover:bg-orange-50'
                  }`}
                  style={isActive ? { backgroundColor: folder.color } : undefined}
                >
                  {!isActive && (
                    <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                  )}
                  {folder.name}
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* "+" create folder pill */}
            <div className="relative flex-shrink-0" ref={newFolderRef}>
              <button
                onClick={() => setShowNewFolder((prev) => !prev)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-dashed border-orange-300 bg-white text-orange-500 transition-all hover:bg-orange-50 hover:border-orange-400"
                aria-label="New folder"
              >
                <PlusIcon className="h-4 w-4" />
              </button>

              {showNewFolder && (
                <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-orange-200 bg-white p-4 shadow-xl space-y-3">
                  <p className="text-sm font-semibold text-slate-700">New folder</p>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="w-full rounded-lg border border-orange-200 bg-orange-50/30 px-3 py-2 text-sm
                      focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                      placeholder:text-slate-400 transition-all"
                    autoFocus
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
        </section>
      )}

      {/* Folder management toolbar */}
      {activeFolderData && (
        <section className="mb-5 flex items-center gap-3 flex-wrap">
          {renamingFolder ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="rounded-lg border border-orange-200 bg-orange-50/30 px-3 py-1.5 text-sm
                  focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') void handleRenameFolder(); if (e.key === 'Escape') setRenamingFolder(false); }}
              />
              <button
                onClick={() => void handleRenameFolder()}
                disabled={!renameValue.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                onClick={() => setRenamingFolder(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: activeFolderData.color }} />
                <span className="text-sm font-semibold text-slate-700">{activeFolderData.name}</span>
              </div>
              <button
                onClick={() => { setRenamingFolder(true); setRenameValue(activeFolderData.name); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                <EditIcon className="h-3.5 w-3.5" />
                Rename
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Favorites won&apos;t be deleted, just uncategorized</span>
                  <button
                    onClick={() => void handleDeleteFolder()}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                  >
                    Confirm delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete folder
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* Favorites grid */}
      {filteredFavorites.length === 0 ? (
        <section className="glass-card rounded-3xl text-center py-20 px-6">
          <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            {activeFolder ? <FolderIcon className="h-8 w-8" /> : <HeartIcon className="h-8 w-8" />}
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            {activeFolder ? 'This folder is empty' : 'No favorites yet'}
          </h2>
          <p className="text-slate-500 mb-6">
            {activeFolder ? 'Try saving some cat foods to this folder.' : 'Analyze a cat food and save it here.'}
          </p>
          {!activeFolder && (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white"
            >
              Analyze a cat food
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFavorites.map((item) => (
            <FavoriteCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
              compareMode={compareMode}
              selected={selectedIds.includes(item.id)}
              disabled={compareMode && selectedIds.length >= 3 && !selectedIds.includes(item.id)}
              onToggleSelect={() => handleToggleSelect(item.id)}
            />
          ))}
        </section>
      )}

      {/* Compare mode bottom bar */}
      {compareMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-orange-200 bg-white/90 backdrop-blur-md">
          <div className="site-container flex items-center justify-between py-4">
            <span className="text-sm font-semibold text-slate-600">
              Selected <span className="text-orange-600 font-black">{selectedIds.length}</span>/3
            </span>
            <button
              onClick={handleStartCompare}
              disabled={selectedIds.length < 2}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CompareIcon className="h-4 w-4" />
              Start compare
            </button>
          </div>
        </div>
      )}

      {selectedItem && !compareMode && (
        <FavoriteDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
