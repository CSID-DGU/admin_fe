import { useState } from "react";
import { authService } from "../../services/authService";
import { Alert, Button, FormField, Header, Input } from "../../design-system";
import { useAuth } from "../../hooks/useAuth";

// 신청 화면(RequestWizard)의 첫 비밀번호와 같은 규칙이다 — 서버도 8~128자만 받는다.
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

// 계정 하나에 Ubuntu 비밀번호 하나다. 여기서 바꾸면 떠 있는 컨테이너에 바로 반영되고, 이후 만드는
// 컨테이너도 이 비밀번호를 쓴다. 본인 확인은 현재 웹 비밀번호로 한다.
export function UbuntuPasswordChangeForm({ user }) {
  const { updateUser } = useAuth();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!values.currentPassword) next.currentPassword = "현재 웹 비밀번호를 입력해주세요.";
    if (!values.newPassword) {
      next.newPassword = "새 Ubuntu 비밀번호를 입력해주세요.";
    } else if (values.newPassword.length < MIN_LENGTH || values.newPassword.length > MAX_LENGTH) {
      next.newPassword = `비밀번호는 ${MIN_LENGTH}~${MAX_LENGTH}자로 입력해주세요.`;
    }
    if (!values.confirmPassword) {
      next.confirmPassword = "비밀번호를 한 번 더 입력해주세요.";
    } else if (values.newPassword !== values.confirmPassword) {
      next.confirmPassword = "비밀번호가 일치하지 않아요.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setResult(null);
    try {
      await authService.changeUbuntuPassword(values.currentPassword, values.newPassword);
      setValues(EMPTY);
      setResult({ type: "success", message: "Ubuntu 비밀번호를 바꿨어요. 실행 중인 컨테이너에도 바로 적용됐어요." });
      await updateUser();
    } catch (error) {
      const message = error.status === 400 && error.code === "INVALID_PASSWORD"
        ? "현재 웹 비밀번호가 일치하지 않아요."
        : error.status === 502
        ? "컨테이너에 반영하지 못해 비밀번호를 바꾸지 않았어요. 잠시 후 다시 시도해 주세요."
        : error.message || "Ubuntu 비밀번호 변경에 실패했어요.";
      setResult({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        variant="h3"
        description="SSH·Ubuntu 로그인에 쓰는 비밀번호예요. 바꾸면 실행 중인 모든 컨테이너에 바로 적용돼요."
      >
        Ubuntu 비밀번호 변경
      </Header>

      {result ? (
        <Alert type={result.type} dismissible onDismiss={() => setResult(null)}>
          {result.message}
        </Alert>
      ) : null}

      {user && !user.hasUbuntuPassword ? (
        <Alert type="info">
          아직 Ubuntu 비밀번호가 없어요. 여기서 정하거나, 첫 서버 신청 때 입력하면 돼요.
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="현재 웹 비밀번호" errorText={errors.currentPassword} htmlFor="ubuntu-pw-current">
          <Input
            id="ubuntu-pw-current"
            type="password"
            value={values.currentPassword}
            onChange={(v) => setField("currentPassword", v)}
            invalid={!!errors.currentPassword}
            placeholder="본인 확인을 위해 웹 로그인 비밀번호를 입력해 주세요"
          />
        </FormField>
        <FormField
          label="새 Ubuntu 비밀번호"
          errorText={errors.newPassword}
          constraintText={`${MIN_LENGTH}~${MAX_LENGTH}자로 입력해 주세요.`}
          htmlFor="ubuntu-pw-new"
        >
          <Input
            id="ubuntu-pw-new"
            type="password"
            value={values.newPassword}
            onChange={(v) => setField("newPassword", v)}
            invalid={!!errors.newPassword}
            placeholder="SSH 접속에 사용할 새 비밀번호"
          />
        </FormField>
        <FormField label="새 Ubuntu 비밀번호 확인" errorText={errors.confirmPassword} htmlFor="ubuntu-pw-confirm">
          <Input
            id="ubuntu-pw-confirm"
            type="password"
            value={values.confirmPassword}
            onChange={(v) => setField("confirmPassword", v)}
            invalid={!!errors.confirmPassword}
            placeholder="새 비밀번호를 한 번 더 입력해 주세요"
          />
        </FormField>

        <Alert type="warning" header="비밀번호는 꼭 따로 기억해 두세요">
          비밀번호는 암호화된 형태로만 저장돼요. 관리자도 원래 비밀번호를 볼 수 없어요.
        </Alert>

        <div className="flex justify-end gap-3 pt-6 border-t border-(--decs-border-divider)">
          <Button
            variant="normal"
            onClick={(e) => {
              e.preventDefault();
              setValues(EMPTY);
              setErrors({});
            }}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            Ubuntu 비밀번호 변경
          </Button>
        </div>
      </form>
    </div>
  );
}
