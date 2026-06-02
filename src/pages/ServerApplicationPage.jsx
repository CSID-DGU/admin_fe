import { useState, useEffect } from "react";
import Alert from "../components/UI/Alert";
import ServerForm from "../components/Forms/ServerForm";
import ChangeRequestForm from "../components/Forms/ChangeRequestForm";
import { requestService } from "../services/requestService";
import { mapApprovedRequestDtoToApplicationModel } from "../utils/requestMapper";
import {
  ServerIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

const ServerApplicationPage = () => {
  const [activeTab, setActiveTab] = useState("new");
  const [formData, setFormData] = useState({
    ubuntu_username: "",
    ubuntu_password: "",
    rsgroup_id: "",
    image_id: "",
    expires_at: "",
    volume_size_gb: "",
    usage_purpose: "",
    ubuntu_gids: [],
    port_requests: [],
  });
  const [changeFormData, setChangeFormData] = useState({
    request_id: "",
    change_type: "",
    new_value: "",
    reason: "",
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [gpuTypes, setGpuTypes] = useState([]);
  const [containerImages, setContainerImages] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);

  const updateAvailableGroups = (newGroups) => {
    setAvailableGroups(newGroups);
  };

  const scrollToTop = () => {
    setTimeout(() => {
      const mainElement =
        document.querySelector("main.overflow-auto") ||
        document.querySelector("main") ||
        document.querySelector('[class*="overflow-auto"]');

      if (mainElement) {
        mainElement.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      } else {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const handleSuccess = (message, type = "success") => {
    setAlert({ type, message });
    scrollToTop();
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gpuTypesResponse, imagesResponse, groupsResponse, approvedResponse] =
          await Promise.all([
            requestService.getGpuTypes(),
            requestService.getContainerImages(),
            requestService.getGroups(),
            requestService.getApprovedRequests(),
          ]);

        if (gpuTypesResponse.status === 200) {
          const gpuData = gpuTypesResponse.data?.data || gpuTypesResponse.data;
          if (Array.isArray(gpuData)) {
            const processedGpuData = gpuData.map((gpu) => {
              let gpuModel = "Unknown GPU";
              if (gpu.description) {
                const parts = gpu.description.trim().split(" ");
                if (parts.length >= 2) {
                  gpuModel = parts.slice(0, 2).join(" ");
                }
              }
              return {
                ...gpu,
                gpuModel,
              };
            });
            setGpuTypes(processedGpuData);
          } else {
            setGpuTypes([]);
          }
        } else {
          setGpuTypes([]);
        }

        if (imagesResponse.status === 200) {
          const imageData = imagesResponse.data?.data || imagesResponse.data;
          if (Array.isArray(imageData)) {
            setContainerImages(imageData);
          } else {
            setContainerImages([]);
          }
        } else {
          setContainerImages([]);
        }

        if (groupsResponse.status === 200) {
          const groupData = groupsResponse.data?.data || groupsResponse.data;
          if (Array.isArray(groupData)) {
            const processedGroups = groupData.map((group) => ({
              ubuntu_gid: group.ubuntuGid || group.ubuntu_gid,
              group_name: group.groupName || group.group_name,
            }));
            setAvailableGroups(processedGroups);
          } else {
            setAvailableGroups([]);
          }
        } else {
          setAvailableGroups([]);
        }

        if (approvedResponse.status === 200) {
          const approvedData = approvedResponse.data?.data || approvedResponse.data;
          if (Array.isArray(approvedData)) {
            // API 응답 데이터를 UI에서 사용할 형태로 변환
            const processedApprovedRequests = approvedData.map(
              mapApprovedRequestDtoToApplicationModel
            );
            setApprovedRequests(processedApprovedRequests);
          } else {
            setApprovedRequests([]);
          }
        } else {
          setApprovedRequests([]);
        }

        const defaultExpiry = new Date();
        defaultExpiry.setMonth(defaultExpiry.getMonth() + 3);
        setFormData((prev) => ({
          ...prev,
          expires_at: defaultExpiry.toISOString().split("T")[0],
        }));
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
        setAlert({
          type: "error",
          message: "초기 데이터를 불러오는데 실패했습니다.",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

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
          title={
            alert.type === "success"
              ? activeTab === "new"
                ? "신청 완료"
                : "변경 요청 완료"
              : activeTab === "new"
              ? "신청 실패"
              : "변경 요청 실패"
          }
        >
          {alert.message}
        </Alert>
      )}

      {activeTab === "new" ? (
        <ServerForm
          formData={formData}
          setFormData={setFormData}
          gpuTypes={gpuTypes}
          containerImages={containerImages}
          availableGroups={availableGroups}
          onUpdateAvailableGroups={updateAvailableGroups}
          onSuccess={handleSuccess}
        />
      ) : (
        <ChangeRequestForm
          changeFormData={changeFormData}
          setChangeFormData={setChangeFormData}
          gpuTypes={gpuTypes}
          containerImages={containerImages}
          availableGroups={availableGroups}
          userRequests={approvedRequests}
          onUpdateAvailableGroups={updateAvailableGroups}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default ServerApplicationPage;
