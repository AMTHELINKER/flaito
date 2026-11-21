import { io, type Socket } from 'socket.io-client';
import { MessagingEvents } from '@laito/shared';
import { API_BASE, getAccessToken, refreshSession } from '@/api/client';

/**
 * Connexion temps réel unique (Socket.IO, espace /messaging).
 * Le jeton d'accès est relu à chaque (re)connexion : une session rafraîchie
 * est donc prise en compte sans recréer la connexion.
 */
let socket: Socket | null = null;

export function connectRealtime(): Socket {
  if (socket) return socket;
  const origin = new URL(API_BASE, window.location.href).origin;
  socket = io(`${origin}/messaging`, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  // Jeton expiré au moment de la connexion : on rafraîchit la session puis on réessaie.
  socket.on('unauthorized', async () => {
    const session = await refreshSession().catch(() => null);
    if (session) window.setTimeout(() => socket?.connect(), 500);
  });
  return socket;
}

export function disconnectRealtime(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

export function getRealtime(): Socket | null {
  return socket;
}

/** Signale « en train d'écrire » (au plus une fois toutes les 3 s par conversation). */
const lastTyping = new Map<string, number>();
export function emitTyping(conversationId: string): void {
  const now = Date.now();
  if (!socket?.connected || now - (lastTyping.get(conversationId) ?? 0) < 3000) return;
  lastTyping.set(conversationId, now);
  socket.emit(MessagingEvents.Typing, { conversationId });
}

// ───────── « En train d'écrire » : petit magasin observable ─────────

const TYPING_TTL_MS = 4500;
const typing = new Map<string, Map<string, number>>();
const typingListeners = new Set<() => void>();
const typingSnapshot = new Map<string, string[]>();

function publishTyping(conversationId: string) {
  const users = typing.get(conversationId);
  const now = Date.now();
  typingSnapshot.set(
    conversationId,
    users ? [...users.entries()].filter(([, exp]) => exp > now).map(([id]) => id) : [],
  );
  typingListeners.forEach((l) => l());
}

export function markTyping(conversationId: string, userId: string): void {
  const users = typing.get(conversationId) ?? new Map<string, number>();
  users.set(userId, Date.now() + TYPING_TTL_MS);
  typing.set(conversationId, users);
  publishTyping(conversationId);
  window.setTimeout(() => publishTyping(conversationId), TYPING_TTL_MS + 50);
}

export function clearTyping(conversationId: string, userId: string): void {
  typing.get(conversationId)?.delete(userId);
  publishTyping(conversationId);
}

export const typingStore = {
  subscribe(listener: () => void) {
    typingListeners.add(listener);
    return () => typingListeners.delete(listener);
  },
  get(conversationId: string): string[] {
    return typingSnapshot.get(conversationId) ?? EMPTY;
  },
};
const EMPTY: string[] = [];

// ───────── Conversation affichée (pour ne pas compter ses messages comme non lus) ─────────

let activeConversationId: string | null = null;
export const setActiveConversation = (id: string | null) => {
  activeConversationId = id;
};
export const isActiveConversation = (id: string) =>
  activeConversationId === id && document.visibilityState === 'visible';
