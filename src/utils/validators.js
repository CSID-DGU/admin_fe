// BE는 가입(UserRegisterRequestDTO.phone)과 전화번호 변경(PATCH /api/users/me/phone) 양쪽에서
// 같은 규칙을 쓰고, 저장할 때 010-1234-5678 모양으로 맞춘다. 화면은 입력하는 동안 하이픈을 자동으로 넣어
// 사용자가 형식을 신경 쓰지 않아도 되게 한다.
export const PHONE_PATTERN = /^0\d{1,2}-\d{3,4}-\d{4}$/;
export const PHONE_FORMAT_ERROR = "전화번호를 끝까지 입력해주세요. (예: 010-1234-5678)";
export const PHONE_HELP = "숫자만 입력하면 하이픈(-)은 자동으로 들어가요. 예: 010-1234-5678";

// 입력 중인 값을 지역번호-국번-번호 모양으로 바꾼다. 서울(02)만 앞자리가 두 자리다.
export function formatPhoneInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);
  const area = digits.startsWith("02") ? 2 : 3;
  if (digits.length <= area) return digits;
  const rest = digits.slice(area);
  if (rest.length <= 4) return `${digits.slice(0, area)}-${rest}`;
  const middle = rest.length - 4 > 4 ? 4 : Math.max(rest.length - 4, 3);
  return `${digits.slice(0, area)}-${rest.slice(0, middle)}-${rest.slice(middle, middle + 4)}`;
}
