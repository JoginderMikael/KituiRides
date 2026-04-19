import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerDashboard from "./CustomerDashboard";

const mockUseAuth = vi.fn();
const mockGetCustomerRides = vi.fn();
const mockNearbyDrivers = vi.fn();
const mockCreateCustomerTicket = vi.fn();
const mockDisputeRide = vi.fn();
const mockRequestRide = vi.fn();
const mockInitiateMpesaPayment = vi.fn();
const mockGetSupportContact = vi.fn();
const mockGetChatConversations = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("../features/customer/customerApi", () => ({
  createCustomerTicket: (...args) => mockCreateCustomerTicket(...args),
  disputeRide: (...args) => mockDisputeRide(...args),
  getCustomerRides: (...args) => mockGetCustomerRides(...args),
  nearbyDrivers: (...args) => mockNearbyDrivers(...args),
  requestRide: (...args) => mockRequestRide(...args)
}));

vi.mock("../features/rides/paymentApi", () => ({
  initiateMpesaPayment: (...args) => mockInitiateMpesaPayment(...args)
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

vi.mock("../components/RideMapbox", () => ({
  default: () => <div data-testid="ride-map" />
}));

vi.mock("../components/PaymentMethodSelector", () => ({
  default: () => <div data-testid="payment-method-selector" />
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
      <CustomerDashboard />
    </QueryClientProvider>
  );
}

function buildRide(overrides = {}) {
  return {
    id: 1,
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
    status: "DRIVER_ACCEPTED",
    requestedAt: "2026-04-19T12:00:00Z",
    acceptedAt: "2026-04-19T12:02:00Z",
    arrivedAt: null,
    startedAt: null,
    paymentPendingAt: null,
    paymentCompletedAt: null,
    cancelledAt: null,
    disputedAt: null,
    completedAt: null,
    vehicleType: "CAR",
    paymentType: "MPESA",
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

describe("CustomerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, firstName: "Jane", lastName: "Customer", phoneNumber: "0700000001" },
      session: { userId: 1, role: "CUSTOMER" }
    });
    mockGetSupportContact.mockResolvedValue({ phoneNumber: "+254797753625" });
    mockGetChatConversations.mockResolvedValue([]);
    mockCreateCustomerTicket.mockResolvedValue({});
    mockDisputeRide.mockResolvedValue({});
    mockRequestRide.mockResolvedValue({});
    mockInitiateMpesaPayment.mockResolvedValue({});
  });

  it("disables ride requests when there is already an active ride and shows strict status label", async () => {
    mockGetCustomerRides.mockResolvedValue([buildRide({ status: "DRIVER_ACCEPTED" })]);
    mockNearbyDrivers.mockResolvedValue([]);

    renderPage();

    const statusLabel = await screen.findByText("Driver Accepted");
    const requestButton = screen.getByRole("button", { name: /request ride/i });

    expect(statusLabel).toBeTruthy();
    expect(requestButton.disabled).toBe(true);
  });

  it("queries nearby drivers with pickup, dropoff, and vehicle type parameters", async () => {
    mockGetCustomerRides.mockResolvedValue([]);
    mockNearbyDrivers.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(mockNearbyDrivers).toHaveBeenCalledWith({
        pickupLat: -1.3771,
        pickupLng: 38.0106,
        dropoffLat: -1.3656,
        dropoffLng: 38.0118,
        vehicleType: "CAR"
      })
    );
  });

  it("shows M-Pesa payment action when an active ride is waiting for MPESA payment", async () => {
    mockGetCustomerRides.mockResolvedValue([
      buildRide({
        status: "PAYMENT_PENDING",
        paymentType: "MPESA",
        paymentApproved: false
      })
    ]);
    mockNearbyDrivers.mockResolvedValue([]);

    renderPage();

    const payButton = await screen.findByRole("button", { name: /pay via m-pesa/i });
    expect(payButton).toBeTruthy();
  });
});
