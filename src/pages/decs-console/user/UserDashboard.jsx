// UserDashboard — "지금 상태 + 다음 행동" (Toss식 행동 중심, Cards 우선)
import { Container, Header, Button, StatusIndicator, Badge, Alert, KeyValuePairs } from "../../../design-system";

function BigStatus({ onConnect, onExtend, onDetail }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-xl)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>현재 사용 중인 GPU</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "var(--decs-text-heading)" }}>H100 × 2</span>
            <StatusIndicator type="success">사용 가능</StatusIndicator>
          </div>
          <div style={{ marginTop: 8 }}><Badge color="grey">내 학습 작업 · gpu-job-114</Badge></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>남은 기간</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--decs-text-heading)" }}>12일</div>
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

function UserDashboard({ onRequest, onConnect, onExtend, onDetail }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)", maxWidth: 900, margin: "0 auto" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "var(--decs-fs-display-l)", lineHeight: 1.1, fontWeight: 700, color: "var(--decs-text-heading)" }}>안녕하세요, 현진님</h1>
        <p style={{ margin: "8px 0 0", color: "var(--decs-text-secondary)", fontSize: 16 }}>오늘도 좋은 연구 되세요. 지금 GPU는 문제없이 실행 중이에요.</p>
      </div>

      <Alert type="warning" header="3일 뒤 사용 기간이 만료됩니다" action={<Button variant="normal" onClick={onExtend}>연장하기</Button>}>
        만료되면 컨테이너가 정지되고 저장하지 않은 작업이 사라질 수 있어요. 미리 연장해 두세요.
      </Alert>

      <BigStatus onConnect={onConnect} onExtend={onExtend} onDetail={onDetail} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <div style={{ background: "#fff", border: "1px dashed var(--decs-brand-300)", borderRadius: "var(--decs-radius-container)", padding: "var(--decs-space-xl)", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--decs-text-heading)" }}>새 GPU가 필요하신가요?</div>
          <div style={{ fontSize: 14, color: "var(--decs-text-secondary)", margin: "6px 0 16px" }}>인프라 지식 없이 몇 번의 선택으로 신청할 수 있어요.</div>
          <Button variant="primary" iconName="plus" onClick={onRequest}>GPU 신청하기</Button>
        </div>
        <Container header={<Header variant="h2">최근 활동</Header>}>
          <KeyValuePairs columns={1} items={[
            { label: "7월 5일", value: "gpu-job-114 접속" },
            { label: "7월 1일", value: "H100 × 2 신청 승인됨" },
            { label: "6월 28일", value: "train-bert 작업 종료" },
          ]} />
        </Container>
      </div>
    </div>
  );
}
export default UserDashboard;
