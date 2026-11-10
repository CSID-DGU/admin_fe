// 내 서버의 GPU별 사용률·메모리와 내 프로세스. 다른 사용자는 서버가 집계한 사람 수·메모리 합계만 받는다.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ProgressBar } from "../design-system";
import { requestService } from "../services/requestService";

const REFRESH_MS = 30_000;

const formatMiB = (mib) => (mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${Math.round(mib)} MiB`);

function formatElapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const toneOf = (pct) => (pct >= 90 ? "error" : pct >= 70 ? "warning" : "success");

function MyGpuUsage({ requestId }) {
  const { t } = useTranslation();
  const [gpus, setGpus] = useState(undefined);
  const [failed, setFailed] = useState(false);
  // false면 프로세스·다른 사용자 정보를 못 읽은 것이라 "없음"이 아니라 "알 수 없음"으로 보인다.
  const [processesAvailable, setProcessesAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await requestService.getMyGpuUsage(requestId);
        if (cancelled) return;
        setGpus(res?.data?.data?.gpus ?? []);
        setProcessesAvailable(res?.data?.data?.processesAvailable !== false);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [requestId]);

  if (failed && gpus === undefined) return <Alert type="error">{t("container.usageError")}</Alert>;
  if (gpus === undefined) return null;
  if (gpus.length === 0) {
    return <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", textAlign: "center", padding: "var(--decs-space-m) 0" }}>{t("container.usageEmpty")}</div>;
  }

  const small = { fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      {gpus.map((gpu) => {
        const memPct = gpu.memoryTotalMiB > 0 ? Math.round((gpu.memoryUsedMiB / gpu.memoryTotalMiB) * 100) : 0;
        const util = Math.round(gpu.utilizationPercent);
        return (
          <div key={gpu.index} style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)", paddingBottom: "var(--decs-space-m)", borderBottom: "1px solid var(--decs-border-container)" }}>
            <div style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>
              {t("container.gpuTitle", { index: gpu.index })} <span style={small}>{gpu.modelName}</span>
            </div>
            <ProgressBar value={util} tone={toneOf(util)} label={t("container.gpuUtil", { value: util })} />
            <ProgressBar
              value={memPct}
              tone={toneOf(memPct)}
              label={t("container.gpuMemory", { used: formatMiB(gpu.memoryUsedMiB), total: formatMiB(gpu.memoryTotalMiB) })}
            />
            <div style={{ ...small, marginTop: "var(--decs-space-xxs)" }}>{t("container.gpuMine")}</div>
            {!processesAvailable ? (
              <div style={small}>{t("container.gpuProcessesUnavailable")}</div>
            ) : (gpu.myProcesses ?? []).length === 0 ? (
              <div style={small}>{t("container.gpuNoMine")}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "var(--decs-space-l)", fontSize: "var(--decs-fs-body-s)" }}>
                {(gpu.myProcesses ?? []).map((proc, i) => (
                  <li key={i}>{t("container.gpuProc", { name: proc.name, elapsed: formatElapsed(proc.elapsedSeconds), memory: formatMiB(proc.memoryMiB) })}</li>
                ))}
              </ul>
            )}
            {!processesAvailable ? null : gpu.otherUserCount > 0 ? (
              <div style={small}>{t("container.gpuOthers", { count: gpu.otherUserCount, memory: formatMiB(gpu.otherMemoryMiB) })}</div>
            ) : gpu.otherMemoryMiB > 0 ? (
              <div style={small}>{t("container.gpuOthersMemoryOnly", { memory: formatMiB(gpu.otherMemoryMiB) })}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default MyGpuUsage;
