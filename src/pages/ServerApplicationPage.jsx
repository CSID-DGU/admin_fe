import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ApplicationProvider, useApplication } from "../contexts/ApplicationContext";
import StepServerType from "../components/application/StepServerType";
import StepServerSpec from "../components/application/StepServerSpec";
import StepUserInfo from "../components/application/StepUserInfo";
import StepOptions from "../components/application/StepOptions";
import StepReview from "../components/application/StepReview";
import StepComplete from "../components/application/StepComplete";
import ChangeRequestForm from "../components/Forms/ChangeRequestForm";
import { requestService } from "../services/requestService";
import {
  normalizeContainerImage,
  normalizeGpuType,
} from "../utils/applicationDataMapper";
import { mapApprovedRequestDtoToApplicationModel } from "../utils/requestMapper";
import {
  Wizard,
  Header,
  Tabs,
  Alert,
  Container,
  StatusIndicator,
} from "../design-system";

const LoadingState = ({ children }) => (
  <div className="flex items-center justify-center min-h-96">
    <StatusIndicator type="loading">{children}</StatusIndicator>
  </div>
);

const WizardContent = () => {
  const navigate = useNavigate();
  const {
    currentStep,
    goNext,
    goToStep,
    isInitialLoading,
    submitApplication,
    isSubmitting,
  } = useApplication();
  const [submitError, setSubmitError] = useState(null);

  if (isInitialLoading) {
    return <LoadingState>데이터를 불러오고 있어요...</LoadingState>;
  }

  if (currentStep >= 6) {
    return <StepComplete />;
  }

  const steps = [
    {
      title: "서버 유형",
      description: "사용할 서버를 골라주세요.",
      content: <StepServerType />,
    },
    {
      title: "서버 사양",
      description: "GPU와 컨테이너 이미지를 골라주세요.",
      content: <StepServerSpec />,
    },
    {
      title: "계정 정보",
      description: "서버에서 사용할 계정을 만들어주세요.",
      content: <StepUserInfo />,
    },
    {
      title: "추가 옵션",
      description: "저장 공간과 사용 기간을 알려주세요.",
      content: <StepOptions />,
    },
    {
      title: "신청 검토",
      description: "입력한 내용을 확인하고 제출해주세요.",
      content: (
        <div className="space-y-6">
          {submitError && (
            <Alert
              type="error"
              header="신청 제출 실패"
              dismissible
              onDismiss={() => setSubmitError(null)}
            >
              {submitError}
            </Alert>
          )}
          <StepReview />
        </div>
      ),
    },
  ];

  // Wizard is 0-based; the application state machine is 1-based.
  // Forward moves go through goNext so step validation keeps gating navigation.
  const handleNavigate = (index) => {
    const target = index + 1;
    if (target > currentStep) {
      goNext();
    } else {
      goToStep(target);
    }
  };

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
    <Container>
      <Wizard
        steps={steps}
        activeStepIndex={currentStep - 1}
        onNavigate={handleNavigate}
        onCancel={() => navigate("/requests")}
        onSubmit={handleSubmit}
        submitLabel="신청 제출"
        isLoadingNextStep={isSubmitting}
      />
    </Container>
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
            if (Array.isArray(data)) setGpuTypes(data.map(normalizeGpuType));
          }
          if (imgRes.status === 200) {
            const data = imgRes.data?.data || imgRes.data;
            if (Array.isArray(data)) {
              setContainerImages(data.map(normalizeContainerImage));
            }
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

  const tabs = [
    {
      id: "new",
      label: "서버 신청서",
      content: (
        <ApplicationProvider>
          <WizardContent />
        </ApplicationProvider>
      ),
    },
    {
      id: "change",
      label: "승인된 서버 정보 변경",
      content: isChangeDataLoading ? (
        <LoadingState>데이터를 불러오고 있어요...</LoadingState>
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
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        variant="h1"
        description="새로운 서버를 신청하거나 기존 서버 정보를 변경하세요."
      >
        서버 관리
      </Header>

      {alert && (
        <Alert
          type={alert.type}
          header={alert.type === "success" ? "변경 요청 완료" : "변경 요청 실패"}
          dismissible
          onDismiss={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <Tabs
        tabs={tabs}
        activeTabId={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          setAlert(null);
        }}
      />
    </div>
  );
};

export default ServerApplicationPage;
