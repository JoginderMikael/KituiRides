import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../features/auth/authApi";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { Button, Input, Card } from "../components/UIComponents";

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
    role: "CUSTOMER"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const mutation = useMutation({
    mutationFn: register,
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
                <option value="SUPPORT_AGENT">👨‍💼 Support Agent - Help Users</option>
                <option value="ADMIN">⚙️ Admin - Manage Platform</option>
              </select>
            </div>

            {/* Error Message */}
            {mutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                ✕ Registration failed. Please check your details and try again.
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              loading={mutation.isPending}
              disabled={!passwordMatch}
            >
              Create Account
            </Button>
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
