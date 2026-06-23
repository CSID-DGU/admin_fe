import { useApplicationForm } from "../../hooks/useApplicationForm";
import Input from "../UI/Input";
import GroupSelector from "../Forms/GroupSelector";
import PortSelector from "../Forms/PortSelector";
import {
  CircleStackIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

const StepOptions = () => {
  const {
    formData,
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

  const handleCreateGroup = (newGroup) => {
    updateAvailableGroups([...availableGroups, newGroup]);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">추가 옵션을 설정하세요</h2>
        <p className="text-gray-500 mt-2">
          볼륨, 만료일, 사용 목적 등을 설정합니다.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="볼륨 크기 (GB)"
            name="volume_size_gb"
            type="number"
            value={formData.volume_size_gb}
            onChange={handleChange}
            onBlur={handleBlur}
            error={getFieldError("volume_size_gb") || errors.volume_size_gb}
            placeholder="예: 500"
            help="10GB ~ 2000GB 사이"
            min="10"
            max="2000"
            required
            icon={CircleStackIcon}
          />

          <Input
            label="사용 만료일"
            name="expires_at"
            type="date"
            value={formData.expires_at}
            onChange={handleChange}
            onBlur={handleBlur}
            error={getFieldError("expires_at") || errors.expires_at}
            help="서버 사용 종료 예정일"
            required
            icon={CalendarIcon}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            사용 목적 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="usage_purpose"
            value={formData.usage_purpose}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={4}
            className={`block w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
              (getFieldError("usage_purpose") || errors.usage_purpose)
                ? "border-red-300 text-red-900"
                : "border-gray-300 text-gray-900"
            }`}
            placeholder="서버를 어떤 목적으로 사용할지 자세히 설명해주세요. (최소 10자)"
          />
          {(getFieldError("usage_purpose") || errors.usage_purpose) && (
            <p className="text-sm text-red-600 mt-1">
              {getFieldError("usage_purpose") || errors.usage_purpose}
            </p>
          )}
          {!getFieldError("usage_purpose") && !errors.usage_purpose && (
            <p className="text-xs text-gray-500 mt-1">
              연구 내용, 사용할 프레임워크, 예상 작업량 등을 포함해주세요
            </p>
          )}
        </div>

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
    </div>
  );
};

export default StepOptions;
