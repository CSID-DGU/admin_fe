import React, { useEffect, useState } from "react";
import { Alert, Badge, Button, Container, FormField, Header, Input, Select, StatusIndicator, Table } from "../../design-system";
import { getImages } from "../../services/imageService";
import { nodeService } from "../../services/nodeService";
import { testPodService } from "../../services/testPodService";

const unwrap = (res) => res?.data?.data ?? res?.data ?? [];
const MAX_PORTS = 10;

// 쉼표/공백으로 구분한 포트 문자열 → 정수 배열. 잘못된 값이 있으면 null.
function parsePorts(text) {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const ports = tokens.map(Number);
  if (ports.some((p) => !Number.isInteger(p) || p < 1 || p > 65535) || ports.length > MAX_PORTS) return null;
  return [...new Set(ports)];
}

export default function TestPodPage({ containers, onRefetch, onOpenDetail }) {
  const [images, setImages] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [imageId, setImageId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [portText, setPortText] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [img, nd] = await Promise.all([getImages(), nodeService.getAllNodes()]);
        setImages(img.success ? unwrap({ data: img.data }) : []);
        // LAB 서버 노드는 서버가 항상 제외한다 — 목록에도 보이지 않게 FARM 노드만 둔다.
        setNodes(unwrap(nd).filter((n) => /^farm/i.test(n.nodeId)));
      } catch {
        setAlert({ type: "error", message: "이미지·노드 목록을 불러오지 못했습니다." });
      }
    })();
  }, []);

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    const ports = parsePorts(portText);
    if (imageId == null) return setAlert({ type: "error", message: "이미지를 선택하세요." });
    if (selected.length === 0) return setAlert({ type: "error", message: "노드를 하나 이상 선택하세요." });
    if (ports === null) return setAlert({ type: "error", message: `포트는 1~65535 정수를 ${MAX_PORTS}개까지 쉼표로 구분해 입력하세요.` });
    setBusy(true);
    try {
      const res = await testPodService.create({ imageId, nodeIds: selected, internalPorts: ports });
      const ids = unwrap(res);
      setAlert({ type: "success", message: `테스트 Pod ${Array.isArray(ids) ? ids.length : selected.length}개 생성을 시작했습니다. 아래 목록에서 진행을 확인하세요.` });
      onRefetch();
    } catch (e) {
      setAlert({ type: "error", message: e?.response?.data?.message ?? e?.message ?? "테스트 Pod 생성에 실패했습니다." });
    } finally {
      setBusy(false);
    }
  };

  const tests = containers.filter((c) => c.test);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Header variant="h1" description="신청·승인 없이 노드마다 Pod 하나를 만듭니다. 알림은 noti 채널로만 갑니다.">테스트 Pod</Header>
      {alert && <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>{alert.message}</Alert>}

      <Container header={<Header variant="h2">생성</Header>}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)", maxWidth: 560 }}>
          <FormField label="이미지">
            <Select
              selectedValue={imageId}
              onChange={setImageId}
              options={images.map((i) => ({ value: i.imageId, label: `${i.imageName}:${i.imageVersion}`, description: i.cudaVersion ? `CUDA ${i.cudaVersion}` : undefined }))}
            />
          </FormField>
          <FormField label="노드" description="선택한 노드마다 Pod 하나가 만들어집니다.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-s)" }}>
              {nodes.map((n) => (
                <label key={n.nodeId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={selected.includes(n.nodeId)} onChange={() => toggle(n.nodeId)} />
                  {n.nodeId} <span style={{ color: "var(--decs-text-secondary)" }}>{n.resourceGroupName}</span>
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="추가 내부 포트" description="쉼표로 구분, 최대 10개 (예: 3000, 6006)">
            <Input value={portText} onChange={setPortText} placeholder="3000, 6006" />
          </FormField>
          <div><Button variant="primary" onClick={submit} loading={busy} disabled={busy}>생성</Button></div>
        </div>
      </Container>

      <Container disablePadding header={<Header variant="h2" counter={`(${tests.length})`} actions={<Button onClick={onRefetch}>새로고침</Button>}>생성된 테스트 Pod</Header>}>
        <Table
          density="compact" trackBy="id" items={tests} empty="테스트 Pod가 없습니다."
          columns={[
            { id: "req", header: "신청", cell: (c) => <a href="#" onClick={(e) => { e.preventDefault(); onOpenDetail(c); }} style={{ color: "var(--decs-text-link)" }}>#{c.requestId}</a> },
            { id: "node", header: "노드", cell: (c) => c.node },
            { id: "gpu", header: "GPU", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
            { id: "image", header: "이미지", cell: (c) => c.image },
            { id: "status", header: "상태", cell: (c) => <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
            { id: "expires", header: "만료", cell: (c) => c.expires },
          ]}
        />
      </Container>
    </div>
  );
}
