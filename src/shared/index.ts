/**
 * Types et règles communs à l'API et au front (copie synchronisée avec le dépôt blaito : src/shared).
 * Toute réponse de l'API v1 respecte ces formes.
 */

export * from './text';

// ───────────────────────── Énumérations ─────────────────────────

export const Visibility = {
  Private: 'private',
  Friends: 'friends',
  Link: 'link',
  Public: 'public',
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];
export const VISIBILITIES: Visibility[] = ['private', 'friends', 'link', 'public'];

export const WritingStatus = {
  Draft: 'draft',
  InProgress: 'in_progress',
  Finished: 'finished',
  Published: 'published',
} as const;
export type WritingStatus = (typeof WritingStatus)[keyof typeof WritingStatus];
export const WRITING_STATUSES: WritingStatus[] = ['draft', 'in_progress', 'finished', 'published'];

export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type ThemeName = 'parchment' | 'light' | 'sepia' | 'night';
export type Locale = 'fr' | 'en';
export type ResourceType = 'book' | 'chapter';
export type GrantPermission = 'read' | 'comment';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

// ───────────────────────── Constantes métier ─────────────────────────

export const PASSWORD_MIN_LENGTH = 8;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AUTOSAVE_DELAY_MS = 2000;
export const READING_PROGRESS_INTERVAL_MS = 10_000;
export const WORDS_PER_MINUTE = 230;

export const GENRES = [
  'roman',
  'nouvelle',
  'fantasy',
  'science-fiction',
  'policier',
  'romance',
  'poésie',
  'essai',
  'jeunesse',
  'historique',
  'horreur',
  'autre',
] as const;
export type Genre = (typeof GENRES)[number];

// ───────────────────────── Préférences ─────────────────────────

export interface ReadingPreferences {
  theme: ThemeName;
  fontFamily: 'literata' | 'lora' | 'inter';
  fontSize: number; // px, 14–28
  lineHeight: number; // 1.3–2.2
  margin: 'narrow' | 'normal' | 'wide';
  justify: boolean;
  mode: 'scroll' | 'paged';
}

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  theme: 'parchment',
  fontFamily: 'literata',
  fontSize: 19,
  lineHeight: 1.7,
  margin: 'normal',
  justify: true,
  mode: 'scroll',
};

export interface UserSettingsDto {
  locale: Locale;
  theme: ThemeName;
  notificationsEnabled: boolean;
  readingPreferences: ReadingPreferences;
  onboardingCompleted: boolean;
}

// ───────────────────────── Identité ─────────────────────────

export interface ProfileDto {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  links: string[];
}

export interface MeDto {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  profile: ProfileDto;
  settings: UserSettingsDto;
}

export interface AuthResponse {
  accessToken: string;
  user: MeDto;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  displayName?: string;
  theme?: ThemeName;
  fontSize?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ───────────────────────── Écriture ─────────────────────────

export interface BookDto {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  genre: string | null;
  tags: string[];
  status: WritingStatus;
  visibility: Visibility;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  chapterCount: number;
  wordCount: number;
  author?: Pick<ProfileDto, 'userId' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface ChapterDto {
  id: string;
  bookId: string;
  title: string;
  position: number;
  status: WritingStatus;
  visibility: Visibility;
  wordCount: number;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ChapterContentDto {
  chapterId: string;
  content: string;
  version: number;
  updatedAt: string;
}

export interface CreateBookRequest {
  title: string;
  summary?: string;
  genre?: string;
  tags?: string[];
}

export type UpdateBookRequest = Partial<CreateBookRequest> & {
  status?: WritingStatus;
  visibility?: Visibility;
};

export interface CreateChapterRequest {
  title?: string;
}

export interface UpdateChapterRequest {
  title?: string;
  status?: WritingStatus;
  visibility?: Visibility;
}

export interface SaveContentRequest {
  content: string;
  /** Version connue par le client (contrôle de concurrence optimiste). */
  baseVersion?: number;
}

export interface ReorderChaptersRequest {
  chapterIds: string[];
}

// ───────────────────────── Lecture ─────────────────────────

export interface ReadableBookDto {
  book: BookDto;
  chapters: ChapterDto[];
  progress: ReadingProgressDto | null;
  isOwner: boolean;
}

export interface ReadableChapterDto {
  chapter: ChapterDto;
  content: string;
  previousChapterId: string | null;
  nextChapterId: string | null;
}

export interface ReadingProgressDto {
  bookId: string;
  chapterId: string;
  /** Index du paragraphe atteint. */
  position: number;
  updatedAt: string;
}

// ───────────────────────── Partage ─────────────────────────

export interface ShareLinkDto {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  token: string;
  url: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateShareLinkRequest {
  resourceType: ResourceType;
  resourceId: string;
  expiresAt?: string | null;
}

export interface AccessGrantDto {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  grantee: Pick<ProfileDto, 'userId' | 'username' | 'displayName' | 'avatarUrl'>;
  permission: GrantPermission;
  createdAt: string;
}

export interface CreateAccessGrantRequest {
  resourceType: ResourceType;
  resourceId: string;
  username: string;
  permission?: GrantPermission;
}

// ───────────────────────── Social (minimal MVP) ─────────────────────────

export interface FriendDto {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: FriendshipStatus;
  direction: 'incoming' | 'outgoing' | 'mutual';
}

// ───────────────────────── Divers ─────────────────────────

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: 'Privé',
  friends: 'Amis',
  link: 'Lien privé',
  public: 'Public',
};

export const STATUS_LABELS: Record<WritingStatus, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  finished: 'Terminé',
  published: 'Publié',
};
