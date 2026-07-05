import React from "react";

/**
 * Tabs — underlined tab strip (Cloudscape). Controlled via activeTabId/onChange,
 * or uncontrolled with defaultActiveTabId. tabs: [{ id, label, content }]
 */
export function Tabs({ tabs = [], activeTabId, defaultActiveTabId, onChange, style }) {
  const [internal, setInternal] = React.useState(defaultActiveTabId ?? tabs[0]?.id);
  const active = activeTabId ?? internal;
  const activeTab = tabs.find((t) => t.id === active);

  function select(id) {
    if (activeTabId == null) setInternal(id);
    onChange?.(id);
  }

  return (
    <div style={{ fontFamily: "var(--decs-font-base)", ...style }}>
      <div role="tablist" style={{ display: "flex", gap: "var(--decs-space-l)", borderBottom: "1px solid var(--decs-border-divider)" }}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              disabled={t.disabled}
              onClick={() => !t.disabled && select(t.id)}
              style={{
                position: "relative", background: "none", border: "none", cursor: t.disabled ? "default" : "pointer",
                padding: "var(--decs-space-s) 0", fontSize: "var(--decs-fs-body-m)",
                fontWeight: isActive ? "var(--decs-fw-bold)" : "var(--decs-fw-regular)",
                color: t.disabled ? "var(--decs-text-disabled)" : isActive ? "var(--decs-text-link)" : "var(--decs-text-secondary)",
                boxShadow: isActive ? "inset 0 -2px 0 0 var(--decs-text-link)" : "none",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" style={{ paddingTop: "var(--decs-space-m)" }}>{activeTab?.content}</div>
    </div>
  );
}
