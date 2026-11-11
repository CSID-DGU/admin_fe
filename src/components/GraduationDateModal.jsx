import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FormField, Input, Modal } from "../design-system";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

const DISMISSED_KEY = "graduationModalDismissed";

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

const rememberDismissed = () => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // 저장하지 못하면 이번 화면에서만 닫힌다.
  }
};

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/**
 * 졸업 예정일이 없는 사용자(가입 때 입력란이 없던 기존 사용자)에게 접속할 때 입력을 받는다.
 * 닫으면 이번 접속 동안은 다시 뜨지 않는다. 입력하지 않은 동안은 마지막 컨테이너 종료 1년 규칙이 적용된다.
 */
export default function GraduationDateModal() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 내 정보를 받기 전(user 없음)이나 관리자 계정, 이미 입력한 사용자에게는 띄우지 않는다.
  const visible = !!user && user.role !== "ADMIN" && !user.expectedGraduationDate && !dismissed;

  const dismiss = () => {
    rememberDismissed();
    setDismissed(true);
  };

  const save = async () => {
    if (!date || date < todayIso()) {
      setError(t("auth.expectedGraduationDatePast"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await authService.updateExpectedGraduationDate(date);
    } catch (e) {
      setError(e?.status && e.message ? e.message : t("account.profileSaveFailed"));
      setSaving(false);
      return;
    }
    // 저장은 끝났다. 내 정보를 다시 받지 못해도 같은 날짜를 또 보내지 않도록 모달은 닫는다.
    try {
      await updateUser();
    } catch {
      dismiss();
    }
    setSaving(false);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={dismiss}
      header={t("graduationModal.title")}
      footer={<><Button onClick={dismiss}>{t("graduationModal.later")}</Button><Button variant="primary" loading={saving} disabled={saving} onClick={save}>{t("common.save")}</Button></>}
    >
      <div className="space-y-4">
        <p>{t("graduationModal.body")}</p>
        <FormField label={t("auth.expectedGraduationDate")} errorText={error} constraintText={t("graduationModal.help")} htmlFor="graduation-modal-date">
          <Input id="graduation-modal-date" type="date" min={todayIso()} value={date} onChange={(value) => { setDate(value); setError(""); }} invalid={!!error} />
        </FormField>
      </div>
    </Modal>
  );
}
