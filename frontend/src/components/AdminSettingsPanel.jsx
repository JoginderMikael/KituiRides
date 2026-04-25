/**
 * @fileoverview UI component module for admin settings panel.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiDatabase,
  FiDollarSign,
  FiEye,
  FiMail,
  FiPercent,
  FiPhone,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiSettings,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiZap
} from "react-icons/fi";
import { Modal } from "./UIComponents";
import {
  getAdminSystemSettings,
  refreshAdminSystemSettingsCache,
  updateAdminSystemSettings
} from "../features/admin/adminSettingsApi";

const SECTION_FIELDS = {
  pricing: ["baseFare", "fuelCostPerLiter"],
  controls: [
    "supportPhoneNumber",
    "supportEmailAddress",
    "supportHelpLabel",
    "supportEscalationContact",
    "emergencyContactVisible"
  ],
  formula: ["driverMarkup", "companyCommissionRate"]
};

const DEFAULT_FORM_VALUES = {
  baseFare: "150",
  fuelCostPerLiter: "200",
  driverMarkup: "1.5",
  companyCommissionRate: "0.2",
  supportPhoneNumber: "+254797753625",
  supportEmailAddress: "support@kituirides.com",
  supportHelpLabel: "Need help with your trip? Reach KituiRides support.",
  supportEscalationContact: "Ops escalation desk",
  emergencyContactVisible: true
};

const SAMPLE_SCENARIO = {
  distanceKm: 12.4,
  durationMinutes: 18,
  timeRatePerMinute: 4.5,
  bookingFee: 25,
  surgeMultiplier: 1.1
};

const SECTION_META = {
  pricing: {
    title: "Price Configuration",
    icon: FiDollarSign
  },
  controls: {
    title: "Controls",
    icon: FiSliders
  },
  formula: {
    title: "Price Engine Formula",
    icon: FiPercent
  },
  preview: {
    title: "Current Surface Preview",
    icon: FiEye
  }
};

const STATUS_TONE_MAP = {
  SYNCED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  STALE: "border-amber-200 bg-amber-50 text-amber-700",
  UNAVAILABLE: "border-rose-200 bg-rose-50 text-rose-700"
};

function buildFormValues(settings) {
  return {
    baseFare: String(settings?.pricing?.baseFare ?? DEFAULT_FORM_VALUES.baseFare),
    fuelCostPerLiter: String(settings?.pricing?.fuelCostPerLiter ?? DEFAULT_FORM_VALUES.fuelCostPerLiter),
    driverMarkup: String(settings?.pricing?.driverMarkup ?? DEFAULT_FORM_VALUES.driverMarkup),
    companyCommissionRate: String(settings?.pricing?.companyCommissionRate ?? DEFAULT_FORM_VALUES.companyCommissionRate),
    supportPhoneNumber: settings?.support?.supportPhoneNumber ?? DEFAULT_FORM_VALUES.supportPhoneNumber,
    supportEmailAddress: settings?.support?.supportEmailAddress ?? DEFAULT_FORM_VALUES.supportEmailAddress,
    supportHelpLabel: settings?.support?.supportHelpLabel ?? DEFAULT_FORM_VALUES.supportHelpLabel,
    supportEscalationContact: settings?.support?.supportEscalationContact ?? DEFAULT_FORM_VALUES.supportEscalationContact,
    emergencyContactVisible:
      typeof settings?.support?.emergencyContactVisible === "boolean"
        ? settings.support.emergencyContactVisible
        : DEFAULT_FORM_VALUES.emergencyContactVisible
  };
}

function buildPayload(values) {
  return {
    baseFare: Number(values.baseFare),
    fuelCostPerLiter: Number(values.fuelCostPerLiter),
    driverMarkup: Number(values.driverMarkup),
    companyCommissionRate: Number(values.companyCommissionRate),
    supportPhoneNumber: values.supportPhoneNumber.trim(),
    supportEmailAddress: values.supportEmailAddress.trim(),
    supportHelpLabel: values.supportHelpLabel.trim(),
    supportEscalationContact: values.supportEscalationContact.trim(),
    emergencyContactVisible: Boolean(values.emergencyContactVisible)
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatRatioAsPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "--";
  }
  return `${(parsed * 100).toFixed(1)}%`;
}

function formatTimestamp(value) {
  if (!value) {
    return "Not yet saved";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function validateValues(values) {
  const errors = {};
  const baseFare = Number(values.baseFare);
  const fuelCostPerLiter = Number(values.fuelCostPerLiter);
  const driverMarkup = Number(values.driverMarkup);
  const companyCommissionRate = Number(values.companyCommissionRate);

  if (!Number.isFinite(baseFare) || baseFare < 0) {
    errors.baseFare = "Base fare must be zero or higher.";
  }

  if (!Number.isFinite(fuelCostPerLiter) || fuelCostPerLiter <= 0) {
    errors.fuelCostPerLiter = "Fuel cost per liter must be greater than zero.";
  }

  if (!Number.isFinite(driverMarkup) || driverMarkup < 0 || driverMarkup > 5) {
    errors.driverMarkup = "Driver markup must stay between 0.00 and 5.00.";
  }

  if (!Number.isFinite(companyCommissionRate) || companyCommissionRate < 0 || companyCommissionRate >= 0.95) {
    errors.companyCommissionRate = "Company commission must stay below 0.95.";
  }

  if (!values.supportPhoneNumber.trim()) {
    errors.supportPhoneNumber = "Support phone is required.";
  }

  if (!values.supportEmailAddress.trim()) {
    errors.supportEmailAddress = "Support email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.supportEmailAddress.trim())) {
    errors.supportEmailAddress = "Support email must be valid.";
  }

  if (!values.supportHelpLabel.trim()) {
    errors.supportHelpLabel = "Support help label is required.";
  }

  if (!values.supportEscalationContact.trim()) {
    errors.supportEscalationContact = "Support escalation contact is required.";
  }

  return errors;
}

function fieldClassName(hasError) {
  return [
    "w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition duration-200",
    "focus:border-teal-500 focus:ring-4 focus:ring-teal-100",
    hasError ? "border-rose-300 bg-rose-50/80" : "border-slate-200 bg-white hover:border-slate-300"
  ].join(" ");
}

function buttonClassName(tone) {
  const palette = {
    primary: "border-teal-700 bg-teal-700 text-white hover:bg-teal-800 hover:border-teal-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
    ghost: "border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
  };

  return [
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
    palette[tone]
  ].join(" ");
}

function getSectionFields(sectionId) {
  return SECTION_FIELDS[sectionId] || [];
}

function isFieldEqual(left, right) {
  return String(left) === String(right);
}

function isSectionDirty(sectionId, draftValues, savedValues) {
  if (!draftValues || !savedValues) {
    return false;
  }

  return getSectionFields(sectionId).some((field) => !isFieldEqual(draftValues[field], savedValues[field]));
}

function hasAnyDirtyValues(draftValues, savedValues) {
  if (!draftValues || !savedValues) {
    return false;
  }

  return Object.keys(DEFAULT_FORM_VALUES).some((field) => !isFieldEqual(draftValues[field], savedValues[field]));
}

function mergeSectionValues(baseValues, nextValues, fields) {
  const merged = { ...baseValues };
  fields.forEach((field) => {
    merged[field] = nextValues[field];
  });
  return merged;
}

function resetSectionValues(currentValues, savedValues, sectionId) {
  const next = { ...currentValues };
  getSectionFields(sectionId).forEach((field) => {
    next[field] = savedValues[field];
  });
  return next;
}

function buildSectionDefaults(baseValues, sectionId) {
  const next = { ...baseValues };
  getSectionFields(sectionId).forEach((field) => {
    next[field] = DEFAULT_FORM_VALUES[field];
  });
  return next;
}

function computeSampleQuote(values, pricing) {
  const baseFare = Number(values.baseFare);
  const fuelCostPerLiter = Number(values.fuelCostPerLiter);
  const driverMarkup = Number(values.driverMarkup);
  const companyCommissionRate = Number(values.companyCommissionRate);
  const fuelEfficiency = Number(pricing?.motorcycleFuelEconomy || 0);

  if (
    !Number.isFinite(baseFare) ||
    !Number.isFinite(fuelCostPerLiter) ||
    !Number.isFinite(driverMarkup) ||
    !Number.isFinite(companyCommissionRate) ||
    !Number.isFinite(fuelEfficiency) ||
    fuelEfficiency <= 0 ||
    companyCommissionRate >= 1
  ) {
    return null;
  }

  const distanceCharge = (SAMPLE_SCENARIO.distanceKm / fuelEfficiency) * fuelCostPerLiter;
  const timeCharge = SAMPLE_SCENARIO.durationMinutes * SAMPLE_SCENARIO.timeRatePerMinute;
  const bookingFee = SAMPLE_SCENARIO.bookingFee;
  const driverMarkupValue = distanceCharge * driverMarkup;
  const subtotalBeforeSurge = baseFare + distanceCharge + timeCharge + bookingFee + driverMarkupValue;
  const surgedSubtotal = subtotalBeforeSurge * SAMPLE_SCENARIO.surgeMultiplier;
  const total = surgedSubtotal / (1 - companyCommissionRate);
  const serviceFee = total - surgedSubtotal;

  return {
    baseFare,
    distanceCharge,
    timeCharge,
    bookingFee,
    driverMarkupValue,
    surgeMultiplier: SAMPLE_SCENARIO.surgeMultiplier,
    serviceFee,
    total
  };
}

function SectionTab({ sectionId, active, dirty, onClick }) {
  const meta = SECTION_META[sectionId];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group rounded-[28px] border p-5 text-left shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] transition duration-200",
        active
          ? "border-teal-300 bg-[linear-gradient(160deg,rgba(240,253,250,0.95),rgba(255,255,255,1))] ring-2 ring-teal-100"
          : "border-white/70 bg-white/90 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-2xl p-3 ${active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>
          <Icon className="h-5 w-5" />
        </div>
        {dirty ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Draft
          </span>
        ) : active ? (
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
            Open
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">{meta.title}</h3>
    </button>
  );
}

function StatusBadge({ label, status }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        STATUS_TONE_MAP[status] || "border-slate-200 bg-slate-100 text-slate-600"
      ].join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/10">{icon}</div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PanelShell({ icon, title, children, actions }) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] md:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            {icon}
            Section
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-950">{title}</h2>
        </div>
        {actions ? <div className="lg:pl-6">{actions}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function FieldCard({ label, helper, unit, error, children }) {
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{helper}</p>
        </div>
        {unit ? (
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function FeedbackBanner({ feedback }) {
  if (!feedback) {
    return null;
  }

  const toneClass =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : feedback.type === "error"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={`flex items-start gap-3 rounded-[26px] border px-5 py-4 shadow-sm ${toneClass}`}>
      {feedback.type === "success" ? (
        <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <div>
        <p className="font-semibold">{feedback.title}</p>
        <p className="mt-1 text-sm leading-6">{feedback.message}</p>
      </div>
    </div>
  );
}

function ActionBar({
  onSave,
  onCancel,
  onRestoreDefaults,
  saveDisabled,
  cancelDisabled,
  defaultsDisabled,
  saving,
  savingLabel = "Saving..."
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
      <button type="button" className={buttonClassName("primary")} onClick={onSave} disabled={saveDisabled}>
        <FiSave className="h-4 w-4" />
        {saving ? savingLabel : "Save Changes"}
      </button>
      <button type="button" className={buttonClassName("secondary")} onClick={onCancel} disabled={cancelDisabled}>
        <FiRotateCcw className="h-4 w-4" />
        Cancel Edits
      </button>
      {onRestoreDefaults ? (
        <button
          type="button"
          className={buttonClassName("danger")}
          onClick={onRestoreDefaults}
          disabled={defaultsDisabled}
        >
          <FiShield className="h-4 w-4" />
          Restore Defaults
        </button>
      ) : null}
    </div>
  );
}

function QuoteLine({ label, value, emphasis, hint }) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-2xl border px-4 py-3",
        emphasis ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50/90 text-slate-700"
      ].join(" ")}
    >
      <div>
        <p className={`text-sm font-semibold ${emphasis ? "text-white" : "text-slate-900"}`}>{label}</p>
        {hint ? <p className={`mt-1 text-xs ${emphasis ? "text-slate-300" : "text-slate-500"}`}>{hint}</p> : null}
      </div>
      <p className={`text-sm font-semibold ${emphasis ? "text-white" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function LiveValueCard({ title, children, tone = "neutral" }) {
  const toneClass =
    tone === "draft"
      ? "border-amber-200 bg-amber-50/80"
      : tone === "live"
        ? "border-emerald-200 bg-emerald-50/70"
        : "border-slate-200 bg-slate-50/90";

  return (
    <div className={`rounded-[26px] border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="h-44 animate-pulse rounded-[32px] bg-slate-200/80" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-[28px] bg-slate-200/70" />
        ))}
      </div>
      <div className="h-[640px] animate-pulse rounded-[32px] bg-slate-200/70" />
    </div>
  );
}

export default function AdminSettingsPanel({ activeRequestsCount = 0 }) {
  const queryClient = useQueryClient();
  const savedValuesRef = useRef(null);
  const [activeSection, setActiveSection] = useState("pricing");
  const [settingsSnapshot, setSettingsSnapshot] = useState(null);
  const [savedValues, setSavedValues] = useState(null);
  const [draftValues, setDraftValues] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [activeOperation, setActiveOperation] = useState(null);

  const settingsQuery = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: getAdminSystemSettings
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    const nextSnapshot = settingsQuery.data;
    const nextSavedValues = buildFormValues(nextSnapshot);
    const previousSavedValues = savedValuesRef.current;

    setSettingsSnapshot(nextSnapshot);
    setSavedValues(nextSavedValues);
    savedValuesRef.current = nextSavedValues;

    setDraftValues((current) => {
      if (!current || !previousSavedValues || !hasAnyDirtyValues(current, previousSavedValues)) {
        return nextSavedValues;
      }
      return current;
    });
  }, [settingsQuery.data]);

  const validationErrors = useMemo(() => (draftValues ? validateValues(draftValues) : {}), [draftValues]);

  const dirtySections = useMemo(() => ({
    pricing: isSectionDirty("pricing", draftValues, savedValues),
    controls: isSectionDirty("controls", draftValues, savedValues),
    formula: isSectionDirty("formula", draftValues, savedValues),
    preview: false
  }), [draftValues, savedValues]);

  const hasAnyUnsavedChanges = useMemo(
    () => hasAnyDirtyValues(draftValues, savedValues),
    [draftValues, savedValues]
  );

  useEffect(() => {
    if (!hasAnyUnsavedChanges || typeof window === "undefined") {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasAnyUnsavedChanges]);

  const sampleQuote = useMemo(() => {
    if (!draftValues || !settingsSnapshot?.pricing) {
      return null;
    }
    return computeSampleQuote(draftValues, settingsSnapshot.pricing);
  }, [draftValues, settingsSnapshot]);

  const saveMutation = useMutation({
    mutationFn: ({ nextValues }) => updateAdminSystemSettings(buildPayload(nextValues)),
    onSuccess: (response, variables) => {
      const normalizedValues = buildFormValues(response);
      const syncFields = variables?.fields || Object.keys(DEFAULT_FORM_VALUES);

      setSettingsSnapshot(response);
      setSavedValues(normalizedValues);
      savedValuesRef.current = normalizedValues;
      setDraftValues((current) => {
        if (!current) {
          return normalizedValues;
        }

        const nextDraft = { ...current };
        syncFields.forEach((field) => {
          nextDraft[field] = normalizedValues[field];
        });
        return nextDraft;
      });

      setFeedback({
        type: "success",
        title: variables.successTitle || "Changes applied",
        message: variables.successMessage || "The selected platform settings were saved successfully."
      });

      setActiveOperation(null);
      queryClient.invalidateQueries({ queryKey: ["support-contact"] });
      queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error, variables) => {
      setFeedback({
        type: "error",
        title: variables?.errorTitle || "Save failed",
        message: error?.response?.data?.message || "The selected settings could not be persisted right now."
      });
      setActiveOperation(null);
    }
  });

  const refreshCacheMutation = useMutation({
    mutationFn: refreshAdminSystemSettingsCache,
    onSuccess: (response) => {
      setFeedback({
        type: "info",
        title: "Cache refreshed",
        message: response?.message || "Redis cache refresh completed."
      });
      setActiveOperation(null);
      settingsQuery.refetch();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        title: "Refresh failed",
        message: error?.response?.data?.message || "Redis cache refresh could not be completed."
      });
      setActiveOperation(null);
    }
  });

  const summary = settingsSnapshot?.summary;
  const pricing = settingsSnapshot?.pricing;

  function syncSavedSection(sectionId, nextValues, successTitle, successMessage, errorTitle) {
    const sectionErrors = getSectionFields(sectionId).reduce((accumulator, field) => {
      if (validationErrors[field]) {
        accumulator[field] = validationErrors[field];
      }
      return accumulator;
    }, {});

    if (Object.keys(sectionErrors).length) {
      setFeedback({
        type: "error",
        title: errorTitle || "Fix required",
        message: "Resolve the highlighted fields in this section before saving."
      });
      return;
    }

    setActiveOperation({ type: "save", sectionId });
    saveMutation.mutate({
      nextValues,
      fields: getSectionFields(sectionId),
      successTitle,
      successMessage,
      errorTitle
    });
  }

  function handleSaveSection(sectionId) {
    const nextValues = mergeSectionValues(savedValues, draftValues, getSectionFields(sectionId));

    const successMap = {
      pricing: {
        title: "Pricing saved",
        message: "Base fare and fuel cost were persisted and are ready to drive new pricing calculations."
      },
      controls: {
        title: "Controls saved",
        message: "Support contact controls were updated successfully."
      },
      formula: {
        title: "Formula updated",
        message: "Markup and commission weights were saved for the pricing engine."
      }
    };

    syncSavedSection(
      sectionId,
      nextValues,
      successMap[sectionId]?.title,
      successMap[sectionId]?.message,
      "Save blocked"
    );
  }

  function handleCancelSection(sectionId) {
    setDraftValues((current) => resetSectionValues(current, savedValues, sectionId));
    setFeedback({
      type: "info",
      title: "Edits discarded",
      message: `${SECTION_META[sectionId].title} was reset to the last saved values.`
    });
  }

  function requestDefaultsRestore(sectionId) {
    setConfirmation({
      sectionId,
      title: `Restore defaults for ${SECTION_META[sectionId].title}?`,
      description:
        sectionId === "pricing"
          ? "This will replace the saved pricing inputs for this section with the platform defaults."
          : sectionId === "formula"
            ? "This will restore the saved pricing weights in the formula section to their default values."
            : "This will restore the saved support and controls settings in this section to their default values."
    });
  }

  function handleConfirmRestoreDefaults() {
    if (!confirmation) {
      return;
    }

    const sectionId = confirmation.sectionId;
    const nextValues = buildSectionDefaults(savedValues, sectionId);

    setConfirmation(null);
    setActiveOperation({ type: "defaults", sectionId });
    saveMutation.mutate({
      nextValues,
      fields: getSectionFields(sectionId),
      successTitle: "Defaults restored",
      successMessage: `${SECTION_META[sectionId].title} now matches the platform defaults.`,
      errorTitle: "Defaults restore failed"
    });
  }

  if (settingsQuery.isLoading || !settingsSnapshot || !draftValues || !savedValues || !summary || !pricing) {
    return <LoadingState />;
  }

  if (settingsQuery.isError) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-[linear-gradient(140deg,rgba(255,241,242,0.96),rgba(255,255,255,0.98))] p-8 shadow-[0_24px_60px_-36px_rgba(190,24,93,0.35)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-600 p-3 text-white">
              <FiAlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">Settings unavailable</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Platform controls could not be loaded</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                The admin workspace could not fetch pricing, support, or cache state from the backend.
              </p>
            </div>
          </div>
          <button type="button" className={buttonClassName("primary")} onClick={() => settingsQuery.refetch()}>
            <FiRefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  function renderPricingSection() {
    return (
      <PanelShell
        icon={<FiDollarSign className="h-4 w-4" />}
        title="Price Configuration"
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5">
            <FieldCard
              label="Base fare"
              helper="The fixed opening amount added to every trip before the rest of the pricing logic is applied."
              unit="KES"
              error={validationErrors.baseFare}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                className={fieldClassName(Boolean(validationErrors.baseFare))}
                value={draftValues.baseFare}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, baseFare: event.target.value }));
                  setFeedback(null);
                }}
              />
            </FieldCard>

            <FieldCard
              label="Fuel cost per liter"
              helper="The live fuel reference used to derive distance-related ride operating cost."
              unit="KES / L"
              error={validationErrors.fuelCostPerLiter}
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={fieldClassName(Boolean(validationErrors.fuelCostPerLiter))}
                value={draftValues.fuelCostPerLiter}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, fuelCostPerLiter: event.target.value }));
                  setFeedback(null);
                }}
              />
            </FieldCard>

            <div className="rounded-[26px] border border-slate-200 bg-slate-50/90 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Pricing context</p>
                  <p className="mt-1 text-sm text-slate-500">
                    The sample quote also reflects the current formula weights from the formula tab.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Driver markup</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{formatRatioAsPercent(draftValues.driverMarkup)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Platform commission</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{formatRatioAsPercent(draftValues.companyCommissionRate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(240,253,250,0.92),rgba(255,247,237,0.9))] p-6 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Sample Quote Preview</p>
                <h3 className="mt-3 text-2xl font-bold text-slate-950">Live rider quote simulation</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Time, booking, and surge values below are simulation assumptions so admins can preview a full quote surface.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/10">
                <FiTrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge label={`${SAMPLE_SCENARIO.distanceKm} km sample`} status="SYNCED" />
              <StatusBadge label={`${SAMPLE_SCENARIO.durationMinutes} min sample`} status="SYNCED" />
              <StatusBadge label={`${(SAMPLE_SCENARIO.surgeMultiplier * 100).toFixed(0)}% surge`} status="STALE" />
            </div>

            <div className="mt-6 space-y-3">
              <QuoteLine label="Base fare" value={formatMoney(sampleQuote?.baseFare || 0)} />
              <QuoteLine
                label="Distance charge"
                value={formatMoney(sampleQuote?.distanceCharge || 0)}
                hint="Derived from distance, fuel efficiency, and current fuel cost."
              />
              <QuoteLine
                label="Time charge"
                value={formatMoney(sampleQuote?.timeCharge || 0)}
                hint="Preview-only assumption for this sample scenario."
              />
              <QuoteLine
                label="Booking fee"
                value={formatMoney(sampleQuote?.bookingFee || 0)}
                hint="Preview-only operational handling fee."
              />
              <QuoteLine
                label="Driver markup uplift"
                value={formatMoney(sampleQuote?.driverMarkupValue || 0)}
                hint="Driven by the markup weight in the formula tab."
              />
              <QuoteLine
                label="Surge multiplier"
                value={`${sampleQuote ? sampleQuote.surgeMultiplier.toFixed(2) : "0.00"}x`}
                hint="Preview-only demand multiplier."
              />
              <QuoteLine
                label="Service fee"
                value={formatMoney(sampleQuote?.serviceFee || 0)}
                hint="The commission contribution implied by the current formula."
              />
              <QuoteLine
                label="Total estimated ride price"
                value={formatMoney(sampleQuote?.total || 0)}
                emphasis
              />
            </div>
          </div>
        </div>

        <ActionBar
          onSave={() => handleSaveSection("pricing")}
          onCancel={() => handleCancelSection("pricing")}
          onRestoreDefaults={() => requestDefaultsRestore("pricing")}
          saveDisabled={!dirtySections.pricing || activeOperation?.sectionId === "pricing" || saveMutation.isPending}
          cancelDisabled={!dirtySections.pricing || saveMutation.isPending}
          defaultsDisabled={saveMutation.isPending}
          saving={saveMutation.isPending && activeOperation?.sectionId === "pricing"}
        />
      </PanelShell>
    );
  }

  function renderControlsSection() {
    return (
      <PanelShell
        icon={<FiSliders className="h-4 w-4" />}
        title="Controls"
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="grid gap-5">
            <FieldCard
              label="Support phone"
              helper="Primary hotline shown in rider, driver, and support surfaces."
              unit="phone"
              error={validationErrors.supportPhoneNumber}
            >
              <input
                type="tel"
                className={fieldClassName(Boolean(validationErrors.supportPhoneNumber))}
                value={draftValues.supportPhoneNumber}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, supportPhoneNumber: event.target.value }));
                  setFeedback(null);
                }}
              />
            </FieldCard>

            <FieldCard
              label="Support email"
              helper="Email address used for escalations and non-urgent support follow-up."
              unit="email"
              error={validationErrors.supportEmailAddress}
            >
              <input
                type="email"
                className={fieldClassName(Boolean(validationErrors.supportEmailAddress))}
                value={draftValues.supportEmailAddress}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, supportEmailAddress: event.target.value }));
                  setFeedback(null);
                }}
              />
            </FieldCard>

            <FieldCard
              label="Help label"
              helper="Short support guidance text displayed across rider and driver help entry points."
              error={validationErrors.supportHelpLabel}
            >
              <input
                type="text"
                className={fieldClassName(Boolean(validationErrors.supportHelpLabel))}
                value={draftValues.supportHelpLabel}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, supportHelpLabel: event.target.value }));
                  setFeedback(null);
                }}
              />
            </FieldCard>

            <FieldCard
              label="Escalation contact"
              helper="Operations alias or desk responsible for higher-severity support follow-up."
              error={validationErrors.supportEscalationContact}
            >
              <input
                type="text"
                className={fieldClassName(Boolean(validationErrors.supportEscalationContact))}
                value={draftValues.supportEscalationContact}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, supportEscalationContact: event.target.value }));
                  setFeedback(null);
                }}
              />
            </FieldCard>

            <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(145deg,rgba(15,23,42,0.03),rgba(13,148,136,0.04),rgba(255,255,255,0.96))] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Emergency contact visibility</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Control whether emergency support prompts stay visible in the rider and driver support surfaces.
                  </p>
                </div>
                <button
                  type="button"
                  className={[
                    "inline-flex min-w-[13rem] items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-200",
                    draftValues.emergencyContactVisible
                      ? "border-teal-200 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-600"
                  ].join(" ")}
                  onClick={() => {
                    setDraftValues((current) => ({
                      ...current,
                      emergencyContactVisible: !current.emergencyContactVisible
                    }));
                    setFeedback(null);
                  }}
                >
                  <span>{draftValues.emergencyContactVisible ? "Visible to users" : "Hidden from users"}</span>
                  <span
                    className={[
                      "relative h-6 w-11 rounded-full transition",
                      draftValues.emergencyContactVisible ? "bg-teal-600" : "bg-slate-300"
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                        draftValues.emergencyContactVisible ? "left-[1.3rem]" : "left-0.5"
                      ].join(" ")}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.38)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">System Tools</p>
                  <h3 className="mt-3 text-xl font-bold text-slate-950">Cache and sync state</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Redis and persistence status stay visible here so admins can refresh the cache without leaving controls.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/10">
                  <FiDatabase className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cache status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{summary.cacheStatus}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Database sync</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{summary.databaseStatus}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Last cache refresh</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatTimestamp(summary.cacheRefreshedAt)}</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  className={buttonClassName("ghost")}
                  onClick={() => {
                    setActiveOperation({ type: "cache", sectionId: "controls" });
                    refreshCacheMutation.mutate();
                  }}
                  disabled={refreshCacheMutation.isPending}
                >
                  <FiRefreshCw className={`h-4 w-4 ${refreshCacheMutation.isPending ? "animate-spin" : ""}`} />
                  {refreshCacheMutation.isPending ? "Refreshing Cache..." : "Refresh Cache"}
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(240,253,250,0.9))] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Preview Signal</p>
              <h3 className="mt-3 text-xl font-bold text-slate-950">Current support surface state</h3>
              <div className="mt-5 space-y-3">
                <QuoteLine label="Hotline" value={draftValues.supportPhoneNumber || "--"} />
                <QuoteLine label="Support email" value={draftValues.supportEmailAddress || "--"} />
                <QuoteLine
                  label="Emergency prompt"
                  value={draftValues.emergencyContactVisible ? "Visible" : "Hidden"}
                />
              </div>
            </div>
          </div>
        </div>

        <ActionBar
          onSave={() => handleSaveSection("controls")}
          onCancel={() => handleCancelSection("controls")}
          onRestoreDefaults={() => requestDefaultsRestore("controls")}
          saveDisabled={!dirtySections.controls || activeOperation?.sectionId === "controls" || saveMutation.isPending}
          cancelDisabled={!dirtySections.controls || saveMutation.isPending}
          defaultsDisabled={saveMutation.isPending}
          saving={saveMutation.isPending && activeOperation?.sectionId === "controls"}
        />
      </PanelShell>
    );
  }

  function renderFormulaSection() {
    return (
      <PanelShell
        icon={<FiPercent className="h-4 w-4" />}
        title="Price Engine Formula"
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-[0_22px_60px_-38px_rgba(15,23,42,0.9)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-300">Active formula</p>
              <p className="mt-4 overflow-x-auto font-mono text-lg leading-8 text-slate-100 md:text-xl">
                P = (B + (D / FE × Cf × (1 + M))) / (1 - R)
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Base fare, distance operating cost, driver markup, and company commission remain centrally managed here.
              </p>
            </div>

            <FieldCard
              label="Driver markup"
              helper="Markup ratio applied on top of distance operating cost before commission is recovered."
              unit="ratio"
              error={validationErrors.driverMarkup}
            >
              <input
                type="number"
                min="0"
                max="5"
                step="0.0001"
                className={fieldClassName(Boolean(validationErrors.driverMarkup))}
                value={draftValues.driverMarkup}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, driverMarkup: event.target.value }));
                  setFeedback(null);
                }}
              />
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Equivalent uplift: <span className="text-slate-700">{formatRatioAsPercent(draftValues.driverMarkup)}</span>
              </p>
            </FieldCard>

            <FieldCard
              label="Company commission"
              helper="Platform fee ratio recovered after the ride subtotal has been computed."
              unit="ratio"
              error={validationErrors.companyCommissionRate}
            >
              <input
                type="number"
                min="0"
                max="0.9499"
                step="0.0001"
                className={fieldClassName(Boolean(validationErrors.companyCommissionRate))}
                value={draftValues.companyCommissionRate}
                onChange={(event) => {
                  setDraftValues((current) => ({ ...current, companyCommissionRate: event.target.value }));
                  setFeedback(null);
                }}
              />
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Platform take: <span className="text-slate-700">{formatRatioAsPercent(draftValues.companyCommissionRate)}</span>
              </p>
            </FieldCard>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.38)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Formula builder</p>
              <h3 className="mt-3 text-xl font-bold text-slate-950">Readable pricing logic</h3>
              <div className="mt-5 space-y-3">
                {[
                  { symbol: "B", label: "Base fare", value: formatMoney(Number(draftValues.baseFare || 0)) },
                  { symbol: "Cf", label: "Fuel cost per liter", value: formatMoney(Number(draftValues.fuelCostPerLiter || 0)) },
                  { symbol: "FE", label: "Fuel efficiency baseline", value: `${pricing.motorcycleFuelEconomy} km/L` },
                  { symbol: "M", label: "Driver markup", value: formatRatioAsPercent(draftValues.driverMarkup) },
                  { symbol: "R", label: "Company commission", value: formatRatioAsPercent(draftValues.companyCommissionRate) }
                ].map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-900 shadow-sm">
                        {item.symbol}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SummaryCard
                icon={<FiTrendingUp className="h-5 w-5" />}
                label="Driver Margin"
                value={formatRatioAsPercent(draftValues.driverMarkup)}
                caption="How much uplift is currently being applied to the distance-derived operating cost."
              />
              <SummaryCard
                icon={<FiZap className="h-5 w-5" />}
                label="Platform Take"
                value={formatRatioAsPercent(draftValues.companyCommissionRate)}
                caption="How much of the final fare is being retained by the company."
              />
            </div>
          </div>
        </div>

        <ActionBar
          onSave={() => handleSaveSection("formula")}
          onCancel={() => handleCancelSection("formula")}
          onRestoreDefaults={() => requestDefaultsRestore("formula")}
          saveDisabled={!dirtySections.formula || activeOperation?.sectionId === "formula" || saveMutation.isPending}
          cancelDisabled={!dirtySections.formula || saveMutation.isPending}
          defaultsDisabled={saveMutation.isPending}
          saving={saveMutation.isPending && activeOperation?.sectionId === "formula"}
        />
      </PanelShell>
    );
  }

  function renderPreviewSection() {
    const hasDraftChanges = hasAnyUnsavedChanges;

    return (
      <PanelShell
        icon={<FiEye className="h-4 w-4" />}
        title="Current Surface Preview"
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <LiveValueCard title="Live Pricing Snapshot" tone="live">
            <QuoteLine label="Base fare" value={formatMoney(Number(savedValues.baseFare || 0))} />
            <QuoteLine label="Fuel cost / liter" value={formatMoney(Number(savedValues.fuelCostPerLiter || 0))} />
            <QuoteLine label="Driver markup" value={formatRatioAsPercent(savedValues.driverMarkup)} />
            <QuoteLine label="Company commission" value={formatRatioAsPercent(savedValues.companyCommissionRate)} />
          </LiveValueCard>

          <LiveValueCard title="Live Support Surface" tone="live">
            <QuoteLine label="Hotline" value={savedValues.supportPhoneNumber || "--"} />
            <QuoteLine label="Support email" value={savedValues.supportEmailAddress || "--"} />
            <QuoteLine label="Help label" value={savedValues.supportHelpLabel || "--"} />
            <QuoteLine label="Emergency prompt" value={savedValues.emergencyContactVisible ? "Visible" : "Hidden"} />
          </LiveValueCard>

          <LiveValueCard title="Live System Status" tone="neutral">
            <QuoteLine label="Cache status" value={summary.cacheStatus} />
            <QuoteLine label="Database sync" value={summary.databaseStatus} />
            <QuoteLine label="Last saved" value={formatTimestamp(summary.lastUpdatedAt)} />
            <QuoteLine label="Config version" value={`v${summary.configurationVersion}`} />
          </LiveValueCard>

          <LiveValueCard title={hasDraftChanges ? "Pending Local Draft" : "Draft State"} tone={hasDraftChanges ? "draft" : "neutral"}>
            {hasDraftChanges ? (
              <>
                <QuoteLine label="Draft base fare" value={formatMoney(Number(draftValues.baseFare || 0))} />
                <QuoteLine label="Draft hotline" value={draftValues.supportPhoneNumber || "--"} />
                <QuoteLine label="Draft markup" value={formatRatioAsPercent(draftValues.driverMarkup)} />
                <QuoteLine
                  label="Draft emergency prompt"
                  value={draftValues.emergencyContactVisible ? "Visible" : "Hidden"}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                No local drafts are waiting. The values in this workspace match the live platform settings.
              </div>
            )}
          </LiveValueCard>
        </div>
      </PanelShell>
    );
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "pricing":
        return renderPricingSection();
      case "controls":
        return renderControlsSection();
      case "formula":
        return renderFormulaSection();
      case "preview":
      default:
        return renderPreviewSection();
    }
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] p-6 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.45)] md:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 shadow-sm">
            <FiSettings className="h-4 w-4" />
            Platform Controls
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            System settings for pricing, support, and ride economics
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusBadge
              label={hasAnyUnsavedChanges ? "Unsaved changes" : summary.cacheStatus === "SYNCED" ? "Cached and live" : "Needs attention"}
              status={hasAnyUnsavedChanges ? "STALE" : summary.cacheStatus}
            />
            <StatusBadge label={`DB ${summary.databaseStatus}`} status="SYNCED" />
            <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-sm">
              Last updated by <span className="font-semibold text-slate-900">{summary.lastUpdatedByName || "System default"}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FiActivity className="h-5 w-5" />}
            label="Active Requests"
            value={String(activeRequestsCount)}
          />
          <SummaryCard
            icon={<FiDatabase className="h-5 w-5" />}
            label="Cache Status"
            value={summary.cacheStatus}
          />
          <SummaryCard
            icon={<FiClock className="h-5 w-5" />}
            label="Last Saved"
            value={formatTimestamp(summary.lastUpdatedAt)}
          />
          <SummaryCard
            icon={<FiCpu className="h-5 w-5" />}
            label="Engine Version"
            value={`v${summary.configurationVersion}`}
          />
        </div>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace Navigation</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.keys(SECTION_META).map((sectionId) => (
              <SectionTab
                key={sectionId}
                sectionId={sectionId}
                active={activeSection === sectionId}
                dirty={dirtySections[sectionId]}
                onClick={() => setActiveSection(sectionId)}
              />
            ))}
          </div>
        </div>
      </section>

      <FeedbackBanner feedback={feedback} />

      {hasAnyUnsavedChanges ? (
        <div className="rounded-[26px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-900 shadow-sm">
          Unsaved edits stay local while you move between sections. They will not become live until you save the relevant section.
        </div>
      ) : null}

      {renderActiveSection()}

      {confirmation ? (
        <Modal
          isOpen={Boolean(confirmation)}
          title={confirmation.title}
          onClose={() => setConfirmation(null)}
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className={buttonClassName("secondary")} onClick={() => setConfirmation(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={buttonClassName("danger")}
                onClick={handleConfirmRestoreDefaults}
                disabled={saveMutation.isPending}
              >
                <FiShield className="h-4 w-4" />
                Restore Defaults
              </button>
            </div>
          }
        >
          <p className="text-sm leading-7 text-slate-600">{confirmation.description}</p>
        </Modal>
      ) : null}
    </div>
  );
}
