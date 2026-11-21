import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { ConversationDto, MessageDto, Paginated } from '@laito/shared';
import { qk } from '@/api/endpoints';
import { patchConversation, upsertMessage, type LocalMessage } from './cache';

const msg = (over: Partial<LocalMessage>): LocalMessage => ({
  id: 'm1',
  conversationId: 'c1',
  senderId: 'u1',
  body: 'Bonjour',
  createdAt: '2026-01-01T10:00:00.000Z',
  deletedAt: null,
  clientId: null,
  ...over,
});

const conv = (id: string, lastMessageAt: string | null): ConversationDto => ({
  id,
  type: 'direct',
  title: null,
  members: [],
  lastMessage: null,
  lastMessageAt,
  unreadCount: 0,
  myRole: 'member',
  canSend: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

function seedMessages(qc: QueryClient, items: LocalMessage[]) {
  qc.setQueryData<InfiniteData<Paginated<MessageDto>, string | null>>(qk.messages('c1'), {
    pages: [{ items, nextCursor: null }],
    pageParams: [null],
  });
}
const messages = (qc: QueryClient) =>
  qc.getQueryData<InfiniteData<Paginated<LocalMessage>>>(qk.messages('c1'))!.pages[0].items;

describe('cache de la messagerie', () => {
  it('remplace le message optimiste par la réponse du serveur (même clientId)', () => {
    const qc = new QueryClient();
    seedMessages(qc, [msg({ id: 'old' })]);
    upsertMessage(qc, 'c1', msg({ id: 'local-x', clientId: 'x', status: 'sending' }));
    expect(messages(qc).map((m) => m.id)).toEqual(['local-x', 'old']);
    upsertMessage(qc, 'c1', msg({ id: 'srv-1', clientId: 'x' }));
    expect(messages(qc).map((m) => [m.id, m.status])).toEqual([
      ['srv-1', undefined],
      ['old', undefined],
    ]);
  });

  it('ignore un doublon reçu à la fois par HTTP et par le temps réel', () => {
    const qc = new QueryClient();
    seedMessages(qc, []);
    upsertMessage(qc, 'c1', msg({ id: 'srv-1', clientId: 'x' }));
    upsertMessage(qc, 'c1', msg({ id: 'srv-1', clientId: 'x' }));
    expect(messages(qc)).toHaveLength(1);
  });

  it('remonte en tête la conversation qui reçoit un message', () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.conversations, {
      pages: [
        {
          items: [conv('a', '2026-01-02T00:00:00Z'), conv('b', '2026-01-01T00:00:00Z')],
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });
    patchConversation(qc, 'b', (c) => ({
      ...c,
      lastMessageAt: '2026-01-03T00:00:00Z',
      unreadCount: 1,
    }));
    const items = qc.getQueryData<InfiniteData<Paginated<ConversationDto>>>(qk.conversations)!
      .pages[0].items;
    expect(items.map((c) => [c.id, c.unreadCount])).toEqual([
      ['b', 1],
      ['a', 0],
    ]);
  });
});
