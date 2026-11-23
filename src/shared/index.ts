/**
 * Types et règles communs à l'API et au front.
 *
 * SOURCE DE VÉRITÉ : dépôt blaito, dossier src/shared.
 * Le front (dépôt flaito) en garde une copie, mise à jour par `pnpm shared:sync`
 * et contrôlée par sa CI : ne modifiez ces fichiers que dans blaito.
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
  /** Masqué par la modération (visible seulement de l'auteur). */
  hiddenAt?: string | null;
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
  /** Masqué par la modération (visible seulement de l'auteur). */
  hiddenAt?: string | null;
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

export type PublicProfileDto = Pick<
  ProfileDto,
  'userId' | 'username' | 'displayName' | 'avatarUrl'
>;

// ───────────────────────── Messagerie ─────────────────────────

export const MESSAGE_MAX_LENGTH = 4000;
export const GROUP_TITLE_MAX_LENGTH = 80;
export const GROUP_MAX_MEMBERS = 50;

export type ConversationType = 'direct' | 'group';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface ConversationMemberDto extends PublicProfileDto {
  role: MemberRole;
  joinedAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  /** Vide si le message a été supprimé. */
  body: string;
  createdAt: string;
  deletedAt: string | null;
  /** Identifiant choisi par l'expéditeur, pour rapprocher l'envoi optimiste de la réponse. */
  clientId: string | null;
}

export interface ConversationDto {
  id: string;
  type: ConversationType;
  /** Titre du groupe ; pour une conversation privée, null (afficher l'autre participant). */
  title: string | null;
  members: ConversationMemberDto[];
  lastMessage: MessageDto | null;
  lastMessageAt: string | null;
  unreadCount: number;
  /** Rôle de l'utilisateur courant. */
  myRole: MemberRole;
  /** Conversation privée : faux si les deux personnes ne sont plus amies (historique en lecture seule). */
  canSend: boolean;
  createdAt: string;
}

export interface CreateDirectConversationRequest {
  userId: string;
}

export interface CreateGroupConversationRequest {
  title: string;
  memberIds: string[];
}

export interface UpdateConversationRequest {
  title: string;
}

export interface AddMembersRequest {
  userIds: string[];
}

export interface SendMessageRequest {
  body: string;
  clientId?: string;
}

/** Événements temps réel (Socket.IO, espace de noms /messaging). */
export const MessagingEvents = {
  MessageNew: 'message:new',
  MessageDeleted: 'message:deleted',
  ConversationUpdated: 'conversation:updated',
  ConversationRemoved: 'conversation:removed',
  ConversationRead: 'conversation:read',
  Typing: 'typing',
  FriendsChanged: 'friends:changed',
} as const;

export interface MessageNewEvent {
  conversationId: string;
  message: MessageDto;
}
export interface MessageDeletedEvent {
  conversationId: string;
  messageId: string;
}
export interface ConversationRemovedEvent {
  conversationId: string;
}
export interface ConversationReadEvent {
  conversationId: string;
  userId: string;
  readAt: string;
}
export interface TypingEvent {
  conversationId: string;
  userId: string;
}

// ───────────────────────── Modération ─────────────────────────

export type ReportTargetType = 'book' | 'chapter' | 'user' | 'message';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type ModerationActionType =
  | 'hide_content'
  | 'unhide_content'
  | 'suspend_user'
  | 'reinstate_user'
  | 'dismiss_report'
  | 'change_role'
  | 'delete_user';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam ou publicité',
  harassment: 'Harcèlement ou propos haineux',
  inappropriate: 'Contenu inapproprié',
  copyright: 'Plagiat ou droits d’auteur',
  other: 'Autre',
};

export const REPORT_REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];
export const REPORT_DETAILS_MAX_LENGTH = 1000;

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/** Résumé lisible de ce qui est signalé (pour l'écran de modération). */
export interface ReportTargetSummary {
  label: string;
  excerpt: string | null;
  /** Lien vers le contenu dans l'application, si consultable. */
  href: string | null;
  /** Auteur du contenu signalé (ou la personne signalée). */
  ownerId: string | null;
  ownerName: string | null;
  hidden: boolean;
  /** Le contenu n'existe plus. */
  missing: boolean;
}

export interface ReportDto {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reporter: PublicProfileDto | null;
  target: ReportTargetSummary;
  /** Nombre de signalements ouverts sur la même cible. */
  similarOpen: number;
  createdAt: string;
  resolvedAt: string | null;
}

export type ReportDecision = 'dismiss' | 'hide' | 'suspend';

export interface ResolveReportRequest {
  decision: ReportDecision;
  note?: string;
}

export interface AdminStatsDto {
  users: { total: number; new7d: number; suspended: number; verified: number };
  books: { total: number; public: number; new7d: number; hidden: number };
  chapters: { total: number; published: number };
  words: number;
  messages: { total: number; last7d: number };
  reports: { open: number; resolved7d: number };
}

export interface AdminUserDto extends PublicProfileDto {
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  bookCount: number;
}

export interface ModerationActionDto {
  id: string;
  moderator: PublicProfileDto | null;
  action: ModerationActionType;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string | null;
  reason: string | null;
  createdAt: string;
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
