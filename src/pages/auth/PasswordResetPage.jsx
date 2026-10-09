import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PasswordResetForm from "../../components/PasswordResetForm";

/** 비밀번호를 잊어 로그인하지 못하는 사용자가 비밀번호 변경을 신청하는 화면. 로그인한 사용자는 변경 요청 화면에서 같은 폼으로 신청한다. */
export default function PasswordResetPage() {
  const { t, i18n } = useTranslation();

  return <main className="min-h-screen bg-white py-12 px-4"><div className="mx-auto w-full max-w-sm">
    <div className="flex items-center mb-8"><img src="/dongguk_university_logo.svg" alt="동국대학교 로고" width="153" height="48" className="h-12 w-auto mr-3" /><div><h1 className="text-xl font-bold">{t("auth.resetTitle")}</h1><p className="text-sm text-gray-600">{t("auth.resetSubtitle")}</p></div></div>
    <PasswordResetForm />
    <p className="mt-6 text-center text-sm text-gray-600"><Link to="/login" className="font-medium text-brand-500">{t("auth.backToLogin")}</Link></p>
    <button className="mt-6 w-full text-sm text-gray-600" onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ko" : "en")}>{t("common.language")}</button>
  </div></main>;
}
