// 추가 포트 변경 폼 — 값은 승인 뒤에 열려 있을 추가 포트 전체 목록([{ internalPort, usagePurpose }])
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, FormField, Input, Table } from "../../../../design-system";
import { MAX_EXTRA_PORTS, PORT_PURPOSE_MAX_LENGTH, PROTECTED_PORTS, RESERVED_PORT_PURPOSES } from "./changeRequestRules";

function PortForm({ value, onChange }) {
  const { t } = useTranslation();
  const [portNumber, setPortNumber] = useState("");
  const [portPurpose, setPortPurpose] = useState("");
  const [portError, setPortError] = useState(null);

  function addPort() {
    const internalPort = Number(portNumber);
    const usagePurpose = portPurpose.trim() || t("data.portDefault", { port: internalPort });
    const error = addError(internalPort, usagePurpose);
    if (error) {
      setPortError(error);
      return;
    }
    onChange([...value, { internalPort, usagePurpose }]);
    setPortNumber("");
    setPortPurpose("");
    setPortError(null);
  }

  function addError(internalPort, usagePurpose) {
    if (!Number.isInteger(internalPort) || internalPort < 1 || internalPort > 65535) return t("wizard.errPortRange");
    if (PROTECTED_PORTS.includes(internalPort)) return t("change.errPortProtected");
    if (value.some((port) => port.internalPort === internalPort)) return t("wizard.errPortDuplicate");
    if (value.length >= MAX_EXTRA_PORTS) return t("change.errPortMax", { max: MAX_EXTRA_PORTS });
    if (RESERVED_PORT_PURPOSES.includes(usagePurpose.toLowerCase())) return t("change.errPortPurposeReserved", { purpose: usagePurpose });
    if (usagePurpose.length > PORT_PURPOSE_MAX_LENGTH) return t("change.errPortPurposeLong", { max: PORT_PURPOSE_MAX_LENGTH });
    return null;
  }

  return (
    <>
      <Alert type="info">{t("change.portNotice")}</Alert>
      <FormField label={t("change.portList")} errorText={portError} constraintText={t("change.portHelp", { max: MAX_EXTRA_PORTS })}>
        <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) auto", gap: "var(--decs-space-xs)" }}>
          <Input value={portNumber} onChange={(next) => { setPortNumber(next); setPortError(null); }} type="number" min={1} max={65535} step={1} placeholder={t("wizard.portPlaceholder")} invalid={!!portError} />
          <Input value={portPurpose} onChange={setPortPurpose} placeholder={t("wizard.portPurposePlaceholder")} />
          <Button iconName="plus" onClick={addPort} ariaLabel={t("wizard.addPortAria")}>{t("common.add")}</Button>
        </div>
        {value.length > 0 ? (
          <Table
            density="compact"
            trackBy="internalPort"
            items={value}
            style={{ marginTop: "var(--decs-space-xs)" }}
            columns={[
              { id: "port", header: t("wizard.port"), cell: (port) => port.internalPort },
              { id: "purpose", header: t("wizard.portPurpose"), cell: (port) => port.usagePurpose },
              { id: "remove", header: "", width: 60, cell: (port) => <Button variant="icon" iconName="trash" onClick={() => onChange(value.filter((p) => p.internalPort !== port.internalPort))} ariaLabel={t("wizard.removePortAria", { port: port.internalPort })} /> },
            ]}
          />
        ) : (
          <div style={{ marginTop: "var(--decs-space-xs)", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
            {t("change.portEmpty")}
          </div>
        )}
      </FormField>
    </>
  );
}
export default PortForm;
