import { create } from 'zustand';
import { AuthUser, FavoriteItem, FolderItem, FavoritesState } from '../types';

interface ApiError {
  error?: string;
}

interface SessionResponse {
  user: AuthUser | null;
}

interface FavoritesResponse {
  favorites: FavoriteItem[];
}

interface FavoriteResponse {
  favorite: FavoriteItem;
}

interface FoldersResponse {
  folders: FolderItem[];
}

interface FolderResponse {
  folder: FolderItem;
}

interface LegacyPersistData {
  state?: {
    favorites?: FavoriteItem[];
  };
}

type FavoriteInput = Omit<FavoriteItem, 'id' | 'createdAt'>;

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiError;

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

async function fetchSession(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
  });

  const data = await parseJson<SessionResponse>(response);
  return data.user;
}

async function fetchFavorites(): Promise<FavoriteItem[]> {
  const response = await fetch('/api/favorites', {
    method: 'GET',
    credentials: 'include',
  });

  const data = await parseJson<FavoritesResponse>(response);
  return data.favorites;
}

async function createFavorite(input: FavoriteInput): Promise<FavoriteItem> {
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await parseJson<FavoriteResponse>(response);
  return data.favorite;
}

function readLegacyFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem('meowlytics-favorites');
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as LegacyPersistData;
    if (!parsed.state?.favorites || !Array.isArray(parsed.state.favorites)) {
      return [];
    }
    return parsed.state.favorites;
  } catch {
    return [];
  }
}

function clearLegacyFavorites(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('meowlytics-favorites');
  }
}

function writeLegacyFavorites(favorites: FavoriteItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (favorites.length === 0) {
    clearLegacyFavorites();
    return;
  }

  window.localStorage.setItem(
    'meowlytics-favorites',
    JSON.stringify({ state: { favorites } } satisfies LegacyPersistData)
  );
}

async function migrateLegacyFavoritesToServer(): Promise<string | null> {
  const legacyFavorites = readLegacyFavorites();
  if (legacyFavorites.length === 0) {
    return null;
  }

  const failedItems: FavoriteItem[] = [];

  for (const legacyItem of legacyFavorites) {
    try {
      await createFavorite({
        name: legacyItem.name,
        brand: legacyItem.brand,
        imageData: legacyItem.imageData,
        analysis: legacyItem.analysis,
        notes: legacyItem.notes,
      });
    } catch {
      failedItems.push(legacyItem);
    }
  }

  writeLegacyFavorites(failedItems);

  if (failedItems.length === 0) {
    return null;
  }

  return `${failedItems.length} local favorite(s) failed to migrate. Please try again later.`;
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,
  favorites: [],
  folders: [],
  authModalOpen: false,
  authModalMode: 'login',

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const user = await fetchSession();

      if (!user) {
        set({ user: null, favorites: [], folders: [], loading: false, initialized: true });
        return;
      }

      const migrationError = await migrateLegacyFavoritesToServer();
      const favorites = await fetchFavorites();

      const foldersResponse = await fetch('/api/folders', {
        method: 'GET',
        credentials: 'include',
      });
      const foldersData = await parseJson<FoldersResponse>(foldersResponse);

      set({
        user,
        favorites,
        folders: foldersData.folders,
        loading: false,
        initialized: true,
        error: migrationError,
      });
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error: error instanceof Error ? error.message : 'Initialization failed',
      });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJson<{ user: AuthUser }>(response);
      const migrationError = await migrateLegacyFavoritesToServer();
      const favorites = await fetchFavorites();

      const foldersResponse = await fetch('/api/folders', {
        method: 'GET',
        credentials: 'include',
      });
      const foldersData = await parseJson<FoldersResponse>(foldersResponse);

      set({
        user: data.user,
        favorites,
        folders: foldersData.folders,
        loading: false,
        initialized: true,
        error: migrationError,
        authModalOpen: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      });
      throw error;
    }
  },

  register: async ({ email, password, displayName }) => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await parseJson<{ user: AuthUser }>(response);
      const migrationError = await migrateLegacyFavoritesToServer();
      const favorites = await fetchFavorites();

      const foldersResponse = await fetch('/api/folders', {
        method: 'GET',
        credentials: 'include',
      });
      const foldersData = await parseJson<FoldersResponse>(foldersResponse);

      set({
        user: data.user,
        favorites,
        folders: foldersData.folders,
        loading: false,
        initialized: true,
        error: migrationError,
        authModalOpen: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      await parseJson<{ success: boolean }>(response);

      set({
        user: null,
        favorites: [],
        folders: [],
        loading: false,
        initialized: true,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      });
      throw error;
    }
  },

  addFavorite: async (item) => {
    if (!get().user) {
      throw new Error('Please sign in before saving favorites.');
    }

    set({ loading: true, error: null });

    try {
      const favorite = await createFavorite(item);
      set((state) => ({
        favorites: [favorite, ...state.favorites],
        loading: false,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to save favorite',
      });
      throw error;
    }
  },

  removeFavorite: async (id) => {
    if (!get().user) {
      throw new Error('Please sign in first.');
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      await parseJson<{ success: boolean }>(response);

      set((state) => ({
        favorites: state.favorites.filter((item) => item.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete favorite',
      });
      throw error;
    }
  },

  updateFavorite: async (id, updates) => {
    if (!get().user) {
      throw new Error('Please sign in first.');
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      await parseJson<{ success: boolean }>(response);

      set((state) => ({
        favorites: state.favorites.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
        loading: false,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update favorite',
      });
      throw error;
    }
  },

  getFavoriteById: (id) => get().favorites.find((item) => item.id === id),

  fetchFolders: async () => {
    const response = await fetch('/api/folders', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await parseJson<FoldersResponse>(response);
    set({ folders: data.folders });
  },

  createFolder: async (name, color) => {
    if (!get().user) {
      throw new Error('Please sign in first.');
    }

    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, color }),
    });

    const data = await parseJson<FolderResponse>(response);
    set((state) => ({
      folders: [data.folder, ...state.folders],
    }));
    return data.folder;
  },

  updateFolder: async (id, updates) => {
    if (!get().user) {
      throw new Error('Please sign in first.');
    }

    const response = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    await parseJson<{ success: boolean }>(response);

    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id ? { ...folder, ...updates } : folder
      ),
    }));
  },

  deleteFolder: async (id) => {
    if (!get().user) {
      throw new Error('Please sign in first.');
    }

    const response = await fetch(`/api/folders/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    await parseJson<{ success: boolean }>(response);

    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
      favorites: state.favorites.map((fav) =>
        fav.folderId === id ? { ...fav, folderId: undefined } : fav
      ),
    }));
  },

  openAuthModal: (mode = 'login') => {
    set({ authModalOpen: true, authModalMode: mode, error: null });
  },

  closeAuthModal: () => {
    set({ authModalOpen: false, error: null });
  },
}));
