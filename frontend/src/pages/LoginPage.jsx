/**
 * @fileoverview Page component for login page.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiChevronDown, FiMail, FiShield } from "react-icons/fi";
import { login } from "../features/auth/authApi";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import {
  AuthCardLayout,
  AuthInputField,
  AuthPrimaryButton,
  AuthRoadScene,
  BrandMark,
  PasswordField
} from "../components/AuthUI";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const authResponse = await login(form);
      setAuth(authResponse);
      const targetPath = roleHomePath(authResponse.role);
      navigate(targetPath, { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message || "Login failed. Please check your credentials.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCardLayout
      aside={<AuthRoadScene title="KituiRides" subtitle="Move around Kitui with trusted rides, clear fares, and support when you need it." />}
    >
      <section className="w-full max-w-[27rem] rounded-2xl bg-white p-5 shadow-[0_22px_55px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:p-7">
        <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="lg:hidden">
            <BrandMark />
            <img
              src="/landing/kituirides-hero-scene.png"
              alt=""
              className="mx-auto mt-5 h-28 w-full object-contain"
            />
          </div>
          <div className="mt-8 w-full lg:mt-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Welcome Back</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Sign in to continue to your account</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <AuthInputField
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <FiMail className="pointer-events-none absolute right-4 top-9 text-slate-400" />
          </div>

          <PasswordField
            label="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            showPassword={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            required
          />

          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              Remember me
            </label>
            <button type="button" className="text-emerald-700 transition hover:text-emerald-800">
              Forgot Password?
            </button>
          </div>

          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {submitError}
            </div>
          ) : null}

          <AuthPrimaryButton type="submit" loading={isSubmitting}>
            Sign In
          </AuthPrimaryButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to KituiRides?{" "}
          <Link to="/register" className="font-bold text-emerald-700 transition hover:text-emerald-800">
            Create Account
          </Link>
        </p>

        <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/70">
          <button
            type="button"
            onClick={() => setShowAdminSetup((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3 text-sm font-bold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-700">
                <FiShield />
              </span>
              Initial Admin Setup
            </span>
            <FiChevronDown className={`text-slate-500 transition ${showAdminSetup ? "rotate-180" : ""}`} />
          </button>
          {showAdminSetup ? (
            <div className="border-t border-emerald-100 px-4 pb-4 pt-3 text-xs leading-6 text-slate-600">
              <p>Set APP_SUPERADMIN_EMAIL and APP_SUPERADMIN_PASSWORD before first launch to create an admin account.</p>
              <p className="mt-2 text-slate-500">Register customer and driver accounts through the app, then approve drivers from the admin dashboard.</p>
            </div>
          ) : null}
        </div>
      </section>
    </AuthCardLayout>
  );
}
