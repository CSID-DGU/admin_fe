// 컨테이너 재시작 확인 모달. 관리자 콘솔과 사용자 포털이 함께 쓴다 — 어떤 API로 시작하고 결과를 읽는지만
// start·fetchLatest로 받는다. 재시작은 현재 서버에서 컨테이너를 새로 만드는 작업이라 실행 중이던 프로세스는 모두 강제 종료된다.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button, Alert } from "../design-system";
import { waitForMigrationResult, describeRestartResult, restartStages } from "../utils/migrationResult";

const STAGE_MARK = { done: "✓", active: "●", waiting: "○" };
const STAGE_COLOR = {
  done: "var(--decs-status-success)",
  active: "var(--decs-text-heading)",
  waiting: "var(--decs-text-inactive)",
};

function RestartContainerModal({ visible, title, start, fetchLatest, onDismiss, onDone }) {
  const { t } = useTranslation();
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
        setError(t("restart.errConflict"));
      } else {
        setError(e.message || t("restart.errFailed"));
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={dismiss}
      header={title ? t("restart.titleWith", { title }) : t("restart.title")}
      footer={
        <>
          <Button variant="normal" disabled={running} onClick={dismiss}>{t("common.cancel")}</Button>
          <Button variant="primary" loading={running} onClick={submit}>{t("restart.submit")}</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <Alert type="warning" header={t("restart.warnTitle")}>
          {t("restart.warnBody")}
        </Alert>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-xs)", cursor: running ? "default" : "pointer" }}>
          <input
            type="checkbox"
            checked={keepChanges}
            onChange={(event) => setKeepChanges(event.target.checked)}
            disabled={running}
          />
          <span>
            <span style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>{t("restart.keepChanges")}</span>
            <span style={{ display: "block", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
              {t("restart.keepChangesHelp")}
            </span>
          </span>
        </label>
        {running ? (
          <div>
            <ol aria-label={t("restart.stagesAria")} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--decs-space-xxs)" }}>
              {restartStages(completedSteps, keepChanges).map((stage) => (
                <li key={stage.id} aria-current={stage.state === "active" ? "step" : undefined}
                  style={{ display: "flex", gap: "var(--decs-space-xs)", color: STAGE_COLOR[stage.state], fontWeight: stage.state === "active" ? 600 : 400 }}>
                  <span aria-hidden="true">{STAGE_MARK[stage.state]}</span>
                  <span>{stage.state === "active" ? t("restart.stageActive", { label: stage.label }) : stage.state === "done" ? t("restart.stageDone", { label: stage.label }) : stage.label}</span>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: "var(--decs-space-s)", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
              {t("restart.running")}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default RestartContainerModal;
