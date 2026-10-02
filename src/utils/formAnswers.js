// 신청서 폼 응답(formAnswers)의 키를 화면에 보일 이름으로 바꾼다. 모르는 키는 그대로 보여 준다.
const FORM_ANSWER_LABELS = {
  teamInfo: "팀 프로젝트 정보 (그룹 이름·팀원 이름)",
};

export function formAnswerLabel(key) {
  return FORM_ANSWER_LABELS[key] ?? key.replace("_", " ");
}
