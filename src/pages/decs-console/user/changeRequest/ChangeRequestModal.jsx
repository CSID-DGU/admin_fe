// ChangeRequestModal — 변경 요청 창 하나. 고른 종류에 따라 폼만 바뀐다.
// 종류별 내용은 changeRequestTypes 등록표에서 꺼낸다. 열 때마다 새로 마운트해 입력을 비운다.
//
// 종류는 둘로 나뉜다. 컨테이너 단위(기간·그룹·포트)는 대상 컨테이너를 고르고 사유를 적어 여기서 제출한다.
// 계정 단위(accountScoped — 비밀번호)는 대상 컨테이너·사유가 없고 폼이 스스로 제출한다.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Modal, Select } from "../../../../design-system";
import { CHANGE_REQUEST_TYPES, REASON_MIN_LENGTH, findChangeRequestType } from "./changeRequestTypes";

function initialValues(server) {
  return Object.fromEntries(CHANGE_REQUEST_TYPES
    .filter((entry) => !entry.accountScoped)
    .map((entry) => [entry.type, server ? entry.initialValue(server) : null]));
}

function ChangeRequestModal({ servers = [], groupOptions = [], initialType, accountEmail, loadPendingTypes, onSubmit, onSubmitted, onDismiss }) {
  const { t } = useTranslation();
  const [requestId, setRequestId] = useState(servers[0]?.requestId ?? null);
  const server = servers.find((item) => item.requestId === requestId) ?? null;
  // 쓰는 컨테이너가 없으면 컨테이너 단위 종류는 고를 수 없다 — 계정 단위 종류에서 시작한다.
  const [type, setType] = useState(() => {
    const wanted = findChangeRequestType(initialType);
    return server || wanted.accountScoped ? wanted.type : CHANGE_REQUEST_TYPES.find((entry) => entry.accountScoped).type;
  });
  // 종류를 오가도 적던 내용이 남도록 종류별 값을 따로 둔다. 컨테이너를 바꾸면 그 컨테이너의 값으로 다시 채운다.
  const [values, setValues] = useState(() => initialValues(server));
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingTypes, setPendingTypes] = useState([]);

  // 같은 종류는 한 번에 하나만 검토받을 수 있다(서버 규칙). 못 읽어도 제출 때 서버가 막는다.
  useEffect(() => {
    if (requestId == null) return undefined;
    let cancelled = false;
    loadPendingTypes(requestId)
      .then((types) => { if (!cancelled) setPendingTypes(types); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [loadPendingTypes, requestId]);

  const entry = findChangeRequestType(type);
  const pending = !entry.accountScoped && pendingTypes.includes(type);
  const Form = entry.Form;
  const reasonLength = reason.trim().length;

  function selectServer(nextId) {
    const next = servers.find((item) => String(item.requestId) === String(nextId));
    if (!next) return;
    setRequestId(next.requestId);
    setValues(initialValues(next));
    setPendingTypes([]);
    setError(null);
  }

  async function submit() {
    const invalid = entry.validate(values[type], server, t)
      ?? (reasonLength >= REASON_MIN_LENGTH ? null : t("change.errReason", { min: REASON_MIN_LENGTH }));
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
      footer={entry.accountScoped ? (
        <Button variant="normal" onClick={onDismiss}>{t("common.close")}</Button>
      ) : (
        <>
          <Button variant="normal" disabled={submitting} onClick={onDismiss}>{t("common.cancel")}</Button>
          <Button variant="primary" loading={submitting} disabled={pending} onClick={submit}>{t("change.submit")}</Button>
        </>
      )}
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
              disabled: !option.accountScoped && !server,
              description: !option.accountScoped && !server
                ? t("change.needContainer")
                : !option.accountScoped && pendingTypes.includes(option.type) ? t("change.pending") : undefined,
            }))}
          />
        </FormField>
        {entry.accountScoped ? (
          <Form accountEmail={accountEmail} onSubmitted={onSubmitted} />
        ) : (
          <>
            {servers.length > 1 ? (
              <FormField label={t("change.targetLabel")}>
                <Select
                  selectedValue={String(server.requestId)}
                  onChange={selectServer}
                  disabled={submitting}
                  options={servers.map((item) => ({
                    value: String(item.requestId),
                    label: item.jobTitle,
                    description: `${item.gpuName} · ${item.expiresText}`,
                  }))}
                />
              </FormField>
            ) : null}
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
                <FormField
                  label={t("change.reason")}
                  description={t("change.reasonHelp")}
                  constraintText={(
                    <span style={{ color: reasonLength >= REASON_MIN_LENGTH ? "var(--decs-status-success)" : undefined }}>
                      {t("wizard.purposeCount", { min: REASON_MIN_LENGTH, current: reasonLength })}
                    </span>
                  )}
                >
                  <textarea
                    value={reason}
                    onChange={(event) => { setReason(event.target.value); setError(null); }}
                    rows={5}
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
          </>
        )}
      </div>
    </Modal>
  );
}
export default ChangeRequestModal;
