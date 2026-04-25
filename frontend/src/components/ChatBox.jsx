/**
 * @fileoverview UI component module for chat box.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatMessages, markConversationRead, sendChatMessage } from "../features/chat/chatApi";
import { useAuth } from "../hooks/useAuth";
import { connectRealtimeSocket } from "../lib/socket";
import { Button, LoadingSpinner } from "./UIComponents";

export default function ChatBox({
  conversationId,
  title = "Conversation",
  participantName,
  participantPhone,
  onClose,
  onActivity,
  heightClassName = "h-[28rem]"
}) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: () => getChatMessages(conversationId),
    enabled: Boolean(conversationId)
  });

  useEffect(() => {
    if (!conversationId) {
      return () => {};
    }
    const disconnect = connectRealtimeSocket({
      conversationIds: [conversationId],
      onConversationUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        queryClient.invalidateQueries({ queryKey: ["ride-chat-thread"] });
        onActivity?.();
      }
    });
    return disconnect;
  }, [conversationId, onActivity, queryClient]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    markConversationRead(conversationId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
        queryClient.invalidateQueries({ queryKey: ["ride-chat-thread"] });
        onActivity?.();
      })
      .catch(() => {});
  }, [conversationId, messagesQuery.data, onActivity, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: () => sendChatMessage(conversationId, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      queryClient.invalidateQueries({ queryKey: ["ride-chat-thread"] });
      onActivity?.();
    }
  });

  const orderedMessages = useMemo(() => messagesQuery.data || [], [messagesQuery.data]);

  if (!conversationId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
        Select a conversation to start chatting.
      </div>
    );
  }

  if (messagesQuery.isLoading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`flex ${heightClassName} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div>
          <p className="font-semibold">{title}</p>
          {participantName && (
            <p className="text-xs text-slate-300">
              {participantName}
              {participantPhone ? ` • ${participantPhone}` : ""}
            </p>
          )}
        </div>
        {onClose && (
          <button className="text-sm text-slate-300 hover:text-white" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
        {orderedMessages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            No messages yet. Start the conversation.
          </div>
        ) : (
          orderedMessages.map((message) => {
            const mine = message.sender?.userId === session?.userId;
            const senderName = message.sender?.fullName || "System";
            const senderPhone = message.sender?.phoneNumber;
            if (message.systemMessage) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="max-w-[90%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
                    <p>{message.content}</p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    mine
                      ? "bg-teal-600 text-white"
                      : "border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <p className={`mb-1 text-xs font-semibold ${mine ? "text-teal-100" : "text-slate-500"}`}>
                    {senderName}
                    {senderPhone ? ` • ${senderPhone}` : ""}
                  </p>
                  <p>{message.content}</p>
                  <p className={`mt-2 text-[11px] ${mine ? "text-teal-100" : "text-slate-400"}`}>
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex gap-3 border-t border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) {
            return;
          }
          sendMutation.mutate();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
        <Button loading={sendMutation.isPending}>Send</Button>
      </form>
    </div>
  );
}
