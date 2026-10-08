// 공유 그룹 추가 폼 — 값은 추가할 그룹 목록(groupOptions 항목)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, FormField, Select } from "../../../../design-system";

function GroupForm({ server, groupOptions = [], value, onChange }) {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // 그룹 추가 변경 요청은 gid로 보낸다. 아직 만들어지지 않은 새 그룹(gid 없음)은 새 신청으로만 쓸 수 있어 뺀다.
  const currentGids = new Set((server.groups ?? []).map((group) => String(group.ubuntuGid)));
  const addedIds = new Set(value.map((group) => group.value));
  const options = groupOptions
    .filter((group) => group.ubuntuGid != null && !currentGids.has(String(group.ubuntuGid)))
    .map((group) => ({ ...group, disabled: addedIds.has(group.value) }));

  function addGroup() {
    const group = options.find((option) => option.value === selectedGroupId);
    if (!group || group.disabled) return;
    onChange([...value, group]);
    setSelectedGroupId("");
  }

  return (
    <>
      <Alert type="info" header={t("container.groupDelayTitle")}>
        {t("container.groupDelayBody")}
      </Alert>
      <FormField label={t("container.currentGroups")}>
        {(server.groups ?? []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)" }}>
            {server.groups.map((group) => (
              <Badge key={group.ubuntuGid} color="grey">{group.groupName}</Badge>
            ))}
          </div>
        ) : (
          <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>{t("common.none")}</span>
        )}
      </FormField>
      <FormField label={t("container.groupsToAdd")}>
        <div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
          <Select selectedValue={selectedGroupId} onChange={setSelectedGroupId} options={options} placeholder={t("wizard.pickGroup")} style={{ flex: 1 }} />
          <Button iconName="plus" onClick={addGroup} disabled={!selectedGroupId || addedIds.has(selectedGroupId)} ariaLabel={t("container.addGroupAria")}>{t("common.add")}</Button>
        </div>
        {value.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xs)" }}>
            {value.map((group) => (
              <span key={group.value} style={{ display: "inline-flex", alignItems: "center", gap: "var(--decs-space-xxxs)" }}>
                <Badge color="blue">{group.label}</Badge>
                <Button variant="icon" iconName="x-mark" onClick={() => onChange(value.filter((g) => g.value !== group.value))} ariaLabel={t("container.removeGroupAria", { name: group.label })} />
              </span>
            ))}
          </div>
        ) : null}
      </FormField>
    </>
  );
}
export default GroupForm;
