/**
 * @fileoverview Realtime socket helpers used by chat and ride features.
 */
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs.js";

export function connectRealtimeSocket({
  userId,
  conversationIds = [],
  onRideUpdate,
  onNearbyDrivers,
  onDriverOffer,
  onConversationUpdate,
  onChatInboxUpdate
}) {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5174";
  const base = (import.meta.env.VITE_WS_URL || browserOrigin).replace(/\/$/, "");
  const client = new Client({
    webSocketFactory: () => new SockJS(`${base}/ws`),
    reconnectDelay: 5000
  });
  client.onConnect = () => {
    if (onNearbyDrivers) {
      client.subscribe("/topic/drivers/nearby", (msg) => onNearbyDrivers(JSON.parse(msg.body)));
    }
    if (onRideUpdate) {
      client.subscribe("/topic/rides", (msg) => onRideUpdate(JSON.parse(msg.body)));
    }
    if (userId && onDriverOffer) {
      client.subscribe(`/topic/drivers/${userId}/offers`, (msg) => onDriverOffer(JSON.parse(msg.body)));
    }
    if (userId && onChatInboxUpdate) {
      client.subscribe(`/topic/chat/users/${userId}`, (msg) => onChatInboxUpdate(JSON.parse(msg.body)));
    }
    conversationIds.filter(Boolean).forEach((conversationId) => {
      client.subscribe(`/topic/conversations/${conversationId}`, (msg) => {
        onConversationUpdate?.(conversationId, JSON.parse(msg.body));
      });
    });
  };
  client.activate();
  return () => client.deactivate();
}
