export const ACTIVE_RIDE_STATUSES = [
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "PAYMENT_PENDING",
  "PAYMENT_COMPLETED",
  "DISPUTED"
];

export const TERMINAL_RIDE_STATUSES = [
  "TRIP_COMPLETED",
  "TRIP_CANCELLED",
  "DRIVER_REJECTED"
];

export function isActiveRide(status) {
  return ACTIVE_RIDE_STATUSES.includes(status);
}

export function isTerminalRide(status) {
  return TERMINAL_RIDE_STATUSES.includes(status);
}

export function isCompletedRide(status) {
  return status === "TRIP_COMPLETED";
}

export function isCancelledRide(status) {
  return status === "TRIP_CANCELLED";
}

export function rideStatusLabel(status) {
  const labels = {
    REQUESTED: "Requesting Driver",
    DRIVER_ASSIGNED: "Drivers Notified",
    DRIVER_ACCEPTED: "Driver Accepted",
    DRIVER_ARRIVED: "Driver Arrived",
    TRIP_STARTED: "Trip In Progress",
    PAYMENT_PENDING: "Payment Pending",
    PAYMENT_COMPLETED: "Payment Completed",
    TRIP_COMPLETED: "Trip Completed",
    TRIP_CANCELLED: "Trip Cancelled",
    DRIVER_REJECTED: "No Driver Accepted",
    DISPUTED: "Disputed"
  };
  return labels[status] || status;
}

export function rideStatusVariant(status) {
  if (status === "TRIP_COMPLETED" || status === "PAYMENT_COMPLETED") {
    return "success";
  }
  if (status === "TRIP_CANCELLED" || status === "DRIVER_REJECTED") {
    return "error";
  }
  if (status === "DISPUTED" || status === "PAYMENT_PENDING") {
    return "warning";
  }
  return "info";
}
