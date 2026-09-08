import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Input } from "../../design-system";
import { authService } from "../../services/authService";
import { requestService } from "../../services/requestService";

const UBUNTU_USERNAME_PATTERN = /^[a-z][a-z0-9_-]{2,49}$/;
const UBUNTU_USERNAME_FORMAT_ERROR = "소문자로 시작하고 소문자·숫자·_·-만 사용해 3~50자로 입력해주세요.";
const UBUNTU_USERNAME_TAKEN_ERROR = "이미 사용 중인 Ubuntu 사용자명입니다.";
const UBUNTU_USERNAME_CHECK_FAILED_ERROR = "사용자명 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.";

export default function SignupPage() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", verificationCode: "", password: "", confirmPassword: "", name: "", department: "", studentId: "", phone: "", ubuntuUsername: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const change = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); };
  const field = (name, type = "text", props = {}) => <FormField label={t(`auth.${name}`)} errorText={errors[name]} {...props}><Input type={type} value={form[name]} onChange={(value) => change(name, value)} invalid={!!errors[name]} {...props} /></FormField>;
  const run = async (work) => { setLoading(true); setAlert(null); try { await work(); } catch (error) { setAlert({ type: "error", message: error.message }); } finally { setLoading(false); } };

  const { ubuntuUsername } = form;
  useEffect(() => {
    if (!UBUNTU_USERNAME_PATTERN.test(ubuntuUsername)) { setUsernameStatus(null); return undefined; }
    setUsernameStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await requestService.checkUbuntuUsername(ubuntuUsername);
        const available = response.data?.available ?? response.data?.data?.available;
        if (!cancelled) setUsernameStatus(available === false ? "taken" : "available");
      } catch {
        if (!cancelled) setUsernameStatus("failed");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ubuntuUsername]);

  // 중복 확인이 실패했을 때는 가입 자체를 막지 않고 안내만 한다. 최종 중복 판정은 서버가 한다.
  const usernameTakenError = usernameStatus === "taken" ? UBUNTU_USERNAME_TAKEN_ERROR : null;
  const usernameFormatError = ubuntuUsername && !UBUNTU_USERNAME_PATTERN.test(ubuntuUsername) ? UBUNTU_USERNAME_FORMAT_ERROR : null;
  const usernameError = errors.ubuntuUsername || usernameFormatError || usernameTakenError;
  const usernameConstraint = usernameStatus === "checking" ? "사용 가능 여부를 확인하는 중이에요." : usernameStatus === "available" ? "사용할 수 있는 이름이에요." : usernameStatus === "failed" ? UBUNTU_USERNAME_CHECK_FAILED_ERROR : t("auth.ubuntuUsernameHelp");
  const send = (event) => { event.preventDefault(); if (!/@(dgu\.ac\.kr|dongguk\.edu)$/.test(form.email)) return setErrors({ email: t("auth.domainHelp") }); run(async () => { const response = await authService.sendEmailVerification(form.email); if (response.status !== 200) throw new Error("인증번호 전송에 실패했습니다."); setCodeSent(true); setAlert({ type: "success", message: "인증번호가 이메일로 전송되었습니다." }); }); };
  const verify = () => { if (!form.verificationCode) return setErrors({ verificationCode: "인증번호를 입력해주세요." }); run(async () => { const response = await authService.verifyEmailCode(form.email, form.verificationCode); if (response.status !== 200) throw new Error("인증번호가 일치하지 않습니다."); setStep(2); }); };
  const signup = (event) => { event.preventDefault(); const required = ["password", "confirmPassword", "name", "department", "studentId", "phone", "ubuntuUsername"]; const next = Object.fromEntries(required.filter((key) => !form[key]).map((key) => [key, `${t(`auth.${key}`)}을(를) 입력해주세요.`])); if (form.password && form.password.length < 8) next.password = "비밀번호는 8자 이상이어야 합니다."; if (form.confirmPassword && form.password !== form.confirmPassword) next.confirmPassword = "비밀번호가 일치하지 않습니다."; if (form.ubuntuUsername && !UBUNTU_USERNAME_PATTERN.test(form.ubuntuUsername)) next.ubuntuUsername = UBUNTU_USERNAME_FORMAT_ERROR; else if (usernameTakenError) next.ubuntuUsername = usernameTakenError; setErrors(next); if (Object.keys(next).length) return; run(async () => { const response = await authService.register(form); if (response.status < 200 || response.status >= 300) throw new Error("회원가입에 실패했습니다."); window.location.href = "/login"; }); };

  return <main className="min-h-screen bg-white py-12 px-4"><div className="mx-auto w-full max-w-sm">
    <div className="flex items-center mb-8"><img src="/dongguk_university_logo.svg" alt="동국대학교 로고" width="153" height="48" className="h-12 w-auto mr-3" /><div><h1 className="text-xl font-bold">{t("auth.signup")}</h1><p className="text-sm text-gray-600">{t("auth.signupTitle")}</p></div></div>
    <div className="mb-8 flex items-center gap-2"><span className="bg-brand-500 text-white px-3 py-1">1</span><div className={`h-1 flex-1 ${step === 2 ? "bg-brand-500" : "bg-gray-200"}`} /><span className={`${step === 2 ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-600"} px-3 py-1`}>2</span></div>
    {alert ? <div className="mb-6"><Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>{alert.message}</Alert></div> : null}
    {step === 1 ? <form className="space-y-6" onSubmit={send}>{field("email", "email", { disabled: codeSent, constraintText: t("auth.domainHelp") })}{codeSent ? field("verificationCode") : null}<div className="flex gap-3">{codeSent ? <Button type="submit" loading={loading}>{t("auth.resend")}</Button> : null}<Button type={codeSent ? "button" : "submit"} variant="primary" fullWidth loading={loading} onClick={codeSent ? verify : undefined}>{codeSent ? t("auth.verify") : t("auth.sendCode")}</Button></div></form> : <form className="space-y-6" onSubmit={signup}>{field("email", "email", { disabled: true })}{field("password", "password")}{field("confirmPassword", "password")}{field("name", "text", { constraintText: t("auth.slackHelp") })}{field("department")}{field("studentId")}{field("phone")}<FormField label={t("auth.ubuntuUsername")} errorText={usernameError} constraintText={usernameConstraint}><Input value={form.ubuntuUsername} onChange={(value) => change("ubuntuUsername", value)} invalid={!!usernameError} placeholder="소문자·숫자, 3~50자 (SSH 로그인 계정)" /></FormField><div className="flex gap-3"><Button onClick={() => setStep(1)}>{t("auth.previous")}</Button><Button type="submit" variant="primary" fullWidth loading={loading || usernameStatus === "checking"}>{t("auth.signup")}</Button></div></form>}
    <p className="mt-6 text-center text-sm text-gray-600">{t("auth.hasAccount")} <Link to="/login" className="font-medium text-brand-500">{t("auth.login")}</Link></p>
    <button className="mt-6 w-full text-sm text-gray-600" onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ko" : "en")}>{t("common.language")}</button>
  </div></main>;
}
