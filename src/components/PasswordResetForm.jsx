import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Input } from "../design-system";
import { authService } from "../services/authService";
import { newPasswordHelp, validateNewPassword } from "../utils/validators";

const CODE_PATTERN = /^\d{6}$/;

/**
 * 가입한 이메일로 본인 확인을 하고 비밀번호 변경을 신청하는 폼. 로그인 화면(비밀번호를 잊은 사용자)과
 * 변경 요청 창(로그인한 사용자)이 같이 쓴다.
 * 신청만으로는 아무것도 바뀌지 않는다 — 관리자가 승인하면 웹·SSH 비밀번호가 함께 바뀌고 메일로 알린다.
 *
 * accountEmail을 주면 그 주소로만 인증번호를 보내고 이메일 칸을 받지 않는다(로그인한 계정).
 */
export default function PasswordResetForm({ accountEmail, onSubmitted }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: accountEmail ?? "", code: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const change = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };
  const run = async (work) => {
    setLoading(true);
    setAlert(null);
    try {
      await work();
    } catch (error) {
      setAlert({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const sendCode = (event) => {
    event?.preventDefault();
    if (!form.email.includes("@")) return setErrors({ email: "올바른 이메일 형식을 입력해주세요." });
    return run(async () => {
      await authService.sendPasswordResetCode(form.email);
      setCodeSent(true);
      // 가입되지 않은 주소에도 같은 응답이 오므로, 메일이 갔다고 단정하지 않는다.
      setAlert({
        type: "success",
        message: accountEmail
          ? "인증번호를 보냈어요. 5분 안에 입력해 주세요."
          : "가입된 이메일이라면 인증번호를 보냈어요. 5분 안에 입력해 주세요.",
      });
    });
  };

  const submit = (event) => {
    event.preventDefault();
    const next = validateNewPassword(form.password, form.confirm);
    if (!CODE_PATTERN.test(form.code)) next.code = "메일로 받은 6자리 숫자를 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length) return undefined;
    return run(async () => {
      await authService.requestPasswordReset(form.email, form.code, form.password);
      setSubmitted(true);
      onSubmitted?.();
    });
  };

  if (submitted) {
    return (
      <Alert type="success" header="비밀번호 변경을 신청했어요">
        관리자가 승인하면 새 비밀번호가 적용되고, 가입한 이메일로 알려 드려요. 그때까지는 지금 비밀번호가 그대로예요.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {alert ? <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>{alert.message}</Alert> : null}
      {!codeSent ? (
        <form className="space-y-6" onSubmit={sendCode}>
          <FormField
            label={t("auth.email")}
            errorText={errors.email}
            constraintText={accountEmail ? "이 주소로 인증번호를 보내요." : "가입할 때 쓴 학교 이메일을 입력해 주세요."}
          >
            <Input type="email" value={form.email} onChange={(value) => change("email", value)} placeholder="example@dgu.ac.kr" invalid={!!errors.email} disabled={!!accountEmail} />
          </FormField>
          <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading}>{t("auth.sendCode")}</Button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={submit}>
          <FormField label={t("auth.email")}>
            <Input type="email" value={form.email} disabled />
          </FormField>
          <FormField label={t("auth.verificationCode")} errorText={errors.code}>
            <Input value={form.code} onChange={(value) => change("code", value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" invalid={!!errors.code} />
          </FormField>
          <FormField label={t("auth.newPassword")} errorText={errors.password} constraintText={`${newPasswordHelp()}. 서버(SSH·Ubuntu) 접속에도 이 비밀번호를 써요.`}>
            <Input type="password" value={form.password} onChange={(value) => change("password", value)} invalid={!!errors.password} />
          </FormField>
          <FormField label={t("auth.confirmNewPassword")} errorText={errors.confirm}>
            <Input type="password" value={form.confirm} onChange={(value) => change("confirm", value)} invalid={!!errors.confirm} />
          </FormField>
          <Alert type="info">신청한 뒤 관리자가 승인해야 적용돼요. 적용되면 메일로 알려 드려요.</Alert>
          <div className="flex gap-3">
            <Button type="button" loading={loading} disabled={loading} onClick={() => sendCode()}>{t("auth.resend")}</Button>
            <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading}>{t("auth.resetSubmit")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
