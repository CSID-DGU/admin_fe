// BE는 가입(UserRegisterRequestDTO.phone)과 전화번호 변경(PATCH /api/users/me/phone) 양쪽에서
// 같은 하이픈 패턴을 요구한다. FE가 안 막으면 매뉴얼대로 하이픈 없이 적은 사용자가 서버 400을
// 그대로 받는다.
export const PHONE_PATTERN = /^\d{2,3}-\d{3,4}-\d{4}$/;
export const PHONE_FORMAT_ERROR = "전화번호는 하이픈(-)을 넣어 010-1234-5678 형식으로 입력해주세요.";
