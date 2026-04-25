/**
 * @fileoverview API helper module for chat api.
 */
import { apiClient, unwrap } from "../../lib/apiClient";

function normalizeParams(params = {}) {
  const next = { ...params };
  if (Array.isArray(next.threadTypes)) {
    next.threadTypes = next.threadTypes.join(",");
  }
  if (Array.isArray(next.roles)) {
    next.roles = next.roles.join(",");
  }
  return next;
}

export function getChatThreads(params = {}) {
  return unwrap(apiClient.get("/chat/threads", { params: normalizeParams(params) }));
}

export function getChatThread(threadId) {
  return unwrap(apiClient.get(`/chat/threads/${threadId}`));
}

export function getChatMessages(threadId) {
  return unwrap(apiClient.get(`/chat/threads/${threadId}/messages`));
}

export function createChatThread(payload) {
  return unwrap(apiClient.post("/chat/threads", payload));
}

export function sendChatMessage(threadId, content) {
  return unwrap(apiClient.post(`/chat/threads/${threadId}/messages`, { content }));
}

export function markThreadRead(threadId) {
  return unwrap(apiClient.put(`/chat/threads/${threadId}/read`));
}

export function closeChatThread(threadId, payload = {}) {
  return unwrap(apiClient.put(`/chat/threads/${threadId}/close`, payload));
}

export function resolveChatThread(threadId, payload = {}) {
  return unwrap(apiClient.put(`/chat/threads/${threadId}/resolve`, payload));
}

export function reopenChatThread(threadId) {
  return unwrap(apiClient.put(`/chat/threads/${threadId}/reopen`));
}

export function getChatUnreadSummary() {
  return unwrap(apiClient.get("/chat/unread-summary"));
}

export function searchChatParticipants(params = {}) {
  return unwrap(apiClient.get("/chat/participants", { params: normalizeParams(params) }));
}

// Compatibility helpers for older in-page chat code while the new launchers take over.
export function getChatConversations(params = {}) {
  return getChatThreads(params);
}

export function markConversationRead(threadId) {
  return markThreadRead(threadId);
}
