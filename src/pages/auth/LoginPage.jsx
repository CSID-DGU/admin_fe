import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Input } from "../../design-system";

export default function LoginPage({ onLogin }) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");

  const change = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); };
  const submit = async (event) => {
    event.preventDefault();
    const next = { email: !form.email ? "이메일을 입력해주세요." : !form.email.includes("@") ? "올바른 이메일 형식을 입력해주세요." : "", password: form.password ? "" : "비밀번호를 입력해주세요." };
    setErrors(next);
    if (next.email || next.password) return;
    setLoading(true); setAlert("");
    try { const result = await onLogin(form); if (!result.success) setAlert(result.error); }
    catch { setAlert("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  return <div className="h-screen bg-white flex">
    <main className="flex-1 overflow-y-auto">
      <div className="min-h-full flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center mb-8"><img src="/dongguk_university_logo.svg" alt="동국대학교 로고" className="h-12 w-auto mr-3" /><div><h1 className="text-xl font-bold text-gray-900">DGU AI Lab</h1><p className="text-sm text-gray-600">{t("auth.loginTitle")}</p></div></div>
          <form className="space-y-6" onSubmit={submit}>
            {alert ? <Alert type="error" dismissible onDismiss={() => setAlert("")}>{alert}</Alert> : null}
            <FormField label={t("auth.email")} errorText={errors.email}><Input type="email" value={form.email} onChange={(value) => change("email", value)} placeholder="example@dgu.ac.kr" invalid={!!errors.email} /></FormField>
            <FormField label={t("auth.password")} errorText={errors.password}><Input type="password" value={form.password} onChange={(value) => change("password", value)} placeholder={t("auth.password")} invalid={!!errors.password} /></FormField>
            <Link to="/forgot-password" className="block text-sm font-medium text-brand-500 hover:text-brand-600 truncate" title={t("auth.forgot")}>{t("auth.forgot")}</Link>
            <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading}>{t("auth.login")}</Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">{t("auth.noAccount")} <Link to="/signup" className="font-medium text-brand-500 hover:text-brand-600">{t("auth.signup")}</Link></div>
          <button className="mt-6 w-full text-sm text-gray-600" onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ko" : "en")}>{t("common.language")}</button>
        </div>
      </div>
    </main>
    <div className="hidden lg:block relative w-0 flex-1"><img className="absolute inset-0 h-full w-full object-cover" src="/dongguk_university_picture_1.jpg" alt="동국대학교" /><div className="absolute inset-0 bg-brand-500 opacity-20" /></div>
  </div>;
}
