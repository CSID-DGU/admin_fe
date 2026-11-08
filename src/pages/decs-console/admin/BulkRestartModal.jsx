// 컨테이너 관리에서 고른 컨테이너를 한꺼번에 재시작한다. 요청은 한 번에 모두 보내고 접수 결과만 보여 준다 —
// 실제 재시작은 config-server 작업 처리기가 차례로 한다(한 번에 4개, 승인·회수 작업과 같은 자리를 쓴다).
// 한 컨테이너씩 진행 단계를 보여 주는 상세 화면의 재시작(RestartContainerModal)과 달리 끝날 때까지 기다리지 않는다.
import React from "react";
import { Modal, Button, Alert, Badge, Table } from "../../../design-system";
import { requestService } from "../../../services/requestService";

function rejectReasonOf(error) {
  if (error?.status === 409) return "이미 재시작·이동·회수 중이거나 사용 중인 상태가 아닙니다.";
  return error?.message || "요청하지 못했습니다.";
}

function BulkRestartModal({ visible, containers, onDismiss, onFinished }) {
  const [keepChanges, setKeepChanges] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  // 보낸 뒤의 결과. null이면 아직 보내지 않았다.
  const [results, setResults] = React.useState(null);

  React.useEffect(() => {
    if (visible) {
      setKeepChanges(true);
      setSubmitting(false);
      setResults(null);
    }
  }, [visible]);

  const runningCount = containers.filter((c) => c.status === "success").length;
  const acceptedCount = results?.filter((r) => r.ok).length ?? 0;

  async function submit() {
    setSubmitting(true);
    const settled = await Promise.allSettled(
      containers.map((c) => requestService.restartContainer(c.requestId, keepChanges)),
    );
    setResults(containers.map((c, i) => ({
      container: c,
      ok: settled[i].status === "fulfilled",
      reason: settled[i].status === "rejected" ? rejectReasonOf(settled[i].reason) : null,
    })));
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    if (results) {
      onFinished({ accepted: acceptedCount, rejected: results.length - acceptedCount });
    } else {
      onDismiss();
    }
  }

  const containerLabel = (c) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontWeight: 600 }}>{c.name}{c.user && c.user !== "—" ? ` (${c.user})` : ""}</span>
      <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
        {[`신청 #${c.requestId}`, c.node].filter(Boolean).join(" · ")}
      </span>
    </div>
  );

  return (
    <Modal
      visible={visible}
      onDismiss={close}
      size="large"
      dismissible={!submitting}
      header={results ? "재시작 요청 결과" : `컨테이너 ${containers.length}개 재시작`}
      footer={results ? (
        <Button variant="primary" onClick={close}>닫기</Button>
      ) : (
        <>
          <Button variant="normal" disabled={submitting} onClick={close}>취소</Button>
          <Button variant="primary" loading={submitting} onClick={submit}>{containers.length}개 재시작</Button>
        </>
      )}
    >
      {results ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <Alert type={acceptedCount === results.length ? "success" : acceptedCount === 0 ? "error" : "warning"}>
            {results.length}개 중 {acceptedCount}개가 접수되었습니다.
            {acceptedCount > 0 ? " 서버가 한 번에 4개씩 차례로 재시작합니다. 진행 상황은 각 컨테이너 상세의 작업 기록에서 확인할 수 있습니다." : ""}
          </Alert>
          <Table
            density="compact"
            trackBy="id"
            items={results.map((r) => ({ ...r, id: r.container.id }))}
            columns={[
              { id: "container", header: "컨테이너", cell: (r) => containerLabel(r.container) },
              {
                id: "result",
                header: "결과",
                cell: (r) => (r.ok ? <Badge color="green">접수됨</Badge> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xxxs)", alignItems: "flex-start" }}>
                    <Badge color="red">거절됨</Badge>
                    <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>{r.reason}</span>
                  </div>
                )),
              },
            ]}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <Alert type="warning" header={runningCount > 0 ? `실행 중인 컨테이너 ${runningCount}개가 포함되어 있습니다` : "실행 중인 모든 프로세스가 강제 종료됩니다"}>
            재시작하면 컨테이너를 같은 노드에서 새로 만듭니다. 학습, Jupyter 커널, tmux 세션을 포함해 실행 중인 모든 프로세스가 즉시 강제 종료되며 되돌릴 수 없습니다. 홈 디렉터리의 파일은 그대로 남고, 접속 주소(포트)가 바뀔 수 있습니다.
          </Alert>
          <Alert type="info">
            요청은 한 번에 모두 보내고, 서버가 한 번에 4개씩 차례로 재시작합니다. 그동안 새 신청 승인과 회수 작업이 늦어질 수 있습니다.
          </Alert>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-xs)", cursor: submitting ? "default" : "pointer" }}>
            <input type="checkbox" checked={keepChanges} disabled={submitting} onChange={(e) => setKeepChanges(e.target.checked)} />
            <span>
              <span style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>설치한 내용 유지 (모든 컨테이너에 적용)</span>
              <span style={{ display: "block", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
                홈 디렉터리 밖에 설치한 패키지와 바꾼 설정을 그대로 가져갑니다. 끄면 처음 받은 상태로 초기화합니다. 켜 두면 노드마다 변경분을 이미지로 저장하므로, 같은 노드의 컨테이너가 많거나 설치한 내용이 크면 오래 걸리거나 실패할 수 있습니다.
              </span>
            </span>
          </label>
          <Table
            density="compact"
            trackBy="id"
            items={containers}
            columns={[
              { id: "container", header: "컨테이너", cell: containerLabel },
              { id: "gpu", header: "GPU", cell: (c) => <Badge color="brand" style={{ maxWidth: "none" }}>{c.gpu}</Badge> },
              {
                id: "status",
                header: "상태",
                cell: (c) => <span style={{ color: c.status === "success" ? "var(--decs-status-warning)" : "var(--decs-text-body)", fontWeight: c.status === "success" ? 600 : 400 }}>{c.label}</span>,
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}

export default BulkRestartModal;
