// ContainerDetail — 섹션(Container+Header) · 스펙(KeyValuePairs) · 탭(개요/로그/이벤트)
import { Container, Header, KeyValuePairs, Tabs, StatusIndicator, Badge, BreadcrumbGroup } from "../../../design-system";
import { DECS_ADMIN } from "./data";

function ContainerDetail({ item, onBack }) {
  const c = item || DECS_ADMIN.containers[0];

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
    <div style={{ color: "var(--decs-text-secondary)", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
      로그 스트림은 추후 구현 예정입니다
    </div>
  );

  const events = (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
      이벤트 타임라인은 추후 구현 예정입니다
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      <BreadcrumbGroup items={[{ text: "컨테이너", href: "#" }, { text: c.name }]} onFollow={(it) => { if (it.href) onBack(); }} />
      <Header variant="h1"
        actions={<Badge color="grey">작업 기능 추후 구현</Badge>}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{c.name} <Badge color="brand">{c.gpu}</Badge></span>
      </Header>
      <Tabs tabs={[
        { id: "overview", label: "개요", content: overview },
        { id: "logs", label: "로그", content: logs },
        { id: "events", label: "이벤트", content: events },
      ]} />
    </div>
  );
}
export default ContainerDetail;
