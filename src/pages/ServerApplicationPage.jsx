import { useState, useEffect } from "react";
import { ApplicationProvider, useApplication } from "../contexts/ApplicationContext";
import ApplicationStepper from "../components/application/ApplicationStepper";
import StepServerType from "../components/application/StepServerType";
import StepServerSpec from "../components/application/StepServerSpec";
import StepUserInfo from "../components/application/StepUserInfo";
import StepOptions from "../components/application/StepOptions";
import StepReview from "../components/application/StepReview";
import StepComplete from "../components/application/StepComplete";
import ChangeRequestForm from "../components/Forms/ChangeRequestForm";
import { requestService } from "../services/requestService";
import { mapApprovedRequestDtoToApplicationModel } from "../utils/requestMapper";
import Alert from "../components/UI/Alert";
import Button from "../components/UI/Button";
import {
  ServerIcon,
  PencilSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const STEP_COMPONENTS = {
  1: StepServerType,
  2: StepServerSpec,
  3: StepUserInfo,
  4: StepOptions,
  5: StepReview,
  6: StepComplete,
};

const WizardNavigation = () => {
  const { currentStep, goNext, goPrev } = useApplication();

  if (currentStep >= 5) return null;

  return (
    <div className="flex justify-between items-center pt-8 border-t border-gray-200 mt-8">
      <Button
        variant="outline"
        onClick={goPrev}
        disabled={currentStep === 1}
        icon={ChevronLeftIcon}
      >
        이전
      </Button>

      <Button
        variant="primary"
        onClick={goNext}
        className="bg-[#F68313] hover:bg-[#E6750F] border-[#F68313] hover:border-[#E6750F]"
      >
        다음
        <ChevronRightIcon className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

const WizardContent = () => {
  const { currentStep, isInitialLoading } = useApplication();

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F68313] mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="bg-white border border-gray-200 p-6 md:p-8">
      <ApplicationStepper />
      <div className="mt-12">
        <StepComponent />
      </div>
      <WizardNavigation />
    </div>
  );
};

const ServerApplicationPage = () => {
  const [activeTab, setActiveTab] = useState("new");
  const [changeFormData, setChangeFormData] = useState({
    request_id: "",
    change_type: "",
    new_value: "",
    reason: "",
  });
  const [alert, setAlert] = useState(null);
  const [gpuTypes, setGpuTypes] = useState([]);
  const [containerImages, setContainerImages] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [isChangeDataLoading, setIsChangeDataLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "change" && approvedRequests.length === 0) {
      setIsChangeDataLoading(true);
      Promise.all([
        requestService.getGpuTypes(),
        requestService.getContainerImages(),
        requestService.getGroups(),
        requestService.getApprovedRequests(),
      ])
        .then(([gpuRes, imgRes, grpRes, approvedRes]) => {
          if (gpuRes.status === 200) {
            const data = gpuRes.data?.data || gpuRes.data;
            if (Array.isArray(data)) {
              setGpuTypes(
                data.map((gpu) => {
                  let gpuModel = "Unknown GPU";
                  if (gpu.description) {
                    const parts = gpu.description.trim().split(" ");
                    if (parts.length >= 2) gpuModel = parts.slice(0, 2).join(" ");
                  }
                  return { ...gpu, gpuModel };
                })
              );
            }
          }
          if (imgRes.status === 200) {
            const data = imgRes.data?.data || imgRes.data;
            if (Array.isArray(data)) setContainerImages(data);
          }
          if (grpRes.status === 200) {
            const data = grpRes.data?.data || grpRes.data;
            if (Array.isArray(data)) {
              setAvailableGroups(
                data.map((g) => ({
                  ubuntu_gid: g.ubuntuGid || g.ubuntu_gid,
                  group_name: g.groupName || g.group_name,
                }))
              );
            }
          }
          if (approvedRes.status === 200) {
            const data = approvedRes.data?.data || approvedRes.data;
            if (Array.isArray(data)) {
              setApprovedRequests(data.map(mapApprovedRequestDtoToApplicationModel));
            }
          }
        })
        .catch((err) => {
          console.error("변경 요청 데이터 로드 실패:", err);
          setAlert({ type: "error", message: "데이터를 불러오는데 실패했습니다." });
        })
        .finally(() => setIsChangeDataLoading(false));
    }
  }, [activeTab, approvedRequests.length]);

  const handleChangeSuccess = (message, type = "success") => {
    setAlert({ type, message });
    setTimeout(() => {
      const el =
        document.querySelector("main.overflow-auto") ||
        document.querySelector("main");
      if (el) el.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">서버 관리</h1>
        <p className="text-gray-600 mt-1">
          새로운 서버를 신청하거나 기존 서버 정보를 변경하세요.
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setActiveTab("new");
              setAlert(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "new"
                ? "border-[#F68313] text-[#F68313]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ServerIcon className="w-5 h-5 inline mr-2" />
            서버 신청서
          </button>
          <button
            onClick={() => {
              setActiveTab("change");
              setAlert(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "change"
                ? "border-[#F68313] text-[#F68313]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <PencilSquareIcon className="w-5 h-5 inline mr-2" />
            승인된 서버 정보 변경
          </button>
        </nav>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          onClose={() => setAlert(null)}
          title={alert.type === "success" ? "변경 요청 완료" : "변경 요청 실패"}
        >
          {alert.message}
        </Alert>
      )}

      {activeTab === "new" ? (
        <ApplicationProvider>
          <WizardContent />
        </ApplicationProvider>
      ) : isChangeDataLoading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F68313] mx-auto"></div>
            <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      ) : (
        <ChangeRequestForm
          changeFormData={changeFormData}
          setChangeFormData={setChangeFormData}
          gpuTypes={gpuTypes}
          containerImages={containerImages}
          availableGroups={availableGroups}
          userRequests={approvedRequests}
          onUpdateAvailableGroups={setAvailableGroups}
          onSuccess={handleChangeSuccess}
        />
      )}
    </div>
  );
};

export default ServerApplicationPage;
