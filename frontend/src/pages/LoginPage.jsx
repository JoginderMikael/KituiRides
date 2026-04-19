import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../features/auth/authApi";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { Button, Input, Card } from "../components/UIComponents";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [form, setForm] = useState({ email: "admin@example.com", password: "admin@example.com" });
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      navigate(roleHomePath(data.role), { replace: true });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-500 to-orange-400 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-lg mb-4">
            <span className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-orange-500 bg-clip-text text-transparent">
              KR
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">KituiRides</h1>
          <p className="text-teal-100">Your trusted ride-sharing platform</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome Back</h2>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(form);
            }}
          >
            {/* Email Input */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            {/* Password Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

            {/* Error Message */}
            {mutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                ✕ Login failed. Please check your credentials.
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              loading={mutation.isPending}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">New to KituiRides?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="block w-full text-center px-4 py-2 border-2 border-teal-600 text-teal-600 font-semibold rounded-lg hover:bg-teal-50 transition"
          >
            Create Account
          </Link>
        </Card>

        {/* Bootstrap Note */}
        <div className="mt-6 rounded-lg bg-white/20 p-4 text-sm text-white backdrop-blur">
          <p className="font-semibold mb-2">Initial Admin Bootstrap</p>
          <p>Admin email: admin@example.com</p>
          <p>Admin password: admin@example.com</p>
          <p className="mt-2 text-teal-100">Register customer and driver accounts through the app, then approve drivers from the admin dashboard.</p>
        </div>
      </div>
    </div>
  );
}
