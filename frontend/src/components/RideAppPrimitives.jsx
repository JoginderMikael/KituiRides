/**
 * @fileoverview UI component module for ride app primitives.
 */
import { useEffect, useRef } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Badge, Button, Card } from "./UIComponents";

function toneClasses(tone) {
  return {
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    info: "bg-sky-100 text-sky-800 border-sky-200",
    accent: "bg-teal-100 text-teal-800 border-teal-200",
    muted: "bg-slate-100 text-slate-700 border-slate-200",
    danger: "bg-rose-100 text-rose-700 border-rose-200"
  }[tone] || "bg-slate-100 text-slate-700 border-slate-200";
}

export function AppHeader({
  title,
  subtitle,
  status,
  trailing,
  eyebrow,
  className = ""
}) {
  return (
    <div className={`relative overflow-hidden rounded-[30px] border border-white/60 bg-white/90 p-5 shadow-[0_28px_65px_-40px_rgba(15,23,42,0.45)] backdrop-blur ${className}`}>
      <div className="absolute inset-x-6 top-0 h-24 rounded-b-[32px] bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_72%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status}
          {trailing}
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ label, tone = "muted", hint, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses(tone)} ${className}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-75" />
      <span>{label}</span>
      {hint ? <span className="hidden text-[11px] font-medium opacity-80 sm:inline">{hint}</span> : null}
    </div>
  );
}

export function SectionCard({ children, className = "" }) {
  return (
    <Card className={`rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_28px_65px_-40px_rgba(15,23,42,0.45)] ${className}`}>
      {children}
    </Card>
  );
}

export function CompactStatCard({ label, value, helper, tone = "muted" }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${toneClasses(tone)}`}>
          Live
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
    </div>
  );
}

export function MapPanel({ title, subtitle, controls, children, footer, className = "" }) {
  return (
    <SectionCard className={`overflow-hidden p-0 ${className}`}>
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-950">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {controls}
        </div>
      </div>
      <div className="p-5">{children}</div>
      {footer ? <div className="border-t border-slate-200 px-5 py-4">{footer}</div> : null}
    </SectionCard>
  );
}

export function PrimaryActionButton({ children, className = "", ...props }) {
  return (
    <Button
      size="lg"
      className={`min-h-[3.75rem] rounded-2xl bg-teal-600 shadow-[0_24px_40px_-24px_rgba(13,148,136,0.95)] hover:bg-teal-700 ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PaymentMethodCard({
  title,
  description,
  badge,
  icon,
  helper,
  selected,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        selected
          ? "border-teal-500 bg-teal-50 shadow-[0_18px_36px_-26px_rgba(13,148,136,0.75)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? "bg-white text-teal-700" : "bg-slate-100 text-slate-700"}`}>
            {icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-950">{title}</p>
              {badge ? <Badge label={badge} size="sm" variant={selected ? "teal" : "default"} /> : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <span
          className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-teal-600 bg-teal-600" : "border-slate-300"
          }`}
        >
          <span className={`h-2 w-2 rounded-full bg-white transition ${selected ? "opacity-100" : "opacity-0"}`} />
        </span>
      </div>
      {helper ? <p className={`mt-3 text-sm ${selected ? "text-teal-800" : "text-slate-500"}`}>{helper}</p> : null}
    </button>
  );
}

export function BottomSheet({
  title,
  subtitle,
  summary,
  isOpen,
  onToggle,
  children,
  className = ""
}) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !contentRef.current) {
      return;
    }
    contentRef.current.scrollTop = 0;
  }, [isOpen]);

  return (
    <div className={`rounded-[28px] border border-white/70 bg-white/95 shadow-[0_26px_55px_-34px_rgba(15,23,42,0.55)] backdrop-blur ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
          <p className="text-base font-semibold text-slate-950">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {summary}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {isOpen ? <FiChevronDown /> : <FiChevronUp />}
          </span>
        </div>
      </button>
      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[70vh] border-t border-slate-200" : "max-h-0"}`}
      >
        <div className="max-h-[62vh] space-y-4 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function MobileBottomNav({ items, value, onChange }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[68] border-t border-slate-200 bg-white/96 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.6rem)] pt-2 shadow-[0_-18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {items.map((item) => {
          const active = item.value === value;
          const Icon = item.icon;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                active ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className={`text-lg ${active ? "text-teal-600" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
