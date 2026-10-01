import { useState } from "react";
import userService from "../../services/userService";
import { Alert, Button, FormField, Input, Modal } from "../../design-system";
import { NEW_PASSWORD_HELP, validateNewPassword } from "../../utils/validators";

/**
 * 관리자가 사용자 비밀번호를 새로 지정한다. 가입한 메일을 받지 못해 본인이 재설정을 신청할 수 없는 사용자를 위한 경로다.
 * 재설정 신청을 대신 내고 바로 승인하는 것과 같아서, 컨테이너 반영이 끝나야 적용된다.
 * 새 비밀번호는 메일로 보내지 않으므로 관리자가 사용자에게 직접 전달한다.
 *
 * onDone(user, status): status는 PROCESSING(컨테이너에 반영 중) 또는 APPLIED(바로 적용됨)
 */
const PasswordResetModal = ({ user, onDismiss, onDone }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const found = validateNewPassword(password, confirm);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setSaving(true);
      setError(null);
      const response = await userService.resetUserPassword(user.userId, password);
      onDone(user, response.data?.data?.status);
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
          웹 로그인과 SSH(Ubuntu 계정) 비밀번호가 함께 바뀌어요. 실행 중인 컨테이너에 반영한 뒤 적용되므로
          잠시 걸릴 수 있고, 적용되면 사용자의 기존 로그인은 끊겨요. 새 비밀번호는 메일로 가지 않으니 사용자에게
          직접 전달해 주세요.
        </Alert>
        <FormField label="새 비밀번호" errorText={errors.password} constraintText={NEW_PASSWORD_HELP} htmlFor="reset-password">
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
