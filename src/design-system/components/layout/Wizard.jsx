import React from "react";
import { Icon } from "../icons/Icon.jsx";
import { Button } from "../forms/Button.jsx";

/**
 * Wizard — multi-step flow with a left step navigator (Cloudscape). The user
 * GPU-request flow (사용 목적 → GPU → 기간 → 개발 환경 → 확인) is the canonical use.
 * Controlled: pass activeStepIndex + onNavigate. steps: [{ title, content, description? }]
 */
export function Wizard({ steps = [], activeStepIndex = 0, onNavigate, onCancel, onSubmit, submitLabel = "제출", isLoadingNextStep = false, style }) {
  const step = steps[activeStepIndex] || {};
  const isLast = activeStepIndex === steps.length - 1;
  const go = (i) => onNavigate?.(Math.max(0, Math.min(steps.length - 1, i)));

  return (
    <div style={{ display: "flex", gap: "var(--decs-space-xxl)", fontFamily: "var(--decs-font-base)", alignItems: "flex-start", ...style }}>
      {/* Step navigator */}
      <nav style={{ flex: "0 1 220px", minWidth: "160px", display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)" }}>
        {steps.map((s, i) => {
          const done = i < activeStepIndex;
          const current = i === activeStepIndex;
          return (
            <button
              key={i}
              onClick={() => i <= activeStepIndex && go(i)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", textAlign: "left",
                background: "none", border: "none", cursor: i <= activeStepIndex ? "pointer" : "default",
                padding: "var(--decs-space-xxs) 0",
              }}
            >
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "24px", height: "24px", borderRadius: "9999px", flexShrink: 0,
                fontSize: "var(--decs-fs-body-s)", fontWeight: "var(--decs-fw-bold)",
                background: current ? "var(--decs-action-primary)" : done ? "var(--decs-status-success)" : "var(--decs-grey-200)",
                color: current || done ? "#fff" : "var(--decs-text-secondary)",
              }}>
                {done ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span title={s.title} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--decs-fs-body-m)", color: current ? "var(--decs-text-heading)" : "var(--decs-text-secondary)", fontWeight: current ? "var(--decs-fw-bold)" : "var(--decs-fw-regular)" }}>
                {s.title}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Step content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>
          단계 {activeStepIndex + 1} / {steps.length}
        </div>
        <h2 style={{ margin: 0, fontSize: "var(--decs-fs-heading-l)", lineHeight: "var(--decs-lh-heading-l)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)" }}>{step.title}</h2>
        {step.description ? <p style={{ margin: "var(--decs-space-xxs) 0 0", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>{step.description}</p> : null}
        <div style={{ marginTop: "var(--decs-space-l)" }}>{step.content}</div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xl)", paddingTop: "var(--decs-space-m)", borderTop: "1px solid var(--decs-border-divider)" }}>
          <Button variant="link" onClick={onCancel}>취소</Button>
          {activeStepIndex > 0 ? <Button variant="normal" onClick={() => go(activeStepIndex - 1)}>이전</Button> : null}
          {isLast
            ? <Button variant="primary" loading={isLoadingNextStep} onClick={onSubmit}>{submitLabel}</Button>
            : <Button variant="primary" loading={isLoadingNextStep} onClick={() => go(activeStepIndex + 1)}>다음</Button>}
        </div>
      </div>
    </div>
  );
}
