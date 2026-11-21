import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { friendsApi, messagingApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { Button, cx, Tabs } from '@/components/ui/primitives';
import { ConversationList, NoConversations } from './ConversationList';
import { ConversationView } from './ConversationView';
import { FriendsPanel } from './FriendsPanel';
import { NewConversationModal } from './NewConversationModal';

type Tab = 'discussions' | 'amis';

/**
 * Messagerie : liste des conversations (ou amis) à gauche, fil à droite.
 * Sur mobile, un seul volet à la fois.
 */
export function MessagesPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('onglet') === 'amis' ? 'amis' : 'discussions';
  const setTab = (t: Tab) => setParams(t === 'amis' ? { onglet: 'amis' } : {}, { replace: true });
  const [creating, setCreating] = useState(false);

  const conversations = useInfiniteQuery({
    queryKey: qk.conversations,
    queryFn: ({ pageParam }) => messagingApi.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const friends = useQuery({ queryKey: qk.friends, queryFn: friendsApi.list });
  const incoming = (friends.data ?? []).filter(
    (f) => f.status === 'pending' && f.direction === 'incoming',
  ).length;

  if (!user) return null;
  const items = conversations.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="glass grid h-[calc(100dvh-10.5rem)] min-h-[26rem] overflow-hidden rounded-xl md:h-[calc(100dvh-7rem)] md:grid-cols-[22rem_1fr]">
      <aside
        className={cx(
          'flex min-h-0 flex-col border-line md:border-r',
          conversationId ? 'hidden md:flex' : 'flex',
        )}
        aria-label="Conversations et amis"
      >
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
          <h1 className="text-2xl">Messages</h1>
          <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
            Nouvelle
          </Button>
        </div>
        <div className="px-4">
          <Tabs
            label="Messagerie"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'discussions', label: 'Discussions' },
              { value: 'amis', label: incoming ? `Amis · ${incoming}` : 'Amis' },
            ]}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {tab === 'discussions' ? (
            <>
              <ConversationList
                conversations={items}
                meId={user.id}
                loading={conversations.isLoading}
                empty={
                  <NoConversations
                    onNew={() => setCreating(true)}
                    onFriends={() => setTab('amis')}
                  />
                }
              />
              {conversations.hasNextPage && (
                <div className="mt-2 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    busy={conversations.isFetchingNextPage}
                    onClick={() => void conversations.fetchNextPage()}
                  >
                    Conversations plus anciennes
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="px-2">
              <FriendsPanel />
            </div>
          )}
        </div>
      </aside>

      <section
        className={cx(
          'min-h-0 bg-page/40',
          conversationId ? 'flex flex-col' : 'hidden md:flex md:flex-col',
        )}
      >
        {conversationId ? (
          <ConversationView key={conversationId} conversationId={conversationId} />
        ) : (
          <div className="m-auto flex max-w-xs flex-col items-center gap-3 p-6 text-center text-muted">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-accent-text">
              <Icon name="message" size={28} />
            </span>
            <p>Choisissez une conversation, ou écrivez à un ami.</p>
          </div>
        )}
      </section>

      <NewConversationModal
        open={creating}
        onClose={() => setCreating(false)}
        onAddFriends={() => setTab('amis')}
      />
    </div>
  );
}
