import { useMemo } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { Avatar } from "./UIComponents";

function shouldRenderItem(item, permissions) {
  if (item.visible === false) {
    return false;
  }

  if (!permissions) {
    return true;
  }

  if (!item.permissions?.length) {
    return true;
  }

  return item.permissions.some((permission) => permissions.includes(permission));
}

function SidebarBrand({ compact }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f766e,#0b3b42)] shadow-[0_16px_40px_-22px_rgba(15,118,110,0.9)]">
        <span className="text-lg font-black tracking-tight text-white">KR</span>
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-400 ring-4 ring-white/10" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">KituiRides</p>
          <h2 className="truncate text-lg font-semibold text-slate-950">Admin Console</h2>
        </div>
      )}
    </div>
  );
}

function SidebarTooltip({ label, compact }) {
  if (!compact) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 hidden -translate-y-1/2 rounded-xl border border-slate-200 bg-slate-950 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-2xl transition-all duration-200 group-hover/item:block group-hover/item:opacity-100">
      {label}
    </div>
  );
}

function SidebarItem({ item, isActive, compact, badge, onSelect }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group/item relative flex w-full items-center rounded-2xl px-3 py-3 text-left transition-all duration-200 ${
        compact ? "justify-center" : "gap-3"
      } ${
        isActive
          ? "bg-[linear-gradient(135deg,rgba(15,118,110,0.18),rgba(249,115,22,0.12))] text-slate-950 shadow-[0_18px_40px_-26px_rgba(15,118,110,0.9)] ring-1 ring-teal-200"
          : item.kind === "action"
            ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            : "text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-[0_18px_35px_-28px_rgba(15,23,42,0.55)]"
      }`}
      aria-current={isActive ? "page" : undefined}
      title={compact ? item.label : undefined}
    >
      {isActive && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-teal-500 to-orange-400" aria-hidden="true" />
      )}
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
        isActive
          ? "bg-white text-teal-700 shadow-sm"
          : item.kind === "action"
            ? "bg-rose-100/80 text-rose-700"
            : "bg-slate-100 text-slate-500 group-hover/item:bg-teal-50 group-hover/item:text-teal-700"
      }`}>
        <Icon className="text-lg" />
      </span>

      {!compact && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.label}</p>
            {item.helperText && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{item.helperText}</p>
            )}
          </div>
          {badge ? (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isActive
                ? "bg-white text-teal-700"
                : item.kind === "action"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-100 text-slate-500"
            }`}>
              {badge}
            </span>
          ) : null}
        </>
      )}

      <SidebarTooltip label={item.label} compact={compact} />
    </button>
  );
}

function SidebarSection({ group, activeItem, compact, badgesById, onSelect }) {
  return (
    <section>
      {!compact && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {group.label}
        </p>
      )}
      <div className="space-y-1.5">
        {group.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={activeItem === item.id}
            compact={compact}
            badge={badgesById?.[item.id]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function SidebarProfile({ compact, profile }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.96))] p-3 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.45)] ${compact ? "flex justify-center" : ""}`}>
      <div className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}>
        <Avatar name={profile?.name || "Admin User"} size="md" className="shadow-sm" />
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{profile?.name || "Admin User"}</p>
            <p className="truncate text-xs text-slate-500">{profile?.email || "admin@kituirides.com"}</p>
            <p className="mt-1 inline-flex rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
              {profile?.role || "ADMIN"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarShell({
  groups,
  activeItem,
  compact,
  badgesById,
  onSelect,
  onToggleCompact,
  profile,
  onCloseMobile,
  mobile = false
}) {
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,252,0.98))] p-4 shadow-[0_28px_65px_-45px_rgba(15,23,42,0.75)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <SidebarBrand compact={compact && !mobile} />
        <div className="flex items-center gap-2">
          {mobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              aria-label="Close admin navigation"
            >
              <FiX className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCompact}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 lg:inline-flex"
              aria-label={compact ? "Expand admin sidebar" : "Collapse admin sidebar"}
            >
              {compact ? <FiChevronRight className="text-lg" /> : <FiChevronLeft className="text-lg" />}
            </button>
          )}
        </div>
      </div>

      {!compact || mobile ? (
        <div className="mt-5 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.14),transparent_55%),linear-gradient(135deg,#f8fafc,#eef6f6)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Transport Ops</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Trusted control for riders, drivers, payments, and service recovery.
          </p>
        </div>
      ) : null}

      <div className={`mt-5 flex-1 space-y-5 overflow-y-auto ${compact && !mobile ? "overflow-visible" : ""}`}>
        {groups.map((group) => (
          <SidebarSection
            key={group.id}
            group={group}
            activeItem={activeItem}
            compact={compact && !mobile}
            badgesById={badgesById}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <SidebarProfile compact={compact && !mobile} profile={profile} />
        {!mobile && compact ? (
          <p className="px-1 text-center text-[11px] font-medium text-slate-400">Hover icons for labels</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminSidebar({
  groups,
  activeItem,
  badgesById,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  onSelect,
  profile,
  permissions
}) {
  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => shouldRenderItem(item, permissions))
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, permissions]);

  const desktopWidth = collapsed ? 104 : 312;

  return (
    <>
      <div className="hidden lg:block">
        <div
          className="fixed bottom-5 left-4 top-[5.35rem] z-30 transition-[width] duration-300"
          style={{ width: desktopWidth }}
        >
          <SidebarShell
            groups={filteredGroups}
            activeItem={activeItem}
            compact={collapsed}
            badgesById={badgesById}
            onSelect={onSelect}
            onToggleCompact={onToggleCollapsed}
            profile={profile}
          />
        </div>
      </div>

      <div className={`lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`fixed inset-0 z-50 bg-slate-950/50 transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <div
          className={`fixed inset-y-0 left-0 z-[60] w-[20rem] max-w-[86vw] transform p-3 transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarShell
            groups={filteredGroups}
            activeItem={activeItem}
            compact={false}
            badgesById={badgesById}
            onSelect={(item) => {
              onSelect(item);
              onCloseMobile?.();
            }}
            onToggleCompact={onToggleCollapsed}
            profile={profile}
            onCloseMobile={onCloseMobile}
            mobile
          />
        </div>
      </div>
    </>
  );
}
