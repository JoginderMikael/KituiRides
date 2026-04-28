/**
 * @fileoverview UI component module for admin sidebar.
 */
import { useMemo } from "react";
import { FiChevronLeft, FiChevronRight, FiMapPin, FiTruck, FiX } from "react-icons/fi";

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
      <div className="relative flex h-14 w-11 items-start justify-center rounded-t-full rounded-bl-full bg-emerald-600 pt-3 text-white shadow-[0_18px_35px_-20px_rgba(22,163,74,0.9)]">
        <FiTruck className="text-xl" aria-hidden="true" />
        <FiMapPin className="absolute -bottom-1 -right-1 text-emerald-700" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-3xl font-bold leading-none text-slate-950">
            Kitui<span className="font-medium text-emerald-600">Rides</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">Admin Panel</p>
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
      className={`group/item relative flex min-h-[3.5rem] w-full items-center rounded-2xl px-3 text-left transition-all duration-200 ${
        compact ? "justify-center" : "gap-3"
      } ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : item.kind === "action"
            ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
      }`}
      aria-current={isActive ? "page" : undefined}
      title={compact ? item.label : undefined}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : item.kind === "action"
            ? "bg-rose-100/80 text-rose-700"
            : "bg-white text-slate-800 group-hover/item:bg-emerald-50 group-hover/item:text-emerald-700"
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
                ? "bg-white text-emerald-700"
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
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {group.label}
        </p>
      )}
      <div className="space-y-1">
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

function SidebarShell({
  groups,
  activeItem,
  compact,
  badgesById,
  onSelect,
  onToggleCompact,
  onCloseMobile,
  mobile = false
}) {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <SidebarBrand compact={compact && !mobile} />
        <div className="flex items-center gap-2">
          {mobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              aria-label="Close admin navigation"
            >
              <FiX className="text-lg" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCompact}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 lg:inline-flex"
              aria-label={compact ? "Expand admin sidebar" : "Collapse admin sidebar"}
            >
              {compact ? <FiChevronRight className="text-lg" /> : <FiChevronLeft className="text-lg" />}
            </button>
          )}
        </div>
      </div>

      <div className={`mt-7 flex-1 space-y-5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact && !mobile ? "overflow-visible pr-0" : ""}`}>
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
      {!mobile && compact ? (
        <p className="mt-4 px-1 text-center text-[11px] font-medium text-slate-400">Hover icons for labels</p>
      ) : null}
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

  const desktopWidth = collapsed ? 104 : 278;

  return (
    <>
      <div className="hidden lg:block">
        <div
          className="fixed bottom-0 left-0 top-0 z-30 transition-[width] duration-300"
          style={{ width: desktopWidth }}
        >
          <SidebarShell
            groups={filteredGroups}
            activeItem={activeItem}
            compact={collapsed}
            badgesById={badgesById}
            onSelect={onSelect}
            onToggleCompact={onToggleCollapsed}
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
          className={`fixed inset-y-0 left-0 z-[60] w-[20rem] max-w-[86vw] transform transition-transform duration-300 ${
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
            onCloseMobile={onCloseMobile}
            mobile
          />
        </div>
      </div>
    </>
  );
}
