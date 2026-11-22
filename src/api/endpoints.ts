import type {
  AccessGrantDto,
  AdminStatsDto,
  AdminUserDto,
  AuthResponse,
  BookDto,
  ChapterContentDto,
  ChapterDto,
  ConversationDto,
  CreateAccessGrantRequest,
  CreateBookRequest,
  CreateChapterRequest,
  CreateReportRequest,
  CreateShareLinkRequest,
  FriendDto,
  LoginRequest,
  MeDto,
  ModerationActionDto,
  MessageDto,
  Paginated,
  ProfileDto,
  PublicProfileDto,
  ReadableBookDto,
  ReadableChapterDto,
  ReadingProgressDto,
  ReportDecision,
  ReportDto,
  ReportStatus,
  RegisterRequest,
  ResourceType,
  SaveContentRequest,
  ShareLinkDto,
  UpdateBookRequest,
  UpdateChapterRequest,
  UserRole,
  UserSettingsDto,
} from '@laito/shared';
import { api } from './client';

type Msg = { message: string };
const q = (params: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const qk = {
  me: ['me'] as const,
  myBooks: ['books', 'mine'] as const,
  book: (id: string) => ['books', id] as const,
  chapters: (bookId: string) => ['books', bookId, 'chapters'] as const,
  content: (chapterId: string) => ['chapters', chapterId, 'content'] as const,
  readBook: (id: string, share?: string) => ['read', 'book', id, share ?? ''] as const,
  readChapter: (id: string, share?: string) => ['read', 'chapter', id, share ?? ''] as const,
  progress: ['read', 'progress'] as const,
  shareLinks: (t: ResourceType, id: string) => ['share', 'links', t, id] as const,
  grants: (t: ResourceType, id: string) => ['share', 'grants', t, id] as const,
  sharedWithMe: ['share', 'with-me'] as const,
  friends: ['friends'] as const,
  catalog: (p: object) => ['catalog', p] as const,
  genres: ['catalog', 'genres'] as const,
  profile: (u: string) => ['profiles', u] as const,
  userSearch: (term: string) => ['users', 'search', term] as const,
  conversations: ['conversations'] as const,
  conversation: (id: string) => ['conversations', id] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
  unread: ['conversations', 'unread-count'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminReports: (status: ReportStatus) => ['admin', 'reports', status] as const,
  adminUsers: (q: string) => ['admin', 'users', q] as const,
  adminActions: ['admin', 'actions'] as const,
};

export const authApi = {
  register: (b: RegisterRequest) => api<Msg>('/auth/register', { method: 'POST', body: b }),
  verifyEmail: (token: string) =>
    api<AuthResponse>('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (email: string) =>
    api<Msg>('/auth/resend-verification', { method: 'POST', body: { email } }),
  login: (b: LoginRequest) => api<AuthResponse>('/auth/login', { method: 'POST', body: b }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) =>
    api<Msg>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api<Msg>('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

export const meApi = {
  get: () => api<MeDto>('/me'),
  updateProfile: (b: Partial<Pick<ProfileDto, 'username' | 'displayName' | 'bio' | 'links'>>) =>
    api<ProfileDto>('/me/profile', { method: 'PATCH', body: b }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api<ProfileDto>('/me/avatar', { method: 'POST', body: fd });
  },
  updateSettings: (b: Partial<UserSettingsDto>) =>
    api<UserSettingsDto>('/me/settings', { method: 'PATCH', body: b }),
  exportData: () => api<unknown>('/me/export'),
  deleteAccount: (password: string) => api<void>('/me', { method: 'DELETE', body: { password } }),
  publicProfile: (username: string) =>
    api<{ profile: ProfileDto; books: BookDto[] }>(`/profiles/${encodeURIComponent(username)}`),
};

export const booksApi = {
  mine: () => api<BookDto[]>('/books/mine'),
  create: (b: CreateBookRequest) => api<BookDto>('/books', { method: 'POST', body: b }),
  get: (id: string) => api<BookDto>(`/books/${id}`),
  update: (id: string, b: UpdateBookRequest) =>
    api<BookDto>(`/books/${id}`, { method: 'PATCH', body: b }),
  remove: (id: string) => api<void>(`/books/${id}`, { method: 'DELETE' }),
  restore: (id: string) => api<BookDto>(`/books/${id}/restore`, { method: 'POST' }),
  uploadCover: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api<BookDto>(`/books/${id}/cover`, { method: 'POST', body: fd });
  },
  chapters: (id: string) => api<ChapterDto[]>(`/books/${id}/chapters`),
  createChapter: (id: string, b: CreateChapterRequest = {}) =>
    api<ChapterDto>(`/books/${id}/chapters`, { method: 'POST', body: b }),
  reorder: (id: string, chapterIds: string[]) =>
    api<ChapterDto[]>(`/books/${id}/chapters/order`, { method: 'PUT', body: { chapterIds } }),
};

export const chaptersApi = {
  update: (id: string, b: UpdateChapterRequest) =>
    api<ChapterDto>(`/chapters/${id}`, { method: 'PATCH', body: b }),
  remove: (id: string) => api<void>(`/chapters/${id}`, { method: 'DELETE' }),
  content: (id: string) => api<ChapterContentDto>(`/chapters/${id}/content`),
  saveContent: (id: string, b: SaveContentRequest) =>
    api<ChapterContentDto>(`/chapters/${id}/content`, { method: 'PUT', body: b }),
};

export const readApi = {
  book: (id: string, share?: string) => api<ReadableBookDto>(`/read/books/${id}${q({ share })}`),
  chapter: (id: string, share?: string) =>
    api<ReadableChapterDto>(`/read/chapters/${id}${q({ share })}`),
  saveProgress: (b: { bookId: string; chapterId: string; position: number }) =>
    api<ReadingProgressDto>('/read/progress', { method: 'PUT', body: b }),
  progress: () => api<(ReadingProgressDto & { book: BookDto })[]>('/read/progress'),
};

export const shareApi = {
  links: (t: ResourceType, id: string) =>
    api<ShareLinkDto[]>(`/share/links${q({ resourceType: t, resourceId: id })}`),
  createLink: (b: CreateShareLinkRequest) =>
    api<ShareLinkDto>('/share/links', { method: 'POST', body: b }),
  revokeLink: (id: string) => api<void>(`/share/links/${id}`, { method: 'DELETE' }),
  resolve: (token: string) =>
    api<{ resourceType: ResourceType; resourceId: string; bookId: string }>(
      `/share/resolve/${encodeURIComponent(token)}`,
    ),
  grants: (t: ResourceType, id: string) =>
    api<AccessGrantDto[]>(`/share/grants${q({ resourceType: t, resourceId: id })}`),
  createGrant: (b: CreateAccessGrantRequest) =>
    api<AccessGrantDto>('/share/grants', { method: 'POST', body: b }),
  removeGrant: (id: string) => api<void>(`/share/grants/${id}`, { method: 'DELETE' }),
  withMe: () => api<BookDto[]>('/share/with-me'),
};

export const friendsApi = {
  list: () => api<FriendDto[]>('/friends'),
  add: (username: string) =>
    api<FriendDto>(`/friends/${encodeURIComponent(username)}`, { method: 'POST' }),
  remove: (userId: string) => api<void>(`/friends/${userId}`, { method: 'DELETE' }),
};

export interface CatalogParams {
  q?: string;
  genre?: string;
  sort?: 'recent' | 'trending';
  cursor?: string;
  limit?: number;
}
export const catalogApi = {
  list: (p: CatalogParams) =>
    api<Paginated<BookDto>>(`/catalog${q(p as Record<string, string | number | undefined>)}`),
  genres: () => api<{ genre: string; count: number }[]>('/catalog/genres'),
};

export const usersApi = {
  search: (term: string) => api<PublicProfileDto[]>(`/users/search${q({ q: term })}`),
};

export const messagingApi = {
  list: (cursor?: string | null) =>
    api<Paginated<ConversationDto>>(`/conversations${q({ cursor, limit: 50 })}`),
  get: (id: string) => api<ConversationDto>(`/conversations/${id}`),
  unread: () => api<{ count: number }>('/conversations/unread-count'),
  openDirect: (userId: string) =>
    api<ConversationDto>('/conversations/direct', { method: 'POST', body: { userId } }),
  createGroup: (title: string, memberIds: string[]) =>
    api<ConversationDto>('/conversations/group', { method: 'POST', body: { title, memberIds } }),
  rename: (id: string, title: string) =>
    api<ConversationDto>(`/conversations/${id}`, { method: 'PATCH', body: { title } }),
  addMembers: (id: string, userIds: string[]) =>
    api<ConversationDto>(`/conversations/${id}/members`, { method: 'POST', body: { userIds } }),
  removeMember: (id: string, userId: string) =>
    api<void>(`/conversations/${id}/members/${userId}`, { method: 'DELETE' }),
  messages: (id: string, before?: string | null) =>
    api<Paginated<MessageDto>>(`/conversations/${id}/messages${q({ before, limit: 40 })}`),
  send: (id: string, body: string, clientId: string) =>
    api<MessageDto>(`/conversations/${id}/messages`, { method: 'POST', body: { body, clientId } }),
  deleteMessage: (id: string, messageId: string) =>
    api<void>(`/conversations/${id}/messages/${messageId}`, { method: 'DELETE' }),
  markRead: (id: string) => api<void>(`/conversations/${id}/read`, { method: 'POST' }),
};

export const reportsApi = {
  create: (b: CreateReportRequest) => api<Msg>('/reports', { method: 'POST', body: b }),
};

type ContentType = 'book' | 'chapter' | 'message';
export const adminApi = {
  stats: () => api<AdminStatsDto>('/admin/stats'),
  reports: (status: ReportStatus, cursor?: string | null) =>
    api<Paginated<ReportDto>>(`/admin/reports${q({ status, cursor })}`),
  resolve: (id: string, decision: ReportDecision, note?: string) =>
    api<void>(`/admin/reports/${id}/resolve`, { method: 'POST', body: { decision, note } }),
  hide: (type: ContentType, id: string, reason?: string) =>
    api<void>(`/admin/content/${type}/${id}/hide`, { method: 'POST', body: { reason } }),
  unhide: (type: ContentType, id: string, reason?: string) =>
    api<void>(`/admin/content/${type}/${id}/unhide`, { method: 'POST', body: { reason } }),
  users: (term: string, cursor?: string | null) =>
    api<Paginated<AdminUserDto>>(`/admin/users${q({ q: term, cursor })}`),
  suspend: (id: string, reason?: string) =>
    api<void>(`/admin/users/${id}/suspend`, { method: 'POST', body: { reason } }),
  reinstate: (id: string, reason?: string) =>
    api<void>(`/admin/users/${id}/reinstate`, { method: 'POST', body: { reason } }),
  setRole: (id: string, role: UserRole) =>
    api<void>(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  actions: (cursor?: string | null) =>
    api<Paginated<ModerationActionDto>>(`/admin/actions${q({ cursor })}`),
};
