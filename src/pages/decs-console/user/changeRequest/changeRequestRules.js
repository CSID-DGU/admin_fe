// 변경 요청 폼과 등록표가 같이 쓰는 값·규칙.

// 변경 요청으로 바꿀 수 없는 포트·용도 이름. 최종 판정은 서버가 한다(admin_be PortChangeValue) —
// 여기서는 제출 전에 걸러 관리자 승인 단계에서야 실패하는 일을 줄인다.
export const PROTECTED_PORTS = [22, 8888, 6080];
export const RESERVED_PORT_PURPOSES = ["ssh", "jupyter", "novnc", "vnc"];
export const MAX_EXTRA_PORTS = 10;
export const PORT_PURPOSE_MAX_LENGTH = 255;

export function toLocalDateInput(date) {
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
