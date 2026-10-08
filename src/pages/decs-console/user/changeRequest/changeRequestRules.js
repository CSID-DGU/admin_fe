// 변경 요청 폼과 등록표가 같이 쓰는 값·규칙.

// 변경 요청으로 바꿀 수 없는 포트·용도 이름. 최종 판정은 서버가 한다(admin_be PortChangeValue) —
// 여기서는 제출 전에 걸러 관리자 승인 단계에서야 실패하는 일을 줄인다.
export const PROTECTED_PORTS = [22, 8888, 6080];
export const RESERVED_PORT_PURPOSES = ["ssh", "jupyter", "novnc", "vnc"];
export const MAX_EXTRA_PORTS = 10;
export const PORT_PURPOSE_MAX_LENGTH = 255;

// 새로 추가하는 포트의 용도 이름을 받을 수 없으면 오류 문구를 준다.
// 서버는 예약된 이름과 정확히 같을 때만 막지만, 접속 안내(decsMapper.toExtraPort)는 이름에 vnc가
// 들어 있으면 원격 데스크톱 주소로 안내한다. 그 안내가 틀리지 않도록 여기서는 vnc가 들어간 이름도 받지 않는다.
export function portPurposeError(usagePurpose, t) {
  const purpose = String(usagePurpose ?? "").trim();
  if (RESERVED_PORT_PURPOSES.includes(purpose.toLowerCase()) || /vnc/i.test(purpose)) {
    return t("change.errPortPurposeReserved", { purpose });
  }
  if (purpose.length > PORT_PURPOSE_MAX_LENGTH) return t("change.errPortPurposeLong", { max: PORT_PURPOSE_MAX_LENGTH });
  return null;
}

export function toLocalDateInput(date) {
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
