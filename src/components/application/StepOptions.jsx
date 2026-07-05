import { useApplicationForm } from "../../hooks/useApplicationForm";
import GroupSelector from "../Forms/GroupSelector";
import PortSelector from "../Forms/PortSelector";
import { FormField, Input, ExpandableSection } from "../../design-system";

const textareaClass = (invalid) =>
  `block w-full px-3 py-1.5 text-sm bg-(--decs-surface-input) text-(--decs-text-body) rounded-(--decs-radius-input) border focus:outline-none focus:ring-1 focus:ring-(--decs-border-focus) focus:border-(--decs-border-focus) ${
    invalid ? "border-(--decs-status-error)" : "border-(--decs-border-input)"
  }`;

const StepOptions = () => {
  const {
    formData,
    updateField,
    handleChange,
    handleBlur,
    getFieldError,
    errors,
    availableGroups,
    updateAvailableGroups,
    addGroup,
    removeGroup,
    addPort,
    removePort,
    updatePortUsagePurpose,
  } = useApplicationForm();

  const err = (name) => getFieldError(name) || errors[name];

  const handleCreateGroup = (newGroup) => {
    updateAvailableGroups([...availableGroups, newGroup]);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="저장 공간 (GB)"
          errorText={err("volume_size_gb")}
          constraintText="10GB부터 2000GB까지 신청할 수 있어요."
          htmlFor="volume_size_gb"
        >
          <Input
            id="volume_size_gb"
            type="number"
            value={formData.volume_size_gb}
            onChange={(value) => updateField("volume_size_gb", value)}
            placeholder="예: 500"
            iconName="cube"
            invalid={!!err("volume_size_gb")}
          />
        </FormField>

        <FormField
          label="사용 만료일"
          errorText={err("expires_at")}
          constraintText="서버 사용을 마칠 예정일이에요."
          htmlFor="expires_at"
        >
          <Input
            id="expires_at"
            type="date"
            value={formData.expires_at}
            onChange={(value) => updateField("expires_at", value)}
            invalid={!!err("expires_at")}
          />
        </FormField>
      </div>

      <FormField
        label="사용 목적"
        errorText={err("usage_purpose")}
        constraintText="연구 내용, 사용할 프레임워크, 예상 작업량을 함께 적어주세요."
        htmlFor="usage_purpose"
      >
        <textarea
          id="usage_purpose"
          name="usage_purpose"
          value={formData.usage_purpose}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={4}
          className={textareaClass(!!err("usage_purpose"))}
          placeholder="서버를 어떤 목적으로 사용할지 자세히 설명해주세요. (최소 10자)"
        />
      </FormField>

      <ExpandableSection
        headerText="고급 설정"
        defaultExpanded={
          formData.ubuntu_gids.length > 0 || formData.port_requests.length > 0
        }
      >
        <div className="space-y-6 pt-2">
          <GroupSelector
            selectedGroups={formData.ubuntu_gids}
            availableGroups={availableGroups}
            onAddGroup={addGroup}
            onRemoveGroup={removeGroup}
            onCreateGroup={handleCreateGroup}
            ubuntuUsername={formData.ubuntu_username}
          />

          <PortSelector
            selectedPorts={formData.port_requests}
            onAddPort={addPort}
            onRemovePort={removePort}
            onUpdatePortUsagePurpose={updatePortUsagePurpose}
          />
        </div>
      </ExpandableSection>
    </div>
  );
};

export default StepOptions;
