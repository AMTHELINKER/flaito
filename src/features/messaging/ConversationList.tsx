import { NavLink } from 'react-router-dom';
import type { ConversationDto } from '@laito/shared';
import { cx, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ConversationAvatar, conversationTitle, lastMessagePreview, shortTime } from './display';

export function ConversationList({
  conversations,
  meId,
  loading,
  empty,
}: {
  conversations: ConversationDto[];
  meId: string;
  loading: boolean;
  empty: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  if (!conversations.length) return <>{empty}</>;
  return (
    <ul className="flex flex-col gap-0.5" aria-label="Conversations">
      {conversations.map((c) => {
        const unread = c.unreadCount > 0;
        return (
          <li key={c.id}>
            <NavLink
              to={`/messages/${c.id}`}
              className={({ isActive }) =>
                cx(
                  'pressable flex items-center gap-3 rounded-md px-2 py-2.5',
                  isActive ? 'bg-page shadow-soft' : 'hover:bg-fg/[0.05]',
                )
              }
            >
              <ConversationAvatar conversation={c} meId={meId} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cx('truncate', unread ? 'font-semibold' : 'font-medium')}>
                    {conversationTitle(c, meId)}
                  </p>
                  <time
                    className={cx(
                      'shrink-0 text-xs',
                      unread ? 'font-semibold text-accent-text' : 'text-muted',
                    )}
                  >
                    {shortTime(c.lastMessageAt ?? c.createdAt)}
                  </time>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cx('truncate text-sm', unread ? 'text-fg' : 'text-muted')}>
                    {lastMessagePreview(c, meId)}
                  </p>
                  {unread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[0.7rem] font-semibold text-accent-fg">
                      <span className="sr-only">Non lus : </span>
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

export function NoConversations({
  onNew,
  onFriends,
}: {
  onNew: () => void;
  onFriends: () => void;
}) {
  return (
    <EmptyState
      icon="message"
      title="Aucune conversation"
      text="Écrivez à un ami ou créez un groupe pour échanger autour de vos livres."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onNew}
            className="pressable min-h-11 rounded-md bg-accent px-4 font-semibold text-accent-fg shadow-soft"
          >
            Nouvelle conversation
          </button>
          <button
            type="button"
            onClick={onFriends}
            className="pressable min-h-11 rounded-md px-4 hover:bg-fg/[0.06]"
          >
            Ajouter des amis
          </button>
        </div>
      }
    />
  );
}
