// 사용 기간 연장 폼 — 값은 새로 끝나는 날(YYYY-MM-DD)
import { useTranslation } from "react-i18next";
import { FormField, Input } from "../../../../design-system";
import { toLocalDateInput } from "./changeRequestRules";

function ExpiresAtForm({ server, value, onChange }) {
  const { t } = useTranslation();
  return (
    <>
      <FormField label={t("container.currentEnd")}>
        <Input value={toLocalDateInput(new Date(server.expiresAt))} readOnly />
      </FormField>
      <FormField label={t("container.newEnd")} constraintText={t("container.errExtendDate")}>
        <Input type="date" value={value} onChange={onChange} />
      </FormField>
    </>
  );
}
export default ExpiresAtForm;
