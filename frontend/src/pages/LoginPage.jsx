import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../features/auth/authApi";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      navigate(roleHomePath(data.role), { replace: true });
    }
  });

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <input className="w-full rounded border p-2" placeholder="Email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mutation.isError && <p className="text-sm text-red-600">Login failed</p>}
        <button className="w-full rounded bg-brand-primary p-2 text-white" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-3 text-sm">No account? <Link to="/register" className="text-brand-primary">Register</Link></p>
    </div>
  );
}
