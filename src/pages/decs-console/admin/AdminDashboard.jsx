// AdminDashboard — 전체 상태 즉시 파악 (GPU 사용률 · 컨테이너 상태 · 만료 예정 · 최근 활동)
import { Container, Header, StatusIndicator, Badge, Button, Table, Alert } from "../../../design-system";
import { DECS_ADMIN } from "./data";

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-l)" }}>
      <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: accent || "var(--decs-text-heading)", marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub ? <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function AdminDashboard({ onOpenContainers, containers = DECS_ADMIN.containers, users = DECS_ADMIN.users }) {
  const running = containers.filter((c) => c.status === "success").length;
  const errored = containers.filter((c) => c.status === "error").length;
  const expiring = containers.filter((c) => c.status !== "stopped" && c.expires !== "—" && c.expires <= "2026-07-11").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Header variant="h1" description="클러스터 자원과 컨테이너 상태를 한눈에 확인합니다">대시보드</Header>

      {errored > 0 ? (
        <Alert type="error" header={`컨테이너 ${errored}건에 오류가 있습니다`} action={<Button variant="normal" onClick={onOpenContainers}>확인</Button>}>
          desired-state와 observed-state 불일치가 감지되었습니다. 상세에서 이벤트 로그를 확인하세요.
        </Alert>
      ) : null}

      <div style={{ display: "flex", gap: "var(--decs-space-m)" }}>
        <StatCard label="실행 중 컨테이너" value={running} sub={`전체 ${containers.length}건`} />
        <StatCard label="오류" value={errored} sub="즉시 조치 필요" accent="var(--decs-status-error)" />
        <StatCard label="만료 임박 (3일)" value={expiring} sub="연장 안내 대상" accent="var(--decs-status-warning)" />
        <StatCard label="등록 사용자" value={users.length} sub="활성 세션 5" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "var(--decs-space-l)", alignItems: "start" }}>
        <Container header={<Header variant="h2">GPU 클러스터 사용률</Header>}>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
            실시간 사용률은 추후 구현 예정입니다
          </div>
        </Container>

        <Container disablePadding header={<Header variant="h2" counter={`(${containers.length})`} actions={<Button variant="link" onClick={onOpenContainers}>전체 보기</Button>}>최근 컨테이너</Header>}>
          <Table density="compact" trackBy="id" items={containers.slice(0, 5)} columns={[
            { id: "name", header: "이름", cell: (c) => <span style={{ fontWeight: 600 }}>{c.name}</span> },
            { id: "user", header: "사용자", cell: (c) => c.user },
            { id: "gpu", header: "GPU", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
            { id: "status", header: "상태", cell: (c) => <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
          ]} />
        </Container>
      </div>
    </div>
  );
}
export default AdminDashboard;
