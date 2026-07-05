import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GroupSelector from "./GroupSelector";
import PortSelector from "./PortSelector";
import { requestService } from "../../services/requestService";
import { validateServerForm } from "../../utils/formValidator";
import {
  Container,
  Header,
  FormField,
  Input,
  Cards,
  Badge,
  Alert,
  Button,
  StatusIndicator,
} from "../../design-system";

const textareaClass = (invalid) =>
  `block w-full px-3 py-1.5 text-sm bg-(--decs-surface-input) text-(--decs-text-body) rounded-(--decs-radius-input) border focus:outline-none focus:ring-1 focus:ring-(--decs-border-focus) focus:border-(--decs-border-focus) ${
    invalid ? "border-(--decs-status-error)" : "border-(--decs-border-input)"
  }`;

const ServerForm = ({
  formData,
  setFormData,
  gpuTypes,
  containerImages,
  availableGroups,
  onUpdateAvailableGroups,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const hasId = (id) => id !== undefined && id !== null;

  const handleFieldChange = (name, value) => {
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

  const handleChange = (e) => handleFieldChange(e.target.name, e.target.value);

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

  const handleSubmit = async () => {
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

  // GPU 타입을 서버별로 그룹화
  const groupedGpusByServer = Object.entries(
    (gpuTypes || []).reduce((acc, gpu) => {
      if (!acc[gpu.serverName]) {
        acc[gpu.serverName] = [];
      }
      acc[gpu.serverName].push(gpu);
      return acc;
    }, {})
  ).map(([serverName, serverGpus]) => [
    serverName,
    Object.values(
      serverGpus.reduce((acc, gpu) => {
        if (!hasId(gpu.rsgroupId)) return acc;
        const key = `${gpu.gpuModel}-${gpu.ramGb}GB`;
        if (!acc[key]) {
          acc[key] = { ...gpu, groupKey: key, availableNodes: 0, nodeIds: [] };
        }
        acc[key].availableNodes += gpu.availableNodes || 0;
        acc[key].nodeIds.push(gpu.nodeId);
        return acc;
      }, {})
    ),
  ]);

  // 컨테이너 이미지를 프레임워크별로 그룹화
  const groupedImages = Object.entries(
    (containerImages || []).reduce((acc, image) => {
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

  return (
    <Container
      header={
        <Header variant="h2" description="모든 필수 항목을 정확히 입력해주세요.">
          서버 신청서
        </Header>
      }
    >
      <div className="space-y-10">
        {/* Basic Information Section */}
        <section className="space-y-6">
          <Header variant="h3">기본 정보</Header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="우분투 계정명"
              errorText={errors.ubuntu_username}
              constraintText="소문자, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있어요."
              htmlFor="ubuntu_username"
            >
              <Input
                id="ubuntu_username"
                value={formData.ubuntu_username}
                onChange={(value) => handleFieldChange("ubuntu_username", value)}
                placeholder="예: john_doe123"
                iconName="user-circle"
                invalid={!!errors.ubuntu_username}
              />
            </FormField>

            <FormField
              label="우분투 계정 비밀번호"
              errorText={errors.ubuntu_password}
              constraintText="4자 이상 입력해주세요."
              htmlFor="ubuntu_password"
            >
              <Input
                id="ubuntu_password"
                type="password"
                value={formData.ubuntu_password}
                onChange={(value) => handleFieldChange("ubuntu_password", value)}
                placeholder="비밀번호를 입력하세요"
                iconName="key"
                invalid={!!errors.ubuntu_password}
              />
            </FormField>
          </div>

          <FormField
            label="사용 만료일"
            errorText={errors.expires_at}
            constraintText="서버 사용을 마칠 예정일이에요."
            htmlFor="expires_at"
          >
            <Input
              id="expires_at"
              type="date"
              value={formData.expires_at}
              onChange={(value) => handleFieldChange("expires_at", value)}
              invalid={!!errors.expires_at}
            />
          </FormField>
        </section>

        {/* Server Configuration Section */}
        <section className="space-y-6">
          <Header variant="h3">리소스 선택</Header>

          <FormField label="GPU 기종" errorText={errors.rsgroup_id}>
            {groupedGpusByServer.length === 0 ? (
              <div className="py-8 text-center">
                <StatusIndicator type="loading">
                  GPU 리소스 정보를 불러오고 있어요...
                </StatusIndicator>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedGpusByServer.map(([serverName, serverGpus]) => (
                  <div key={serverName} className="space-y-2">
                    <div className="text-sm font-medium text-(--decs-text-secondary)">
                      {serverName} 서버
                    </div>
                    <Cards
                      items={serverGpus}
                      trackBy="groupKey"
                      columns={1}
                      selectionType="single"
                      selectedItems={serverGpus.filter(
                        (gpu) => formData.rsgroup_id === String(gpu.rsgroupId)
                      )}
                      onSelectionChange={([gpu]) => {
                        if (gpu.availableNodes === 0) return;
                        handleFieldChange("rsgroup_id", String(gpu.rsgroupId));
                      }}
                      cardDefinition={{
                        header: (gpu) => (
                          <span className="inline-flex items-center gap-2">
                            {gpu.gpuModel}
                            {gpu.availableNodes > 0 ? (
                              <Badge color="green">사용 가능</Badge>
                            ) : (
                              <Badge color="red">사용 불가</Badge>
                            )}
                          </span>
                        ),
                        sections: [
                          {
                            id: "description",
                            content: (gpu) => gpu.description,
                          },
                          {
                            id: "spec",
                            content: (gpu) => (
                              <span className="text-(--decs-text-secondary)">
                                GPU 메모리 {gpu.ramGb}GB · 바로 쓸 수 있는 서버{" "}
                                {gpu.availableNodes}대 · 장비 번호{" "}
                                {gpu.nodeIds.join(", ")}
                              </span>
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

          <FormField
            label="컨테이너 이미지"
            errorText={errors.image_id}
            constraintText={
              !errors.image_id
                ? "연구에 필요한 프레임워크와 CUDA 버전을 확인하고 골라주세요."
                : undefined
            }
          >
            {groupedImages.length === 0 ? (
              <div className="py-8 text-center">
                <StatusIndicator type="loading">
                  컨테이너 이미지 정보를 불러오고 있어요...
                </StatusIndicator>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedImages.map(([frameworkName, frameworkImages]) => (
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
                        (image) => formData.image_id === String(image.imageId)
                      )}
                      onSelectionChange={([image]) =>
                        handleFieldChange("image_id", String(image.imageId))
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

          <FormField
            label="저장 공간 (GB)"
            errorText={errors.volume_size_gb}
            constraintText="10GB부터 2000GB까지 신청할 수 있어요."
            htmlFor="volume_size_gb"
          >
            <Input
              id="volume_size_gb"
              type="number"
              value={formData.volume_size_gb}
              onChange={(value) => handleFieldChange("volume_size_gb", value)}
              placeholder="예: 500"
              iconName="cube"
              invalid={!!errors.volume_size_gb}
            />
          </FormField>

          {/* Group Selection */}
          <GroupSelector
            selectedGroups={formData.ubuntu_gids}
            availableGroups={availableGroups}
            onAddGroup={addGroup}
            onRemoveGroup={removeGroup}
            onCreateGroup={createGroup}
            ubuntuUsername={formData.ubuntu_username}
          />

          {/* Port Selection */}
          <PortSelector
            selectedPorts={formData.port_requests}
            onAddPort={addPort}
            onRemovePort={removePort}
            onUpdatePortUsagePurpose={updatePortUsagePurpose}
          />
        </section>

        {/* Usage Information Section */}
        <section className="space-y-6">
          <Header variant="h3">사용 정보</Header>

          <FormField
            label="사용 목적"
            errorText={errors.usage_purpose}
            constraintText="연구 내용, 사용할 프레임워크, 예상 작업량을 함께 적어주세요."
            htmlFor="usage_purpose"
          >
            <textarea
              id="usage_purpose"
              name="usage_purpose"
              value={formData.usage_purpose}
              onChange={handleChange}
              rows={4}
              className={textareaClass(!!errors.usage_purpose)}
              placeholder="서버를 어떤 목적으로 사용할지 자세히 설명해주세요. (최소 10자)"
            />
          </FormField>
        </section>

        {/* Important Notes */}
        <Alert type="info" header="신청 전 확인사항">
          <ul className="list-disc list-inside space-y-1">
            <li>신청 후 관리자 승인까지 1~3일 정도 걸릴 수 있어요.</li>
            <li>승인되면 서버 접속 정보를 이메일로 보내드려요.</li>
            <li>선택한 GPU 기종과 컨테이너 이미지에 따라 리소스가 할당돼요.</li>
            <li>컨테이너 이미지의 CUDA 버전과 GPU 호환성을 확인해주세요.</li>
            <li>데이터 백업은 사용자 책임이에요. 정기적으로 백업해주세요.</li>
            <li>서버 사용 규정을 지켜주세요. 위반 시 사용이 제한될 수 있어요.</li>
          </ul>
        </Alert>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-2 pt-6 border-t border-(--decs-border-divider)">
          <Button variant="normal" onClick={() => navigate("/dashboard")}>
            취소
          </Button>
          <Button
            variant="primary"
            iconName="server-stack"
            loading={isLoading}
            disabled={isLoading}
            onClick={handleSubmit}
          >
            신청 제출
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default ServerForm;
