import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../features/auth/authApi";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../lib/apiClient";
import { Button, Input, Card } from "../components/UIComponents";
import FileUpload from "../components/FileUpload";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: "CUSTOMER",
    idNumber: "",
    licenseNumber: "",
    profilePhotoUrl: "",
    idFrontUrl: "",
    idBackUrl: "",
    licenseFrontUrl: "",
    licenseBackUrl: "",
    // Step 2
    carMake: "",
    carModel: "",
    carColor: "",
    plateNumber: "",
    engineSize: "",
    yearOfManufacture: "",
    isOwner: true,
    vehicleType: "CAR",
    carFrontUrl: "",
    carRearUrl: "",
    carInteriorUrl: "",
    insurancePhotoUrl: "",
    chassisPhotoUrl: ""
  });
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await register(data);
      if (data.role === "DRIVER") {
        await apiClient.post("/driver/vehicle", {
          make: data.carMake,
          model: data.carModel,
          color: data.carColor,
          plateNumber: data.plateNumber,
          engineSize: parseInt(data.engineSize),
          yearOfManufacture: parseInt(data.yearOfManufacture),
          isOwner: data.isOwner,
          vehicleType: data.vehicleType,
          frontPhotoUrl: data.carFrontUrl,
          rearPhotoUrl: data.carRearUrl,
          interiorPhotoUrl: data.carInteriorUrl,
          insurancePhotoUrl: data.insurancePhotoUrl,
          chassisPhotoUrl: data.chassisPhotoUrl
        });
      }
      return res;
    },
    onSuccess: (data) => {
      setAuth(data);
      navigate(roleHomePath(data.role), { replace: true });
    }
  });

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setForm({ ...form, password: pwd });
    setPasswordMatch(pwd === form.confirmPassword);
  };

  const handleConfirmPasswordChange = (e) => {
    const confirmPwd = e.target.value;
    setForm({ ...form, confirmPassword: confirmPwd });
    setPasswordMatch(form.password === confirmPwd);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-500 to-orange-400 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-lg mb-4">
            <span className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent">
              KR
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Join KituiRides</h1>
          <p className="text-teal-100">Start your journey with us today</p>
        </div>

        {/* Register Card */}
        <Card className="shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Your Account</h2>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!passwordMatch) {
                return;
              }
              mutation.mutate(form);
            }}
          >
            {step === 1 && (
              <>
                {/* Name Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="John"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>

                {/* Email */}
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />

                {/* Phone */}
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="254700000000"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  required
                />

                {/* Password */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      passwordMatch
                        ? "border-gray-300 focus:ring-teal-600"
                        : "border-red-500 focus:ring-red-600"
                    }`}
                  />
                  {!passwordMatch && (
                    <p className="text-red-500 text-sm mt-1">✕ Passwords do not match</p>
                  )}
                </div>

                {/* Role Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="CUSTOMER">👤 Customer - Book Rides</option>
                    <option value="DRIVER">🚗 Driver - Offer Rides</option>
                  </select>
                </div>

                {/* Profile Photo - for all */}
                <FileUpload
                  label="Passport Sized Photo"
                  onUpload={(url) => setForm({ ...form, profilePhotoUrl: url })}
                  value={form.profilePhotoUrl}
                  required={form.role === "DRIVER"}
                />

                {form.role === "DRIVER" && (
                  <div className="space-y-4 pt-4 border-t">
                    <Input
                      label="ID Number"
                      placeholder="12345678"
                      value={form.idNumber}
                      onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FileUpload
                        label="ID Front Side"
                        onUpload={(url) => setForm({ ...form, idFrontUrl: url })}
                        value={form.idFrontUrl}
                        required
                      />
                      <FileUpload
                        label="ID Back Side"
                        onUpload={(url) => setForm({ ...form, idBackUrl: url })}
                        value={form.idBackUrl}
                        required
                      />
                    </div>
                    <Input
                      label="License Number"
                      placeholder="DL-12345"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FileUpload
                        label="License Front"
                        onUpload={(url) => setForm({ ...form, licenseFrontUrl: url })}
                        value={form.licenseFrontUrl}
                        required
                      />
                      <FileUpload
                        label="License Rear"
                        onUpload={(url) => setForm({ ...form, licenseBackUrl: url })}
                        value={form.licenseBackUrl}
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 2 && form.role === "DRIVER" && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold text-gray-700">Vehicle Details (Step 2)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Car Make"
                    placeholder="Toyota"
                    value={form.carMake}
                    onChange={(e) => setForm({ ...form, carMake: e.target.value })}
                    required
                  />
                  <Input
                    label="Car Model"
                    placeholder="Vitz"
                    value={form.carModel}
                    onChange={(e) => setForm({ ...form, carModel: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Plate Number"
                    placeholder="KAA 001A"
                    value={form.plateNumber}
                    onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                    required
                  />
                  <Input
                    label="Engine Size (cc)"
                    type="number"
                    placeholder="1500"
                    value={form.engineSize}
                    onChange={(e) => setForm({ ...form, engineSize: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Year"
                    type="number"
                    placeholder="2015"
                    value={form.yearOfManufacture}
                    onChange={(e) => setForm({ ...form, yearOfManufacture: e.target.value })}
                    required
                  />
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                    <select
                      value={form.vehicleType}
                      onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="CAR">Car</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Vehicle Photos</label>
                  <div className="grid grid-cols-2 gap-4">
                    <FileUpload
                      label="Front Photo"
                      onUpload={(url) => setForm({ ...form, carFrontUrl: url })}
                      value={form.carFrontUrl}
                      required
                    />
                    <FileUpload
                      label="Rear Photo"
                      onUpload={(url) => setForm({ ...form, carRearUrl: url })}
                      value={form.carRearUrl}
                      required
                    />
                    <FileUpload
                      label="Interior Photo"
                      onUpload={(url) => setForm({ ...form, carInteriorUrl: url })}
                      value={form.carInteriorUrl}
                      required
                    />
                    <FileUpload
                      label="Insurance Sticker"
                      onUpload={(url) => setForm({ ...form, insurancePhotoUrl: url })}
                      value={form.insurancePhotoUrl}
                      required
                    />
                  </div>
                  <FileUpload
                    label="Chassis Number Photo"
                    onUpload={(url) => setForm({ ...form, chassisPhotoUrl: url })}
                    value={form.chassisPhotoUrl}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.isOwner}
                    onChange={(e) => setForm({ ...form, isOwner: e.target.checked })}
                    id="isOwner"
                  />
                  <label htmlFor="isOwner" className="text-sm text-gray-700">I am the owner of this vehicle</label>
                </div>
              </div>
            )}

            {/* Error Message */}
            {mutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                ✕ Registration failed. Please check your details and try again.
              </div>
            )}

            {/* Submit Button */}
            {form.role === "DRIVER" && step === 1 ? (
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => setStep(2)}
                disabled={!passwordMatch || !form.idNumber || !form.licenseNumber || !form.profilePhotoUrl || !form.idFrontUrl || !form.idBackUrl || !form.licenseFrontUrl || !form.licenseBackUrl}
              >
                Next Step (Vehicle Details)
              </Button>
            ) : (
              <div className="flex space-x-2 w-full">
                {step === 2 && (
                   <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(1)}>Back</Button>
                )}
                <Button
                  className={step === 2 ? "w-2/3" : "w-full"}
                  size="lg"
                  loading={mutation.isPending}
                  disabled={!passwordMatch || (form.role === "DRIVER" && (!form.carMake || !form.plateNumber || !form.carFrontUrl || !form.carRearUrl || !form.carInteriorUrl || !form.insurancePhotoUrl || !form.chassisPhotoUrl))}
                >
                  {form.role === "DRIVER" ? "Submit Application" : "Create Account"}
                </Button>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            to="/login"
            className="block w-full text-center px-4 py-2 border-2 border-teal-600 text-teal-600 font-semibold rounded-lg hover:bg-teal-50 transition"
          >
            Sign In
          </Link>
        </Card>

        {/* Terms */}
        <p className="mt-6 text-center text-white text-sm">
          By creating an account, you agree to our<br />
          <a href="#" className="underline hover:text-gray-100">Terms of Service</a> and{" "}
          <a href="#" className="underline hover:text-gray-100">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
