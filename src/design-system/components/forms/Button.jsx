import React from "react";
import { Icon } from "../icons/Icon.jsx";

/**
 * Button — Cloudscape button. In DECS the `primary` variant carries the brand
 * accent (orange), which is the main thing that makes DECS look like DECS.
 * Variants: primary | normal | link | inline-link | icon.
 */
export function Button({
  variant = "normal",
  children,
  iconName,
  iconAlign = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  href,
  ariaLabel,
  type = "button",
  style,
}) {
  const isDisabled = disabled || loading;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--decs-space-xs)",
    fontFamily: "var(--decs-font-base)",
    fontSize: "var(--decs-fs-body-m)",
    lineHeight: "var(--decs-lh-body-m)",
    fontWeight: "var(--decs-fw-bold)",
    borderRadius: "var(--decs-radius-button)",
    cursor: isDisabled ? "default" : "pointer",
    border: "1px solid transparent",
    padding: "var(--decs-space-xs) var(--decs-space-l)",
    minHeight: "var(--decs-control-height)",
    width: fullWidth ? "100%" : undefined,
    transition: "background var(--decs-motion-fast) var(--decs-easing), border-color var(--decs-motion-fast) var(--decs-easing)",
    textDecoration: "var(--hv-deco, none)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  };

  const variants = {
    primary: {
      "--hv-bg": isDisabled ? "var(--decs-grey-200)" : "var(--decs-action-primary)",
      "--hv-hover": "var(--decs-action-primary-hover)",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-action-primary-text)",
    },
    normal: {
      "--hv-bg": isDisabled ? "transparent" : "var(--decs-action-normal-bg)",
      "--hv-hover": "var(--decs-action-normal-hover-bg)",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-action-normal-text)",
      borderColor: isDisabled ? "var(--decs-grey-300)" : "var(--decs-action-normal-border)",
    },
    link: {
      "--hv-hover": "var(--decs-action-normal-hover-bg)",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-text-link)",
    },
    "inline-link": {
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-text-link)",
      padding: 0,
      minHeight: 0,
      borderRadius: 0,
      fontWeight: "var(--decs-fw-regular)",
    },
    icon: {
      "--hv-hover": "var(--decs-surface-hover)",
      color: isDisabled ? "var(--decs-text-disabled)" : "var(--decs-text-secondary)",
      padding: "var(--decs-space-xs)",
      minHeight: 0,
      borderRadius: "var(--decs-radius-item)",
    },
  };

  const merged = { ...base, ...(variants[variant] || variants.normal), ...style };
  const Tag = href && !isDisabled ? "a" : "button";
  const icon = loading ? (
    <span className="decs-spin" style={{ display: "inline-flex" }}><Icon name="arrow-path" size={16} /></span>
  ) : iconName ? <Icon name={iconName} size={16} /> : null;

  return (
    <Tag
      className={variant === "inline-link" ? "decs-hv decs-hv-ul" : "decs-hv"}
      href={href && !isDisabled ? href : undefined}
      onClick={isDisabled ? undefined : onClick}
      disabled={Tag === "button" ? isDisabled : undefined}
      type={Tag === "button" ? type : undefined}
      aria-label={ariaLabel}
      aria-disabled={isDisabled || undefined}
      style={merged}
    >
      {iconAlign === "left" && icon}
      {variant === "icon" && !children ? null : children}
      {iconAlign === "right" && icon}
    </Tag>
  );
}
