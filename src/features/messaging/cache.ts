import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { ConversationDto, MessageDto, Paginated } from '@laito/shared';
import { qk } from '@/api/endpoints';

/** Message affiché : éventuellement en cours d'envoi ou en échec (envoi optimiste). */
export type LocalMessage = MessageDto & { status?: 'sending' | 'failed' };

type Pages<T> = InfiniteData<Paginated<T>, string | null>;

const activity = (c: ConversationDto) => c.lastMessageAt ?? c.createdAt;

/** Applique une transformation à la liste des conversations (toutes pages confondues), triée par activité. */
export function updateConversations(
  qc: QueryClient,
  fn: (items: ConversationDto[]) => ConversationDto[],
): void {
  qc.setQueryData<Pages<ConversationDto>>(qk.conversations, (data) => {
    if (!data) return data;
    const all = fn(data.pages.flatMap((p) => p.items)).sort((a, b) =>
      activity(b).localeCompare(activity(a)),
    );
    const last = data.pages[data.pages.length - 1];
    return {
      ...data,
      pages: [{ items: all, nextCursor: last.nextCursor }],
      pageParams: [data.pageParams[0]],
    };
  });
}

export function patchConversation(
  qc: QueryClient,
  id: string,
  patch: (c: ConversationDto) => ConversationDto,
): void {
  updateConversations(qc, (items) => items.map((c) => (c.id === id ? patch(c) : c)));
  qc.setQueryData<ConversationDto>(qk.conversation(id), (c) => (c ? patch(c) : c));
}

/** Ajoute ou remplace un message (rapprochement par id ou par clientId). */
export function upsertMessage(
  qc: QueryClient,
  conversationId: string,
  message: LocalMessage,
): void {
  qc.setQueryData<Pages<LocalMessage>>(qk.messages(conversationId), (data) => {
    if (!data) return data;
    const same = (m: LocalMessage) =>
      m.id === message.id || (!!message.clientId && m.clientId === message.clientId);
    const exists = data.pages.some((p) => p.items.some(same));
    const pages = data.pages.map((p, i) => {
      if (exists) return { ...p, items: p.items.map((m) => (same(m) ? message : m)) };
      return i === 0 ? { ...p, items: [message, ...p.items] } : p;
    });
    return { ...data, pages };
  });
}

export function patchMessage(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
  patch: Partial<LocalMessage>,
): void {
  qc.setQueryData<Pages<LocalMessage>>(qk.messages(conversationId), (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
          })),
        }
      : data,
  );
}

export function removeConversation(qc: QueryClient, id: string): void {
  updateConversations(qc, (items) => items.filter((c) => c.id !== id));
  qc.removeQueries({ queryKey: qk.conversation(id) });
  qc.removeQueries({ queryKey: qk.messages(id) });
}

export function setUnread(qc: QueryClient, update: (n: number) => number): void {
  qc.setQueryData<{ count: number }>(qk.unread, (d) => ({
    count: Math.max(0, update(d?.count ?? 0)),
  }));
}
