import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DriverDashboard from "./DriverDashboard";

const mockUseAuth = vi.fn();
const mockGetDriverDashboard = vi.fn();
const mockGetDriverOffers = vi.fn();
const mockGetDriverRides = vi.fn();
const mockGetSupportContact = vi.fn();
const mockGetChatConversations = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../features/driver/driverApi", () => ({
  acceptDriverRide: vi.fn(),
  completeDriverRide: vi.fn(),
  getDriverDashboard: (...args) => mockGetDriverDashboard(...args),
  getDriverOffers: (...args) => mockGetDriverOffers(...args),
  getDriverRides: (...args) => mockGetDriverRides(...args),
  markDriverArrival: vi.fn(),
  rejectDriverRide: vi.fn(),
  startDriverRide: vi.fn(),
  submitManualDistance: vi.fn(),
  updateDriverLocation: vi.fn(),
  updateDriverStatus: vi.fn()
}));

vi.mock("../features/rides/paymentApi", () => ({
  approveCashPayment: vi.fn()
}));

vi.mock("../features/support/supportApi", () => ({
  getSupportContact: (...args) => mockGetSupportContact(...args)
}));

vi.mock("../features/chat/chatApi", () => ({
  getChatConversations: (...args) => mockGetChatConversations(...args)
}));

vi.mock("../lib/socket", () => ({
  connectRealtimeSocket: () => () => {}
}));

vi.mock("../components/ChatBox", () => ({
  default: () => <div data-testid="chat-box" />
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
      <DriverDashboard />
    </QueryClientProvider>
  );
}

function buildRide(overrides = {}) {
  return {
    id: 3,
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
    status: "TRIP_STARTED",
    requestedAt: "2026-04-19T12:00:00Z",
    acceptedAt: "2026-04-19T12:02:00Z",
    arrivedAt: "2026-04-19T12:15:00Z",
    startedAt: "2026-04-19T12:18:00Z",
    paymentPendingAt: null,
    paymentCompletedAt: null,
    cancelledAt: null,
    disputedAt: null,
    completedAt: null,
    vehicleType: "CAR",
    paymentType: "CASH",
    paymentStatus: "PENDING",
    estimatedDistanceKm: 4.2,
    chargeableDistanceKm: null,
    distanceSource: "ESTIMATED",
    manualDistanceRequired: false,
    paymentApproved: false,
    supportTicketId: null,
    disputeReason: null,
    ...overrides
  };
}

describe("DriverDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { userId: 2, role: "DRIVER" }
    });
    mockGetDriverDashboard.mockResolvedValue({
      userId: 2,
      fullName: "Driver One",
      licenseNumber: "DL-001",
      verified: true,
      online: true,
      totalEarnings: 1200,
      activeTrip: null,
      pendingOfferCount: 0,
      supportPhoneNumber: "+254797753625",
      vehicle: { make: "Toyota", model: "Vitz", color: "Silver", plateNumber: "KAA 123A", engineSize: 1500, yearOfManufacture: 2015 },
      wallet: { balance: 200, totalEarned: 1200, totalWithdrawn: 500, outstandingCommission: 50 }
    });
    mockGetDriverOffers.mockResolvedValue([]);
    mockGetSupportContact.mockResolvedValue({ phoneNumber: "+254797753625" });
    mockGetChatConversations.mockResolvedValue([]);
  });

  it("shows the cash approval action for cash trips in progress", async () => {
    mockGetDriverRides.mockResolvedValue([buildRide({ status: "TRIP_STARTED", paymentType: "CASH", paymentApproved: false })]);

    renderPage();

    const approveButton = await screen.findByRole("button", { name: /approve cash payment/i });
    expect(approveButton).toBeTruthy();
  });

  it("shows the complete-trip action only after payment is completed", async () => {
    mockGetDriverRides.mockResolvedValue([buildRide({ status: "PAYMENT_COMPLETED", paymentApproved: true })]);

    renderPage();

    const completeButton = await screen.findByRole("button", { name: /complete trip/i });
    expect(completeButton).toBeTruthy();
  });
});
