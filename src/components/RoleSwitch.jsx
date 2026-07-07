// 관리자/사용자 콘솔 전환 세그먼트 토글 — 상단바(어두운 배경) 전용, 관리자에게만 노출
import { useNavigate } from "react-router-dom";

const SEGMENTS = [
  { key: "admin", label: "관리자", href: "/decs/admin" },
  { key: "user", label: "사용자", href: "/decs/user" },
];

export default function RoleSwitch({ current }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.15)", borderRadius: "9999px", padding: "2px", marginRight: "var(--decs-space-xs)" }}>
      {SEGMENTS.map((s) => {
        const active = s.key === current;
        return (
          <button
            key={s.key}
            onClick={() => { if (!active) navigate(s.href); }}
            aria-pressed={active}
            style={{
              border: 0,
              cursor: active ? "default" : "pointer",
              padding: "3px 12px",
              borderRadius: "9999px",
              fontFamily: "var(--decs-font-base)",
              fontSize: "var(--decs-fs-body-s)",
              fontWeight: active ? "var(--decs-fw-bold)" : "var(--decs-fw-regular)",
              background: active ? "#fff" : "none",
              color: active ? "var(--decs-grey-900)" : "rgba(255,255,255,0.85)",
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
