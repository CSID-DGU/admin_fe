import { requestService } from "./requestService";

const POLL_MS = 1500;
// 작업은 보통 몇 초면 끝난다. AD·NAS가 막혀 재시도하는 경우까지 기다리되, 화면을 무한정 붙잡지는 않는다.
const TIMEOUT_MS = 3 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 그룹 작업(멤버 추가·제거)이 끝날 때까지 기다린다. 그룹 생성은 작업이 아니라 바로 끝난다. 서버는 작업을 등록만 하고 돌아오므로,
 * 등록 응답으로 받은 작업을 넘기면 끝난 상태(APPLIED 또는 FAILED)의 작업을 돌려준다.
 * 시간 안에 끝나지 않으면 마지막으로 본 상태(PROCESSING)를 그대로 돌려준다 — 작업은 서버에서 계속 돈다.
 */
export async function waitForGroupOperation(operation) {
  let current = operation;
  const deadline = Date.now() + TIMEOUT_MS;
  // 작업 번호가 없으면 작업 없이 바로 끝난 요청이다.
  while (current?.operationId != null && current.status === "PROCESSING" && Date.now() < deadline) {
    await sleep(POLL_MS);
    const response = await requestService.getGroupOperation(current.operationId);
    current = response.data?.data ?? response.data;
  }
  return current;
}
