import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../icons/Icon.jsx";
import { Button } from "../forms/Button.jsx";
import { PHONE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery.js";

/**
 * Wizard — multi-step flow with a left step navigator (Cloudscape). The user
 * GPU-request flow (사용 목적 → GPU → 기간 → 개발 환경 → 확인) is the canonical use.
 * 휴대폰 폭에서는 단계 목록을 내용 위에 번호만 가로로 놓는다(현재 단계 제목은 내용 머리에 있다).
 * Controlled: pass activeStepIndex + onNavigate. steps: [{ title, content, description? }]
 */
export function Wizard({ steps = [], activeStepIndex = 0, onNavigate, onCancel, onSubmit, submitLabel, isLoadingNextStep = false, style }) {
  const { t } = useTranslation();
  const stacked = useMediaQuery(PHONE_QUERY);
  const step = steps[activeStepIndex] || {};
  const isLast = activeStepIndex === steps.length - 1;
  const go = (i) => onNavigate?.(Math.max(0, Math.min(steps.length - 1, i)));

  return (
    <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", gap: stacked ? "var(--decs-space-m)" : "var(--decs-space-xxl)", fontFamily: "var(--decs-font-base)", alignItems: stacked ? "stretch" : "flex-start", ...style }}>
      {/* Step navigator */}
      <nav style={stacked ? { display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)" } : { flex: "0 1 220px", minWidth: "160px", display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)" }}>
        {steps.map((s, i) => {
          const done = i < activeStepIndex;
          const current = i === activeStepIndex;
          return (
            <button
              key={i}
              onClick={() => i <= activeStepIndex && go(i)}
              aria-label={stacked ? s.title : undefined}
              aria-current={current ? "step" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", textAlign: "left",
                background: "none", border: "none", cursor: i <= activeStepIndex ? "pointer" : "default",
                padding: "var(--decs-space-xs) 0",
              }}
            >
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "24px", height: "24px", borderRadius: "9999px", flexShrink: 0,
                fontSize: "var(--decs-fs-body-s)", fontWeight: "var(--decs-fw-bold)",
                background: current ? "var(--decs-action-primary)" : done ? "var(--decs-status-success)" : "var(--decs-grey-200)",
                color: current || done ? "var(--decs-text-on-color)" : "var(--decs-text-secondary)",
              }}>
                {done ? <Icon name="check" size={14} /> : i + 1}
              </span>
              {stacked ? null : (
                <span title={s.title} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--decs-fs-body-m)", color: current ? "var(--decs-text-heading)" : "var(--decs-text-secondary)", fontWeight: current ? "var(--decs-fw-bold)" : "var(--decs-fw-regular)" }}>
                  {s.title}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Step content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>
          {t("ds.stepOf", { current: activeStepIndex + 1, total: steps.length })}
        </div>
        <h2 style={{ margin: 0, fontSize: "var(--decs-fs-heading-l)", lineHeight: "var(--decs-lh-heading-l)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)" }}>{step.title}</h2>
        {step.description ? <p style={{ margin: "var(--decs-space-xxs) 0 0", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>{step.description}</p> : null}
        <div style={{ marginTop: "var(--decs-space-xl)" }}>{step.content}</div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xl)", paddingTop: "var(--decs-space-m)", borderTop: "1px solid var(--decs-border-divider)" }}>
          <Button variant="link" onClick={onCancel}>{t("common.cancel")}</Button>
          {activeStepIndex > 0 ? <Button variant="normal" onClick={() => go(activeStepIndex - 1)}>{t("ds.previous")}</Button> : null}
          {isLast
            ? <Button variant="primary" loading={isLoadingNextStep} onClick={onSubmit}>{submitLabel ?? t("ds.submit")}</Button>
            : <Button variant="primary" loading={isLoadingNextStep} onClick={() => go(activeStepIndex + 1)}>{t("ds.next")}</Button>}
        </div>
      </div>
    </div>
  );
}
