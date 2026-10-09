// 변경 요청 종류 등록표 — 종류마다 폼, 처음 값, 검사, 서버로 보낼 값(newValue)을 한 곳에 둔다.
// 종류를 더하려면 폼 컴포넌트 하나와 여기 한 항목만 더한다. ChangeRequestModal은 종류를 모른다.
//
// 항목 모양:
//   type            서버의 ChangeType 이름
//   labelKey        종류 이름 번역 키
//   accountScoped   true면 계정 단위 변경 — 대상 컨테이너·사유가 없고 Form이 스스로 제출한다.
//                   이때 Form은 ({ accountEmail, onSubmitted })를 받고, 아래 나머지 항목은 쓰지 않는다.
//   reasonPlaceholderKey  사유 입력란 예시 번역 키
//   Form            ({ server, groupOptions, value, onChange }) => 폼
//   initialValue    (server) => 폼의 처음 값
//   validate        (value, server, t) => 오류 문구 | null
//   toNewValue      (value, server) => 서버로 보낼 문자열
import ExpiresAtForm from "./ExpiresAtForm";
import GroupForm from "./GroupForm";
import PortForm from "./PortForm";
import PasswordResetForm from "../../../../components/PasswordResetForm";
import { MAX_EXTRA_PORTS, PROTECTED_PORTS, toLocalDateInput } from "./changeRequestRules";

// 서버(SingleChangeRequestDTO.reason)와 같은 한도. 승인자가 이 글만 보고 판단하므로 최소 길이를 둔다.
export const REASON_MIN_LENGTH = 100;

function changeablePorts(server) {
  return (server.extraPorts ?? [])
    .filter((port) => !PROTECTED_PORTS.includes(port.internalPort))
    .map((port) => ({ internalPort: port.internalPort, usagePurpose: port.purpose }));
}

function samePortNumbers(a, b) {
  const numbers = new Set(a.map((port) => port.internalPort));
  return a.length === b.length && b.every((port) => numbers.has(port.internalPort));
}

export const CHANGE_REQUEST_TYPES = [
  {
    type: "EXPIRES_AT",
    labelKey: "change.type.EXPIRES_AT",
    reasonPlaceholderKey: "container.extendReasonPlaceholder",
    Form: ExpiresAtForm,
    initialValue: (server) => {
      const suggested = new Date(server.expiresAt);
      suggested.setDate(suggested.getDate() + 14);
      return toLocalDateInput(suggested);
    },
    validate: (date, server, t) => {
      const next = new Date(`${date}T23:59:59`);
      if (!date || Number.isNaN(next.getTime()) || next <= new Date(server.expiresAt) || next <= new Date()) {
        return t("container.errExtendDate");
      }
      return null;
    },
    toNewValue: (date) => `${date}T23:59:59`,
  },
  {
    type: "GROUP",
    labelKey: "change.type.GROUP",
    reasonPlaceholderKey: "container.groupReasonPlaceholder",
    Form: GroupForm,
    initialValue: () => [],
    validate: (added, _server, t) => (added.length === 0 ? t("container.errGroupEmpty") : null),
    // 서버는 계정이 갖게 될 그룹 전체를 받는다 — 지금 그룹에 고른 그룹을 더해 보낸다.
    toNewValue: (added, server) => JSON.stringify([...new Set([
      ...(server.groups ?? []).map((group) => group.ubuntuGid),
      ...added.map((group) => Number(group.ubuntuGid)),
    ])]),
  },
  {
    type: "PORT",
    labelKey: "change.type.PORT",
    reasonPlaceholderKey: "change.portReasonPlaceholder",
    Form: PortForm,
    initialValue: changeablePorts,
    validate: (ports, server, t) => {
      if (ports.length > MAX_EXTRA_PORTS) return t("change.errPortMax", { max: MAX_EXTRA_PORTS });
      if (samePortNumbers(ports, changeablePorts(server))) return t("change.errPortSame");
      return null;
    },
    // 서버는 승인 뒤에 열려 있을 추가 포트 전체를 받는다. 빈 목록이면 모두 닫는다.
    toNewValue: (ports) => JSON.stringify(ports),
  },
  {
    type: "PASSWORD",
    labelKey: "change.type.PASSWORD",
    accountScoped: true,
    Form: PasswordResetForm,
  },
];

export function findChangeRequestType(type) {
  return CHANGE_REQUEST_TYPES.find((entry) => entry.type === type) ?? CHANGE_REQUEST_TYPES[0];
}
