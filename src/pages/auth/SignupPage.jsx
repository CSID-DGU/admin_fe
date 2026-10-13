import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Alert, Button, FormField, Input } from "../../design-system";
import { authService } from "../../services/authService";
import { PHONE_PATTERN, phoneFormatError, phoneHelp, formatPhoneInput } from "../../utils/validators";

// 계정 이름은 쿠버네티스 자원 이름(Secret 등)에도 들어가 밑줄을 쓸 수 없고, 리눅스 계정 이름 상한은 32자다.
const UBUNTU_USERNAME_PATTERN = /^(?!(?:root|admin|nobody|daemon|bin|sys|ubuntu|svmanager|ailab-krb5)$)[a-z][a-z0-9-]{1,30}[a-z0-9]$/;
const UBUNTU_USERNAME_FORMAT_ERROR = "소문자로 시작하고 소문자·숫자·하이픈(-)만 사용해 3~32자로 입력해주세요. 끝은 소문자나 숫자여야 하고, 시스템 계정 이름은 쓸 수 없습니다.";
// 가입 요청이 계정 이름 때문에 거절됐을 때의 오류 코드. 이름 입력란 아래에 서버가 준 사유를 보여 준다.
const UBUNTU_USERNAME_REJECTED_CODES = ["DUPLICATE_USERNAME", "UBUNTU_USERNAME_RESERVED", "UBUNTU_USERNAME_CONFLICTS_GROUP"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("auth.signup"));
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", verificationCode: "", password: "", confirmPassword: "", name: "", department: "", studentId: "", phone: "", ubuntuUsername: "", contactEmail: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const change = (name, rawValue) => { const value = name === "phone" ? formatPhoneInput(rawValue) : rawValue; setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); };
  const field = (name, type = "text", props = {}) => <FormField label={t(`auth.${name}`)} errorText={errors[name]} {...props}><Input type={type} value={form[name]} onChange={(value) => change(name, value)} invalid={!!errors[name]} {...props} /></FormField>;
  const run = async (work) => { setLoading(true); setAlert(null); try { await work(); } catch (error) { setAlert({ type: "error", message: error.message }); } finally { setLoading(false); } };

  // 계정 이름이 이미 쓰이는지는 가입 요청 때 서버가 판정한다. 로그인 전에는 미리 물어볼 수 없다
  // (누구나 어떤 이름이 쓰이는지 알아낼 수 있어 중복 확인 API는 로그인한 사용자만 부를 수 있다).
  const { ubuntuUsername } = form;
  const usernameFormatError = ubuntuUsername && !UBUNTU_USERNAME_PATTERN.test(ubuntuUsername) ? UBUNTU_USERNAME_FORMAT_ERROR : null;
  const usernameError = errors.ubuntuUsername || usernameFormatError;
  const send = (event) => { event.preventDefault(); if (!/@(dgu\.ac\.kr|dongguk\.edu)$/i.test(form.email)) return setErrors({ email: t("auth.domainHelp") }); run(async () => { const response = await authService.sendEmailVerification(form.email); if (response.status !== 200) throw new Error("인증번호 전송에 실패했습니다."); setCodeSent(true); setAlert({ type: "success", message: "인증번호가 이메일로 전송되었습니다." }); }); };
  const verify = () => { if (!form.verificationCode) return setErrors({ verificationCode: "인증번호를 입력해주세요." }); run(async () => { const response = await authService.verifyEmailCode(form.email, form.verificationCode); if (response.status !== 200) throw new Error("인증번호가 일치하지 않습니다."); setForm((current) => ({ ...current, contactEmail: current.contactEmail || current.email })); setStep(2); }); };
  const signup = (event) => { event.preventDefault(); const required = ["password", "confirmPassword", "name", "department", "studentId", "phone", "ubuntuUsername"]; const next = Object.fromEntries(required.filter((key) => !form[key]).map((key) => [key, `${t(`auth.${key}`)}을(를) 입력해주세요.`])); if (form.password && form.password.length < 8) next.password = "비밀번호는 8자 이상이어야 합니다."; if (form.confirmPassword && form.password !== form.confirmPassword) next.confirmPassword = "비밀번호가 일치하지 않습니다."; if (form.phone && !PHONE_PATTERN.test(form.phone)) next.phone = phoneFormatError(); if (form.contactEmail && !EMAIL_PATTERN.test(form.contactEmail)) next.contactEmail = t("auth.contactEmailInvalid"); if (form.ubuntuUsername && !UBUNTU_USERNAME_PATTERN.test(form.ubuntuUsername)) next.ubuntuUsername = UBUNTU_USERNAME_FORMAT_ERROR; setErrors(next); if (Object.keys(next).length) return; run(async () => { try { const response = await authService.register(form); if (response.status < 200 || response.status >= 300) throw new Error("회원가입에 실패했습니다."); } catch (error) { if (!UBUNTU_USERNAME_REJECTED_CODES.includes(error.code)) throw error; setErrors({ ubuntuUsername: error.message }); return; } window.location.href = "/login"; }); };

  return <main className="min-h-screen bg-white py-12 px-4"><div className="mx-auto w-full max-w-sm">
    <div className="flex items-center mb-8"><img src="/dongguk_university_logo.svg" alt="동국대학교 로고" width="153" height="48" className="h-12 w-auto mr-3" /><div><h1 className="text-xl font-bold">{t("auth.signup")}</h1><p className="text-sm text-gray-600">{t("auth.signupTitle")}</p></div></div>
    <div className="mb-8 flex items-center gap-2"><span className="bg-brand-500 text-white px-3 py-1">1</span><div className={`h-1 flex-1 ${step === 2 ? "bg-brand-500" : "bg-gray-200"}`} /><span className={`${step === 2 ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-600"} px-3 py-1`}>2</span></div>
    {alert ? <div className="mb-6"><Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>{alert.message}</Alert></div> : null}
    {step === 1 ? <form className="space-y-6" onSubmit={send}>{field("email", "email", { disabled: codeSent, constraintText: t("auth.domainHelp") })}{codeSent ? field("verificationCode") : null}<div className="flex gap-3">{codeSent ? <Button type="submit" loading={loading}>{t("auth.resend")}</Button> : null}<Button type={codeSent ? "button" : "submit"} variant="primary" fullWidth loading={loading} onClick={codeSent ? verify : undefined}>{codeSent ? t("auth.verify") : t("auth.sendCode")}</Button></div></form> : <form className="space-y-6" onSubmit={signup}>{field("email", "email", { disabled: true })}{field("password", "password", { constraintText: "8자 이상. 서버(SSH·Ubuntu) 접속에도 이 비밀번호를 써요." })}{field("confirmPassword", "password")}{field("name", "text", { constraintText: t("auth.slackHelp"), placeholder: "예: 홍길동" })}{field("contactEmail", "email", { constraintText: t("auth.contactEmailHelp") })}{field("department", "text", { placeholder: "예: 컴퓨터공학과" })}{field("studentId", "text", { placeholder: "예: 2025112345" })}{field("phone", "tel", { constraintText: phoneHelp(), placeholder: "010-1234-5678" })}<FormField label={t("auth.ubuntuUsername")} errorText={usernameError} constraintText={t("auth.ubuntuUsernameHelp")}><Input value={form.ubuntuUsername} onChange={(value) => change("ubuntuUsername", value)} invalid={!!usernameError} placeholder="소문자·숫자, 3~50자 (SSH 로그인 계정)" /></FormField><div className="flex gap-3"><Button onClick={() => setStep(1)}>{t("auth.previous")}</Button><Button type="submit" variant="primary" fullWidth loading={loading}>{t("auth.signup")}</Button></div></form>}
    <p className="mt-6 text-center text-sm text-gray-600">{t("auth.hasAccount")} <Link to="/login" className="font-medium text-brand-500">{t("auth.login")}</Link></p>
    <button className="mt-6 w-full text-sm text-gray-600" onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ko" : "en")}>{t("common.language")}</button>
  </div></main>;
}
