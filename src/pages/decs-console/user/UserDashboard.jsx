// UserDashboard — "지금 상태 + 다음 행동" (Toss식 행동 중심, Cards 우선)
import { Container, Header, Button, StatusIndicator, Badge, Alert, KeyValuePairs } from "../../../design-system";

function BigStatus({ onConnect, onExtend, onDetail, server }) {
  return (
    <div style={{ background: "var(--decs-surface-container)", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-xl)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>현재 사용 중인 GPU</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{server.gpuName}</span>
            <StatusIndicator type={server.statusType}>{server.statusLabel}</StatusIndicator>
          </div>
          <div style={{ marginTop: 8 }}><Badge color="grey">{server.jobBadge}</Badge></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>남은 기간</div>
          <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{`${server.daysLeft}일`}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--decs-space-s)", marginTop: "var(--decs-space-l)" }}>
        <Button variant="primary" iconName="arrow-up-right" onClick={onConnect}>컨테이너 접속하기</Button>
        <Button variant="normal" iconName="calendar" onClick={onExtend}>사용 기간 연장하기</Button>
        <Button variant="link" onClick={onDetail}>상세 보기</Button>
      </div>
    </div>
  );
}

function UserDashboard({ onRequest, onConnect, onExtend, onDetail, userName, server, expiryDays, activities = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)", maxWidth: 900, margin: "0 auto" }}>
      <Header variant="h1" description={server ? "현재 GPU 상태를 확인하고 바로 접속할 수 있어요." : "아직 신청한 GPU가 없어요. 신청하면 이곳에서 바로 확인할 수 있어요."}>안녕하세요, {userName}님</Header>

      {expiryDays != null ? (<Alert type="warning" header={`${expiryDays}일 뒤 사용 기간이 만료됩니다`} action={<Button variant="normal" onClick={onExtend}>연장하기</Button>}>
        만료되면 컨테이너가 정지되고 저장하지 않은 작업이 사라질 수 있어요. 미리 연장해 두세요.
      </Alert>) : null}

      {server ? (
        <BigStatus onConnect={onConnect} onExtend={onExtend} onDetail={onDetail} server={server} />
      ) : (
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", padding: "24px 0", textAlign: "center" }}>
            아직 신청한 GPU가 없어요. 신청하면 이곳에서 바로 확인할 수 있어요.
          </div>
        </Container>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <div style={{ background: "var(--decs-surface-container)", border: "1px dashed var(--decs-brand-300)", borderRadius: "var(--decs-radius-container)", padding: "var(--decs-space-xl)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--decs-fs-body-l)", fontWeight: 700, color: "var(--decs-text-heading)" }}>새 GPU가 필요하신가요?</div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)", margin: "6px 0 16px" }}>인프라 지식 없이 몇 번의 선택으로 신청할 수 있어요.</div>
          <Button variant="primary" iconName="plus" onClick={onRequest}>GPU 신청하기</Button>
        </div>
        <Container header={<Header variant="h2">최근 활동</Header>}>
          <KeyValuePairs columns={1} items={activities} />
        </Container>
      </div>
    </div>
  );
}
export default UserDashboard;
