/**
 * @fileoverview Test coverage for support workspace.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SupportPage from "./SupportPage";

const mockUseAuth = vi.fn();
const mockSupportTickets = vi.fn();
const mockGetSupportRide = vi.fn();
const mockGetRidePayment = vi.fn();
const mockGetChatUnreadSummary = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../features/support/supportApi", () => ({
  fixRideKms: vi.fn(),
  forceApprovePayment: vi.fn(),
  getSupportRide: (...args) => mockGetSupportRide(...args),
  replyTicket: vi.fn(),
  resolveRide: vi.fn(),
  supportTickets: (...args) => mockSupportTickets(...args),
  updateTicket: vi.fn()
}));

vi.mock("../features/rides/paymentApi", () => ({
  approveCashPayment: vi.fn(),
  getRidePayment: (...args) => mockGetRidePayment(...args),
  initiateMpesaPayment: vi.fn(),
  promptCustomerMpesaPayment: vi.fn()
}));

vi.mock("../features/chat/chatApi", () => ({
  getChatUnreadSummary: (...args) => mockGetChatUnreadSummary(...args)
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SupportPage />
    </QueryClientProvider>
  );
}

async function findWorkspaceNav() {
  return screen.findByRole("navigation", { name: /support workspace navigation/i });
}

function buildTicket(overrides = {}) {
  return {
    id: 21,
    createdByUserId: 3,
    assignedToUserId: 7,
    subject: "Payment issue on ride #44",
    description: "Customer says the prompt did not arrive.",
    ticketType: "PAYMENT_CONFLICT",
    rideId: 44,
    status: "OPEN",
    resolutionNotes: null,
    createdAt: "2026-04-27T10:00:00Z",
    replies: [],
    ...overrides
  };
}

function buildRide(overrides = {}) {
  return {
    id: 44,
    customerId: 1,
    customerName: "Jane Customer",
    customerPhone: "254700000001",
    riderId: 2,
    riderName: "Driver One",
    riderPhone: "254700000002",
    pickupAddress: "Kitui CBD",
    dropoffAddress: "Kalundu",
    pickupLat: -1.3771,
    pickupLng: 38.0106,
    dropoffLat: -1.3656,
    dropoffLng: 38.0118,
    estimatedFare: 500,
    finalFare: 500,
    surgeMultiplier: 1,
    etaMinutes: 5,
    status: "PAYMENT_PENDING",
    requestedAt: "2026-04-19T12:00:00Z",
    acceptedAt: "2026-04-19T12:02:00Z",
    arrivedAt: "2026-04-19T12:15:00Z",
    startedAt: "2026-04-19T12:18:00Z",
    paymentPendingAt: "2026-04-19T12:40:00Z",
    paymentCompletedAt: null,
    cancelledAt: null,
    disputedAt: null,
    completedAt: null,
    vehicleType: "CAR",
    paymentType: "MPESA",
    paymentStatus: "PENDING",
    estimatedDistanceKm: 4.2,
    chargeableDistanceKm: 4.6,
    distanceSource: "GPS",
    manualDistanceRequired: false,
    paymentApproved: false,
    supportTicketId: 21,
    disputeReason: null,
    ...overrides
  };
}

function buildPayment(overrides = {}) {
  return {
    id: 91,
    rideId: 44,
    amount: 500,
    phoneNumber: "254700000001",
    transactionRef: "MPESA-44-123456",
    paymentType: "MPESA",
    status: "PENDING",
    providerCheckoutRequestId: "checkout-1",
    providerMerchantRequestId: "merchant-1",
    providerReceiptNumber: null,
    providerResponseCode: "0",
    providerResponseDescription: "Prompt sent",
    createdAt: "2026-04-27T10:10:00Z",
    completedAt: null,
    ...overrides
  };
}

describe("SupportPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { userId: 7, role: "SUPPORT_AGENT" },
      user: { id: 7, firstName: "Grace", lastName: "Support" }
    });
    mockGetChatUnreadSummary.mockResolvedValue({
      totalUnread: 3,
      supportCustomerUnread: 2,
      supportDriverUnread: 1,
      supportAdminUnread: 0
    });
    mockSupportTickets.mockResolvedValue([buildTicket()]);
    mockGetSupportRide.mockResolvedValue(buildRide());
    mockGetRidePayment.mockResolvedValue(buildPayment());
  });

  it("loads the summary home view by default", async () => {
    renderPage();

    expect(await screen.findByText(/operational shortcuts/i)).toBeTruthy();
    expect(await screen.findByText(/payment issue on ride #44/i)).toBeTruthy();
    expect(await screen.findByText(/priority queue snapshot/i)).toBeTruthy();
  });

  it("opens the case workspace from the left navigation", async () => {
    renderPage();

    const workspaceNav = await findWorkspaceNav();
    fireEvent.click(within(workspaceNav).getByRole("button", { name: /case workspace/i }));

    expect(await screen.findByText(/reply thread/i)).toBeTruthy();
  });

  it("shows M-Pesa intervention actions for mpesa rides", async () => {
    renderPage();

    const workspaceNav = await findWorkspaceNav();
    fireEvent.click(within(workspaceNav).getByRole("button", { name: /ride investigation/i }));

    expect(await screen.findByRole("button", { name: /send stk push/i })).toBeTruthy();
    expect(await screen.findByRole("button", { name: /prompt registered phone/i })).toBeTruthy();
    expect(await screen.findByRole("button", { name: /force approve payment/i })).toBeTruthy();
  });

  it("shows cash approval action for cash rides", async () => {
    mockGetSupportRide.mockResolvedValue(buildRide({ paymentType: "CASH" }));
    mockGetRidePayment.mockResolvedValue(buildPayment({ paymentType: "CASH" }));

    renderPage();

    const workspaceNav = await findWorkspaceNav();
    fireEvent.click(within(workspaceNav).getByRole("button", { name: /ride investigation/i }));

    await waitFor(() => expect(mockGetSupportRide).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: /approve cash settlement/i })).toBeTruthy();
  });
});
