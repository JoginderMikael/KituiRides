import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { apiClient, unwrap } from "../lib/apiClient";
import {
  Badge,
  Button,
  Card,
  Input,
  LoadingSpinner,
  Modal,
  ProfileHeader
} from "../components/UIComponents";

export default function UserProfile() {
  const { user: authUser, setUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => unwrap(apiClient.get("/users/me"))
  });

  const driverDashboardQuery = useQuery({
    queryKey: ["driver-dashboard"],
    queryFn: () => unwrap(apiClient.get("/driver/dashboard")),
    enabled: profileQuery.data?.role === "DRIVER"
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => unwrap(apiClient.put("/users/me", payload)),
    onSuccess: (profile) => {
      setUser(profile);
      setIsEditingProfile(false);
      profileQuery.refetch();
    }
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const user = profileQuery.data || authUser;
  const driverDetails = driverDashboardQuery.data;

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} />

      <div className="grid gap-6 lg:grid-cols-[1fr,0.7fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Account Information</h2>
                <p className="text-sm text-slate-500">Basic contact details and role assignment.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditData(user);
                  setIsEditingProfile(true);
                }}
              >
                Edit Profile
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">First Name</p>
                <p className="font-semibold text-slate-900">{user.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Last Name</p>
                <p className="font-semibold text-slate-900">{user.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-semibold text-slate-900">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-semibold text-slate-900">{user.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Role</p>
                <div className="mt-2">
                  <Badge label={user.role} variant="teal" size="sm" />
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <div className="mt-2">
                  <Badge label={user.active ? "Active" : "Inactive"} variant={user.active ? "success" : "error"} size="sm" />
                </div>
              </div>
            </div>
          </Card>

          {user.role === "DRIVER" && driverDetails && (
            <Card>
              <h2 className="text-2xl font-bold text-slate-900">Driver Details</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">License Number</p>
                  <p className="font-semibold text-slate-900">{driverDetails.licenseNumber}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Verification</p>
                  <Badge label={driverDetails.verified ? "Verified" : "Pending"} variant={driverDetails.verified ? "success" : "warning"} size="sm" />
                </div>
                {driverDetails.vehicle && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <p className="text-sm text-slate-500">Vehicle</p>
                    <p className="font-semibold text-slate-900">{driverDetails.vehicle.make} {driverDetails.vehicle.model}</p>
                    <p className="text-sm text-slate-600">{driverDetails.vehicle.plateNumber} • {driverDetails.vehicle.engineSize}cc</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="text-center">
            <p className="text-sm text-slate-500">Member Since</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
            </p>
          </Card>

          {user.role === "DRIVER" && driverDetails?.wallet && (
            <>
              <Card className="text-center">
                <p className="text-sm text-slate-500">Wallet Balance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  KES {Number(driverDetails.wallet.balance || 0).toFixed(2)}
                </p>
              </Card>
              <Card className="text-center">
                <p className="text-sm text-slate-500">Outstanding Commission</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  KES {Number(driverDetails.wallet.outstandingCommission || 0).toFixed(2)}
                </p>
              </Card>
            </>
          )}
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
            <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate(editData)}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="First Name" value={editData.firstName || ""} onChange={(event) => setEditData((current) => ({ ...current, firstName: event.target.value }))} />
          <Input label="Last Name" value={editData.lastName || ""} onChange={(event) => setEditData((current) => ({ ...current, lastName: event.target.value }))} />
          <Input label="Email" value={editData.email || ""} disabled />
          <Input label="Phone Number" value={editData.phoneNumber || ""} onChange={(event) => setEditData((current) => ({ ...current, phoneNumber: event.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
