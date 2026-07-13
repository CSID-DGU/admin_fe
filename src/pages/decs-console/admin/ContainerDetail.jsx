// ContainerDetail — 섹션(Container+Header) · 스펙(KeyValuePairs) · 탭(개요/로그/이벤트)
import { Container, Header, KeyValuePairs, Tabs, StatusIndicator, BreadcrumbGroup } from "../../../design-system";

function ContainerDetail({ item, onBack }) {
  const c = item;

  if (!c) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
        <BreadcrumbGroup items={[{ text: "컨테이너", href: "#" }, { text: "상세" }]} onFollow={(it) => { if (it.href) onBack(); }} />
        <Header variant="h1">컨테이너 상세</Header>
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "24px 0", textAlign: "center" }}>
            컨테이너 데이터를 찾을 수 없습니다.
          </div>
        </Container>
      </div>
    );
  }

  const overview = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Container header={<Header variant="h2">스펙</Header>}>
        <KeyValuePairs columns={3} items={[
          { label: "상태", value: <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
          { label: "리소스 그룹", value: c.gpu },
          { label: "노드", value: c.node },
          { label: "이미지", value: c.image },
          { label: "Pod", value: c.podName || "—" },
          { label: "네임스페이스", value: c.namespace },
          { label: "호스트 IP", value: c.hostIP },
          { label: "생성일", value: c.createdAt },
          { label: "만료", value: c.expires },
          { label: "컨테이너", value: c.podContainers.length ? c.podContainers.map((container) => `${container.name} (${container.image})`).join(", ") : "—" },
        ]} />
      </Container>
    </div>
  );

  const logs = (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
      표시할 로그 데이터가 없습니다.
    </div>
  );

  const events = (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
      표시할 이벤트 데이터가 없습니다.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      <BreadcrumbGroup items={[{ text: "컨테이너", href: "#" }, { text: c.name }]} onFollow={(it) => { if (it.href) onBack(); }} />
      <Header variant="h1">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{c.name}</span>
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
