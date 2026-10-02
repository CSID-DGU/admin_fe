// 컨테이너 재시작 확인 모달. 관리자 콘솔과 사용자 포털이 함께 쓴다 — 어떤 API로 시작하고 결과를 읽는지만
// start·fetchLatest로 받는다. 재시작은 현재 서버에서 컨테이너를 새로 만드는 작업이라 실행 중이던 프로세스는 모두 강제 종료된다.
import { useEffect, useState } from "react";
import { Modal, Button, Alert } from "../design-system";
import { waitForMigrationResult, describeRestartResult, restartStages } from "../utils/migrationResult";

const STAGE_MARK = { done: "✓", active: "●", waiting: "○" };
const STAGE_COLOR = {
  done: "var(--decs-status-success)",
  active: "var(--decs-text-heading)",
  waiting: "var(--decs-text-inactive)",
};

function RestartContainerModal({ visible, title, start, fetchLatest, onDismiss, onDone }) {
  const [keepChanges, setKeepChanges] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);

  // 모달이 새로 열릴 때마다 기본값으로 되돌린다
  useEffect(() => {
    if (visible) {
      setKeepChanges(true);
      setError(null);
    }
  }, [visible]);

  const dismiss = () => {
    if (!running) onDismiss();
  };

  const submit = async () => {
    setRunning(true);
    setError(null);
    setCompletedSteps([]);
    try {
      await start(keepChanges);
      onDone(describeRestartResult(await waitForMigrationResult(fetchLatest, {
        onProgress: (latest) => setCompletedSteps(latest.completedSteps ?? []),
      })));
    } catch (e) {
      if (e.status === 409) {
        setError("지금은 재시작할 수 없습니다. 이미 재시작·이동 중이거나 사용 중인 상태가 아닙니다.");
      } else {
        setError(e.message || "재시작을 요청하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={dismiss}
      header={title ? `컨테이너 재시작 — ${title}` : "컨테이너 재시작"}
      footer={
        <>
          <Button variant="normal" disabled={running} onClick={dismiss}>취소</Button>
          <Button variant="primary" loading={running} onClick={submit}>재시작</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <Alert type="warning" header="실행 중인 모든 프로세스가 강제 종료됩니다">
          학습, Jupyter 커널, tmux 세션을 포함해 컨테이너에서 실행 중인 모든 프로세스가 즉시 강제 종료되며 되돌릴 수 없습니다.
          저장하지 않은 작업(진행 중인 학습, 노트북의 변수, 메모리에만 있는 데이터)은 모두 사라지니 반드시 먼저 저장하세요.
          홈 폴더의 파일은 그대로 남습니다. 끝나기까지 몇 분 걸릴 수 있고, 접속 주소(포트)가 바뀔 수 있습니다.
        </Alert>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-xs)", cursor: running ? "default" : "pointer" }}>
          <input
            type="checkbox"
            checked={keepChanges}
            onChange={(event) => setKeepChanges(event.target.checked)}
            disabled={running}
          />
          <span>
            <span style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>설치한 내용 유지</span>
            <span style={{ display: "block", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
              홈 폴더 밖에 설치한 패키지와 바꾼 설정을 그대로 가져갑니다. 끄면 처음 받은 상태로 초기화합니다.
            </span>
          </span>
        </label>
        {running ? (
          <div>
            <ol aria-label="재시작 진행 단계" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--decs-space-xxs)" }}>
              {restartStages(completedSteps, keepChanges).map((stage) => (
                <li key={stage.id} aria-current={stage.state === "active" ? "step" : undefined}
                  style={{ display: "flex", gap: "var(--decs-space-xs)", color: STAGE_COLOR[stage.state], fontWeight: stage.state === "active" ? 600 : 400 }}>
                  <span aria-hidden="true">{STAGE_MARK[stage.state]}</span>
                  <span>{stage.label}{stage.state === "active" ? " — 진행 중" : stage.state === "done" ? " — 완료" : ""}</span>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: "var(--decs-space-s)", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
              재시작하는 중입니다. 이 창을 닫지 말고 기다려 주세요.
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default RestartContainerModal;
