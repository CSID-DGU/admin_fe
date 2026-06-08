import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../UI/Card";
import Button from "../UI/Button";
import Input from "../UI/Input";
import GroupSelector from "./GroupSelector";
import PortSelector from "./PortSelector";
import { requestService } from "../../services/requestService";
import { validateChangeRequestForm } from "../../utils/formValidator";
import {
  CheckCircleIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  CpuChipIcon,
  CircleStackIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const ChangeRequestForm = ({
  changeFormData,
  setChangeFormData,
  gpuTypes,
  containerImages,
  availableGroups,
  userRequests,
  onUpdateAvailableGroups,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const hasId = (id) => id !== undefined && id !== null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    // change_type이 변경될 때 new_value 초기화
    if (name === "change_type") {
      let initialValue = "";
      if (value === "GROUPS" || value === "INTERNAL_PORTS") {
        initialValue = JSON.stringify([]);
      }
      setChangeFormData((prev) => ({
        ...prev,
        [name]: value,
        new_value: initialValue,
      }));
    } else {
      setChangeFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // 그룹 추가 핸들러 (변경 요청용)
  const addGroupForChange = (gid) => {
    const currentGroups = changeFormData.new_value
      ? JSON.parse(changeFormData.new_value)
      : [];
    if (!currentGroups.includes(gid)) {
      const newGroups = [...currentGroups, gid];
      setChangeFormData((prev) => ({
        ...prev,
        new_value: JSON.stringify(newGroups),
      }));
    }
  };

  // 그룹 제거 핸들러 (변경 요청용)
  const removeGroupForChange = (gid) => {
    const currentGroups = changeFormData.new_value
      ? JSON.parse(changeFormData.new_value)
      : [];
    const newGroups = currentGroups.filter((id) => id !== gid);
    setChangeFormData((prev) => ({
      ...prev,
      new_value: JSON.stringify(newGroups),
    }));
  };

  // 새 그룹 생성 핸들러 (변경 요청용)
  const createGroupForChange = (newGroup) => {
    // availableGroups에 새 그룹 추가
    if (onUpdateAvailableGroups) {
      const updatedGroups = [...availableGroups, newGroup];
      onUpdateAvailableGroups(updatedGroups);
    }
    
    // GroupSelector에서 API 성공 후에 직접 addGroupForChange를 호출하므로
    // 여기서는 addGroupForChange를 호출하지 않음
  };

  // 포트 추가 핸들러 (변경 요청용)
  const addPortForChange = (port, usagePurpose = "") => {
    const portNumber = parseInt(port);
    if (portNumber && portNumber > 0 && portNumber <= 65535) {
      const currentPorts = changeFormData.new_value
        ? JSON.parse(changeFormData.new_value)
        : [];
      const existingPort = currentPorts.find(
        (p) => p.internalPort === portNumber
      );
      if (!existingPort) {
        const newPorts = [
          ...currentPorts,
          {
            internalPort: portNumber,
            usagePurpose: usagePurpose || `포트 ${portNumber}`,
          },
        ];
        setChangeFormData((prev) => ({
          ...prev,
          new_value: JSON.stringify(newPorts),
        }));
      }
    }
  };

  // 포트 제거 핸들러 (변경 요청용)
  const removePortForChange = (port) => {
    const currentPorts = changeFormData.new_value
      ? JSON.parse(changeFormData.new_value)
      : [];
    const newPorts = currentPorts.filter((p) => p.internalPort !== port);
    setChangeFormData((prev) => ({
      ...prev,
      new_value: JSON.stringify(newPorts),
    }));
  };

  // 포트 사용 목적 수정 핸들러 (변경 요청용)
  const updatePortUsagePurposeForChange = (port, usagePurpose) => {
    const currentPorts = changeFormData.new_value
      ? JSON.parse(changeFormData.new_value)
      : [];
    const newPorts = currentPorts.map((p) =>
      p.internalPort === port ? { ...p, usagePurpose } : p
    );
    setChangeFormData((prev) => ({
      ...prev,
      new_value: JSON.stringify(newPorts),
    }));
  };

  // 선택된 서버의 현재 값을 가져오는 함수
  const getSelectedRequestCurrentValue = (changeType) => {
    const selectedRequest = userRequests.find(
      (req) => req.request_id === parseInt(changeFormData.request_id)
    );
    
    if (!selectedRequest) return null;

    switch (changeType) {
      case "VOLUME_SIZE":
        return selectedRequest.volume_size_gb;
      case "EXPIRES_AT":
        return selectedRequest.expires_at;
      case "RSGROUP_ID":
        return selectedRequest.gpu_model;
      case "IMAGE_ID":
        return `${selectedRequest.image_name} ${selectedRequest.image_version}`;
      case "GROUPS":
        return selectedRequest.group_names.length > 0 
          ? selectedRequest.group_names.join(", ") 
          : "설정된 그룹 없음";
      case "INTERNAL_PORTS":
        return selectedRequest.port_mappings.length > 0 
          ? selectedRequest.port_mappings.map(port => port.internalPort).join(", ")
          : "설정된 포트 없음";
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateChangeRequestForm(changeFormData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);

    try {
      // API 명세에 맞게 changeType 매핑
      const changeTypeMapping = {
        "VOLUME_SIZE": "VOLUME_SIZE",
        "EXPIRES_AT": "EXPIRES_AT", 
        "RSGROUP_ID": "RESOURCE_GROUP",
        "IMAGE_ID": "IMAGE_ID",
        "GROUPS": "GROUP",
        "INTERNAL_PORTS": "PORT"
      };

      // newValue 형식 처리
      let formattedNewValue = changeFormData.new_value;
      
      // PORT나 GROUP 타입인 경우 JSON string으로 변환
      if (changeFormData.change_type === "INTERNAL_PORTS") {
        // 포트 배열을 API 명세에 맞는 형식으로 변환
        const ports = JSON.parse(changeFormData.new_value || "[]");
        const formattedPorts = ports.map(port => ({
          internalPort: parseInt(port.internalPort),
          usagePurpose: port.usagePurpose
        }));
        formattedNewValue = JSON.stringify(formattedPorts);
      } else if (changeFormData.change_type === "GROUPS") {
        // 그룹 배열을 정수 배열로 변환하여 JSON string으로
        const groups = JSON.parse(changeFormData.new_value || "[]");
        const formattedGroups = groups.map(group => parseInt(group));
        formattedNewValue = JSON.stringify(formattedGroups);
      }

      // Create change request data
      const changeRequestData = {
        changeType: changeTypeMapping[changeFormData.change_type],
        newValue: formattedNewValue,
        reason: changeFormData.reason,
      };

      console.log("Change request data:", changeRequestData);

      const response = await requestService.createChangeRequest(
        parseInt(changeFormData.request_id),
        changeRequestData
      );

      if (response.status === 200 || response.status === 201) {
        onSuccess(
          "변경 요청이 성공적으로 제출되었습니다. 관리자 승인을 기다려주세요."
        );

        // Reset form
        setChangeFormData({
          request_id: "",
          change_type: "",
          new_value: "",
          reason: "",
        });
      } else {
        onSuccess("변경 요청 중 오류가 발생했습니다. 다시 시도해주세요.", "error");
      }
    } catch (error) {
      console.error("Change request error:", error);
      onSuccess("변경 요청에 실패했습니다. 다시 시도해주세요.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // GPU 타입들을 그룹화하는 함수
  const groupGpuTypes = () => {
    const grouped = {};
    
    gpuTypes.forEach((gpu) => {
      if (!hasId(gpu.rsgroupId)) return;
      const key = `${gpu.gpuModel}_${gpu.ramGb}GB`;
      if (!grouped[key]) {
        grouped[key] = {
          gpuModel: gpu.gpuModel,
          ramGb: gpu.ramGb,
          nodes: [],
          rsgroupIds: []
        };
      }
      grouped[key].nodes.push(gpu.nodeId);
      grouped[key].rsgroupIds.push(gpu.rsgroupId);
    });

    return Object.values(grouped);
  };

  const getNewValueInput = () => {
    const { change_type } = changeFormData;

    switch (change_type) {
      case "VOLUME_SIZE":
        return (
          <Input
            label="새로운 볼륨 크기 (GB)"
            name="new_value"
            type="number"
            value={changeFormData.new_value}
            onChange={handleChange}
            error={errors.new_value}
            placeholder="예: 1000"
            help="10GB ~ 2000GB 사이"
            min="10"
            max="2000"
            required
            icon={CircleStackIcon}
          />
        );
      case "EXPIRES_AT":
        return (
          <Input
            label="새로운 만료일"
            name="new_value"
            type="date"
            value={changeFormData.new_value}
            onChange={handleChange}
            error={errors.new_value}
            help="서버 사용 종료 예정일"
            required
            icon={CalendarIcon}
          />
        );
      case "RSGROUP_ID":
        return (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              <CpuChipIcon className="w-4 h-4 inline mr-1" />
              새로운 GPU 기종 *
            </label>
            <select
              name="new_value"
              value={changeFormData.new_value}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border text-sm h-[38px] focus:outline-none focus:ring-2 focus:ring-[#F68313] focus:border-[#F68313] ${
                errors.new_value
                  ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 text-gray-900"
              }`}
              required
            >
              <option value="">GPU 기종을 선택하세요</option>
              {groupGpuTypes().map((group, index) => (
                <option key={index} value={group.rsgroupIds[0]}>
                  {group.gpuModel} ({group.ramGb}GB, 가용 노드 {group.nodes.join(", ")})
                </option>
              ))}
            </select>
            {errors.new_value && (
              <p className="text-sm text-red-600">{errors.new_value}</p>
            )}
          </div>
        );
      case "IMAGE_ID":
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              <ComputerDesktopIcon className="w-4 h-4 inline mr-1" />
              새로운 컨테이너 이미지 *
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
                  const imageVersion =
                    image.imageVersion || image.image_version;
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
                <div key={frameworkName} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                    <ComputerDesktopIcon className="w-4 h-4 mr-2 text-[#F68313]" />
                    {frameworkName.charAt(0).toUpperCase() +
                      frameworkName.slice(1)}
                  </h4>

                  <div className="grid grid-cols-1 gap-2">
                    {frameworkImages.map((image) => (
                      <div
                        key={`change-${frameworkName}-${image.imageId}`}
                        className="relative"
                      >
                        <input
                          type="radio"
                          id={`change_image_${image.imageId}`}
                          name="new_value"
	                          value={image.imageId}
	                          checked={
	                            changeFormData.new_value === String(image.imageId)
	                          }
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <label
                          htmlFor={`change_image_${image.imageId}`}
                          className={`block p-3 border cursor-pointer transition-all ${
	                            changeFormData.new_value === String(image.imageId)
                              ? "border-[#F68313] bg-orange-50"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 text-sm">
                                  {image.imageName} {image.imageVersion}
                                </span>
                              </div>
                              {image.description && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {image.description}
                                </p>
                              )}
                              <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                                <span>CUDA: {image.cudaVersion}</span>
                                <span>ID: {image.imageId}</span>
                              </div>
                            </div>
	                            {changeFormData.new_value === String(image.imageId) && (
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

            {errors.new_value && (
              <p className="text-sm text-red-600">{errors.new_value}</p>
            )}
          </div>
        );
      case "GROUPS": {
        const currentGroups = changeFormData.new_value
          ? JSON.parse(changeFormData.new_value)
          : [];
        return (
          <GroupSelector
            selectedGroups={currentGroups}
            availableGroups={availableGroups}
            onAddGroup={addGroupForChange}
            onRemoveGroup={removeGroupForChange}
            onCreateGroup={createGroupForChange}
          />
        );
      }
      case "INTERNAL_PORTS": {
        const currentPorts = changeFormData.new_value
          ? JSON.parse(changeFormData.new_value)
          : [];
        return (
          <PortSelector
            selectedPorts={currentPorts}
            onAddPort={addPortForChange}
            onRemovePort={removePortForChange}
            onUpdatePortUsagePurpose={updatePortUsagePurposeForChange}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <Card
      title="서버 정보 변경 요청"
      subtitle="승인된 서버의 설정을 변경할 수 있습니다."
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Request Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2 text-[#F68313]" />
            변경할 서버 선택
          </h3>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              승인된 서버 *
            </label>
            <select
              name="request_id"
              value={changeFormData.request_id}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border text-sm h-[38px] focus:outline-none focus:ring-2 focus:ring-[#F68313] focus:border-[#F68313] ${
                errors.request_id
                  ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 text-gray-900"
              }`}
              required
            >
              <option value="">변경할 서버를 선택하세요</option>
              {userRequests.map((request) => (
                <option key={request.request_id} value={request.request_id}>
                  {request.server_name} - {request.gpu_model} ({request.image_name} {request.image_version}) - {request.ubuntu_username} (
                  {request.volume_size_gb}GB, 만료: {request.expires_at})
                </option>
              ))}
            </select>
            {errors.request_id && (
              <p className="text-sm text-red-600">{errors.request_id}</p>
            )}
            {!errors.request_id && (
              <p className="text-sm text-gray-500">
                변경하고자 하는 승인된 서버를 선택하세요
              </p>
            )}
          </div>
        </div>

        {/* Change Type Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PencilSquareIcon className="w-5 h-5 mr-2 text-[#F68313]" />
            변경 항목
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                변경할 항목 *
              </label>
              <select
                name="change_type"
                value={changeFormData.change_type}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border text-sm h-[38px] focus:outline-none focus:ring-2 focus:ring-[#F68313] focus:border-[#F68313] ${
                  errors.change_type
                    ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 text-gray-900"
                }`}
                required
              >
                <option value="">변경할 항목을 선택하세요</option>
                <option value="VOLUME_SIZE">볼륨 크기</option>
                <option value="EXPIRES_AT">사용 만료일</option>
                <option value="RSGROUP_ID">GPU 기종</option>
                <option value="IMAGE_ID">컨테이너 이미지</option>
                <option value="GROUPS">그룹</option>
                <option value="INTERNAL_PORTS">개방 포트</option>
              </select>
              {errors.change_type && (
                <p className="text-sm text-red-600">{errors.change_type}</p>
              )}
            </div>

            {/* 현재 값 표시 */}
            {changeFormData.request_id && changeFormData.change_type && (
              <div className="bg-blue-50 border border-blue-200 p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">현재 설정값</h4>
                <p className="text-sm text-blue-800">
                  {getSelectedRequestCurrentValue(changeFormData.change_type)}
                </p>
              </div>
            )}

            {/* Dynamic input based on change type */}
            {changeFormData.change_type && <div>{getNewValueInput()}</div>}
          </div>
        </div>

        {/* Reason */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2 text-[#F68313]" />
            변경 사유
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              변경 사유 *
            </label>
            <textarea
              name="reason"
              value={changeFormData.reason}
              onChange={handleChange}
              rows={4}
              className={`block w-full px-3 py-2 border text-sm focus:outline-none focus:ring-2 focus:ring-[#F68313] focus:border-[#F68313] ${
                errors.reason
                  ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 text-gray-900"
              }`}
              placeholder="변경이 필요한 이유를 자세히 설명해주세요. (최소 10자)"
              required
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              연구 진행 상황 변화, 리소스 부족, 기타 사유 등을 포함해주세요
            </p>
          </div>
        </div>

        {/* Important Notes for Change Request */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <ClockIcon className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" />
            <div className="text-sm text-yellow-700">
              <h4 className="font-medium mb-2">변경 요청 주의사항</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>변경 요청 후 관리자 승인까지 1-3일이 소요될 수 있습니다.</li>
                <li>승인 전까지는 기존 설정으로 서버가 운영됩니다.</li>
                <li>일부 변경사항은 서버 재시작이 필요할 수 있습니다.</li>
                <li>변경 요청이 거절될 경우 사유가 안내됩니다.</li>
                <li>중요한 데이터는 변경 전에 반드시 백업하시기 바랍니다.</li>
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
            <PencilSquareIcon className="w-4 h-4 mr-1" />
            변경 요청 제출
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ChangeRequestForm;
