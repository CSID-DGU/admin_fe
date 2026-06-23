import { useState } from "react";
import { useApplication } from "../../contexts/ApplicationContext";
import Button from "../UI/Button";
import {
  ServerIcon,
  CpuChipIcon,
  ComputerDesktopIcon,
  UserIcon,
  CircleStackIcon,
  CalendarIcon,
  DocumentTextIcon,
  UsersIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ReviewRow = ({ icon: Icon, label, value, onEdit }) => (
  <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-start gap-3 min-w-0">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 mt-0.5 break-words">
          {value || <span className="text-gray-400">미입력</span>}
        </dd>
      </div>
    </div>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-brand-500 hover:underline shrink-0 ml-4"
      >
        수정
      </button>
    )}
  </div>
);

const StepReview = () => {
  const {
    formData,
    gpuTypes,
    containerImages,
    availableGroups,
    goToStep,
    submitApplication,
    isSubmitting,
  } = useApplication();

  const [submitError, setSubmitError] = useState(null);

  const selectedGpu = gpuTypes.find(
    (g) => g.rsgroupId !== undefined && g.rsgroupId !== null && String(g.rsgroupId) === formData.rsgroup_id
  );
  const selectedImage = containerImages.find((img) => {
    const id = img.imageId ?? img.image_id;
    return id !== undefined && id !== null && String(id) === formData.image_id;
  });

  const groupNames = formData.ubuntu_gids
    .map((gid) => {
      const g = availableGroups.find((ag) => ag.ubuntu_gid === gid);
      return g ? `${g.group_name} (${gid})` : `GID: ${gid}`;
    })
    .join(", ");

  const portList = formData.port_requests
    .map((p) => `${p.internalPort} (${p.usagePurpose})`)
    .join(", ");

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      await submitApplication();
    } catch (err) {
      setSubmitError(
        err.message || "서버 신청에 실패했습니다. 다시 시도해주세요."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">신청 내용을 확인하세요</h2>
        <p className="text-gray-500 mt-2">
          아래 내용을 확인한 후 제출 버튼을 눌러주세요.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Server & Spec */}
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            서버 및 사양
          </h3>
          <dl>
            <ReviewRow
              icon={ServerIcon}
              label="서버 유형"
              value={formData.server_type}
              onEdit={() => goToStep(1)}
            />
            <ReviewRow
              icon={CpuChipIcon}
              label="GPU"
              value={
                selectedGpu
                  ? `${selectedGpu.gpuModel} (${selectedGpu.ramGb}GB)`
                  : formData.rsgroup_id
              }
              onEdit={() => goToStep(2)}
            />
            <ReviewRow
              icon={ComputerDesktopIcon}
              label="컨테이너 이미지"
              value={
                selectedImage
                  ? `${selectedImage.imageName || selectedImage.image_name} ${
                      selectedImage.imageVersion || selectedImage.image_version
                    }`
                  : formData.image_id
              }
              onEdit={() => goToStep(2)}
            />
          </dl>
        </div>

        {/* User Info */}
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">계정 정보</h3>
          <dl>
            <ReviewRow
              icon={UserIcon}
              label="우분투 계정명"
              value={formData.ubuntu_username}
              onEdit={() => goToStep(3)}
            />
            <ReviewRow
              icon={UserIcon}
              label="비밀번호"
              value={formData.ubuntu_password ? "••••••••" : ""}
              onEdit={() => goToStep(3)}
            />
          </dl>
        </div>

        {/* Options */}
        <div className="bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">추가 옵션</h3>
          <dl>
            <ReviewRow
              icon={CircleStackIcon}
              label="볼륨 크기"
              value={formData.volume_size_gb ? `${formData.volume_size_gb} GB` : ""}
              onEdit={() => goToStep(4)}
            />
            <ReviewRow
              icon={CalendarIcon}
              label="사용 만료일"
              value={formData.expires_at}
              onEdit={() => goToStep(4)}
            />
            <ReviewRow
              icon={DocumentTextIcon}
              label="사용 목적"
              value={formData.usage_purpose}
              onEdit={() => goToStep(4)}
            />
            {formData.ubuntu_gids.length > 0 && (
              <ReviewRow
                icon={UsersIcon}
                label="그룹"
                value={groupNames}
                onEdit={() => goToStep(4)}
              />
            )}
            {formData.port_requests.length > 0 && (
              <ReviewRow
                icon={GlobeAltIcon}
                label="포트"
                value={portList}
                onEdit={() => goToStep(4)}
              />
            )}
          </dl>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm text-blue-700">
          <ul className="list-disc list-inside space-y-1">
            <li>신청 후 관리자 승인까지 1-3일이 소요될 수 있습니다.</li>
            <li>승인 후 서버 접속 정보가 이메일로 전송됩니다.</li>
            <li>CUDA 버전과 GPU 호환성을 확인해주세요.</li>
          </ul>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Button
            variant="primary"
            size="large"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full max-w-xs bg-brand-500 hover:bg-brand-600 border-brand-500 hover:border-brand-600"
          >
            <ServerIcon className="w-5 h-5 mr-2" />
            신청 제출
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepReview;
