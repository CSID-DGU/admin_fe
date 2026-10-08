// 신청서 폼 응답(formAnswers)의 키를 화면에 보일 이름으로 바꾼다. 모르는 키는 그대로 보여 준다.
const FORM_ANSWER_LABELS = {
  teamInfo: "팀 프로젝트 정보 (그룹 이름·팀원 이름)",
};

// 사용 목적은 신청의 usage_purpose 로 따로 보여 준다. 옛 신청은 같은 글이 폼 응답에도 들어 있어 화면에서 뺀다.
const HIDDEN_FORM_ANSWER_KEYS = new Set(["purpose"]);

export function visibleFormAnswers(formAnswers) {
  return Object.entries(formAnswers ?? {}).filter(([key]) => !HIDDEN_FORM_ANSWER_KEYS.has(key));
}

export function formAnswerLabel(key) {
  return FORM_ANSWER_LABELS[key] ?? key.replace("_", " ");
}
