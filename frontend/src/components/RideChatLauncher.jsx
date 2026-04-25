/**
 * @fileoverview UI component module for ride chat launcher.
 */
import { useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiX } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { connectRealtimeSocket } from "../lib/socket";
import ChatBox from "./ChatBox";
import { LoadingSpinner, ToastContainer } from "./UIComponents";

let rideChatAudioContext = null;

function getRideChatAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!rideChatAudioContext) {
    rideChatAudioContext = new AudioContextClass();
  }

  return rideChatAudioContext;
}

function primeRideChatAudio() {
  const context = getRideChatAudioContext();
  if (!context || context.state !== "suspended") {
    return;
  }
  context.resume().catch(() => {});
}

function playRideChatNotificationSound() {
  const context = getRideChatAudioContext();
  if (!context) {
    return;
  }

  const startChime = () => {
    const startAt = context.currentTime;
    const notes = [
      { frequency: 784, offset: 0, duration: 0.16, gain: 0.035 },
      { frequency: 1046, offset: 0.14, duration: 0.2, gain: 0.03 }
    ];

    notes.forEach(({ frequency, offset, duration, gain }) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt + offset);

      envelope.gain.setValueAtTime(0.0001, startAt + offset);
      envelope.gain.exponentialRampToValueAtTime(gain, startAt + offset + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + duration);

      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + duration + 0.03);
    });
  };

  if (context.state === "suspended") {
    context.resume().then(startChime).catch(() => {});
    return;
  }

  startChime();
}

export default function RideChatLauncher({
  activeRide,
  chatThread,
  participantName,
  participantPhone,
  isLoading = false,
  isError = false,
  errorMessage = "Unable to load the ride chat right now.",
  placeholder = "Ride chat will appear here once the conversation is ready.",
  onActivity
}) {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const previousThreadStateRef = useRef({
    threadId: null,
    unreadCount: 0,
    lastMessageAt: null
  });

  const unreadCount = Number(chatThread?.unreadCount || 0);

  const removeToast = (toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  };

  const pushToast = (message) => {
    const toastId = `ride-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [
      ...current.slice(-2),
      { id: toastId, message, type: "info", duration: 5000 }
    ]);
  };

  useEffect(() => {
    if (!activeRide) {
      setIsOpen(false);
    }
  }, [activeRide]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const unlockAudio = () => primeRideChatAudio();
    window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!session?.userId || !activeRide || isOpen) {
      return () => {};
    }

    const disconnect = connectRealtimeSocket({
      userId: session.userId,
      conversationIds: chatThread?.id ? [chatThread.id] : [],
      onConversationUpdate: () => onActivity?.(),
      onChatInboxUpdate: () => onActivity?.()
    });

    return disconnect;
  }, [activeRide, chatThread?.id, isOpen, onActivity, session?.userId]);

  useEffect(() => {
    const nextThreadId = chatThread?.id || null;
    const nextUnreadCount = Number(chatThread?.unreadCount || 0);
    const nextLastMessageAt = chatThread?.lastMessageAt || chatThread?.updatedAt || null;
    const previousThreadState = previousThreadStateRef.current;

    if (!nextThreadId) {
      previousThreadStateRef.current = {
        threadId: null,
        unreadCount: 0,
        lastMessageAt: null
      };
      return;
    }

    const threadChanged = previousThreadState.threadId !== nextThreadId;
    const unreadIncreased = nextUnreadCount > previousThreadState.unreadCount;
    const previousTimestamp = previousThreadState.lastMessageAt
      ? new Date(previousThreadState.lastMessageAt).getTime()
      : 0;
    const nextTimestamp = nextLastMessageAt ? new Date(nextLastMessageAt).getTime() : 0;
    const hasNewerMessage = nextTimestamp > previousTimestamp;

    if (!threadChanged && unreadIncreased && hasNewerMessage && !isOpen) {
      const senderName = participantName || chatThread.participant?.fullName || "Your ride contact";
      const preview = chatThread.lastMessagePreview?.trim();
      pushToast(preview ? `${senderName}: ${preview}` : `${senderName} sent a new ride message.`);
      playRideChatNotificationSound();
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([120, 70, 120]);
      }
    }

    previousThreadStateRef.current = {
      threadId: nextThreadId,
      unreadCount: nextUnreadCount,
      lastMessageAt: nextLastMessageAt
    };
  }, [
    chatThread?.id,
    chatThread?.lastMessageAt,
    chatThread?.lastMessagePreview,
    chatThread?.participant?.fullName,
    chatThread?.unreadCount,
    chatThread?.updatedAt,
    isOpen,
    participantName
  ]);

  if (!activeRide) {
    return null;
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 left-4 z-[75] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-teal-600 text-white shadow-[0_24px_45px_-24px_rgba(15,23,42,0.7)] transition hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-white/60 md:bottom-6 md:left-6"
          aria-label={unreadCount > 0 ? `Open ride chat (${unreadCount} unread)` : "Open ride chat"}
        >
          <FiMessageSquare className="text-2xl" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-7 items-center justify-center rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-900 shadow-md animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[2px]">
          <div className="absolute inset-y-4 left-4 flex w-[calc(100%-2rem)] justify-start sm:inset-y-6 sm:left-6 sm:w-[calc(100%-3rem)]">
            <div className="h-full w-full max-w-[430px]">
              {chatThread && !isLoading && !isError ? (
                <ChatBox
                  conversationId={chatThread.id}
                  title={`Ride #${activeRide.id} chat`}
                  participantName={participantName || chatThread.participant?.fullName}
                  participantPhone={participantPhone || chatThread.participant?.phoneNumber}
                  onClose={() => setIsOpen(false)}
                  onActivity={onActivity}
                  heightClassName="h-full min-h-[32rem]"
                />
              ) : (
                <div className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(241,245,249,0.98),rgba(255,255,255,0.98))] shadow-2xl">
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-600 px-5 py-4 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Ride chat</p>
                        <h2 className="mt-1 text-2xl font-semibold">Trip #{activeRide.id}</h2>
                        <p className="mt-1 text-sm text-white/80">
                          {participantName || "Direct rider conversation"}
                          {participantPhone ? ` • ${participantPhone}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
                        aria-label="Close ride chat"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 items-center justify-center p-4">
                    {isLoading ? (
                      <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-white/70 bg-white/80">
                        <LoadingSpinner />
                      </div>
                    ) : isError ? (
                      <div className="w-full rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                        {errorMessage}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        {placeholder}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
