// ChangeRequestModal — 변경 요청 창 하나. 고른 종류에 따라 폼만 바뀌고 사유·제출은 공통이다.
// 종류별 내용은 changeRequestTypes 등록표에서 꺼낸다. 열 때마다 새로 마운트해 입력을 비운다.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Modal, Select } from "../../../../design-system";
import { CHANGE_REQUEST_TYPES, findChangeRequestType } from "./changeRequestTypes";

function ChangeRequestModal({ server, groupOptions = [], initialType, loadPendingTypes, onSubmit, onDismiss }) {
  const { t } = useTranslation();
  const [type, setType] = useState(findChangeRequestType(initialType).type);
  // 종류를 오가도 적던 내용이 남도록 종류별 값을 따로 둔다.
  const [values, setValues] = useState(() => Object.fromEntries(
    CHANGE_REQUEST_TYPES.map((entry) => [entry.type, entry.initialValue(server)])
  ));
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingTypes, setPendingTypes] = useState([]);

  // 같은 종류는 한 번에 하나만 검토받을 수 있다(서버 규칙). 못 읽어도 제출 때 서버가 막는다.
  useEffect(() => {
    let cancelled = false;
    loadPendingTypes(server.requestId)
      .then((types) => { if (!cancelled) setPendingTypes(types); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [loadPendingTypes, server.requestId]);

  const entry = findChangeRequestType(type);
  const pending = pendingTypes.includes(type);
  const Form = entry.Form;

  async function submit() {
    const invalid = entry.validate(values[type], server, t) ?? (reason.trim() ? null : t("change.errReason"));
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        requestId: server.requestId,
        changeType: type,
        newValue: entry.toNewValue(values[type], server),
        reason: reason.trim(),
      });
    } catch (failure) {
      setError(failure.response?.data?.message || failure.message || t("change.errFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible
      onDismiss={() => !submitting && onDismiss()}
      header={t("change.modalTitle")}
      footer={<>
        <Button variant="normal" disabled={submitting} onClick={onDismiss}>{t("common.cancel")}</Button>
        <Button variant="primary" loading={submitting} disabled={pending} onClick={submit}>{t("change.submit")}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <FormField label={t("change.typeLabel")}>
          <Select
            selectedValue={type}
            onChange={(next) => { setType(next); setError(null); }}
            disabled={submitting}
            options={CHANGE_REQUEST_TYPES.map((option) => ({
              value: option.type,
              label: t(option.labelKey),
              description: pendingTypes.includes(option.type) ? t("change.pending") : undefined,
            }))}
          />
        </FormField>
        {pending ? (
          <Alert type="warning">{t("change.pendingBody")}</Alert>
        ) : (
          <>
            <Form
              server={server}
              groupOptions={groupOptions}
              value={values[type]}
              onChange={(next) => setValues((prev) => ({ ...prev, [type]: next }))}
            />
            <FormField label={t("change.reason")} constraintText={t("change.reasonHelp")}>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={t(entry.reasonPlaceholderKey)}
                style={{
                  width: "100%", boxSizing: "border-box", resize: "vertical",
                  padding: "var(--decs-space-s) var(--decs-space-m)",
                  font: "inherit", color: "var(--decs-text-body)",
                  background: "var(--decs-surface-input)",
                  border: "thin solid var(--decs-border-input)",
                  borderRadius: "var(--decs-radius-input)",
                }}
              />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
}
export default ChangeRequestModal;
