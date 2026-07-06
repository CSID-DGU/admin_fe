// UserContainerDetail — 접속·상태 이해 (친절한 문구 + 복사 가능한 접속 정보)
import { Container, Header, KeyValuePairs, StatusIndicator, Button, Alert, ExpandableSection, Badge } from "../../../design-system";

function UserContainerDetail({ onBack, onExtend, server }) {
  if (!server) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
        <Button variant="link" iconName="arrow-left" onClick={onBack}>대시보드</Button>
        <Header variant="h1">내 컨테이너</Header>
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", padding: "24px 0", textAlign: "center" }}>
            아직 접속할 수 있는 GPU가 없어요. 신청이 승인되면 접속 정보가 표시됩니다.
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <div>
        <Button variant="link" iconName="arrow-left" onClick={onBack}>대시보드</Button>
        <Header variant="h1" actions={<StatusIndicator type={server.statusType}>{server.statusLabel}</StatusIndicator>}>{server.jobTitle}</Header>
        <Badge color="brand">{server.gpuName}</Badge>
      </div>

      <Container header={<Header variant="h2" description="터미널에 아래 명령을 붙여넣어 접속하세요">접속 정보</Header>}>
        <KeyValuePairs columns={1} items={[
          { label: "접속 명령", value: server.sshCommand, copyable: true },
          { label: "비밀번호", value: "최초 발급된 비밀번호를 사용하세요" },
        ]} />
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <ExpandableSection headerText="Jupyter로 접속하기">
            <KeyValuePairs columns={1} items={[
              { label: "주소", value: server.jupyterUrl, copyable: true },
              { label: "토큰", value: "대시보드 알림에서 확인할 수 있어요" },
            ]} />
          </ExpandableSection>
        </div>
      </Container>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <Container header={<Header variant="h2">사용량</Header>}>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
            사용량 지표는 추후 구현 예정입니다
          </div>
        </Container>
        <Container header={<Header variant="h2">사용 기간</Header>}>
          <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{`${server.daysLeft}일 남음`}</div>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", marginTop: 4 }}>{server.expiresText}</div>
          <div style={{ marginTop: 16 }}><Button variant="primary" iconName="calendar" onClick={onExtend}>연장하기</Button></div>
        </Container>
      </div>

      <Alert type="info" header="문제가 있나요?">
        접속이 안 되면 컨테이너를 재시작해 보세요. 그래도 안 되면 대시보드의 도움말에서 관리자에게 문의할 수 있어요.
      </Alert>
    </div>
  );
}
export default UserContainerDetail;
