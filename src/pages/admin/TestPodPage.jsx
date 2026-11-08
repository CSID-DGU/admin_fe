import React, { useEffect, useState } from "react";
import { Alert, Badge, Button, Container, FormField, Header, Input, Select, StatusIndicator, Table } from "../../design-system";
import { getImages } from "../../services/imageService";
import { nodeService } from "../../services/nodeService";
import { podService } from "../../services/podService";
import { testPodService } from "../../services/testPodService";

const unwrap = (res) => res?.data?.data ?? res?.data ?? [];
const MAX_PORTS = 10;
const POLL_MS = 5000;
const WATCH_MS = 10 * 60 * 1000; // 생성 뒤 이 시간 동안은 끝난 건도 상태 확인을 따라간다
const WAITING = ["PENDING", "PROCESSING", "unknown", "Pending", "ContainerCreating"];

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
  const [watchUntil, setWatchUntil] = useState(0);
  const [progress, setProgress] = useState({});

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

  const tests = containers.filter((c) => c.test);
  const podMissing = tests.filter((c) => c.rawStatus === "pod-missing");
  const waiting = tests.filter((c) => WAITING.includes(c.rawStatus));
  const watching = Date.now() < watchUntil;
  const active = waiting.length > 0 || (watching && podMissing.length > 0);

  // 진행 중인 동안 목록을 5초마다 다시 읽는다. FULFILLED인데 Pod가 아직 상태 캐시(5분 주기)에 없으면 지금 다시 읽게 한다.
  useEffect(() => {
    if (!active) return;
    const tick = async () => {
      if (podMissing.length > 0) await podService.refreshPodStatus().catch(() => {});
      onRefetch();
      const processing = tests.filter((c) => c.rawStatus === "PROCESSING");
      const entries = await Promise.all(processing.map(async (c) => {
        try { return [c.requestId, (await podService.getProvisioningStatus(c.requestId))?.data?.data]; } catch { return [c.requestId, null]; }
      }));
      setProgress((cur) => ({ ...cur, ...Object.fromEntries(entries.filter(([, v]) => v)) }));
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, containers]);

  const progressOf = (c) => {
    if (c.rawStatus === "PENDING") return "대기열에서 순서를 기다리는 중 (한 번에 하나씩 만듭니다)";
    if (c.rawStatus === "PROCESSING") return progress[c.requestId]?.message || "생성 중";
    if (c.rawStatus === "pod-missing" && watching) return "Pod 상태를 읽는 중";
    if (c.rawStatus === "DENIED") return "거절됨 (노드 오류 등으로 재시도 한도 초과)";
    return "";
  };

  // 화면을 열 때 한 번 상태 캐시를 다시 읽게 한다 — 방금 만든 Pod가 5분 주기 갱신 전이라 "Pod 없음"으로 보이는 것을 막는다.
  useEffect(() => { podService.refreshPodStatus().catch(() => {}).finally(onRefetch); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    const ports = parsePorts(portText);
    if (imageId == null) return setAlert({ type: "error", message: "이미지를 선택하시기 바랍니다." });
    if (selected.length === 0) return setAlert({ type: "error", message: "노드를 하나 이상 선택하시기 바랍니다." });
    if (ports === null) return setAlert({ type: "error", message: `포트는 1~65535 정수를 ${MAX_PORTS}개까지 쉼표로 구분해 입력하시기 바랍니다.` });
    setBusy(true);
    try {
      const res = await testPodService.create({ imageId, nodeIds: selected, internalPorts: ports });
      const ids = unwrap(res);
      setAlert({ type: "success", message: `테스트 Pod ${Array.isArray(ids) ? ids.length : selected.length}개 생성을 시작했습니다. 아래 목록에서 진행을 확인하시기 바랍니다.` });
      setWatchUntil(Date.now() + WATCH_MS);
      onRefetch();
    } catch (e) {
      setAlert({ type: "error", message: e?.response?.data?.message ?? e?.message ?? "테스트 Pod 생성에 실패했습니다." });
    } finally {
      setBusy(false);
    }
  };

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

      <Container disablePadding header={<Header variant="h2" counter={`(${tests.length})`} actions={<Button onClick={() => podService.refreshPodStatus().catch(() => {}).finally(onRefetch)}>새로고침</Button>}>생성된 테스트 Pod</Header>}>
        <Table
          density="compact" trackBy="id" items={tests} empty="테스트 Pod가 없습니다."
          columns={[
            { id: "req", header: "신청", cell: (c) => (c.rawStatus === "PENDING" || c.rawStatus === "PROCESSING"
              ? <span>#{c.requestId}</span> // 아직 컨테이너가 없어 상세 화면이 없다
              : <a href="#" onClick={(e) => { e.preventDefault(); onOpenDetail(c); }} style={{ color: "var(--decs-text-link)" }}>#{c.requestId}</a>) },
            { id: "node", header: "노드", cell: (c) => c.node },
            { id: "gpu", header: "GPU", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
            { id: "image", header: "이미지", cell: (c) => c.image },
            { id: "status", header: "상태", cell: (c) => (c.rawStatus === "pod-missing" && watching
              ? <StatusIndicator type="in-progress">확인 중</StatusIndicator>
              : <StatusIndicator type={c.status}>{c.label}</StatusIndicator>) },
            { id: "progress", header: "진행", cell: (c) => <span style={{ color: "var(--decs-text-secondary)" }}>{progressOf(c) || "—"}</span> },
            { id: "expires", header: "만료", cell: (c) => c.expires },
          ]}
        />
      </Container>
    </div>
  );
}
