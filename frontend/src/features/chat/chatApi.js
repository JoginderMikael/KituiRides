import { apiClient, unwrap } from "../../lib/apiClient";

export function getChatConversations(params = {}) {
  return unwrap(apiClient.get("/chat/conversations", { params }));
}

export function getChatMessages(conversationId) {
  return unwrap(apiClient.get(`/chat/conversations/${conversationId}/messages`));
}

export function sendChatMessage(conversationId, content) {
  return unwrap(apiClient.post(`/chat/conversations/${conversationId}/messages`, { content }));
}

export function markConversationRead(conversationId) {
  return unwrap(apiClient.put(`/chat/conversations/${conversationId}/read`));
}
