// 마이그레이션·재시작은 작업만 등록하고 202로 돌아온다. 끝날 때까지 마지막 작업 결과를 주기적으로 확인한다
// (새 노드에서 이미지를 처음 받거나 컨테이너 변경분을 저장하면 수 분 걸린다).
import i18n from "../i18n";

const FINISHED_PHASES = ["SUCCESS", "FAIL", "UNKNOWN"];
const POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * @param {() => Promise<{ data?: any }>} fetchLatest 마지막 작업 결과 조회
 * @param {{ timeoutMs?: number, intervalMs?: number, onProgress?: (latest: object) => void }} [options] onProgress는 아직 진행 중인 결과를 받을 때마다 불린다
 * @returns {Promise<object | null>} 끝난 작업 결과. 제한 시간 안에 끝나지 않으면 null
 */
export async function waitForMigrationResult(fetchLatest, { timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = POLL_INTERVAL_MS, onProgress } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      const res = await fetchLatest();
      const latest = res.data?.data ?? res.data;
      if (latest && FINISHED_PHASES.includes(latest.phase)) return latest;
      if (latest && onProgress) onProgress(latest);
    } catch {
      // 조회 한 번 실패는 다음 바퀴에 다시 본다
    }
  }
  return null;
}

// 재시작이 거치는 단계. doneWhen은 그 단계가 끝났음을 알리는 작업 단계 이름(백엔드 completedSteps)이다.
// 설치한 내용을 유지하지 않으면 저장 단계가 없다.
const RESTART_STAGES = [
  { id: "prepare", doneWhen: "FETCH_USER_CONFIG" },
  { id: "save", doneWhen: "COMMIT_IMAGE", onlyWhenKeepingChanges: true },
  { id: "create", doneWhen: "CREATE_POD_K8S" },
  { id: "ready", doneWhen: "WAIT_READY" },
  { id: "connect", doneWhen: "CREATE_SERVICE" },
  { id: "cleanup", doneWhen: "DELETE_POD_K8S" },
];

/**
 * 끝난 작업 단계 목록으로 재시작 단계마다 상태(done / active / waiting)를 매긴다. 끝나지 않은 첫 단계가 진행 중이다.
 * @param {string[]} completedSteps
 * @param {boolean} keepChanges
 * @returns {{ id: string, label: string, state: "done" | "active" | "waiting" }[]}
 */
export function restartStages(completedSteps, keepChanges) {
  const done = new Set(completedSteps ?? []);
  let activeFound = false;
  return RESTART_STAGES.filter((stage) => keepChanges || !stage.onlyWhenKeepingChanges).map((stage) => {
    let state = "waiting";
    if (!activeFound && done.has(stage.doneWhen)) state = "done";
    else if (!activeFound) { state = "active"; activeFound = true; }
    return { id: stage.id, label: i18n.t(`restart.stage.${stage.id}`), state };
  });
}

// 재시작이 실패했을 때 사용자가 다음에 무엇을 하면 되는지 알려 준다. 목록에 없는 코드는 그대로 보인다.
const RESTART_FAILURE_HINTS = ["IMAGE_CHANGES_TOO_LARGE", "IMAGE_COMMIT_NO_CONTAINER"];

/**
 * 재시작 작업 결과를 알림 한 건으로 바꾼다. 관리자·사용자 화면이 같은 문구를 쓴다.
 * @param {object | null} result waitForMigrationResult의 반환값
 * @returns {{ type: "success" | "warning" | "error", message: string }}
 */
export function describeRestartResult(result) {
  if (!result) {
    return { type: "warning", message: i18n.t("restart.resultPending") };
  }
  if (result.phase === "SUCCESS") {
    return { type: "success", message: i18n.t("restart.resultSuccess") };
  }
  if (result.phase === "UNKNOWN") {
    return { type: "warning", message: i18n.t("restart.resultUnknown") };
  }
  if (RESTART_FAILURE_HINTS.includes(result.errorCode)) {
    return { type: "error", message: i18n.t(`restart.hint.${result.errorCode}`) };
  }
  return {
    type: "error",
    message: result.errorCode ? i18n.t("restart.resultFailedCode", { code: result.errorCode }) : i18n.t("restart.resultFailed"),
  };
}
