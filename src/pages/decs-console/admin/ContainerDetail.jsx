// ContainerDetail — 섹션(Container+Header) · 스펙(KeyValuePairs) · 탭(개요/로그/이벤트)
import { useEffect, useState } from "react";
import {
  Container, Header, KeyValuePairs, Tabs, StatusIndicator, BreadcrumbGroup,
  Button, Modal, Alert, FormField, Input,
} from "../../../design-system";
import { requestService } from "../../../services/requestService";
import { nodeService } from "../../../services/nodeService";
import { podService } from "../../../services/podService";

function ContainerDetail({ item, onBack, onRefetch }) {
  const c = item;

  const [alert, setAlert] = useState(null);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [availableNodes, setAvailableNodes] = useState([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [migrateRatioInput, setMigrateRatioInput] = useState("");
  const [migrateForce, setMigrateForce] = useState(false);
  const [migrateFormError, setMigrateFormError] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [logsText, setLogsText] = useState(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);
  const [podEvents, setPodEvents] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  useEffect(() => {
    if (!c?.podName) {
      setLogsLoading(false);
      setEventsLoading(false);
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    setEventsLoading(true);
    podService.getPodLogs(c.podName).then((res) => {
      if (cancelled) return;
      setLogsText(res.data?.data?.logs ?? "");
      setLogsError(null);
    }).catch(() => {
      if (!cancelled) setLogsError("로그를 불러오지 못했습니다.");
    }).finally(() => {
      if (!cancelled) setLogsLoading(false);
    });
    podService.getPodEvents(c.podName).then((res) => {
      if (cancelled) return;
      setPodEvents(res.data?.data ?? []);
      setEventsError(null);
    }).catch(() => {
      if (!cancelled) setEventsError("이벤트를 불러오지 못했습니다.");
    }).finally(() => {
      if (!cancelled) setEventsLoading(false);
    });
    return () => { cancelled = true; };
  }, [c?.podName]);

  // 마이그레이션 진행 중일 때 config-server의 세세한 진행 단계를 폴링해서 보여준다.
  // 승인 요청 진행 상태(RequestManagementPage)와 동일한 패턴 — 조회 실패는
  // 마이그레이션 흐름 자체에 영향을 주지 않으므로 조용히 무시한다.
  // podService.getProvisioningStatus의 인자명은 requestId지만, 마이그레이션 경로는
  // 아직 config-server가 username 기준으로 진행 상황을 저장해서 여기서는 그대로
  // username(c.name)을 넘긴다 — 승인(생성) 경로만 requestId로 바뀌었다.
  useEffect(() => {
    if (!isMigrating || !c?.name) {
      setMigrationStatus(null);
      return;
    }
    let cancelled = false;
    let timeoutId;
    // setInterval 대신 매 응답을 받은 뒤에만 다음 폴링을 예약한다 — 네트워크 지연으로
    // 요청이 겹치면 먼저 보낸(오래된 단계) 응답이 나중에 도착해 최신 단계를 덮어쓸 수 있다.
    const poll = async () => {
      try {
        const res = await podService.getProvisioningStatus(c.name);
        if (!cancelled) setMigrationStatus(res?.data ?? null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) timeoutId = setTimeout(poll, 3000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isMigrating, c?.name]);

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

  const openMigrate = async () => {
    setSelectedNodes(c.node && c.node !== "—" ? [c.node] : []);
    setMigrateRatioInput("");
    setMigrateForce(false);
    setMigrateFormError(null);
    setMigrateOpen(true);
    setNodesLoading(true);
    try {
      const response = await nodeService.getAllNodes();
      setAvailableNodes(response.data?.data ?? response.data ?? []);
    } catch (error) {
      console.error("Failed to load nodes:", error);
      setMigrateFormError("노드 목록을 불러오지 못했습니다.");
    } finally {
      setNodesLoading(false);
    }
  };

  const closeMigrate = () => {
    if (isMigrating) return;
    setMigrateOpen(false);
  };

  const toggleNode = (nodeId) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((n) => n !== nodeId) : [...prev, nodeId]
    );
  };

  const submitMigrate = async () => {
    const nodes = selectedNodes;

    if (nodes.length === 0) {
      setMigrateFormError("후보 노드를 하나 이상 선택하세요.");
      return;
    }

    let minImprovementRatio;
    if (!migrateForce && migrateRatioInput.trim() !== "") {
      const parsed = Number(migrateRatioInput.trim());
      if (Number.isNaN(parsed)) {
        setMigrateFormError("최소 개선 비율은 숫자로 입력하세요.");
        return;
      }
      minImprovementRatio = parsed;
    }

    setMigrateFormError(null);
    setIsMigrating(true);
    try {
      const response = await requestService.migrateRequest(c.requestId, nodes, minImprovementRatio, migrateForce);
      const result = response.data?.data ?? response.data;

      if (result?.status === "migrated") {
        setAlert({
          type: "success",
          message: `Pod를 ${result.from} → ${result.to}(으)로 마이그레이션했습니다.${
            result.old_pod_cleanup === "failed" ? " (기존 Pod 정리는 실패해 수동 확인이 필요합니다.)" : ""
          }`,
        });
      } else {
        setAlert({
          type: "info",
          message: `마이그레이션을 건너뛰었습니다: ${result?.reason ?? "개선 효과가 충분하지 않습니다."}${
            result?.best_candidate ? ` (최적 후보: ${result.best_candidate})` : ""
          }`,
        });
      }
      setMigrateOpen(false);
      onRefetch?.();
    } catch (error) {
      console.error("Failed to migrate pod:", error);
      if (error.status === 409) {
        setMigrateFormError("이미 마이그레이션이 진행 중이거나 FULFILLED 상태가 아닙니다.");
      } else if (error.status === 502) {
        setMigrateFormError("config-server 마이그레이션 API 호출에 실패했습니다.");
      } else if (error.name === "TimeoutError" || error.name === "AbortError") {
        setMigrateFormError("응답 시간이 초과되었습니다. 실제 처리 상태는 목록을 새로고침해 확인해주세요.");
      } else {
        setMigrateFormError(error.message || "마이그레이션 요청에 실패했습니다.");
      }
    } finally {
      setIsMigrating(false);
    }
  };

  const submitDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await requestService.deleteContainer(c.requestId);
      setDeleteOpen(false);
      onRefetch?.();
      setAlert({ type: "success", message: `컨테이너 "${c.name}"을(를) 삭제했습니다.` });
      // 삭제된 컨테이너는 더 이상 존재하지 않아 이 페이지에 계속 머물면 로그/이벤트 탭이
      // 깨진 상태로 남는다 — 성공 메시지를 잠깐 보여준 뒤 목록으로 돌아간다.
      setTimeout(() => onBack(), 1500);
    } catch (error) {
      console.error("Failed to delete container:", error);
      setDeleteError(error.message || "컨테이너 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const overview = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Container header={<Header variant="h2">스펙</Header>}>
        <KeyValuePairs columns={3} items={[
          { label: "상태", value: <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
          ...(c.statusReason ? [{ label: "오류 사유", value: c.statusReason }] : []),
          { label: "리소스 그룹", value: c.gpu },
          { label: "노드", value: c.node },
          { label: "이미지", value: c.image },
          { label: "Pod", value: c.podName || "—" },
          { label: "네임스페이스", value: c.namespace },
          { label: "호스트 IP", value: c.hostIP },
          { label: "생성일", value: c.createdAt },
          { label: "만료", value: c.expires },
          { label: "컨테이너", value: c.podContainers.length ? c.podContainers.map((container) => `${container.name} (${container.image})`).join(", ") : "—" },
          ...(c.sshCommand && c.sshCommand !== "—"
            ? [{ label: "SSH 접속", value: c.sshCommand, copyable: true, copyText: c.sshCommand }]
            : []),
        ]} />
      </Container>
    </div>
  );

  const logs = logsLoading ? (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
      로그를 불러오는 중...
    </div>
  ) : logsError ? (
    <Alert type="error">{logsError}</Alert>
  ) : !logsText ? (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
      표시할 로그 데이터가 없습니다.
    </div>
  ) : (
    <pre style={{
      margin: 0, padding: "var(--decs-space-m)", maxHeight: 480, overflow: "auto",
      background: "var(--decs-surface-sunken)", borderRadius: "var(--decs-radius-container)",
      fontFamily: "var(--decs-font-mono, monospace)", fontSize: "var(--decs-fs-body-s)",
      color: "var(--decs-text-body)", whiteSpace: "pre-wrap", wordBreak: "break-all",
    }}>
      {logsText}
    </pre>
  );

  const events = eventsLoading ? (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
      이벤트를 불러오는 중...
    </div>
  ) : eventsError ? (
    <Alert type="error">{eventsError}</Alert>
  ) : !podEvents || podEvents.length === 0 ? (
    <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
      표시할 이벤트 데이터가 없습니다.
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
      {podEvents.map((ev, idx) => (
        <div
          key={idx}
          style={{
            display: "flex", gap: "var(--decs-space-s)", alignItems: "flex-start",
            padding: "var(--decs-space-s) var(--decs-space-m)", borderRadius: "var(--decs-radius-container)",
            background: "var(--decs-surface-sunken)",
          }}
        >
          <StatusIndicator type={ev.type === "Warning" ? "warning" : "success"}>{ev.reason}</StatusIndicator>
          <div style={{ flex: 1, fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-body)" }}>{ev.message}</div>
          <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)", whiteSpace: "nowrap" }}>
            {ev.count > 1 ? `${ev.count}회 · ` : ""}{ev.lastTimestamp}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      <BreadcrumbGroup items={[{ text: "컨테이너", href: "#" }, { text: c.name }]} onFollow={(it) => { if (it.href) onBack(); }} />

      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Header
        variant="h1"
        actions={
          <div style={{ display: "flex", gap: "var(--decs-space-s)" }}>
            {c.status !== "stopped" && c.requestId != null && (
              <Button variant="normal" onClick={openMigrate}>마이그레이션</Button>
            )}
            <Button
              variant="normal"
              style={{ color: "var(--decs-status-error)", borderColor: "var(--decs-status-error)" }}
              onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
            >
              삭제
            </Button>
          </div>
        }
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{c.name}</span>
      </Header>
      <Tabs tabs={[
        { id: "overview", label: "개요", content: overview },
        { id: "logs", label: "로그", content: logs },
        { id: "events", label: "이벤트", content: events },
      ]} />

      <Modal
        visible={migrateOpen}
        onDismiss={closeMigrate}
        header={`Pod 마이그레이션 — ${c.userName ?? c.name} (${c.name})`}
        footer={
          <>
            <Button variant="normal" disabled={isMigrating} onClick={closeMigrate}>취소</Button>
            <Button variant="primary" loading={isMigrating} onClick={submitMigrate}>마이그레이션 실행</Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <Alert type="info">
            config-server가 후보 노드 중 가장 개선 효과가 큰 노드로 Pod를 옮깁니다. 완료까지 최대 10분이 걸릴 수 있습니다.
            {isMigrating && migrationStatus?.message ? ` (현재 단계: ${migrationStatus.message})` : null}
          </Alert>
          <FormField
            label="후보 노드"
            description="마이그레이션을 시도할 노드를 하나 이상 선택하세요 (현재 노드 포함 가능)."
            errorText={migrateFormError}
          >
            {nodesLoading ? (
              <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>노드 목록 불러오는 중...</div>
            ) : availableNodes.length === 0 ? (
              <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>사용 가능한 노드가 없습니다.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)", maxHeight: 220, overflowY: "auto" }}>
                {availableNodes.map((node) => (
                  <label
                    key={node.nodeId}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--decs-space-xs)",
                      padding: "var(--decs-space-xs) var(--decs-space-s)",
                      border: "1px solid var(--decs-border-container)",
                      borderRadius: "var(--decs-radius-input)",
                      background: node.nodeId === c.node ? "var(--decs-surface-sunken)" : "transparent",
                      cursor: isMigrating ? "default" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNodes.includes(node.nodeId)}
                      onChange={() => toggleNode(node.nodeId)}
                      disabled={isMigrating}
                    />
                    <span style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>{node.nodeId}</span>
                    <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
                      {node.resourceGroupName} · GPU {node.numberGpu}
                      {node.nodeId === c.node ? " · 현재 노드" : ""}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </FormField>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", cursor: isMigrating ? "default" : "pointer" }}>
            <input
              type="checkbox"
              checked={migrateForce}
              onChange={(event) => setMigrateForce(event.target.checked)}
              disabled={isMigrating}
            />
            <span style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>필수로 마이그레이션</span>
            <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
              개선 효과와 무관하게 선택한 노드로 옮깁니다.
            </span>
          </label>
          {!migrateForce && (
            <FormField label="최소 개선 비율 (선택)" description="생략하면 config-server 기본값을 사용합니다.">
              <Input
                value={migrateRatioInput}
                onChange={setMigrateRatioInput}
                placeholder="0.2"
                type="number"
                disabled={isMigrating}
              />
            </FormField>
          )}
        </div>
      </Modal>

      <Modal
        visible={deleteOpen}
        onDismiss={() => !isDeleting && setDeleteOpen(false)}
        header="컨테이너 삭제"
        size="small"
        footer={
          <>
            <Button variant="normal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button
              variant="primary"
              loading={isDeleting}
              style={{ background: "var(--decs-status-error)", color: "#fff" }}
              onClick={submitDelete}
            >
              삭제
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
          {deleteError ? <Alert type="error">{deleteError}</Alert> : null}
          <p>
            컨테이너 &quot;{c.name}&quot;이(가) 영구적으로 삭제됩니다 (외부 계정/Pod 정리 포함).
            이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}
export default ContainerDetail;
