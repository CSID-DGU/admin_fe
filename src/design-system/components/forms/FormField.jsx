import React from "react";
import { FieldControlIdContext } from "./fieldControlId.js";

/**
 * FormField — label + description + control + constraint/error wrapper.
 * Wrap every Input/Select so labels, help text and validation are consistent.
 * htmlFor를 주지 않으면 안에 있는 Input/Select에 id를 만들어 라벨과 잇는다.
 */
export function FormField({ label, description, constraintText, errorText, secondaryControl, children, htmlFor, style }) {
  const invalid = !!errorText;
  const generatedId = React.useId();
  const controlId = htmlFor ?? generatedId;
  return (
    <FieldControlIdContext.Provider value={htmlFor ? undefined : generatedId}>
    <div style={{ fontFamily: "var(--decs-font-base)", ...style }}>
      {label ? (
        <label title={typeof label === "string" ? label : undefined} htmlFor={controlId} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--decs-fs-body-m)", fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)", marginBottom: "var(--decs-space-xs)" }}>
          {label}
        </label>
      ) : null}
      {description ? (
        <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", marginBottom: "var(--decs-space-xs)" }}>{description}</div>
      ) : null}
      <div style={{ display: "flex", gap: "var(--decs-space-xs)", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        {secondaryControl ? <div>{secondaryControl}</div> : null}
      </div>
      {invalid ? (
        <div role="alert" style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-status-error)", marginTop: "var(--decs-space-xxs)" }}>{errorText}</div>
      ) : constraintText ? (
        <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", marginTop: "var(--decs-space-xxs)" }}>{constraintText}</div>
      ) : null}
    </div>
    </FieldControlIdContext.Provider>
  );
}
