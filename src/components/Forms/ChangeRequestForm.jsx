import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GroupSelector from "./GroupSelector";
import PortSelector from "./PortSelector";
import { requestService } from "../../services/requestService";
import { validateChangeRequestForm } from "../../utils/formValidator";
import {
  Container,
  Header,
  FormField,
  Input,
  Select,
  Cards,
  Alert,
  Button,
  StatusIndicator,
} from "../../design-system";

const textareaClass = (invalid) =>
  `block w-full px-3 py-1.5 text-sm bg-(--decs-surface-input) text-(--decs-text-body) rounded-(--decs-radius-input) border focus:outline-none focus:ring-1 focus:ring-(--decs-border-focus) focus:border-(--decs-border-focus) ${
    invalid ? "border-(--decs-status-error)" : "border-(--decs-border-input)"
  }`;

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

  const handleFieldChange = (name, value) => {
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

  const handleChange = (e) => handleFieldChange(e.target.name, e.target.value);

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
          ? selectedRequest.port_mappings.map((port) => port.internalPort).join(", ")
          : "설정된 포트 없음";
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
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
        "INTERNAL_PORTS": "PORT",
      };

      // newValue 형식 처리
      let formattedNewValue = changeFormData.new_value;

      // PORT나 GROUP 타입인 경우 JSON string으로 변환
      if (changeFormData.change_type === "INTERNAL_PORTS") {
        // 포트 배열을 API 명세에 맞는 형식으로 변환
        const ports = JSON.parse(changeFormData.new_value || "[]");
        const formattedPorts = ports.map((port) => ({
          internalPort: parseInt(port.internalPort),
          usagePurpose: port.usagePurpose,
        }));
        formattedNewValue = JSON.stringify(formattedPorts);
      } else if (changeFormData.change_type === "GROUPS") {
        // 그룹 배열을 정수 배열로 변환하여 JSON string으로
        const groups = JSON.parse(changeFormData.new_value || "[]");
        const formattedGroups = groups.map((group) => parseInt(group));
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
          rsgroupIds: [],
        };
      }
      grouped[key].nodes.push(gpu.nodeId);
      grouped[key].rsgroupIds.push(gpu.rsgroupId);
    });

    return Object.values(grouped);
  };

  // 컨테이너 이미지를 프레임워크별로 그룹화
  const groupContainerImages = () =>
    Object.entries(
      containerImages.reduce((acc, image) => {
        const frameworkName = image.imageName || image.image_name || "Unknown";
        const imageId = image.imageId ?? image.image_id;
        if (!hasId(imageId)) return acc;
        const imageVersion = image.imageVersion || image.image_version;
        const cudaVersion = image.cudaVersion || image.cuda_version;

        if (!acc[frameworkName]) {
          acc[frameworkName] = [];
        }
        acc[frameworkName].push({
          ...image,
          imageId,
          imageName: frameworkName,
          imageVersion,
          cudaVersion,
          description: image.description,
        });
        return acc;
      }, {})
    );

  const getNewValueInput = () => {
    const { change_type } = changeFormData;

    switch (change_type) {
      case "VOLUME_SIZE":
        return (
          <FormField
            label="새로운 저장 공간 (GB)"
            errorText={errors.new_value}
            constraintText="10GB부터 2000GB까지 신청할 수 있어요."
            htmlFor="change_new_value"
          >
            <Input
              id="change_new_value"
              type="number"
              value={changeFormData.new_value}
              onChange={(value) => handleFieldChange("new_value", value)}
              placeholder="예: 1000"
              iconName="cube"
              invalid={!!errors.new_value}
            />
          </FormField>
        );
      case "EXPIRES_AT":
        return (
          <FormField
            label="새로운 만료일"
            errorText={errors.new_value}
            constraintText="서버 사용을 마칠 예정일이에요."
            htmlFor="change_new_value"
          >
            <Input
              id="change_new_value"
              type="date"
              value={changeFormData.new_value}
              onChange={(value) => handleFieldChange("new_value", value)}
              invalid={!!errors.new_value}
            />
          </FormField>
        );
      case "RSGROUP_ID":
        return (
          <FormField label="새로운 GPU 기종" errorText={errors.new_value}>
            <Select
              options={groupGpuTypes().map((group) => ({
                value: String(group.rsgroupIds[0]),
                label: `${group.gpuModel} (${group.ramGb}GB)`,
                description: `가용 노드 ${group.nodes.join(", ")}`,
              }))}
              selectedValue={changeFormData.new_value}
              onChange={(value) => handleFieldChange("new_value", value)}
              placeholder="GPU 기종을 선택하세요"
              invalid={!!errors.new_value}
            />
          </FormField>
        );
      case "IMAGE_ID":
        return (
          <FormField label="새로운 컨테이너 이미지" errorText={errors.new_value}>
            {!containerImages || containerImages.length === 0 ? (
              <div className="py-8 text-center">
                <StatusIndicator type="loading">
                  컨테이너 이미지 정보를 불러오고 있어요...
                </StatusIndicator>
              </div>
            ) : (
              <div className="space-y-4">
                {groupContainerImages().map(([frameworkName, frameworkImages]) => (
                  <div key={frameworkName} className="space-y-2">
                    <div className="text-sm font-medium text-(--decs-text-secondary)">
                      {frameworkName.charAt(0).toUpperCase() +
                        frameworkName.slice(1)}
                    </div>
                    <Cards
                      items={frameworkImages}
                      trackBy="imageId"
                      columns={2}
                      selectionType="single"
                      selectedItems={frameworkImages.filter(
                        (image) =>
                          changeFormData.new_value === String(image.imageId)
                      )}
                      onSelectionChange={([image]) =>
                        handleFieldChange("new_value", String(image.imageId))
                      }
                      cardDefinition={{
                        header: (image) =>
                          `${image.imageName} ${image.imageVersion}`,
                        sections: [
                          {
                            id: "detail",
                            content: (image) => (
                              <div>
                                {image.description && <p>{image.description}</p>}
                                <p className="text-(--decs-text-secondary)">
                                  CUDA {image.cudaVersion}
                                </p>
                              </div>
                            ),
                          },
                        ],
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </FormField>
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
            ubuntuUsername={
              userRequests.find(
                (r) => String(r.request_id) === String(changeFormData.request_id)
              )?.ubuntu_username
            }
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
    <Container
      header={
        <Header
          variant="h2"
          description="승인된 서버의 설정을 변경할 수 있어요."
        >
          서버 정보 변경 요청
        </Header>
      }
    >
      <div className="space-y-8">
        {/* Request Selection */}
        <FormField
          label="변경할 서버"
          errorText={errors.request_id}
          constraintText={
            !errors.request_id
              ? "변경하고 싶은 승인된 서버를 골라주세요."
              : undefined
          }
        >
          <Select
            options={userRequests.map((request) => ({
              value: String(request.request_id),
              label: `${request.server_name} - ${request.gpu_model} (${request.image_name} ${request.image_version}) - ${request.ubuntu_username}`,
              description: `${request.volume_size_gb}GB, 만료: ${request.expires_at}`,
            }))}
            selectedValue={String(changeFormData.request_id)}
            onChange={(value) => handleFieldChange("request_id", value)}
            placeholder="변경할 서버를 선택하세요"
            invalid={!!errors.request_id}
          />
        </FormField>

        {/* Change Type Selection */}
        <div className="space-y-4">
          <FormField label="변경할 항목" errorText={errors.change_type}>
            <Select
              options={[
                { value: "VOLUME_SIZE", label: "저장 공간" },
                { value: "EXPIRES_AT", label: "사용 만료일" },
                { value: "RSGROUP_ID", label: "GPU 기종" },
                { value: "IMAGE_ID", label: "컨테이너 이미지" },
                { value: "GROUPS", label: "그룹" },
                { value: "INTERNAL_PORTS", label: "개방 포트" },
              ]}
              selectedValue={changeFormData.change_type}
              onChange={(value) => handleFieldChange("change_type", value)}
              placeholder="변경할 항목을 선택하세요"
              invalid={!!errors.change_type}
            />
          </FormField>

          {/* 현재 값 표시 */}
          {changeFormData.request_id && changeFormData.change_type && (
            <Alert type="info" header="현재 설정값">
              {getSelectedRequestCurrentValue(changeFormData.change_type)}
            </Alert>
          )}

          {/* Dynamic input based on change type */}
          {changeFormData.change_type && <div>{getNewValueInput()}</div>}
        </div>

        {/* Reason */}
        <FormField
          label="변경 사유"
          errorText={errors.reason}
          constraintText="연구 진행 상황 변화, 리소스 부족 등 변경이 필요한 이유를 적어주세요."
          htmlFor="change_reason"
        >
          <textarea
            id="change_reason"
            name="reason"
            value={changeFormData.reason}
            onChange={handleChange}
            rows={4}
            className={textareaClass(!!errors.reason)}
            placeholder="변경이 필요한 이유를 자세히 설명해주세요. (최소 10자)"
          />
        </FormField>

        {/* Important Notes for Change Request */}
        <Alert type="warning" header="변경 요청 주의사항">
          <ul className="list-disc list-inside space-y-1">
            <li>변경 요청 후 관리자 승인까지 1~3일 정도 걸릴 수 있어요.</li>
            <li>승인 전까지는 기존 설정으로 서버가 운영돼요.</li>
            <li>일부 변경사항은 서버 재시작이 필요할 수 있어요.</li>
            <li>변경 요청이 거절되면 사유를 안내해드려요.</li>
            <li>중요한 데이터는 변경 전에 꼭 백업해주세요.</li>
          </ul>
        </Alert>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-2 pt-6 border-t border-(--decs-border-divider)">
          <Button variant="normal" onClick={() => navigate("/my-change-requests")}>
            취소
          </Button>
          <Button
            variant="primary"
            iconName="pencil-square"
            loading={isLoading}
            disabled={isLoading}
            onClick={handleSubmit}
          >
            변경 요청 제출
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default ChangeRequestForm;
