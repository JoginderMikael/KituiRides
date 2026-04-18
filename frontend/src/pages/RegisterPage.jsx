import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../features/auth/authApi";
import { saveSession } from "../lib/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "2547",
    password: "",
    roles: ["CUSTOMER"]
  });

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      saveSession(data);
      navigate("/");
    }
  });

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl bg-white p-6 shadow">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <input className="rounded border p-2" placeholder="First name"
          value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <input className="rounded border p-2" placeholder="Last name"
          value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <input className="col-span-2 rounded border p-2" placeholder="Email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="col-span-2 rounded border p-2" placeholder="Phone number (254...)"
          value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
        <input className="col-span-2 rounded border p-2" type="password" placeholder="Password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select
          className="col-span-2 rounded border p-2"
          onChange={(e) => setForm({ ...form, roles: [e.target.value] })}
          defaultValue="CUSTOMER"
        >
          <option value="CUSTOMER">Customer</option>
          <option value="RIDER">Rider (Driver)</option>
          <option value="SUPPORT_AGENT">Support Agent</option>
          <option value="ADMIN">Admin</option>
        </select>
        {mutation.isError && <p className="col-span-2 text-sm text-red-600">Registration failed</p>}
        <button className="col-span-2 rounded bg-brand-primary p-2 text-white" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-3 text-sm">Have an account? <Link to="/login" className="text-brand-primary">Login</Link></p>
    </div>
  );
}
