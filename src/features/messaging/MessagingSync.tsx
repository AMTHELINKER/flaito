import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MessagingEvents,
  type ConversationReadEvent,
  type ConversationRemovedEvent,
  type MessageDeletedEvent,
  type MessageNewEvent,
  type TypingEvent,
} from '@laito/shared';
import { qk } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import {
  patchConversation,
  patchMessage,
  removeConversation,
  setUnread,
  upsertMessage,
} from './cache';
import {
  clearTyping,
  connectRealtime,
  disconnectRealtime,
  isActiveConversation,
  markTyping,
} from './realtime';

/**
 * Relie le canal temps réel au cache de données : les écrans n'ont qu'à lire
 * leurs requêtes, elles se mettent à jour d'elles-mêmes. Monté une fois, si connecté.
 */
export function MessagingSync() {
  const { status, user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const userId = user?.id;
  // `navigate` change à chaque navigation et `toast` à chaque rendu : on les lit via des refs
  // pour que la connexion temps réel ne soit pas recréée (et des événements perdus) à chaque page.
  const navigateRef = useRef(navigate);
  const toastRef = useRef(toast);
  navigateRef.current = navigate;
  toastRef.current = toast;

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    const socket = connectRealtime();

    const onMessage = ({ conversationId, message }: MessageNewEvent) => {
      clearTyping(conversationId, message.senderId);
      upsertMessage(qc, conversationId, message);
      const fromOther = message.senderId !== userId;
      const counts = fromOther && !isActiveConversation(conversationId);
      let known = false;
      patchConversation(qc, conversationId, (c) => {
        known = true;
        return {
          ...c,
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount: counts ? c.unreadCount + 1 : c.unreadCount,
        };
      });
      if (counts) setUnread(qc, (n) => n + 1);
      // Nouvelle conversation (ex. on vient d'être ajouté à un groupe) : recharger la liste.
      if (!known) void qc.invalidateQueries({ queryKey: qk.conversations });
    };

    const onDeleted = ({ conversationId, messageId }: MessageDeletedEvent) => {
      patchMessage(qc, conversationId, messageId, {
        body: '',
        deletedAt: new Date().toISOString(),
      });
      void qc.invalidateQueries({ queryKey: qk.conversations });
    };

    const onUpdated = ({ conversationId }: { conversationId: string }) => {
      void qc.invalidateQueries({ queryKey: qk.conversation(conversationId) });
      void qc.invalidateQueries({ queryKey: qk.conversations, exact: true });
    };

    const onRemoved = ({ conversationId }: ConversationRemovedEvent) => {
      removeConversation(qc, conversationId);
      void qc.invalidateQueries({ queryKey: qk.unread });
      if (window.location.pathname === `/messages/${conversationId}`) {
        toastRef.current.show('Vous ne faites plus partie de ce groupe.');
        navigateRef.current('/messages', { replace: true });
      }
    };

    const onRead = ({ conversationId, userId: reader }: ConversationReadEvent) => {
      if (reader !== userId) return;
      // Lu depuis un autre appareil : on aligne les compteurs.
      patchConversation(qc, conversationId, (c) => ({ ...c, unreadCount: 0 }));
      void qc.invalidateQueries({ queryKey: qk.unread });
    };

    const onTyping = ({ conversationId, userId: who }: TypingEvent) =>
      markTyping(conversationId, who);
    const onFriends = () => void qc.invalidateQueries({ queryKey: qk.friends });

    // À chaque (re)connexion, on rattrape ce qui a pu être manqué pendant la coupure.
    let connectedOnce = false;
    const onConnect = () => {
      if (!connectedOnce) {
        connectedOnce = true;
        return;
      }
      void qc.invalidateQueries({ queryKey: qk.conversations });
      void qc.invalidateQueries({ queryKey: qk.friends });
    };

    socket.on(MessagingEvents.MessageNew, onMessage);
    socket.on(MessagingEvents.MessageDeleted, onDeleted);
    socket.on(MessagingEvents.ConversationUpdated, onUpdated);
    socket.on(MessagingEvents.ConversationRemoved, onRemoved);
    socket.on(MessagingEvents.ConversationRead, onRead);
    socket.on(MessagingEvents.Typing, onTyping);
    socket.on(MessagingEvents.FriendsChanged, onFriends);
    socket.on('connect', onConnect);
    return () => disconnectRealtime();
  }, [status, userId, qc]);

  return null;
}
