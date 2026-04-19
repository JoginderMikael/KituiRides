import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { approveDriver, createSupportAgent, getDashboard, getRides, getUsers, updateDriverDetails, upgradeUserToAdmin } from "../features/admin/adminApi";
import AdminSettingsPanel from "../components/AdminSettingsPanel";
import {
  Card,
  Badge,
  Button,
  Avatar,
  LoadingSpinner,
  StatCard,
  Modal,
  EmptyState,
} from "../components/UIComponents";

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [filterRole, setFilterRole] = useState("ALL");
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });
  const [editDriverForm, setEditDriverForm] = useState(null);

  const dashboard = useQuery({ queryKey: ["admin-dashboard"], queryFn: getDashboard });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: getUsers });
  const rides = useQuery({ queryKey: ["admin-rides"], queryFn: getRides });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => approveDriver(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
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
      setShowSupportModal(false);
      setSupportForm({ firstName: "", lastName: "", email: "", phoneNumber: "" });
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, payload }) => updateDriverDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditDriverForm(null);
    }
  });

  const filteredUsers =
    filterRole === "ALL"
      ? users.data || []
      : (users.data || []).filter((u) => u.role === filterRole);

  const driverCount = (users.data || []).filter((u) => u.role === "DRIVER").length;
  const customerCount = (users.data || []).filter((u) => u.role === "CUSTOMER").length;

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, rides, and system operations</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={dashboard.data?.totalUsers ?? "-"}
          icon="👥"
          trend={{ positive: true, text: "+12% this month" }}
        />
        <StatCard
          label="Total Drivers"
          value={driverCount}
          icon="🚗"
          trend={{ positive: true, text: "All verified" }}
        />
        <StatCard
          label="Active Rides"
          value={dashboard.data?.activeRideRequests ?? "-"}
          icon="🚦"
        />
        <StatCard
          label="Total Completed"
          value={dashboard.data?.totalRides ?? "-"}
          icon="✓"
          trend={{ positive: true, text: "Revenue active" }}
        />
      </div>

      {/* Users Management Section */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Users Management</h2>
          <div className="flex gap-2">
            <Button variant="orange" size="sm" onClick={() => setShowSupportModal(true)}>
              + Add Support Agent
            </Button>
            {["ALL", "CUSTOMER", "DRIVER", "ADMIN", "SUPPORT_AGENT"].map((role) => (
              <Button
                key={role}
                variant={filterRole === role ? "primary" : "secondary"}
                size="sm"
                onClick={() => setFilterRole(role)}
              >
                {role === "ALL" ? "All Users" : role}
              </Button>
            ))}
          </div>
        </div>

        {users.isLoading ? (
          <LoadingSpinner />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No Users Found"
            description="No users match the selected filter."
          />
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar name={`${user.firstName} ${user.lastName}`} size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {user.firstName} {user.lastName}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.phoneNumber && (
                        <p className="text-sm text-gray-600">• {user.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge label={user.role} variant="teal" size="sm" />

                  {user.role === "DRIVER" && (
                    <Badge
                      label={user.verified ? "Verified" : "Pending"}
                      variant={user.verified ? "success" : "warning"}
                      size="sm"
                    />
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                    >
                      View
                    </Button>

                    {user.role === "DRIVER" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-teal-600 border-teal-200"
                        onClick={() => setEditDriverForm({
                          id: user.id,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          email: user.email,
                          phoneNumber: user.phoneNumber,
                          idNumber: user.idNumber || "",
                          licenseNumber: user.licenseNumber || "",
                          isOwner: user.isOwner !== false,
                          carModel: user.carModel || "",
                          plateNumber: user.plateNumber || "",
                          engineSize: user.engineSize || 1500,
                          yearOfManufacture: user.yearOfManufacture || 2015,
                          vehicleType: user.vehicleType || "CAR"
                        })}
                      >
                        Edit
                      </Button>
                    )}

                    {user.role === "DRIVER" && !user.verified && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          loading={approveMutation.isPending}
                          onClick={() =>
                            approveMutation.mutate({
                              id: user.id,
                              approved: true,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            approveMutation.mutate({
                              id: user.id,
                              approved: false,
                            })
                          }
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

      {/* Rides Management Section */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Rides</h2>

        {rides.isLoading ? (
          <LoadingSpinner />
        ) : (rides.data || []).length === 0 ? (
          <EmptyState
            icon="🚗"
            title="No Rides Found"
            description="There are no rides in the system yet."
          />
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(rides.data || []).slice(0, 10).map((ride) => (
              <div
                key={ride.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 mb-1">
                    {ride.pickupAddress} → {ride.dropoffAddress}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>🆔 #{ride.id}</span>
                    <span>💰 KES {ride.finalFare?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    label={ride.status}
                    variant={
                      ride.status === "COMPLETED"
                        ? "success"
                        : ride.status === "CANCELLED"
                        ? "error"
                        : "info"
                    }
                    size="sm"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedRide(ride)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          title={`User Details - ${selectedUser.firstName} ${selectedUser.lastName}`}
          onClose={() => setSelectedUser(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Email</p>
                <p className="font-semibold text-gray-800">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Phone</p>
                <p className="font-semibold text-gray-800">
                  {selectedUser.phoneNumber || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Role</p>
                <Badge label={selectedUser.role} variant="teal" size="md" />
                {selectedUser.role === "SUPPORT_AGENT" && (
                   <Button size="xs" variant="outline" className="mt-2" onClick={() => upgradeMutation.mutate(selectedUser.id)} loading={upgradeMutation.isPending}>Upgrade to Admin</Button>
                )}
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Status</p>
                <Badge
                  label={selectedUser.active ? "Active" : "Inactive"}
                  variant={selectedUser.active ? "success" : "error"}
                  size="md"
                />
              </div>
            </div>

            {selectedUser.role === "DRIVER" && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 mb-3">Driver Details</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-700 text-sm">License Number</p>
                    <p className="font-semibold text-blue-900">
                      {selectedUser.licenseNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 text-sm">Verification</p>
                    <Badge
                      label={selectedUser.verified ? "Verified" : "Pending"}
                      variant={selectedUser.verified ? "success" : "warning"}
                      size="sm"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Ride Details Modal */}
      {selectedRide && (
        <Modal
          isOpen={!!selectedRide}
          title={`Ride Details - #${selectedRide.id}`}
          onClose={() => setSelectedRide(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Route</p>
              <p className="font-semibold text-gray-800 text-lg">
                {selectedRide.pickupAddress} → {selectedRide.dropoffAddress}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Status</p>
                <Badge
                  label={selectedRide.status}
                  variant={
                    selectedRide.status === "COMPLETED"
                      ? "success"
                      : "info"
                  }
                  size="md"
                />
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Fare</p>
                <p className="font-semibold text-gray-800 text-lg">
                  KES {selectedRide.finalFare?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-1">Coordinates</p>
              <p className="font-mono text-sm text-gray-700 bg-gray-50 p-2 rounded">
                Pickup: {selectedRide.pickupLat}, {selectedRide.pickupLng}
              </p>
              <p className="font-mono text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                Dropoff: {selectedRide.dropoffLat}, {selectedRide.dropoffLng}
              </p>
            </div>
          </div>
        </Modal>
      )}
      {/* Support Agent Modal */}
      {showSupportModal && (
        <Modal isOpen={showSupportModal} title="Create Support Agent" onClose={() => setShowSupportModal(false)}>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            createSupportMutation.mutate(supportForm);
          }}>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={supportForm.firstName} onChange={e => setSupportForm({...supportForm, firstName: e.target.value})} required />
              <Input label="Last Name" value={supportForm.lastName} onChange={e => setSupportForm({...supportForm, lastName: e.target.value})} required />
            </div>
            <Input label="Email" type="email" value={supportForm.email} onChange={e => setSupportForm({...supportForm, email: e.target.value})} required />
            <Input label="Phone" value={supportForm.phoneNumber} onChange={e => setSupportForm({...supportForm, phoneNumber: e.target.value})} required />
            <Button className="w-full" loading={createSupportMutation.isPending}>Create Agent</Button>
          </form>
        </Modal>
      )}

      {/* Admin Settings Section */}
      <AdminSettingsPanel />

      {/* Edit Driver Modal */}
      {editDriverForm && (
        <Modal isOpen={!!editDriverForm} title="Edit Driver Details" onClose={() => setEditDriverForm(null)} size="lg">
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            updateDriverMutation.mutate({ id: editDriverForm.id, payload: editDriverForm });
          }}>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={editDriverForm.firstName} onChange={e => setEditDriverForm({...editDriverForm, firstName: e.target.value})} required />
              <Input label="Last Name" value={editDriverForm.lastName} onChange={e => setEditDriverForm({...editDriverForm, lastName: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" type="email" value={editDriverForm.email} onChange={e => setEditDriverForm({...editDriverForm, email: e.target.value})} required />
              <Input label="Phone" value={editDriverForm.phoneNumber} onChange={e => setEditDriverForm({...editDriverForm, phoneNumber: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="ID Number" value={editDriverForm.idNumber} onChange={e => setEditDriverForm({...editDriverForm, idNumber: e.target.value})} required />
              <Input label="License" value={editDriverForm.licenseNumber} onChange={e => setEditDriverForm({...editDriverForm, licenseNumber: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Car Model" value={editDriverForm.carModel} onChange={e => setEditDriverForm({...editDriverForm, carModel: e.target.value})} required />
              <Input label="Plate" value={editDriverForm.plateNumber} onChange={e => setEditDriverForm({...editDriverForm, plateNumber: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Engine Size" type="number" value={editDriverForm.engineSize} onChange={e => setEditDriverForm({...editDriverForm, engineSize: e.target.value})} required />
              <Input label="Year" type="number" value={editDriverForm.yearOfManufacture} onChange={e => setEditDriverForm({...editDriverForm, yearOfManufacture: e.target.value})} required />
            </div>
            <Button className="w-full" loading={updateDriverMutation.isPending}>Save Changes</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
