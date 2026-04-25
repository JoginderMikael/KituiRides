/**
 * @fileoverview Test coverage for driver dashboard.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DriverDashboard from "./DriverDashboard";

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockGetDriverDashboard = vi.fn();
const mockGetDriverOffers = vi.fn();
const mockGetDriverRides = vi.fn();
const mockGetSupportContact = vi.fn();
const mockGetChatConversations = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock("../features/driver/driverApi", () => ({
  acceptDriverRide: vi.fn(),
  cancelDriverRide: vi.fn(),
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

vi.mock("../components/RideMapbox", () => ({
  default: () => <div data-testid="ride-map" />
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
  afterEach(() => {
    cleanup();
  });

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
    mockGetDriverRides.mockResolvedValue([]);
    mockGetDriverOffers.mockResolvedValue([]);
    mockGetSupportContact.mockResolvedValue({ phoneNumber: "+254797753625" });
    mockGetChatConversations.mockResolvedValue([]);
  });

  it("shows incoming offers for the driver", async () => {
    mockGetDriverOffers.mockResolvedValue([{
      id: 9,
      rideId: 3,
      status: "PENDING",
      offeredAt: "2026-04-24T12:00:00Z",
      expiresAt: "2026-04-24T12:02:00Z",
      customerId: 1,
      customerName: "Jane Customer",
      customerPhone: "254700000001",
      pickupAddress: "Kitui CBD",
      dropoffAddress: "Kalundu",
      pickupLat: -1.3771,
      pickupLng: 38.0106,
      dropoffLat: -1.3656,
      dropoffLng: 38.0118,
      vehicleType: "CAR",
      estimatedFare: 470,
      estimatedDistanceKm: 4.2
    }]);

    renderPage();

    expect(await screen.findByText("Ride #3")).toBeTruthy();
    expect(screen.getByRole("button", { name: /accept/i })).toBeTruthy();
  });

  it("shows the cash approval action for cash trips in progress", async () => {
    mockGetDriverRides.mockResolvedValue([buildRide({ status: "TRIP_STARTED", paymentType: "CASH", paymentApproved: false })]);

    renderPage();

    const approveButton = await screen.findByRole("button", { name: /approve cash payment/i });
    expect(approveButton).toBeTruthy();
    expect(screen.getByLabelText(/manual km/i)).toBeTruthy();
  });

  it("shows the complete action when payment is already settled but the ride is still pending completion", async () => {
    mockGetDriverRides.mockResolvedValue([
      buildRide({
        status: "PAYMENT_PENDING",
        paymentType: "MPESA",
        paymentApproved: true,
        paymentStatus: "SUCCESS"
      })
    ]);

    renderPage();

    const completeButton = await screen.findByRole("button", { name: /complete trip/i });
    expect(completeButton).toBeTruthy();
  });

  it("shows the complete-trip action only after payment is completed", async () => {
    mockGetDriverRides.mockResolvedValue([buildRide({ status: "PAYMENT_COMPLETED", paymentApproved: true })]);
    mockGetChatConversations.mockResolvedValue([
      {
        id: 88,
        rideId: 3,
        threadType: "RIDE_CHAT",
        participant: { userId: 1, fullName: "Jane Customer", phoneNumber: "254700000001" }
      }
    ]);

    renderPage();

    fireEvent.click((await screen.findAllByRole("button", { name: /open ride chat/i }))[0]);
    expect(await screen.findByTestId("chat-box")).toBeTruthy();
    const completeButtons = await screen.findAllByRole("button", { name: /complete trip/i });
    expect(completeButtons.length).toBeGreaterThan(0);
  });
});
