import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import {
  Card,
  Button,
  Input,
  Badge,
  Avatar,
  LoadingSpinner,
  Modal,
  ProfileHeader,
} from "../components/UIComponents";

export default function UserProfile() {
  const { user: authUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});

  // Fetch full user profile
  const { data: userProfile, isLoading, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiClient.get('/api/users/me');
      return response.data;
    },
  });

  // Update profile mutation
  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: (data) => apiClient.put('/api/users/me', data),
    onSuccess: () => {
      setIsEditingProfile(false);
      refetch();
    },
  });

  // Fetch driver details if user is a driver
  const { data: driverDetails } = useQuery({
    queryKey: ['driverDetails'],
    queryFn: async () => {
      const response = await apiClient.get('/api/driver/dashboard');
      return response.data;
    },
    enabled: userProfile?.role === 'DRIVER',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const user = userProfile || authUser;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <ProfileHeader user={user} />

      {/* Main Profile Content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Account Information */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Account Information</h2>
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

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">First Name</p>
                  <p className="text-gray-800 font-semibold text-lg">{user.firstName}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Last Name</p>
                  <p className="text-gray-800 font-semibold text-lg">{user.lastName}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Email Address</p>
                  <p className="text-gray-800 font-semibold">{user.email}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Phone Number</p>
                  <p className="text-gray-800 font-semibold">{user.phoneNumber || 'Not provided'}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Account Role</p>
                  <div className="mt-2">
                    <Badge label={user.role} variant="teal" size="md" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Account Status</p>
                  <div className="mt-2">
                    <Badge
                      label={user.active ? 'Active' : 'Inactive'}
                      variant={user.active ? 'success' : 'error'}
                      size="md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Driver-Specific Information */}
          {user.role === 'DRIVER' && driverDetails && (
            <Card>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Driver Information</h2>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">License Number</p>
                    <p className="text-gray-800 font-semibold">{driverDetails.licenseNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Verification Status</p>
                    <div className="mt-2">
                      <Badge
                        label={driverDetails.verified ? 'Verified' : 'Pending'}
                        variant={driverDetails.verified ? 'success' : 'warning'}
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Online Status</p>
                    <div className="mt-2">
                      <Badge
                        label={driverDetails.online ? 'Online' : 'Offline'}
                        variant={driverDetails.online ? 'success' : 'error'}
                        size="md"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Earnings</p>
                    <p className="text-gray-800 font-semibold text-lg">
                      KES {driverDetails.totalEarnings?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {driverDetails.vehicle && (
                  <div className="bg-teal-50 p-4 rounded-lg mt-4 border border-teal-200">
                    <h3 className="font-semibold text-teal-900 mb-3">Vehicle Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-teal-700 text-sm">Make & Model</p>
                        <p className="text-teal-900 font-semibold">
                          {driverDetails.vehicle.make} {driverDetails.vehicle.model}
                        </p>
                      </div>
                      <div>
                        <p className="text-teal-700 text-sm">Color</p>
                        <p className="text-teal-900 font-semibold">{driverDetails.vehicle.color}</p>
                      </div>
                      <div>
                        <p className="text-teal-700 text-sm">License Plate</p>
                        <p className="text-teal-900 font-semibold">{driverDetails.vehicle.plateNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Security Settings */}
          <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Security</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="outline" className="w-full">
                Two-Factor Authentication
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column - Quick Stats */}
        <div className="space-y-6">
          {/* Account Stats */}
          <Card className="text-center">
            <h3 className="text-gray-600 text-sm mb-2">Member Since</h3>
            <p className="text-2xl font-bold text-gray-800">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </Card>

          {/* Role-Specific Stats */}
          {user.role === 'DRIVER' && driverDetails && (
            <>
              <Card className="text-center bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200">
                <p className="text-teal-700 font-semibold text-sm mb-2">Active Trips</p>
                <p className="text-3xl font-bold text-teal-700">
                  {driverDetails.activeTrip ? 1 : 0}
                </p>
              </Card>

              <Card className="text-center bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                <p className="text-orange-700 font-semibold text-sm mb-2">Total Earnings</p>
                <p className="text-2xl font-bold text-orange-700">
                  KES {driverDetails.totalEarnings?.toFixed(0) || '0'}
                </p>
              </Card>
            </>
          )}

          {/* Account Actions */}
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">Account Actions</h3>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full">
                Download Data
              </Button>
              <Button variant="danger" className="w-full">
                Delete Account
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditingProfile}
        title="Edit Profile"
        onClose={() => setIsEditingProfile(false)}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsEditingProfile(false)}>
              Cancel
            </Button>
            <Button
              loading={isPending}
              onClick={() => updateProfile(editData)}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="First Name"
            value={editData.firstName || ''}
            onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
          />
          <Input
            label="Last Name"
            value={editData.lastName || ''}
            onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={editData.email || ''}
            disabled
          />
          <Input
            label="Phone Number"
            type="tel"
            value={editData.phoneNumber || ''}
            onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
