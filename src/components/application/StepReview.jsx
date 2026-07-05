import { useApplication } from "../../contexts/ApplicationContext";
import {
  Container,
  Header,
  KeyValuePairs,
  Button,
  Alert,
} from "../../design-system";

const StepReview = () => {
  const { formData, gpuTypes, containerImages, availableGroups, goToStep } =
    useApplication();

  const selectedGpu = gpuTypes.find(
    (g) =>
      g.rsgroupId !== undefined &&
      g.rsgroupId !== null &&
      String(g.rsgroupId) === formData.rsgroup_id
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

  const editButton = (step) => (
    <Button variant="inline-link" onClick={() => goToStep(step)}>
      수정
    </Button>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Container
        header={
          <Header variant="h3" actions={editButton(1)}>
            서버 유형
          </Header>
        }
      >
        <KeyValuePairs
          columns={2}
          items={[
            { label: "서버 유형", value: formData.server_type || "미입력" },
          ]}
        />
      </Container>

      <Container
        header={
          <Header variant="h3" actions={editButton(2)}>
            서버 사양
          </Header>
        }
      >
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "GPU",
              value: selectedGpu
                ? `${selectedGpu.gpuModel} (${selectedGpu.ramGb}GB)`
                : formData.rsgroup_id || "미입력",
            },
            {
              label: "컨테이너 이미지",
              value: selectedImage
                ? `${selectedImage.imageName || selectedImage.image_name} ${
                    selectedImage.imageVersion || selectedImage.image_version
                  }`
                : formData.image_id || "미입력",
            },
          ]}
        />
      </Container>

      <Container
        header={
          <Header variant="h3" actions={editButton(3)}>
            계정 정보
          </Header>
        }
      >
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "우분투 계정명",
              value: formData.ubuntu_username || "미입력",
            },
            {
              label: "비밀번호",
              value: formData.ubuntu_password ? "••••••••" : "미입력",
            },
          ]}
        />
      </Container>

      <Container
        header={
          <Header variant="h3" actions={editButton(4)}>
            추가 옵션
          </Header>
        }
      >
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "저장 공간",
              value: formData.volume_size_gb
                ? `${formData.volume_size_gb} GB`
                : "미입력",
            },
            { label: "사용 만료일", value: formData.expires_at || "미입력" },
            { label: "사용 목적", value: formData.usage_purpose || "미입력" },
            ...(formData.ubuntu_gids.length > 0
              ? [{ label: "함께 쓸 그룹", value: groupNames }]
              : []),
            ...(formData.port_requests.length > 0
              ? [{ label: "열어둘 포트", value: portList }]
              : []),
          ]}
        />
      </Container>

      <Alert type="info" header="신청 전에 확인해주세요">
        <ul className="list-disc list-inside space-y-1">
          <li>신청 후 관리자 승인까지 1~3일 정도 걸릴 수 있어요.</li>
          <li>승인되면 서버 접속 정보를 이메일로 보내드려요.</li>
          <li>CUDA 버전과 GPU 호환성을 확인해주세요.</li>
        </ul>
      </Alert>
    </div>
  );
};

export default StepReview;
