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

// 새 비밀번호 규칙. 서버와 같다: 8자 이상, BCrypt가 받는 72바이트까지.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
export const NEW_PASSWORD_HELP = "8~72자";

// 새 비밀번호와 확인 칸을 검사해 { password, confirm } 중 틀린 칸의 안내만 담아 돌려준다.
export function validateNewPassword(password, confirm) {
  const errors = {};
  if (!password) {
    errors.password = "새 비밀번호를 입력해 주세요.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `${PASSWORD_MIN_LENGTH}자 이상으로 정해 주세요.`;
  } else if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = "너무 깁니다. 영문 72자(한글 24자)까지 쓸 수 있어요.";
  }
  if (!confirm) {
    errors.confirm = "새 비밀번호를 한 번 더 입력해 주세요.";
  } else if (password !== confirm) {
    errors.confirm = "새 비밀번호와 달라요.";
  }
  return errors;
}
