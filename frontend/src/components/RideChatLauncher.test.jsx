/**
 * @fileoverview Test coverage for ride chat launcher.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RideChatLauncher from "./RideChatLauncher";

const mockUseAuth = vi.fn();
const mockConnectRealtimeSocket = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../lib/socket", () => ({
  connectRealtimeSocket: (...args) => mockConnectRealtimeSocket(...args)
}));

vi.mock("./ChatBox", () => ({
  default: () => <div data-testid="chat-box" />
}));

function buildThread(overrides = {}) {
  return {
    id: 77,
    unreadCount: 0,
    lastMessageAt: "2026-04-25T10:00:00Z",
    updatedAt: "2026-04-25T10:00:00Z",
    lastMessagePreview: "See you soon",
    participant: {
      fullName: "Antony Twaem",
      phoneNumber: "078859683854"
    },
    ...overrides
  };
}

function renderLauncher(overrides = {}) {
  return render(
    <RideChatLauncher
      activeRide={{ id: 10 }}
      chatThread={buildThread()}
      participantName="Antony Twaem"
      participantPhone="078859683854"
      onActivity={vi.fn()}
      {...overrides}
    />
  );
}

describe("RideChatLauncher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { userId: 14, role: "CUSTOMER" }
    });
    mockConnectRealtimeSocket.mockReturnValue(() => {});
    Object.defineProperty(window.navigator, "vibrate", {
      value: vi.fn(),
      configurable: true
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an unread badge on the floating launcher", () => {
    renderLauncher({
      chatThread: buildThread({ unreadCount: 3 })
    });

    expect(screen.getByRole("button", { name: /open ride chat/i })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows a toast when a new unread ride message arrives", async () => {
    const { rerender } = renderLauncher({
      chatThread: buildThread({ unreadCount: 0 })
    });

    rerender(
      <RideChatLauncher
        activeRide={{ id: 10 }}
        chatThread={buildThread({
          unreadCount: 1,
          lastMessageAt: "2026-04-25T10:02:00Z",
          updatedAt: "2026-04-25T10:02:00Z",
          lastMessagePreview: "I am outside"
        })}
        participantName="Antony Twaem"
        participantPhone="078859683854"
        onActivity={vi.fn()}
      />
    );

    expect((await screen.findByRole("alert")).textContent).toContain("I am outside");
    expect(window.navigator.vibrate).toHaveBeenCalled();
  });
});
