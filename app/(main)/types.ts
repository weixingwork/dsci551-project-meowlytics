export interface AnalysisResult {
  ingredients: string[];           // List of identified ingredients
  analysis: {
    ingredient: string;
    category: string;              // "protein" | "carbohydrate" | "fat" | "additive" | "vitamin" | "other"
    healthImpact: string;          // "good" | "neutral" | "bad"
    description: string;           // Brief explanation in Chinese
  }[];
  overallScore: number;            // 1-10
  recommendation: string;          // Good/Bad judgment + actionable buying decision in Chinese
  summary: string;                 // Brief overall summary in Chinese
}

// Favorites types
export interface FavoriteItem {
  id: string;
  name: string;                    // User-given name like "皇家幼猫粮"
  brand?: string;                  // Brand name (optional)
  imageData?: string;              // Base64 image data (optional)
  analysis: AnalysisResult;        // The analysis result
  createdAt: string;               // ISO date string
  notes?: string;                  // User notes (optional)
  folderId?: string;               // Folder ID (optional)
}

export interface FolderItem {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  favoriteCount: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  createdAt: string;
  isAdmin: boolean;
}

export interface FavoritesState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  favorites: FavoriteItem[];
  folders: FolderItem[];
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'createdAt'>) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => Promise<void>;
  getFavoriteById: (id: string) => FavoriteItem | undefined;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<FolderItem>;
  updateFolder: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}
