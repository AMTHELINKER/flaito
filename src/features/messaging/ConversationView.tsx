import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MESSAGE_MAX_LENGTH, type ConversationDto } from '@laito/shared';
import { errorMessage } from '@/api/client';
import { messagingApi, qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { cx, ErrorNotice, IconButton, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { useOnline } from '@/hooks/useOnline';
import { patchConversation, setUnread, upsertMessage, type LocalMessage } from './cache';
import { conversationSubtitle, conversationTitle, ConversationAvatar, dayLabel } from './display';
import { GroupInfoModal } from './GroupInfoModal';
import { emitTyping, setActiveConversation, typingStore } from './realtime';

const GROUP_GAP_MS = 5 * 60_000;

export function ConversationView({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const meId = user!.id;
  const conv = useQuery({
    queryKey: qk.conversation(conversationId),
    queryFn: () => messagingApi.get(conversationId),
  });
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  if (conv.error)
    return (
      <div className="p-4">
        <ErrorNotice error={conv.error} onRetry={() => conv.refetch()} />
      </div>
    );
  if (!conv.data)
    return (
      <div className="flex flex-col gap-3 p-4" aria-hidden>
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-16 w-1/2" />
      </div>
    );

  const c = conv.data;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* En-tête façon messagerie mobile : retour, avatar et nom (touchez pour le profil ou les infos du groupe). */}
      <header className="flex items-center gap-1 border-b border-line bg-page/95 px-1 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] backdrop-blur md:bg-transparent md:px-3 md:py-2">
        <Link
          to="/messages"
          aria-label="Retour aux conversations"
          className="pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-fg/[0.06] md:hidden"
        >
          <Icon name="chevronLeft" size={24} />
        </Link>
        <HeaderIdentity conversation={c} meId={meId} onGroupInfo={() => setInfoOpen(true)} />
        {c.type === 'group' && (
          <IconButton icon="info" label="Infos du groupe" onClick={() => setInfoOpen(true)} />
        )}
      </header>

      <MessageList conversation={c} meId={meId} />
      <Composer conversation={c} meId={meId} />
      {c.type === 'group' && (
        <GroupInfoModal conversation={c} open={infoOpen} onClose={() => setInfoOpen(false)} />
      )}
    </div>
  );
}

function HeaderIdentity({
  conversation,
  meId,
  onGroupInfo,
}: {
  conversation: ConversationDto;
  meId: string;
  onGroupInfo: () => void;
}) {
  const body = (
    <>
      <ConversationAvatar conversation={conversation} meId={meId} size={38} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-sans text-base font-semibold">
          {conversationTitle(conversation, meId)}
        </span>
        <TypingOrSubtitle conversation={conversation} meId={meId} />
      </span>
    </>
  );
  const cls =
    'pressable flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 hover:bg-fg/[0.04]';
  if (conversation.type === 'group')
    return (
      <button
        type="button"
        className={cls}
        onClick={onGroupInfo}
        aria-label={`Infos du groupe ${conversation.title ?? ''}`}
      >
        {body}
      </button>
    );
  const other = conversation.members.find((m) => m.userId !== meId);
  return other ? (
    <Link to={`/u/${other.username}`} className={cls} aria-label={`Profil de ${other.displayName}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function TypingOrSubtitle({ conversation, meId }: { conversation: ConversationDto; meId: string }) {
  const ids = useSyncExternalStore(typingStore.subscribe, () => typingStore.get(conversation.id));
  const names = ids
    .filter((id) => id !== meId)
    .map((id) => conversation.members.find((m) => m.userId === id)?.displayName)
    .filter(Boolean);
  if (names.length)
    return (
      <span className="block truncate text-xs text-accent-text" aria-live="polite">
        {names.length === 1 ? `${names[0]} écrit…` : 'Plusieurs personnes écrivent…'}
      </span>
    );
  return (
    <span className="block truncate text-xs text-muted">
      {conversationSubtitle(conversation, meId)}
    </span>
  );
}

// ───────────────────────── Fil des messages ─────────────────────────

function MessageList({ conversation, meId }: { conversation: ConversationDto; meId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevHeight = useRef(0);
  const [toDelete, setToDelete] = useState<LocalMessage | null>(null);

  const messages = useInfiniteQuery({
    queryKey: qk.messages(conversation.id),
    queryFn: ({ pageParam }) => messagingApi.messages(conversation.id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  // Les pages arrivent du plus récent au plus ancien : on remet dans l'ordre de lecture.
  const items = useMemo(
    () => (messages.data?.pages.flatMap((p) => p.items as LocalMessage[]) ?? []).slice().reverse(),
    [messages.data],
  );
  const newestId = items[items.length - 1]?.id;

  // Marquer comme lu à l'ouverture et à chaque nouveau message visible.
  useEffect(() => {
    if (!newestId || document.visibilityState !== 'visible') return;
    const unread = conversation.unreadCount;
    if (unread > 0) {
      patchConversation(qc, conversation.id, (c) => ({ ...c, unreadCount: 0 }));
      setUnread(qc, (n) => n - unread);
    }
    void messagingApi.markRead(conversation.id).catch(() => undefined);
  }, [newestId, conversation.id, conversation.unreadCount, qc]);

  // Charger les messages plus anciens en remontant.
  useEffect(() => {
    const el = topSentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && messages.hasNextPage && !messages.isFetchingNextPage) {
          prevHeight.current = scroller.current?.scrollHeight ?? 0;
          void messages.fetchNextPage();
        }
      },
      { root: scroller.current, rootMargin: '200px 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [messages]);

  // Position de défilement : en bas à l'ouverture et pour un nouveau message si on y était déjà ;
  // inchangée quand des messages plus anciens s'ajoutent au-dessus.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevHeight.current) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = 0;
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items.length]);

  const del = useMutation({
    mutationFn: (m: LocalMessage) => messagingApi.deleteMessage(conversation.id, m.id),
    onSuccess: (_r, m) =>
      upsertMessage(qc, conversation.id, { ...m, body: '', deletedAt: new Date().toISOString() }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const memberName = (id: string) =>
    conversation.members.find((m) => m.userId === id)?.displayName ?? 'Ancien membre';
  const member = (id: string) => conversation.members.find((m) => m.userId === id);

  return (
    <div
      ref={scroller}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
      onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      role="log"
      aria-label="Messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div ref={topSentinel} />
      {messages.isFetchingNextPage && <Skeleton className="mx-auto mb-4 h-6 w-32" />}
      {messages.isLoading && (
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="ml-auto h-12 w-1/2" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      )}
      {!messages.isLoading && !items.length && (
        <p className="mx-auto mt-10 max-w-xs text-center text-sm text-muted">
          {conversation.type === 'group'
            ? 'Le groupe est prêt. Lancez la discussion !'
            : 'Aucun message pour l’instant. Dites bonjour !'}
        </p>
      )}

      <ol className="flex flex-col">
        {items.map((m, i) => {
          const prev = items[i - 1];
          const mine = m.senderId === meId;
          const newDay =
            !prev ||
            new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const grouped =
            !newDay &&
            prev?.senderId === m.senderId &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS;
          const author = member(m.senderId);
          return (
            <li
              key={m.clientId ?? m.id}
              className={cx('flex flex-col', grouped ? 'mt-0.5' : 'mt-3')}
            >
              {newDay && (
                <p className="my-3 text-center text-xs font-medium text-muted first-letter:uppercase">
                  {dayLabel(m.createdAt)}
                </p>
              )}
              <div className={cx('group flex items-end gap-2', mine && 'flex-row-reverse')}>
                {!mine && conversation.type === 'group' && (
                  <span className="w-8 shrink-0">
                    {!grouped && author && <Avatar profile={author} size={32} />}
                  </span>
                )}
                <div
                  className={cx(
                    'flex max-w-[80%] flex-col sm:max-w-[70%]',
                    mine ? 'items-end' : 'items-start',
                  )}
                >
                  {!mine && !grouped && conversation.type === 'group' && (
                    <span className="mb-0.5 px-1 text-xs text-muted">{memberName(m.senderId)}</span>
                  )}
                  <Bubble message={m} mine={mine} />
                </div>
                {mine && !m.deletedAt && !m.status && (
                  <IconButton
                    icon="trash"
                    size={16}
                    label="Supprimer ce message"
                    onClick={() => setToDelete(m)}
                    className="h-9 w-9 text-muted opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce message ?"
        message="Il disparaîtra pour tous les membres de la conversation."
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function Bubble({ message, mine }: { message: LocalMessage; mine: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (message.deletedAt)
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm italic text-muted">
        Message supprimé
      </p>
    );
  return (
    <div
      className={cx(
        'rounded-lg px-3 py-2 shadow-soft',
        mine ? 'rounded-br-sm bg-accent/25 text-fg' : 'rounded-bl-sm bg-page text-fg',
        message.status === 'sending' && 'opacity-70',
        message.status === 'failed' && 'ring-1 ring-danger',
      )}
    >
      {/* Texte brut : aucun HTML n'est interprété. */}
      <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">
        {message.body}
      </p>
      <p className="mt-0.5 text-right text-[0.7rem] text-muted">
        {message.status === 'sending'
          ? 'Envoi…'
          : message.status === 'failed'
            ? 'Échec de l’envoi'
            : time}
      </p>
    </div>
  );
}

// ───────────────────────── Saisie ─────────────────────────

function Composer({ conversation, meId }: { conversation: ConversationDto; meId: string }) {
  const qc = useQueryClient();
  const online = useOnline();
  const [text, setText] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ta.current?.focus();
  }, [conversation.id]);

  const autoGrow = useCallback(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const send = useMutation({
    mutationFn: (m: LocalMessage) => messagingApi.send(conversation.id, m.body, m.clientId!),
    onMutate: (m) => upsertMessage(qc, conversation.id, m),
    onSuccess: (saved) => {
      upsertMessage(qc, conversation.id, saved);
      patchConversation(qc, conversation.id, (c) => ({
        ...c,
        lastMessage: saved,
        lastMessageAt: saved.createdAt,
      }));
    },
    onError: (_e, m) => upsertMessage(qc, conversation.id, { ...m, status: 'failed' }),
  });

  const submit = () => {
    const body = text.trim();
    if (!body || !online || !conversation.canSend) return;
    const clientId = crypto.randomUUID();
    send.mutate({
      id: `local-${clientId}`,
      clientId,
      conversationId: conversation.id,
      senderId: meId,
      body,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      status: 'sending',
    });
    setText('');
    requestAnimationFrame(autoGrow);
  };

  if (!conversation.canSend)
    return (
      <p className="border-t border-line px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm text-muted">
        Vous n’êtes plus amis : cette conversation est en lecture seule.
      </p>
    );

  return (
    <form
      className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-3 sm:pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="composer" className="sr-only">
        Votre message
      </label>
      {/* Champ en pilule, bouton d'envoi intégré. */}
      <div className="flex items-end rounded-3xl border border-line bg-surface focus-within:border-accent-text focus-within:ring-2 focus-within:ring-accent/30">
        <textarea
          id="composer"
          ref={ta}
          rows={1}
          value={text}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={online ? 'Votre message' : 'Hors ligne – reconnectez-vous pour écrire'}
          disabled={!online}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow();
            if (e.target.value) emitTyping(conversation.id);
          }}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée passe à la ligne.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 pl-4 leading-snug text-fg placeholder:text-muted/80 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={!text.trim() || !online}
          className={cx(
            'pressable m-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-opacity duration-150',
            // Le bouton n'apparaît que lorsqu'il y a quelque chose à envoyer.
            text.trim() ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <Icon name="send" size={18} />
        </button>
      </div>
    </form>
  );
}
