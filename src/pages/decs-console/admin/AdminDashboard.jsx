// AdminDashboard — 전체 상태 즉시 파악 (GPU 사용률 · 컨테이너 상태 · 만료 예정 · 최근 활동)
import { useEffect, useState, useCallback } from "react";
import { Container, Header, StatusIndicator, Badge, Button, Table, Alert, ProgressBar } from "../../../design-system";
import { monitoringService } from "../../../services/grafanaService";

const GPU_METRICS_REFRESH_MS = 30_000;

function utilBadgeColor(util) {
  if (util >= 80) return "red";
  if (util >= 50) return "amber"; // 디자인 시스템 Badge는 "yellow"가 아니라 "amber"를 지원한다
  return "green";
}

function GpuUtilRow({ server }) {
  const util = server.gpuUtil ?? 0;
  return (
    <div style={{
      border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-item)",
      background: "var(--decs-surface-sunken)", padding: "var(--decs-space-s) var(--decs-space-m)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--decs-space-xxs)" }}>
        <span style={{ fontSize: "var(--decs-fs-body-s)", fontWeight: 700, color: "var(--decs-text-heading)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          {server.hostname}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xs)" }}>
          <Badge color={utilBadgeColor(util)}>{util}%</Badge>
          <span style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>GPU {server.gpuCount}개</span>
        </div>
      </div>
      {/* ProgressBar의 status="error"는 진행률이 아니라 "완료(실패)" 취급이라 바 자체가 안
          그려진다 — 사용률 게이지 용도로는 항상 in-progress로 그리고, 색 구분은 위 Badge로 한다. */}
      <ProgressBar value={util} status="in-progress" />
    </div>
  );
}

function GpuUtilPanel({ onUpdated }) {
  const [servers, setServers] = useState(null);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await monitoringService.getMetrics();
      if (res?.status === 200 && res.data?.data) {
        setServers(res.data.data.gpuServers ?? []);
        setError(null);
        onUpdated?.(new Date());
      } else {
        setError("지표를 불러오지 못했습니다.");
      }
    } catch {
      setError("모니터링 서버와 연결할 수 없습니다.");
    }
  }, [onUpdated]);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, GPU_METRICS_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  if (error) {
    return <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>{error}</div>;
  }
  if (servers === null) {
    return <StatusIndicator type="loading">지표를 불러오는 중...</StatusIndicator>;
  }
  if (servers.length === 0) {
    return <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>GPU 데이터를 수신하지 못했습니다.</div>;
  }

  const avgUtil = Math.round(servers.reduce((sum, s) => sum + (s.gpuUtil ?? 0), 0) / servers.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--decs-space-xs)" }}>
        <span style={{ fontSize: "var(--decs-fs-heading-l)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{avgUtil}%</span>
        <span style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>전체 평균 · 서버 {servers.length}대</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-s)" }}>
        {servers.map((s) => <GpuUtilRow key={s.hostname} server={s} />)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, background: "var(--decs-surface-container)", border: "1px solid var(--decs-border-container)",
        borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-l)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)" }}>{label}</div>
      <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: accent || "var(--decs-text-heading)", marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub ? <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function AdminDashboard({ onOpenContainers, onOpenErrorContainers, onOpenDetail, containers = [], users = [] }) {
  const [gpuLastUpdated, setGpuLastUpdated] = useState(null);
  const running = containers.filter((c) => c.status === "success").length;
  const errored = containers.filter((c) => c.status === "error").length;
  const expiring = containers.filter((c) => c.status !== "stopped" && c.expires !== "—" && c.expires <= "2026-07-11").length;
  // 최신순(생성일 내림차순) — createdAt이 없는 항목은 맨 뒤로
  const recentContainers = [...containers].sort((a, b) => {
    const aKey = a.createdAt === "—" ? "" : a.createdAt;
    const bKey = b.createdAt === "—" ? "" : b.createdAt;
    return bKey.localeCompare(aKey);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Header variant="h1" description="클러스터 자원과 컨테이너 상태">대시보드</Header>

      {errored > 0 ? (
        <Alert type="error" header={`컨테이너 ${errored}건에 오류가 있습니다`} action={<Button variant="normal" onClick={onOpenErrorContainers}>확인</Button>}>
          desired-state와 observed-state 불일치가 감지되었습니다. 상세에서 이벤트 로그를 확인하세요.
        </Alert>
      ) : null}

      <div style={{ display: "flex", gap: "var(--decs-space-m)" }}>
        <StatCard label="실행 중 컨테이너" value={running} sub={`전체 ${containers.length}건`} onClick={onOpenContainers} />
        <StatCard label="오류" value={errored} sub="즉시 조치 필요" accent="var(--decs-status-error)" onClick={onOpenErrorContainers} />
        <StatCard label="만료 임박 (3일)" value={expiring} sub="연장 안내 대상" accent="var(--decs-status-warning)" onClick={onOpenContainers} />
        <StatCard label="등록 사용자" value={users.length} sub="활성 세션 5" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "var(--decs-space-l)", alignItems: "start" }}>
        <Container header={
          <Header
            variant="h2"
            description={`30초마다 자동으로 갱신됩니다.${gpuLastUpdated ? ` (${gpuLastUpdated.toLocaleTimeString("ko-KR")} 기준)` : ""}`}
          >
            GPU 클러스터 사용률
          </Header>
        }>
          <GpuUtilPanel onUpdated={setGpuLastUpdated} />
        </Container>

        <Container disablePadding header={<Header variant="h2" counter={`(${containers.length})`} actions={<Button variant="link" onClick={onOpenContainers}>전체 보기</Button>}>최근 컨테이너</Header>}>
          <Table density="compact" trackBy="id" items={recentContainers.slice(0, 5)} columns={[
            {
              id: "name",
              header: "이름",
              cell: (c) => (
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onOpenDetail?.(c); }}
                  style={{ fontWeight: 600, color: "var(--decs-text-link)", textDecoration: "none" }}
                >
                  {c.name}
                </a>
              ),
            },
            { id: "user", header: "사용자", cell: (c) => c.user },
            { id: "gpu", header: "리소스 그룹", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
            { id: "status", header: "상태", cell: (c) => <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
          ]} />
        </Container>
      </div>
    </div>
  );
}
export default AdminDashboard;
