import { useEffect, useState } from "react";
import { FiDollarSign, FiSmartphone } from "react-icons/fi";
import { PaymentMethodCard } from "./RideAppPrimitives";

function formatMoney(value) {
  return Number.isFinite(Number(value))
    ? `KES ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Unavailable";
}

export default function PaymentMethodSelector({
  value = "MPESA",
  onSelect,
  estimatedFare = null,
  estimatePending = false
}) {
  const [selectedMethod, setSelectedMethod] = useState(value || "MPESA");
  const [showDetails, setShowDetails] = useState(false);
  const hasEstimate = Number.isFinite(Number(estimatedFare)) && Number(estimatedFare) > 0;
  const fareLabel = estimatePending ? "Calculating..." : hasEstimate ? formatMoney(estimatedFare) : "Unavailable";

  useEffect(() => {
    setSelectedMethod(value || "MPESA");
  }, [value]);

  function handleSelect(method) {
    setSelectedMethod(method);
    onSelect?.(method);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Payment method</h3>
          <p className="text-sm text-slate-500">Choose how you want to settle this trip.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="text-sm font-semibold text-teal-700 transition hover:text-teal-800"
        >
          {showDetails ? "Hide details" : "Payment details"}
        </button>
      </div>

      <div className="space-y-3">
        <PaymentMethodCard
          title="M-Pesa"
          description="Fastest checkout with STK push confirmation."
          badge="Recommended"
          icon={<FiSmartphone className="text-xl" />}
          helper="You will confirm the payment on your phone before the trip closes."
          selected={selectedMethod === "MPESA"}
          onClick={() => handleSelect("MPESA")}
        />
        <PaymentMethodCard
          title="Cash"
          description="Pay the driver directly when the trip ends."
          icon={<FiDollarSign className="text-xl" />}
          helper={`Have the exact fare ready: ${fareLabel}. The driver still confirms receipt in-app.`}
          selected={selectedMethod === "CASH"}
          onClick={() => handleSelect("CASH")}
        />
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Estimated fare</span>
          <span className="font-semibold text-slate-950">{fareLabel}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">Service fee</span>
          <span className="font-medium text-slate-700">Included</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-lg font-semibold text-slate-950">{fareLabel}</span>
        </div>
      </div>

      {showDetails ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-900">What is included</p>
          <p className="mt-2">Base fare, backend distance pricing, vehicle rules, and active company pricing settings.</p>
        </div>
      ) : null}
    </div>
  );
}
