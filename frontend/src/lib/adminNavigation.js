/**
 * @fileoverview Shared utility module for admin navigation.
 */
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiCreditCard,
  FiGift,
  FiGrid,
  FiLifeBuoy,
  FiLogOut,
  FiMapPin,
  FiSettings,
  FiShield,
  FiSmartphone,
  FiTruck,
  FiUserPlus,
  FiUsers
} from "react-icons/fi";

export const ADMIN_NAVIGATION_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: FiGrid,
        permissions: ["admin.dashboard.read"]
      },
      {
        id: "reports",
        label: "Reports",
        icon: FiBarChart2,
        permissions: ["admin.reports.read"]
      }
    ]
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "riders",
        label: "Users",
        icon: FiUsers,
        permissions: ["admin.users.read"]
      },
      {
        id: "drivers",
        label: "Drivers",
        icon: FiTruck,
        permissions: ["admin.drivers.read"]
      },
      {
        id: "trips",
        label: "Rides",
        icon: FiMapPin,
        permissions: ["admin.trips.read"]
      },
      {
        id: "bookings",
        label: "Bookings",
        icon: FiCalendar,
        permissions: ["admin.bookings.read"]
      },
      {
        id: "supportTickets",
        label: "Support Tickets",
        icon: FiLifeBuoy,
        permissions: ["admin.support.read"]
      },
      {
        id: "disputes",
        label: "Issue Resolution",
        icon: FiAlertTriangle,
        permissions: ["admin.disputes.read"]
      }
    ]
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        id: "payments",
        label: "Payments",
        icon: FiCreditCard,
        permissions: ["admin.payments.read"]
      },
      {
        id: "mpesa",
        label: "Mpesa Transactions",
        icon: FiSmartphone,
        permissions: ["admin.mpesa.read"]
      },
      {
        id: "promotions",
        label: "Promotions",
        icon: FiGift,
        permissions: ["admin.promotions.read"]
      }
    ]
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        id: "settings",
        label: "Settings",
        icon: FiSettings,
        permissions: ["admin.settings.read"]
      },
      {
        id: "staff",
        label: "Admin Staff",
        icon: FiUserPlus,
        permissions: ["admin.staff.read"]
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: FiBell,
        permissions: ["admin.notifications.read"]
      },
      {
        id: "auditLogs",
        label: "Audit Logs",
        icon: FiClipboard,
        permissions: ["admin.audit.read"]
      }
    ]
  },
  {
    id: "session",
    label: "Session",
    items: [
      {
        id: "logout",
        label: "Logout",
        icon: FiLogOut,
        kind: "action",
        permissions: []
      }
    ]
  }
];

export const ADMIN_VIEW_META = {
  dashboard: {
    eyebrow: "Executive View",
    title: "Dashboard",
    description: "Overview of KituiRides platform"
  },
  riders: {
    eyebrow: "Rider Accounts",
    title: "Riders Management",
    description: "Review customer accounts, contact details, and ride history entry points without crowding the rest of admin."
  },
  drivers: {
    eyebrow: "Driver Operations",
    title: "Drivers Management",
    description: "Approve drivers, inspect compliance media, and manage driver account details from a dedicated operations workspace."
  },
  trips: {
    eyebrow: "Trip Operations",
    title: "Trips Management",
    description: "Inspect the live trip stream, statuses, and payment outcomes from a dedicated transport operations view."
  },
  bookings: {
    eyebrow: "Booking Flow",
    title: "Bookings",
    description: "Monitor booking demand and recent request flow in a clean booking-focused workspace."
  },
  payments: {
    eyebrow: "Revenue Control",
    title: "Payments",
    description: "Track settlement flow, pending payments, and transaction mix from a finance-oriented workspace."
  },
  mpesa: {
    eyebrow: "Mobile Money",
    title: "Mpesa Transactions",
    description: "Keep the M-Pesa transaction stream visible and ready for future reconciliation workflows."
  },
  reports: {
    eyebrow: "Analytics",
    title: "Reports & Analytics",
    description: "Surface the most important operating metrics with room to grow into deeper reporting."
  },
  supportTickets: {
    eyebrow: "Support Queue",
    title: "Support Tickets",
    description: "Respond to tickets, manage queue state, and keep customer-facing issues moving."
  },
  disputes: {
    eyebrow: "Resolution Desk",
    title: "Disputes / Issue Resolution",
    description: "Focus the issue-resolution workflow on the tickets most likely to need admin judgment."
  },
  promotions: {
    eyebrow: "Growth Tools",
    title: "Promotions / Coupons",
    description: "A polished shell for future discount and promotion controls, ready for permission-based rollout."
  },
  settings: {
    eyebrow: "Platform Controls",
    title: "System Settings",
    description: "Manage pricing parameters and support contact controls from a clear configuration workspace."
  },
  staff: {
    eyebrow: "Admin Team",
    title: "Admin Users / Staff Management",
    description: "Manage support agents and admin access in a workspace designed for trusted staff operations."
  },
  notifications: {
    eyebrow: "Messaging",
    title: "Notifications",
    description: "A scalable notification center shell for future operational alerts and broadcast tooling."
  },
  auditLogs: {
    eyebrow: "Compliance",
    title: "Audit Logs",
    description: "A premium-ready audit surface prepared for future admin traceability and compliance events."
  }
};
