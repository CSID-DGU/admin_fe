import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Input, Modal } from "../design-system";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISMISSED_KEY = "slackMembershipModalDismissed";

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

/**
 * Slack에서 이 사람을 찾지 못했을 때만 뜬다. 지금 신청하면 거절되므로, 신청 전에 Slack에 가입한 이메일을 받아 둔다.
 * 닫으면 이번 접속 동안은 다시 뜨지 않고, 확인되면 그 뒤로는 뜨지 않는다.
 */
export default function SlackMembershipModal() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [visible, setVisible] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || wasDismissed()) return undefined;
    let cancelled = false;
    authService.getSlackMembership()
      .then((status) => {
        if (cancelled || status !== "NOT_MEMBER") return;
        setContactEmail(user.contactEmail || "");
        setVisible(true);
      })
      .catch(() => {
        // 확인하지 못하면 띄우지 않는다. 신청할 때 다시 확인한다.
      });
    return () => { cancelled = true; };
    // 접속한 사람이 바뀔 때만 다시 확인한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const dismiss = () => {
    rememberDismissed();
    setVisible(false);
  };

  const save = async () => {
    const value = contactEmail.trim();
    if (!value || !EMAIL_PATTERN.test(value)) {
      setError(t("auth.contactEmailInvalid"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await authService.updateContactEmail(value);
      await updateUser();
      if ((await authService.getSlackMembership()) === "NOT_MEMBER") {
        setError(t("slackModal.stillNotFound"));
      } else {
        setVisible(false);
      }
    } catch (e) {
      // 서버가 답한 오류는 원인별 문구를 그대로 쓰고, 연결 실패 등은 기본 문구를 쓴다.
      setError(e?.status && e.message ? e.message : t("account.profileSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={dismiss}
      header={t("slackModal.title")}
      footer={<><Button onClick={dismiss}>{t("slackModal.later")}</Button><Button variant="primary" loading={saving} disabled={saving} onClick={save}>{t("common.save")}</Button></>}
    >
      <div className="space-y-4">
        <p>{t("slackModal.body")}</p>
        <FormField label={t("auth.contactEmail")} errorText={error} constraintText={t("slackModal.emailHelp", { email: user?.email || "" })} htmlFor="slack-modal-contact-email">
          <Input id="slack-modal-contact-email" type="email" value={contactEmail} onChange={(value) => { setContactEmail(value); setError(""); }} invalid={!!error} />
        </FormField>
        <Alert type="info">{t("slackModal.nameNote", { name: user?.name || "" })}</Alert>
      </div>
    </Modal>
  );
}
