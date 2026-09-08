import { useState, useEffect } from "react";
import { authService } from "../../services/authService";
import { requestService } from "../../services/requestService";
import { Alert, Button, FormField, Input } from "../../design-system";
import { useAuth } from "../../hooks/useAuth";

// SignupPage와 동일한 형식 규칙 — 가입 때 입력칸이 없던 기존 계정을 위한 1회성
// 등록 폼이라, 서버가 허용하는 값 규칙과 반드시 일치해야 한다.
const UBUNTU_USERNAME_PATTERN = /^[a-z][a-z0-9_-]{2,49}$/;
const UBUNTU_USERNAME_FORMAT_ERROR = "소문자로 시작하고 소문자·숫자·_·-만 사용해 3~50자로 입력해주세요.";
const UBUNTU_USERNAME_TAKEN_ERROR = "이미 사용 중인 Ubuntu 사용자명입니다.";
const UBUNTU_USERNAME_CHECK_FAILED_ERROR = "사용자명 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.";

// AccountPage(마이페이지)의 1회성 필드와 로그인 직후 강제 모달이 이 컴포넌트를 함께 쓴다 —
// 검증 규칙이 두 곳에서 어긋나면 한쪽에서만 통과되는 값이 생기므로 반드시 하나로 유지한다.
export function UbuntuUsernameRegisterForm({ onSuccess, formId, autoFocus = false }) {
  const { updateUser } = useAuth();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!UBUNTU_USERNAME_PATTERN.test(value)) {
      setUsernameStatus(null);
      return undefined;
    }
    setUsernameStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await requestService.checkUbuntuUsername(value);
        const available = response.data?.available ?? response.data?.data?.available;
        if (!cancelled) setUsernameStatus(available === false ? "taken" : "available");
      } catch {
        if (!cancelled) setUsernameStatus("failed");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const usernameTakenError = usernameStatus === "taken" ? UBUNTU_USERNAME_TAKEN_ERROR : null;
  const usernameFormatError =
    value && !UBUNTU_USERNAME_PATTERN.test(value) ? UBUNTU_USERNAME_FORMAT_ERROR : null;
  const usernameError = fieldError || usernameFormatError || usernameTakenError;
  const usernameConstraint =
    usernameStatus === "checking"
      ? "사용 가능 여부를 확인하는 중이에요."
      : usernameStatus === "available"
      ? "사용할 수 있는 이름이에요."
      : usernameStatus === "failed"
      ? UBUNTU_USERNAME_CHECK_FAILED_ERROR
      : "컨테이너 SSH 접속·홈 디렉터리에 쓰이는 이름이에요. 한 번 등록하면 바꿀 수 없어요.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value) {
      setFieldError("유저네임을 입력해주세요.");
      return;
    }
    if (!UBUNTU_USERNAME_PATTERN.test(value)) {
      setFieldError(UBUNTU_USERNAME_FORMAT_ERROR);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await authService.registerUbuntuUsername(value);
      if (response.status !== 200) {
        throw new Error("Ubuntu 유저네임 등록에 실패했습니다.");
      }
      const result = await updateUser();
      onSuccess?.(result.user);
    } catch (error) {
      setSubmitError(error.message || "Ubuntu 유저네임 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {submitError ? <Alert type="error">{submitError}</Alert> : null}
      <FormField
        label="Ubuntu 유저네임"
        errorText={usernameError}
        constraintText={usernameConstraint}
        htmlFor={formId ? `${formId}-input` : "ubuntu-username-input"}
      >
        <Input
          id={formId ? `${formId}-input` : "ubuntu-username-input"}
          value={value}
          onChange={(v) => {
            setValue(v);
            if (fieldError) setFieldError("");
          }}
          invalid={!!usernameError}
          placeholder="소문자·숫자, 3~50자 (SSH 로그인 계정)"
          autoFocus={autoFocus}
        />
      </FormField>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={submitting || usernameStatus === "checking"}
        >
          등록
        </Button>
      </div>
    </form>
  );
}
