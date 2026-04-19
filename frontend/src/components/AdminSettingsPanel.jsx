import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getAdminConfigs, updateAdminConfigs } from "../features/admin/adminApi";
import { Button, Card, Input, LoadingSpinner } from "./UIComponents";

const CONFIG_METADATA = {
  BASE_FARE: { label: "Base Fare", unit: "KES", description: "Starting fare used in every ride quote." },
  FUEL_COST_PER_LITER: { label: "Fuel Cost / Liter", unit: "KES/L", description: "Current fuel price used in the pricing formula." },
  DRIVER_MARKUP: { label: "Driver Markup", unit: "ratio", description: "Driver markup multiplier applied before commission." },
  COMPANY_COMMISSION_RATE: { label: "Company Commission", unit: "ratio", description: "Platform commission rate deducted from the final fare." },
  MOTORCYCLE_FUEL_ECONOMY: { label: "Motorcycle Fuel Economy", unit: "km/L", description: "Reference fuel economy used for motorcycle quotes." },
  SUPPORT_PHONE_NUMBER: { label: "Support Hotline", unit: "phone", description: "Phone number used in customer and driver click-to-call actions." }
};

export default function AdminSettingsPanel() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});

  const configsQuery = useQuery({
    queryKey: ["admin-configs"],
    queryFn: getAdminConfigs
  });

  const configs = useMemo(() => {
    return (configsQuery.data || []).map((config) => ({
      ...config,
      meta: CONFIG_METADATA[config.configKey] || {
        label: config.configKey,
        unit: "",
        description: config.description || "Custom configuration value."
      }
    }));
  }, [configsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateAdminConfigs,
    onSuccess: () => {
      setDrafts({});
      queryClient.invalidateQueries({ queryKey: ["admin-configs"] });
      queryClient.invalidateQueries({ queryKey: ["support-contact"] });
    }
  });

  if (configsQuery.isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pricing & Support Settings</h2>
          <p className="text-sm text-slate-500">These values are persisted in PostgreSQL, cached in Redis, and reused across ride calculations and support UI.</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(drafts)}
          loading={saveMutation.isPending}
          disabled={!Object.keys(drafts).length}
        >
          Save Changes
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {configs.map((config) => (
          <div key={config.id || config.configKey} className="rounded-2xl border border-slate-200 p-5">
            <div className="mb-3">
              <p className="font-semibold text-slate-900">{config.meta.label}</p>
              <p className="text-sm text-slate-500">{config.meta.description}</p>
            </div>
            <Input
              label={`Value${config.meta.unit ? ` (${config.meta.unit})` : ""}`}
              value={drafts[config.configKey] ?? config.configValue}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [config.configKey]: event.target.value
                }))
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Formula: <code>P = (B + (D / FE × Cf × (1 + M))) / (1 - R)</code>
      </div>
    </Card>
  );
}
