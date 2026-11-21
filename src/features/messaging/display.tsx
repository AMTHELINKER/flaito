import type { ConversationDto, ConversationMemberDto } from '@laito/shared';
import { Avatar } from '@/components/Avatar';

export function otherMembers(c: ConversationDto, meId: string): ConversationMemberDto[] {
  return c.members.filter((m) => m.userId !== meId);
}

/** Nom affiché : titre du groupe, ou l'autre personne d'une conversation privée. */
export function conversationTitle(c: ConversationDto, meId: string): string {
  if (c.type === 'group') return c.title || 'Groupe';
  return otherMembers(c, meId)[0]?.displayName ?? 'Compte supprimé';
}

export function conversationSubtitle(c: ConversationDto, meId: string): string {
  if (c.type === 'group') return `${c.members.length} membre${c.members.length > 1 ? 's' : ''}`;
  const other = otherMembers(c, meId)[0];
  return other ? `@${other.username}` : '';
}

/** Aperçu du dernier message dans la liste. */
export function lastMessagePreview(c: ConversationDto, meId: string): string {
  const m = c.lastMessage;
  if (!m) return c.type === 'group' ? 'Groupe créé' : 'Nouvelle conversation';
  if (m.deletedAt) return 'Message supprimé';
  const author =
    m.senderId === meId
      ? 'Vous : '
      : c.type === 'group'
        ? `${c.members.find((x) => x.userId === m.senderId)?.displayName ?? 'Ancien membre'} : `
        : '';
  return author + m.body.replace(/\s+/g, ' ');
}

/** Heure pour aujourd'hui, « Hier », jour de la semaine, puis date courte. */
export function shortTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000,
  );
  if (days === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Hier';
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor(
    (new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function ConversationAvatar({
  conversation,
  meId,
  size = 44,
}: {
  conversation: ConversationDto;
  meId: string;
  size?: number;
}) {
  const others = otherMembers(conversation, meId);
  if (conversation.type === 'direct') {
    return <Avatar profile={others[0] ?? { displayName: '?', avatarUrl: null }} size={size} />;
  }
  // Groupe : deux visages superposés.
  const [a, b] = others;
  const small = Math.round(size * 0.68);
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {b && (
        <span className="absolute right-0 top-0">
          <Avatar profile={b} size={small} />
        </span>
      )}
      <span className="absolute bottom-0 left-0 rounded-full ring-2 ring-page">
        <Avatar
          profile={a ?? { displayName: conversation.title ?? 'G', avatarUrl: null }}
          size={small}
        />
      </span>
    </span>
  );
}
