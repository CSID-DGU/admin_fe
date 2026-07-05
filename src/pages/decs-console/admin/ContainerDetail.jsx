// ContainerDetail — 섹션(Container+Header) · 스펙(KeyValuePairs) · 탭(개요/로그/이벤트)
import { Container, Header, KeyValuePairs, Tabs, StatusIndicator, Badge, Button, ButtonDropdown, BreadcrumbGroup, Alert, ProgressBar } from "../../../design-system";
import { DECS_ADMIN } from "./data";

function ContainerDetail({ item, onBack }) {
  const c = item || DECS_ADMIN.containers[0];
  const hasError = c.status === "error";

  const overview = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Container header={<Header variant="h2">스펙</Header>}>
        <KeyValuePairs columns={3} items={[
          { label: "상태", value: <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
          { label: "GPU", value: c.gpu },
          { label: "노드", value: c.node },
          { label: "이미지", value: "pytorch:2.3-cuda12.1" },
          { label: "CPU / Memory", value: "16 vCPU · 128 GiB" },
          { label: "볼륨 (PVC)", value: "workspace-114 · 200 GiB" },
          { label: "uid / gid", value: "1027 / 1027" },
          { label: "네임스페이스", value: "ns-hjkim" },
          { label: "만료", value: c.expires },
        ]} />
      </Container>
      <Container header={<Header variant="h2">접속 정보</Header>}>
        <KeyValuePairs columns={2} items={[
          { label: "SSH 호스트", value: "gpu.dgu.ac.kr", copyable: true },
          { label: "포트", value: "32107", copyable: true },
          { label: "계정", value: c.user, copyable: true },
          { label: "접속 명령", value: `ssh ${c.user}@gpu.dgu.ac.kr -p 32107`, copyable: true },
        ]} />
      </Container>
    </div>
  );

  const logs = (
    <div style={{ fontFamily: "var(--decs-font-mono)", fontSize: 12.5, lineHeight: 1.7, background: "var(--decs-grey-900)", color: "#d7dde5", borderRadius: "var(--decs-radius-item)", padding: "var(--decs-space-m)", whiteSpace: "pre-wrap" }}>
{`[08:11:02] Pulling image pytorch:2.3-cuda12.1
[08:11:48] Image ready (18.4 GB)
[08:11:49] Mounting PVC workspace-114 -> /workspace
[08:11:51] Container started, pid 1
[08:11:52] CUDA 12.1 · 2× H100 detected`}
    </div>
  );

  const events = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
      {hasError ? (
        <Alert type="error" header="ProvisioningError — desired/observed 불일치">
          WAS DB에 컨테이너 레코드가 있으나 K8s Pod가 존재하지 않습니다 (500 on GET /pod). 재생성하거나 레코드를 정리하세요.
        </Alert>
      ) : null}
      <KeyValuePairs columns={1} items={[
        { label: "08:11:02", value: "Scheduled to node-03" },
        { label: "08:11:49", value: "Volume workspace-114 attached" },
        { label: "08:11:52", value: "Running" },
      ]} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      <BreadcrumbGroup items={[{ text: "컨테이너", href: "#" }, { text: c.name }]} onFollow={(it) => { if (it.href) onBack(); }} />
      <Header variant="h1"
        actions={<div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
          <Button variant="normal" iconName="arrow-path">재시작</Button>
          <ButtonDropdown items={[
            { id: "stop", text: "중지", iconName: "power" },
            { id: "logs", text: "로그 다운로드", iconName: "document-text" },
            { id: "delete", text: "삭제", iconName: "trash", variant: "danger" },
          ]}>작업</ButtonDropdown>
        </div>}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{c.name} <Badge color="brand">{c.gpu}</Badge></span>
      </Header>
      {c.status === "success" ? (
        <div style={{ maxWidth: 360 }}><ProgressBar label="세션 사용량" value={c.cpu} description={`CPU ${c.cpu}% · MEM ${c.mem}%`} /></div>
      ) : null}
      <Tabs tabs={[
        { id: "overview", label: "개요", content: overview },
        { id: "logs", label: "로그", content: logs },
        { id: "events", label: "이벤트", content: events },
      ]} />
    </div>
  );
}
export default ContainerDetail;
