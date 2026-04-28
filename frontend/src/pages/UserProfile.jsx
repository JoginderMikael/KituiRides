/**
 * @fileoverview Page component for role-aware user profiles.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiLock,
  FiMail,
  FiPhone,
  FiShield,
  FiTruck,
  FiUser,
  FiUsers
} from "react-icons/fi";
import { Badge, Button, Input, LoadingSpinner, Modal } from "../components/UIComponents";
import { useAuth } from "../hooks/useAuth";
import { apiClient, unwrap } from "../lib/apiClient";
import { roleHomePath } from "../lib/auth";

const roleTone = {
  ADMIN: "bg-indigo-50 text-indigo-700 border-indigo-100",
  CUSTOMER: "bg-emerald-50 text-emerald-700 border-emerald-100",
  DRIVER: "bg-sky-50 text-sky-700 border-sky-100",
  SUPPORT_AGENT: "bg-amber-50 text-amber-700 border-amber-100"
};

function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Profile";
}

function initialsFor(user) {
  return fullName(user)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(role) {
  return {
    ADMIN: "Administrator",
    CUSTOMER: "Customer",
    DRIVER: "Driver",
    SUPPORT_AGENT: "Support Team"
  }[role] || role || "User";
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="text-slate-400" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 break-words text-sm font-semibold text-slate-950">{value || "Not provided"}</p>
    </div>
  );
}

function ProfileStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="text-lg text-emerald-600" aria-hidden="true" />
      </div>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_22px_55px_-44px_rgba(15,23,42,0.7)]">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReadOnlyNotice({ role }) {
  const isDriver = role === "DRIVER";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
          <FiLock aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-slate-950">
            {isDriver ? "Driver profiles are admin-managed" : "Profile changes are admin-managed"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isDriver
              ? "Your driver identity, license, and vehicle records can only be edited by an administrator."
              : "This account is protected. Ask an administrator to update names, contacts, status, or role details."}
          </p>
        </div>
      </div>
    </div>
  );
}

function DriverSection({ user, driverDetails }) {
  const vehicle = driverDetails?.vehicle;
  return (
    <Section title="Driver Operations" description="Identity, approval, availability, and vehicle records managed by administrators.">
      <div className="grid gap-4 md:grid-cols-2">
        <DetailItem icon={FiShield} label="License Number" value={user.licenseNumber || driverDetails?.licenseNumber} />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Verification</p>
          <div className="mt-3">
            <Badge
              label={user.verified || driverDetails?.verified ? "Verified" : "Pending Review"}
              variant={user.verified || driverDetails?.verified ? "success" : "warning"}
              size="sm"
            />
          </div>
        </div>
        <DetailItem icon={FiUser} label="ID Number" value={user.idNumber} />
        <DetailItem icon={FiCheckCircle} label="Availability" value={user.available || driverDetails?.available ? "Available" : "Unavailable"} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <FiTruck className="text-slate-400" aria-hidden="true" />
            Vehicle
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-950">
            {user.carMake || vehicle?.make || "Vehicle"} {user.carModel || vehicle?.model || "not assigned"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {[user.plateNumber || vehicle?.plateNumber, user.engineSize || vehicle?.engineSize ? `${user.engineSize || vehicle?.engineSize}cc` : null, user.yearOfManufacture || vehicle?.yearOfManufacture]
              .filter(Boolean)
              .join(" | ") || "Vehicle details pending admin update"}
          </p>
        </div>
      </div>
    </Section>
  );
}

function RoleSection({ user, driverDetails }) {
  if (user.role === "DRIVER") {
    return <DriverSection user={user} driverDetails={driverDetails} />;
  }

  if (user.role === "SUPPORT_AGENT") {
    return (
      <Section title="Support Workspace" description="Support team accounts focus on ticket handling, rider assistance, and escalation workflows.">
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileStat label="Workspace" value="Support Portal" icon={FiUsers} />
          <ProfileStat label="Change Control" value="Admin-managed" icon={FiLock} />
        </div>
      </Section>
    );
  }

  if (user.role === "ADMIN") {
    return (
      <Section title="Administrator Access" description="Administrators manage users, drivers, support agents, rides, and operating controls.">
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileStat label="Profile Authority" value="Can edit any account" icon={FiShield} />
          <ProfileStat label="Own Account" value="Admin-managed" icon={FiLock} />
        </div>
      </Section>
    );
  }

  return (
    <Section title="Customer Profile" description="Customer contact details can be updated from this page.">
      <div className="grid gap-4 md:grid-cols-2">
        <ProfileStat label="Account Type" value="Ride customer" icon={FiUser} />
        <ProfileStat label="Self-service Editing" value="Enabled" icon={FiEdit3} />
      </div>
    </Section>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { user: authUser, setUser, role } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => unwrap(apiClient.get("/users/me"))
  });

  const user = profileQuery.data || authUser;

  const driverDashboardQuery = useQuery({
    queryKey: ["driver-dashboard"],
    queryFn: () => unwrap(apiClient.get("/driver/dashboard")),
    enabled: user?.role === "DRIVER"
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => unwrap(apiClient.put("/users/me", payload)),
    onSuccess: (profile) => {
      setUser(profile);
      setIsEditingProfile(false);
      profileQuery.refetch();
    }
  });

  const canEditOwnProfile = user?.role === "CUSTOMER";
  const roleLabel = formatRole(user?.role);
  const roleClassName = roleTone[user?.role] || "bg-slate-50 text-slate-700 border-slate-100";
  const completionItems = useMemo(() => [
    user?.firstName,
    user?.lastName,
    user?.email,
    user?.phoneNumber,
    user?.profilePhotoUrl
  ], [user]);
  const profileCompletion = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(roleHomePath(role));
  }

  if (profileQuery.isLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7f8fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        >
          <FiArrowLeft aria-hidden="true" />
          Back
        </button>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_70px_-48px_rgba(15,23,42,0.55)]">
          <div className="bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-5 py-7 text-white sm:px-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/15 text-3xl font-bold shadow-xl">
                  {user.profilePhotoUrl ? (
                    <img src={user.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsFor(user)
                  )}
                </div>
                <div>
                  <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${roleClassName}`}>
                    {roleLabel}
                  </div>
                  <h1 className="mt-4 text-3xl font-bold tracking-normal sm:text-4xl">{fullName(user)}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                    {canEditOwnProfile
                      ? "Keep your customer contact information current for smooth ride updates and support follow-up."
                      : "This profile is view-only here. Administrative profile changes are handled through account management."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {canEditOwnProfile ? (
                  <button
                    type="button"
                    className="inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-white/25"
                    onClick={() => {
                      setEditData({
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        phoneNumber: user.phoneNumber || ""
                      });
                      setIsEditingProfile(true);
                    }}
                  >
                    <FiEdit3 />
                    Edit Profile
                  </button>
                ) : null}
                {user.role === "ADMIN" ? (
                  <button
                    type="button"
                    className="inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-white/25"
                    onClick={() => navigate("/admin")}
                  >
                    <FiUsers />
                    Manage Profiles
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileStat label="Status" value={user.active ? "Active" : "Inactive"} icon={FiCheckCircle} />
            <ProfileStat label="Member Since" value={formatDate(user.createdAt)} icon={FiCalendar} />
            <ProfileStat label="Profile Complete" value={`${profileCompletion}%`} icon={FiUser} />
            <ProfileStat label="Governance" value={canEditOwnProfile ? "Self-edit" : "Admin edit"} icon={canEditOwnProfile ? FiEdit3 : FiLock} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <Section title="Account Information" description="Primary identity and contact records for this account.">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem icon={FiUser} label="First Name" value={user.firstName} />
                <DetailItem icon={FiUser} label="Last Name" value={user.lastName} />
                <DetailItem icon={FiMail} label="Email" value={user.email} />
                <DetailItem icon={FiPhone} label="Phone" value={user.phoneNumber} />
              </div>
            </Section>

            <RoleSection user={user} driverDetails={driverDashboardQuery.data} />
          </div>

          <aside className="space-y-6">
            {!canEditOwnProfile ? <ReadOnlyNotice role={user.role} /> : null}

            <Section title="Access Summary" description="How this profile is managed across KituiRides.">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <FiBriefcase className="text-emerald-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-700">Current role</span>
                  </div>
                  <Badge label={roleLabel} variant="teal" size="sm" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <FiShield className="text-emerald-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-700">Account status</span>
                  </div>
                  <Badge label={user.active ? "Active" : "Inactive"} variant={user.active ? "success" : "error"} size="sm" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {role === "ADMIN"
                    ? "Use the admin workspace to update customer, driver, support team, and administrator accounts."
                    : "For role, email, driver, support, or account status changes, contact an administrator."}
                </div>
              </div>
            </Section>
          </aside>
        </div>
      </div>

      <Modal
        isOpen={isEditingProfile}
        title="Edit Profile"
        onClose={() => setIsEditingProfile(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsEditingProfile(false)}>
              Cancel
            </Button>
            <Button
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editData)}
              disabled={!editData.firstName?.trim() || !editData.lastName?.trim() || !editData.phoneNumber?.trim()}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="First Name" value={editData.firstName || ""} onChange={(event) => setEditData((current) => ({ ...current, firstName: event.target.value }))} />
          <Input label="Last Name" value={editData.lastName || ""} onChange={(event) => setEditData((current) => ({ ...current, lastName: event.target.value }))} />
          <Input label="Email" value={user.email || ""} disabled />
          <Input label="Phone Number" value={editData.phoneNumber || ""} onChange={(event) => setEditData((current) => ({ ...current, phoneNumber: event.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
