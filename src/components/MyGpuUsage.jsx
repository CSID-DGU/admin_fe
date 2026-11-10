// 내 서버의 GPU별 사용률·메모리와 내 프로세스. 다른 사용자는 서버가 집계한 사람 수·메모리 합계만 받는다.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Container, Header, ProgressBar } from "../design-system";
import { requestService } from "../services/requestService";

const REFRESH_MS = 30_000;

// 서버가 값을 빼먹거나 null을 주면 NaN이 화면에 찍히므로 유한한 수가 아니면 0으로 본다.
const num = (v) => (Number.isFinite(v) ? v : 0);
const formatMiB = (value) => {
  const mib = num(value);
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${Math.round(mib)} MiB`;
};

function formatElapsed(t, seconds) {
  const s = Math.max(0, Math.floor(num(seconds)));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return t("container.elapsedDH", { d, h });
  if (h > 0) return t("container.elapsedHM", { h, m });
  return t("container.elapsedM", { m });
}

const toneOf = (pct) => (pct >= 90 ? "error" : pct >= 70 ? "warning" : "success");

// running=false(컨테이너가 실행 중이 아님)이거나 보여 줄 GPU가 없으면 카드 자체를 그리지 않는다.
function MyGpuUsage({ requestId, running = true }) {
  const { t } = useTranslation();
  const [gpus, setGpus] = useState(undefined);
  // false면 프로세스·다른 사용자 정보를 못 읽은 것이라 "없음"이 아니라 "알 수 없음"으로 보인다.
  const [processesAvailable, setProcessesAvailable] = useState(true);
  // 마지막 갱신이 실패했는지. 값이 이미 있으면 오래된 값을 보이면서 "갱신 실패"를 알린다.
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async (isCancelled) => {
    // 이전 요청이 끝나지 않았으면 겹쳐 보내지 않는다 — 응답 순서가 뒤집혀 옛 값이 덮어쓰는 일도 막힌다.
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await requestService.getMyGpuUsage(requestId);
      if (isCancelled()) return;
      const data = res?.data?.data;
      setGpus(Array.isArray(data?.gpus) ? data.gpus : []);
      setProcessesAvailable(data?.processesAvailable !== false);
      setFailed(false);
    } catch {
      if (!isCancelled()) setFailed(true);
    } finally {
      inFlight.current = false;
    }
  }, [requestId]);

  useEffect(() => {
    if (!running) return undefined;
    let cancelled = false;
    const isCancelled = () => cancelled;
    const tick = () => {
      if (!document.hidden) load(isCancelled);
    };
    tick();
    const timer = setInterval(tick, REFRESH_MS);
    // 숨겨진 탭에서는 건너뛰었으니 다시 보이는 순간 바로 갱신한다.
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      inFlight.current = false;
    };
  }, [running, load]);

  if (!running) return null;
  // 첫 로드 전, 또는 보여 줄 GPU가 없으면(GPU 없는 서버 등) 카드를 숨긴다. 오류는 숨기지 않는다.
  if (!failed && (gpus === undefined || gpus.length === 0)) return null;

  const small = { fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" };
  const header = <Header variant="h2" description={t("container.usageDesc")}>{t("container.usage")}</Header>;
  if (gpus === undefined) {
    return <Container header={header}><Alert type="error">{t("container.usageError")}</Alert></Container>;
  }
  return (
    <Container header={header}>
      {failed ? <Alert type="warning">{t("container.usageStale")}</Alert> : null}
      {!processesAvailable ? <div style={{ ...small, marginBottom: "var(--decs-space-m)" }}>{t("container.gpuProcessesUnavailable")}</div> : null}
      {/* GPU마다 한 줄을 차지하지 않고 타일로 모아 여러 GPU가 한 화면에 들어오게 한다 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 136px), 1fr))", gap: "var(--decs-space-s)" }}>
        {gpus.map((gpu) => {
          const total = num(gpu.memoryTotalMiB);
          const memPct = total > 0 ? Math.round((num(gpu.memoryUsedMiB) / total) * 100) : 0;
          const util = Math.round(num(gpu.utilizationPercent));
          const mine = Array.isArray(gpu.myProcesses) ? gpu.myProcesses : [];
          const others = !processesAvailable ? null : num(gpu.otherUserCount) > 0
            ? t("container.gpuOthers", { count: num(gpu.otherUserCount), memory: formatMiB(gpu.otherMemoryMiB) })
            : num(gpu.otherMemoryMiB) > 0 ? t("container.gpuOthersMemoryOnly", { memory: formatMiB(gpu.otherMemoryMiB) }) : null;
          return (
            <div key={`${gpu.index}-${gpu.modelName}`} style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)", minWidth: 0, padding: "var(--decs-space-s)", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-item)" }}>
              <div style={{ fontWeight: 600, color: "var(--decs-text-heading)", overflowWrap: "anywhere" }}>
                {t("container.gpuTitle", { index: gpu.index })} <span style={{ ...small, fontWeight: 400 }}>{gpu.modelName}</span>
              </div>
              <ProgressBar value={util} tone={toneOf(util)} label={t("container.gpuUtil")} />
              <ProgressBar
                value={memPct}
                tone={toneOf(memPct)}
                label={t("container.gpuMemory", { used: formatMiB(gpu.memoryUsedMiB), total: formatMiB(total) })}
              />
              {others ? <div style={small}>{others}</div> : null}
              {!processesAvailable ? null : mine.length === 0 ? (
                <div style={small}>{t("container.gpuNoMine")}</div>
              ) : (
                <details>
                  <summary style={{ ...small, cursor: "pointer" }}>{t("container.gpuMine", { count: mine.length })}</summary>
                  <ul style={{ margin: "var(--decs-space-xxs) 0 0", paddingLeft: "var(--decs-space-l)", fontSize: "var(--decs-fs-body-s)" }}>
                    {mine.map((proc, i) => (
                      <li key={`${proc.name}-${proc.elapsedSeconds}-${i}`} style={{ overflowWrap: "anywhere" }}>
                        {t("container.gpuProc", { name: proc.name ?? "", elapsed: formatElapsed(t, proc.elapsedSeconds), memory: formatMiB(proc.memoryMiB) })}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </Container>
  );
}

export default MyGpuUsage;
