import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AdminSettingsPanel from "../components/AdminSettingsPanel";
import { Avatar, Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, StatCard } from "../components/UIComponents";
import {
  approveDriver,
  createSupportAgent,
  getDashboard,
  getRides,
  getUsers,
  updateDriverDetails,
  upgradeUserToAdmin
} from "../features/admin/adminApi";
import { supportTickets } from "../features/support/supportApi";
import { rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [filterRole, setFilterRole] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [supportForm, setSupportForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [editDriverForm, setEditDriverForm] = useState(null);

  const dashboardQuery = useQuery({ queryKey: ["admin-dashboard"], queryFn: getDashboard });
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: getUsers });
  const ridesQuery = useQuery({ queryKey: ["admin-rides"], queryFn: getRides });
  const ticketsQuery = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => approveDriver(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: upgradeUserToAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(null);
    }
  });

  const createSupportMutation = useMutation({
    mutationFn: createSupportAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSupportForm({ firstName: "", lastName: "", email: "", phoneNumber: "" });
      setShowSupportModal(false);
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, payload }) => updateDriverDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditDriverForm(null);
    }
  });

  const users = usersQuery.data || [];
  const rides = ridesQuery.data || [];
  const driverEditRequests = (ticketsQuery.data || []).filter((ticket) => ticket.ticketType === "DRIVER_EDIT_REQUEST");
  const filteredUsers = filterRole === "ALL" ? users : users.filter((user) => user.role === filterRole);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-slate-600">Approve drivers, manage support staff, adjust pricing, and oversee ride operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={dashboardQuery.data?.totalUsers ?? 0} icon="👥" />
        <StatCard label="Total Rides" value={dashboardQuery.data?.totalRides ?? 0} icon="🚕" />
        <StatCard label="Active Requests" value={dashboardQuery.data?.activeRideRequests ?? 0} icon="📡" />
        <StatCard label="Driver Edit Tickets" value={driverEditRequests.length} icon="🛠" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Users</h2>
              <p className="text-sm text-slate-500">Driver approvals and support/admin role changes happen here.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="orange" size="sm" onClick={() => setShowSupportModal(true)}>
                Add Support Agent
              </Button>
              {["ALL", "CUSTOMER", "DRIVER", "SUPPORT_AGENT", "ADMIN"].map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant={filterRole === role ? "primary" : "secondary"}
                  onClick={() => setFilterRole(role)}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="mt-6"><LoadingSpinner /></div>
          ) : !filteredUsers.length ? (
            <div className="mt-6">
              <EmptyState icon="👤" title="No users found" description="There are no users for the selected role filter." />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${user.firstName} ${user.lastName}`} size="md" />
                      <div>
                        <p className="font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-slate-600">{user.email} • {user.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={user.role} variant="teal" size="sm" />
                      {user.role === "DRIVER" && (
                        <Badge label={user.verified ? "Verified" : "Pending"} variant={user.verified ? "success" : "warning"} size="sm" />
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setSelectedUser(user)}>
                        View
                      </Button>
                      {user.role === "DRIVER" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setEditDriverForm({
                              id: user.id,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              email: user.email,
                              phoneNumber: user.phoneNumber,
                              idNumber: user.idNumber || "",
                              licenseNumber: user.licenseNumber || "",
                              isOwner: user.isOwner ?? true,
                              carMake: user.carMake || "",
                              carModel: user.carModel || "",
                              plateNumber: user.plateNumber || "",
                              engineSize: user.engineSize || 1500,
                              yearOfManufacture: user.yearOfManufacture || 2015,
                              vehicleType: user.vehicleType || "CAR",
                              profilePhotoUrl: user.profilePhotoUrl || "",
                              carFrontUrl: user.carFrontUrl || "",
                              carRearUrl: user.carRearUrl || "",
                              carInteriorUrl: user.carInteriorUrl || "",
                              insurancePhotoUrl: user.insurancePhotoUrl || "",
                              chassisPhotoUrl: user.chassisPhotoUrl || ""
                            })
                          }
                        >
                          Edit
                        </Button>
                      )}
                      {user.role === "DRIVER" && !user.verified && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: user.id, approved: true })}
                            loading={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => approveMutation.mutate({ id: user.id, approved: false })}
                            loading={approveMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-slate-900">Driver Edit Requests</h2>
          <p className="text-sm text-slate-500">Support-created admin edit tickets are surfaced here so driver details stay locked after submission.</p>
          {!driverEditRequests.length ? (
            <div className="mt-6">
              <EmptyState icon="🧰" title="No edit requests" description="Support-created driver edit requests will show up here." />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {driverEditRequests.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">#{ticket.id} • {ticket.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
                    </div>
                    <Badge label={ticket.status} variant={ticket.status === "RESOLVED" ? "success" : "warning"} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-2xl font-bold text-slate-900">Recent Rides</h2>
        {ridesQuery.isLoading ? (
          <div className="mt-6"><LoadingSpinner /></div>
        ) : !rides.length ? (
          <div className="mt-6">
            <EmptyState icon="🚗" title="No rides found" description="Rides will appear here once customers start requesting trips." />
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {rides.slice(0, 12).map((ride) => (
              <div key={ride.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{ride.pickupAddress} to {ride.dropoffAddress}</p>
                    <p className="text-sm text-slate-600">{formatMoney(ride.finalFare)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={rideStatusLabel(ride.status)} variant={rideStatusVariant(ride.status)} size="sm" />
                    <Button variant="secondary" size="sm" onClick={() => setSelectedRide(ride)}>
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AdminSettingsPanel />

      {selectedUser && (
        <Modal isOpen={Boolean(selectedUser)} title={`User Details • ${selectedUser.firstName} ${selectedUser.lastName}`} onClose={() => setSelectedUser(null)} size="lg">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-semibold text-slate-900">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-semibold text-slate-900">{selectedUser.phoneNumber}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge label={selectedUser.role} variant="teal" size="sm" />
              {selectedUser.role === "DRIVER" && (
                <Badge label={selectedUser.verified ? "Verified" : "Pending"} variant={selectedUser.verified ? "success" : "warning"} size="sm" />
              )}
            </div>

            {selectedUser.role === "DRIVER" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">ID Number</p>
                  <p className="font-semibold text-slate-900">{selectedUser.idNumber}</p>
                  <p className="mt-3 text-sm text-slate-500">License Number</p>
                  <p className="font-semibold text-slate-900">{selectedUser.licenseNumber}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Vehicle</p>
                  <p className="font-semibold text-slate-900">{selectedUser.carMake} {selectedUser.carModel}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedUser.plateNumber} • {selectedUser.engineSize}cc • {selectedUser.vehicleType}</p>
                </div>
              </div>
            )}

            {selectedUser.role === "SUPPORT_AGENT" && (
              <Button size="sm" onClick={() => upgradeMutation.mutate(selectedUser.id)} loading={upgradeMutation.isPending}>
                Promote to Admin
              </Button>
            )}
          </div>
        </Modal>
      )}

      {selectedRide && (
        <Modal isOpen={Boolean(selectedRide)} title={`Ride #${selectedRide.id}`} onClose={() => setSelectedRide(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <Badge label={rideStatusLabel(selectedRide.status)} variant={rideStatusVariant(selectedRide.status)} size="sm" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Pickup</p>
                <p className="font-semibold text-slate-900">{selectedRide.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Dropoff</p>
                <p className="font-semibold text-slate-900">{selectedRide.dropoffAddress}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Fare</p>
                <p className="font-semibold text-slate-900">{formatMoney(selectedRide.finalFare)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <p className="font-semibold text-slate-900">{selectedRide.paymentType} • {selectedRide.paymentStatus}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showSupportModal && (
        <Modal isOpen={showSupportModal} title="Create Support Agent" onClose={() => setShowSupportModal(false)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createSupportMutation.mutate(supportForm);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="First Name" value={supportForm.firstName} onChange={(event) => setSupportForm((current) => ({ ...current, firstName: event.target.value }))} required />
              <Input label="Last Name" value={supportForm.lastName} onChange={(event) => setSupportForm((current) => ({ ...current, lastName: event.target.value }))} required />
            </div>
            <Input label="Email" type="email" value={supportForm.email} onChange={(event) => setSupportForm((current) => ({ ...current, email: event.target.value }))} required />
            <Input label="Phone Number" value={supportForm.phoneNumber} onChange={(event) => setSupportForm((current) => ({ ...current, phoneNumber: event.target.value }))} required />
            <Button className="w-full" loading={createSupportMutation.isPending}>Create Support Agent</Button>
          </form>
        </Modal>
      )}

      {editDriverForm && (
        <Modal isOpen={Boolean(editDriverForm)} title="Edit Driver Details" onClose={() => setEditDriverForm(null)} size="lg">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateDriverMutation.mutate({ id: editDriverForm.id, payload: editDriverForm });
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="First Name" value={editDriverForm.firstName} onChange={(event) => setEditDriverForm((current) => ({ ...current, firstName: event.target.value }))} required />
              <Input label="Last Name" value={editDriverForm.lastName} onChange={(event) => setEditDriverForm((current) => ({ ...current, lastName: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Email" value={editDriverForm.email} onChange={(event) => setEditDriverForm((current) => ({ ...current, email: event.target.value }))} required />
              <Input label="Phone Number" value={editDriverForm.phoneNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, phoneNumber: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="ID Number" value={editDriverForm.idNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, idNumber: event.target.value }))} required />
              <Input label="License Number" value={editDriverForm.licenseNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, licenseNumber: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Vehicle Make" value={editDriverForm.carMake} onChange={(event) => setEditDriverForm((current) => ({ ...current, carMake: event.target.value }))} required />
              <Input label="Vehicle Model" value={editDriverForm.carModel} onChange={(event) => setEditDriverForm((current) => ({ ...current, carModel: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Plate Number" value={editDriverForm.plateNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, plateNumber: event.target.value }))} required />
              <Input label="Engine Size" type="number" value={editDriverForm.engineSize} onChange={(event) => setEditDriverForm((current) => ({ ...current, engineSize: Number(event.target.value) }))} required />
            </div>
            <Button className="w-full" loading={updateDriverMutation.isPending}>Save Driver Changes</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
