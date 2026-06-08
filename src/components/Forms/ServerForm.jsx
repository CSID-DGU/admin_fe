import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../UI/Card";
import Button from "../UI/Button";
import Input from "../UI/Input";
import GroupSelector from "./GroupSelector";
import PortSelector from "./PortSelector";
import { requestService } from "../../services/requestService";
import { validateServerForm } from "../../utils/formValidator";
import {
  UserIcon,
  CalendarIcon,
  CpuChipIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  ClockIcon,
  ServerIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

const ServerForm = ({ 
  formData, 
  setFormData, 
  gpuTypes, 
  containerImages, 
  availableGroups,
  onUpdateAvailableGroups,
  onSuccess 
}) => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const hasId = (id) => id !== undefined && id !== null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // 그룹 추가 핸들러
  const addGroup = (gid) => {
    if (!formData.ubuntu_gids.includes(gid)) {
      setFormData((prev) => ({
        ...prev,
        ubuntu_gids: [...prev.ubuntu_gids, gid],
      }));
    }
  };

  // 그룹 제거 핸들러
  const removeGroup = (gid) => {
    setFormData((prev) => ({
      ...prev,
      ubuntu_gids: prev.ubuntu_gids.filter((id) => id !== gid),
    }));
  };

  // 새 그룹 생성 핸들러
  const createGroup = (newGroup) => {
    // 부모 컴포넌트의 availableGroups 상태 업데이트를 위해 prop으로 받은 함수 호출
    const updatedGroups = [...availableGroups, newGroup];
    if (onUpdateAvailableGroups) {
      onUpdateAvailableGroups(updatedGroups);
    }
    
    // GroupSelector에서 API 성공 후에 직접 addGroup을 호출하므로
    // 여기서는 addGroup을 호출하지 않음
  };

  // 포트 추가 핸들러
  const addPort = (port, usagePurpose = "") => {
    const portNumber = parseInt(port);
    if (portNumber && portNumber > 0 && portNumber <= 65535) {
      const existingPort = formData.port_requests.find(
        (p) => p.internalPort === portNumber
      );
      if (!existingPort) {
        setFormData((prev) => ({
          ...prev,
          port_requests: [
            ...prev.port_requests,
            {
              internalPort: portNumber,
              usagePurpose: usagePurpose || `포트 ${portNumber}`,
            },
          ],
        }));
      }
    }
  };

  // 포트 제거 핸들러
  const removePort = (port) => {
    setFormData((prev) => ({
      ...prev,
      port_requests: prev.port_requests.filter((p) => p.internalPort !== port),
    }));
  };

  // 포트 사용 목적 수정 핸들러
  const updatePortUsagePurpose = (port, usagePurpose) => {
    setFormData((prev) => ({
      ...prev,
      port_requests: prev.port_requests.map((p) =>
        p.internalPort === port ? { ...p, usagePurpose } : p
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateServerForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);

    try {
      // 우분투 패스워드 Base64 인코딩
      const encodeBase64 = (str) => {
        return window.btoa(unescape(encodeURIComponent(str)));
      };

      // API 요청 데이터 구성
      const requestData = {
        resourceGroupId: parseInt(formData.rsgroup_id),
        imageId: parseInt(formData.image_id),
        ubuntuUsername: formData.ubuntu_username,
        ubuntuPassword: encodeBase64(formData.ubuntu_password),
        volumeSizeGiB: parseInt(formData.volume_size_gb),
        usagePurpose: formData.usage_purpose,
        formAnswers: {},
        expiresAt: new Date(formData.expires_at).toISOString(),
        ubuntuGids: formData.ubuntu_gids,
        portRequests: formData.port_requests,
      };

      console.log("Request data:", requestData);

      const response = await requestService.createRequest(requestData);

      if (response.status === 200 || response.status === 201) {
        // 폼 데이터 초기화
        setFormData({
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

        // 기본 만료일 다시 설정 (3개월 후)
        const defaultExpiry = new Date();
        defaultExpiry.setMonth(defaultExpiry.getMonth() + 3);
        setTimeout(() => {
          setFormData((prev) => ({
            ...prev,
            expires_at: defaultExpiry.toISOString().split("T")[0],
          }));
        }, 100);

        onSuccess("서버 신청이 성공적으로 제출되었습니다. 관리자 승인을 기다려주세요.");
      } else {
        onSuccess("서버 신청 중 오류가 발생했습니다. 다시 시도해주세요.", "error");
      }
    } catch (error) {
      console.error("Server application error:", error);
      onSuccess("서버 신청에 실패했습니다. 입력하신 정보를 확인해주세요.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      title="서버 신청서"
      subtitle="모든 필수 항목을 정확히 입력해주세요."
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UserIcon className="w-5 h-5 mr-2 text-[#F68313]" />
            기본 정보
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="우분투 계정명"
              name="ubuntu_username"
              type="text"
              value={formData.ubuntu_username}
              onChange={handleChange}
              error={errors.ubuntu_username}
              placeholder="예: john_doe123"
              help="소문자, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능"
              required
              icon={UserIcon}
            />

            <Input
              label="우분투 계정 비밀번호"
              name="ubuntu_password"
              type="password"
              value={formData.ubuntu_password}
              onChange={handleChange}
              error={errors.ubuntu_password}
              placeholder="비밀번호를 입력하세요"
              help="최소 4자 이상 입력해주세요"
              required
              icon={KeyIcon}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 mt-6">
            <Input
              label="사용 만료일"
              name="expires_at"
              type="date"
              value={formData.expires_at}
              onChange={handleChange}
              error={errors.expires_at}
              help="서버 사용 종료 예정일"
              required
              icon={CalendarIcon}
            />
          </div>
        </div>

        {/* Server Configuration Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 mt-20 flex items-center">
            <ServerIcon className="w-5 h-5 mr-2 text-[#F68313]" />
            리소스 선택
          </h3>

          <div className="space-y-6">
            {/* Resource Group Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CpuChipIcon className="w-4 h-4 inline mr-1" />
                GPU 기종 선택 *
              </label>

              {/* GPU 타입이 로드되지 않았을 때 */}
              {!gpuTypes || gpuTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F68313] mx-auto mb-2"></div>
                  GPU 리소스 정보를 불러오는 중...
                </div>
              ) : (
                /* GPU 타입을 서버별로 그룹화하여 표시 */
                Object.entries(
                  gpuTypes.reduce((acc, gpu) => {
                    if (!acc[gpu.serverName]) {
                      acc[gpu.serverName] = [];
                    }
                    acc[gpu.serverName].push(gpu);
                    return acc;
                  }, {})
                ).map(([serverName, serverGpus]) => (
                  <div key={serverName} className="mb-6">
                    <h4 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                      <ServerIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                      {serverName} 서버
                    </h4>

	                    <div className="grid grid-cols-1 gap-3">
	                      {/* 각 GPU 모델별로 그룹화 */}
	                      {Object.entries(
	                        serverGpus.reduce((acc, gpu) => {
	                          if (!hasId(gpu.rsgroupId)) return acc;
	                          const key = `${gpu.gpuModel}-${gpu.ramGb}GB`;
                          if (!acc[key]) {
                            acc[key] = {
                              ...gpu,
                              availableNodes: 0,
                              nodeIds: [],
                            };
                          }
                          acc[key].availableNodes += gpu.availableNodes || 0;
                          acc[key].nodeIds.push(gpu.nodeId);
                          return acc;
                        }, {})
	                      ).map(([gpuKey, gpuGroup]) => (
	                        <div key={`${serverName}-${gpuKey}`} className="relative">
	                          <input
                            type="radio"
                            id={`rsgroup_${gpuGroup.rsgroupId}`}
                            name="rsgroup_id"
                            value={gpuGroup.rsgroupId}
	                            checked={
	                              formData.rsgroup_id === String(gpuGroup.rsgroupId)
	                            }
                            onChange={handleChange}
                            disabled={gpuGroup.availableNodes === 0}
                            className="sr-only"
                          />
                          <label
                            htmlFor={`rsgroup_${gpuGroup.rsgroupId}`}
	                            className={`block p-4 border cursor-pointer transition-all ${
	                              gpuGroup.availableNodes === 0
	                                ? "bg-gray-50 border-gray-200 cursor-not-allowed"
	                                : formData.rsgroup_id === String(gpuGroup.rsgroupId)
	                                ? "border-[#F68313] bg-orange-50"
	                                : "border-gray-300 hover:border-gray-400"
	                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900">
                                    {gpuGroup.gpuModel}
                                  </span>
                                  <div className="ml-2">
                                    {gpuGroup.availableNodes > 0 ? (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                                        사용 가능
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800">
                                        사용 불가
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {gpuGroup.description}
                                </p>
                                <div className="flex space-x-4 text-xs text-gray-500 mt-2">
                                  <span>GPU 메모리: {gpuGroup.ramGb}GB</span>
                                  <span>
                                    사용 가능 노드: {gpuGroup.availableNodes}개
                                  </span>
                                  <span>
                                    노드 ID: {gpuGroup.nodeIds.join(", ")}
                                  </span>
                                </div>
                              </div>
	                              {formData.rsgroup_id === String(gpuGroup.rsgroupId) && (
	                                <div className="w-4 h-4 border-2 border-[#F68313] rounded-full flex items-center justify-center">
	                                  <div className="w-2 h-2 bg-[#F68313] rounded-full"></div>
	                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {errors.rsgroup_id && (
                <p className="text-sm text-red-600 mt-1">{errors.rsgroup_id}</p>
              )}
            </div>

            {/* Container Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-10">
                <ComputerDesktopIcon className="w-4 h-4 inline mr-1" />
                컨테이너 이미지 *
              </label>

              {/* 컨테이너 이미지가 로드되지 않았을 때 */}
              {!containerImages || containerImages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F68313] mx-auto mb-2"></div>
                  컨테이너 이미지 정보를 불러오는 중...
                </div>
              ) : (
                /* 컨테이너 이미지를 프레임워크별로 그룹화하여 표시 */
                Object.entries(
	                  containerImages.reduce((acc, image) => {
	                    const frameworkName =
	                      image.imageName || image.image_name || "Unknown";
	                    const imageId = image.imageId ?? image.image_id;
	                    if (!hasId(imageId)) return acc;
                    const imageVersion = image.imageVersion || image.image_version;
                    const cudaVersion = image.cudaVersion || image.cuda_version;
                    const description = image.description;

                    if (!acc[frameworkName]) {
                      acc[frameworkName] = [];
                    }
                    acc[frameworkName].push({
                      ...image,
                      imageId,
                      imageName: frameworkName,
                      imageVersion,
                      cudaVersion,
                      description,
                    });
                    return acc;
                  }, {})
                ).map(([frameworkName, frameworkImages]) => (
                  <div key={frameworkName} className="mb-6">
                    <h4 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                      <ComputerDesktopIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                      {frameworkName.charAt(0).toUpperCase() +
                        frameworkName.slice(1)}
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                      {frameworkImages.map((image) => (
                        <div
                          key={`${frameworkName}-${image.imageId}`}
                          className="relative"
                        >
                          <input
                            type="radio"
	                            id={`image_${image.imageId}`}
	                            name="image_id"
	                            value={image.imageId}
	                            checked={formData.image_id === String(image.imageId)}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <label
	                            htmlFor={`image_${image.imageId}`}
	                            className={`block p-4 border cursor-pointer transition-all ${
	                              formData.image_id === String(image.imageId)
	                                ? "border-[#F68313] bg-orange-50"
	                                : "border-gray-300 hover:border-gray-400"
	                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900">
                                    {image.imageName} {image.imageVersion}
                                  </span>
                                </div>
                                {image.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {image.description}
                                  </p>
                                )}
                                <div className="flex space-x-4 text-xs text-gray-500 mt-2">
                                  <span>CUDA: {image.cudaVersion}</span>
                                  <span>이미지 ID: {image.imageId}</span>
                                </div>
                              </div>
	                              {formData.image_id === String(image.imageId) && (
	                                <div className="w-4 h-4 border-2 border-[#F68313] rounded-full flex items-center justify-center">
	                                  <div className="w-2 h-2 bg-[#F68313] rounded-full"></div>
	                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {errors.image_id && (
                <p className="text-sm text-red-600 mt-1">{errors.image_id}</p>
              )}
              {!errors.image_id && (
                <p className="text-xs text-gray-500 mt-1">
                  연구에 필요한 프레임워크와 CUDA 버전을 고려하여 선택하세요
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Input
                label="볼륨 크기 (GB)"
                name="volume_size_gb"
                type="number"
                value={formData.volume_size_gb}
                onChange={handleChange}
                error={errors.volume_size_gb}
                placeholder="예: 500"
                help="10GB ~ 2000GB 사이"
                min="10"
                max="2000"
                required
                icon={CircleStackIcon}
              />
            </div>

            {/* Group Selection */}
            <GroupSelector
              selectedGroups={formData.ubuntu_gids}
              availableGroups={availableGroups}
              onAddGroup={addGroup}
              onRemoveGroup={removeGroup}
              onCreateGroup={createGroup}
            />

            {/* Port Selection */}
            <PortSelector
              selectedPorts={formData.port_requests}
              onAddPort={addPort}
              onRemovePort={removePort}
              onUpdatePortUsagePurpose={updatePortUsagePurpose}
            />
          </div>
        </div>

        {/* Usage Information Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 mt-20 flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2 text-[#F68313]" />
            사용 정보
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용 목적 *
              </label>
              <textarea
                name="usage_purpose"
                value={formData.usage_purpose}
                onChange={handleChange}
                rows={4}
                className={`block w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#F68313] focus:border-[#F68313] ${
                  errors.usage_purpose
                    ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 text-gray-900"
                }`}
                placeholder="서버를 어떤 목적으로 사용할지 자세히 설명해주세요. (최소 10자)"
                required
              />
              {errors.usage_purpose && (
                <p className="text-sm text-red-600 mt-1">{errors.usage_purpose}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                연구 내용, 사용할 프레임워크, 예상 작업량 등을 포함해주세요
              </p>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex items-start">
            <ClockIcon className="w-5 h-5 text-blue-400 mt-0.5 mr-2" />
            <div className="text-sm text-blue-700">
              <h4 className="font-medium mb-2">신청 전 확인사항</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>신청 후 관리자 승인까지 1-3일이 소요될 수 있습니다.</li>
                <li>승인 후 서버 접속 정보가 이메일로 전송됩니다.</li>
                <li>
                  선택한 GPU 기종과 컨테이너 이미지에 따라 리소스가 할당됩니다.
                </li>
                <li>컨테이너 이미지의 CUDA 버전과 GPU 호환성을 확인해주세요.</li>
                <li>
                  데이터 백업은 사용자 책임이며, 정기적으로 백업하시기 바랍니다.
                </li>
                <li>
                  서버 사용 규정을 준수해야 하며, 위반 시 사용이 제한될 수 있습니다.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-300">
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={isLoading}
            className="bg-[#F68313] hover:bg-[#E6750F] border-[#F68313] hover:border-[#E6750F]"
          >
            <ServerIcon className="w-4 h-4 mr-1" />
            신청 제출
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ServerForm;
