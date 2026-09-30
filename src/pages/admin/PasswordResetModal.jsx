import { useState } from "react";
import userService from "../../services/userService";
import { Alert, Button, FormField, Input, Modal } from "../../design-system";

// 서버와 같은 규칙: BCrypt가 72바이트까지만 받는다.
const MIN_LENGTH = 8;
const MAX_BYTES = 72;
const utf8Bytes = (value) => new TextEncoder().encode(value).length;

const validate = (password, confirm) => {
  const errors = {};
  if (!password) {
    errors.password = "새 비밀번호를 입력해 주세요.";
  } else if (password.length < MIN_LENGTH) {
    errors.password = `${MIN_LENGTH}자 이상으로 정해 주세요.`;
  } else if (utf8Bytes(password) > MAX_BYTES) {
    errors.password = "너무 깁니다. 영문 72자(한글 24자)까지 쓸 수 있어요.";
  }
  if (!confirm) {
    errors.confirm = "새 비밀번호를 한 번 더 입력해 주세요.";
  } else if (password !== confirm) {
    errors.confirm = "새 비밀번호와 달라요.";
  }
  return errors;
};

/**
 * 관리자가 사용자 비밀번호를 새로 지정한다. 사용자가 직접 바꾸는 기능은 없어서, 잊었거나 새었을 때 쓰는 유일한 경로다.
 * 새 비밀번호는 메일로 보내지 않으므로 관리자가 사용자에게 직접 전달한다.
 */
const PasswordResetModal = ({ user, onDismiss, onDone }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const found = validate(password, confirm);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setSaving(true);
      setError(null);
      await userService.resetUserPassword(user.userId, password);
      onDone(user);
    } catch (e) {
      setError(e.message || "비밀번호를 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      onDismiss={saving ? undefined : onDismiss}
      dismissible={!saving}
      header={`${user.name} 비밀번호 초기화`}
      footer={
        <>
          <Button variant="normal" disabled={saving} onClick={onDismiss}>
            취소
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSubmit}>
            초기화
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
        {error && <Alert type="error">{error}</Alert>}
        <Alert type="warning">
          웹 로그인과 SSH(Ubuntu 계정) 비밀번호가 함께 바뀌고, 실행 중인 컨테이너에도 바로 적용돼요.
          사용자의 기존 로그인은 끊겨요. 새 비밀번호는 메일로 가지 않으니 사용자에게 직접 전달해 주세요.
        </Alert>
        <FormField label="새 비밀번호" errorText={errors.password} constraintText="8~72자" htmlFor="reset-password">
          <Input
            id="reset-password"
            type="password"
            value={password}
            onChange={setPassword}
            invalid={!!errors.password}
            disabled={saving}
          />
        </FormField>
        <FormField label="새 비밀번호 확인" errorText={errors.confirm} htmlFor="reset-password-confirm">
          <Input
            id="reset-password-confirm"
            type="password"
            value={confirm}
            onChange={setConfirm}
            invalid={!!errors.confirm}
            disabled={saving}
          />
        </FormField>
      </div>
    </Modal>
  );
};

export default PasswordResetModal;
