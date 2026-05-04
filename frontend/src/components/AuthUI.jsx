import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiShield,
  FiUploadCloud
} from "react-icons/fi";
import FileUpload from "./FileUpload";

export function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-9 w-9" : "h-11 w-11"} flex items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-[0_14px_28px_-18px_rgba(5,150,105,0.9)]`}>
        KR
      </div>
      <div>
        <div className={`${compact ? "text-lg" : "text-2xl"} font-bold tracking-tight text-slate-950`}>
          Kitui<span className="text-emerald-600">Rides</span>
        </div>
        {!compact ? <p className="text-xs font-medium text-slate-500">Your trusted ride-sharing platform</p> : null}
      </div>
    </div>
  );
}

export function AuthRoadScene({ title = "KituiRides", subtitle = "Your trusted ride-sharing platform" }) {
  return (
    <div className="relative hidden min-h-[42rem] overflow-hidden rounded-2xl border border-slate-200 bg-white p-10 lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(16,185,129,0.10),transparent_18rem)]" />
      <div className="relative z-10">
        <BrandMark />
        <h1 className="mt-12 max-w-sm text-5xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-4 max-w-xs text-base leading-7 text-slate-600">{subtitle}</p>
      </div>

      <div className="relative z-10 mt-auto pb-16">
        <div className="relative mx-auto h-64 max-w-md">
          <img
            src="/landing/kituirides-hero-scene.png"
            alt=""
            className="absolute inset-x-0 bottom-4 mx-auto h-56 w-full object-contain"
          />
          <div className="absolute left-10 top-8 h-36 w-64 rounded-[50%] border-2 border-dashed border-emerald-200" />
          <div className="absolute left-56 top-12 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl">
            <FiMapPin className="text-2xl" />
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-4">
        {[
          ["Safe Rides", "Your safety is our priority"],
          ["Affordable", "Fair prices, transparent fares"],
          ["Reliable", "On time, every time"]
        ].map(([label, text]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-4 text-center">
            <FiShield className="mx-auto text-xl text-emerald-600" />
            <p className="mt-2 text-sm font-bold text-slate-900">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthCardLayout({ children, aside, wide = false }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className={`mx-auto grid min-h-[calc(100vh-2.5rem)] w-full ${wide ? "max-w-7xl lg:grid-cols-[24rem_minmax(0,1fr)]" : "max-w-6xl lg:grid-cols-[1.08fr_0.92fr]"} gap-6 lg:items-center`}>
        {aside}
        <div className="flex min-h-full items-start justify-center lg:items-center">
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthInputField({ label, required = false, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        {...props}
        required={required}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

export function PasswordField({ label, value, onChange, showPassword, onToggle, required = false, error }) {
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={value}
            onChange={onChange}
            required={required}
            className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
              error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            }`}
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </span>
      </label>
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

export function AuthSelectField({ label, required = false, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <select
        {...props}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      >
        {children}
      </select>
    </label>
  );
}

export function UploadCard({ label, value, onUpload, required = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {label} {required ? <span className="text-red-500">*</span> : null}
          </p>
          <p className="mt-1 text-[0.68rem] font-medium text-slate-400">Images or PDF, up to 15 MB.</p>
        </div>
        <FiUploadCloud className="mt-0.5 shrink-0 text-lg text-slate-400" />
      </div>
      <FileUpload label={label} value={value} onUpload={onUpload} required={required} compact />
    </div>
  );
}

export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const active = step.value === currentStep;
        const complete = step.value < currentStep;
        return (
          <div
            key={step.value}
            className={`flex items-start gap-3 rounded-xl p-3 transition ${active ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              active || complete ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-500"
            }`}>
              {complete ? <FiCheck /> : step.value}
            </span>
            <span>
              <span className="block text-sm font-bold">{step.label}</span>
              <span className="mt-0.5 block text-xs">{step.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AuthPrimaryButton({ children, loading, className = "", ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-18px_rgba(5,150,105,0.95)] transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-emerald-300 ${className}`}
    >
      {loading ? "Please wait..." : children}
      {!loading ? <FiArrowRight /> : null}
    </button>
  );
}

export function AuthSecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <FiArrowLeft />
      {children}
    </button>
  );
}
