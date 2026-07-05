import { useApplication } from "../../contexts/ApplicationContext";
import {
  Cards,
  FormField,
  Header,
  Badge,
  StatusIndicator,
} from "../../design-system";

const StepServerSpec = () => {
  const { formData, updateField, gpuTypes, containerImages, errors } =
    useApplication();

  const hasId = (id) => id !== undefined && id !== null;

  const filteredGpuTypes = gpuTypes.filter(
    (gpu) => gpu.serverName === formData.server_type
  );

  const gpuItems = Object.values(
    filteredGpuTypes.reduce((acc, gpu) => {
      if (!hasId(gpu.rsgroupId)) return acc;
      const key = `${gpu.gpuModel}-${gpu.ramGb}GB`;
      if (!acc[key]) {
        acc[key] = { ...gpu, groupKey: key, availableNodes: 0, nodeIds: [] };
      }
      acc[key].availableNodes += gpu.availableNodes || 0;
      acc[key].nodeIds.push(gpu.nodeId);
      return acc;
    }, {})
  );

  const groupedImages = Object.entries(
    containerImages.reduce((acc, image) => {
      const frameworkName = image.imageName || image.image_name || "Unknown";
      const imageId = image.imageId ?? image.image_id;
      if (!hasId(imageId)) return acc;
      const imageVersion = image.imageVersion || image.image_version;
      const cudaVersion = image.cudaVersion || image.cuda_version;
      if (!acc[frameworkName]) acc[frameworkName] = [];
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

  const handleGpuSelect = (rsgroupId) => {
    if (hasId(rsgroupId)) updateField("rsgroup_id", String(rsgroupId));
  };

  const handleImageSelect = (imageId) => {
    if (hasId(imageId)) updateField("image_id", String(imageId));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-(--decs-text-secondary)">
        선택한 서버
        <Badge color="brand">{formData.server_type}</Badge>
      </div>

      {/* GPU Selection */}
      <section className="space-y-3">
        <Header variant="h3">GPU 선택</Header>
        <FormField errorText={errors.rsgroup_id}>
          <Cards
            items={gpuItems}
            trackBy="groupKey"
            columns={1}
            selectionType="single"
            selectedItems={gpuItems.filter(
              (gpu) => formData.rsgroup_id === String(gpu.rsgroupId)
            )}
            onSelectionChange={([gpu]) => {
              if (gpu.availableNodes === 0) return;
              handleGpuSelect(gpu.rsgroupId);
            }}
            empty="선택한 서버에 사용할 수 있는 GPU가 없어요."
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
                      메모리 {gpu.ramGb}GB · 바로 쓸 수 있는 서버{" "}
                      {gpu.availableNodes}대 · 장비 번호{" "}
                      {gpu.nodeIds.join(", ")}
                    </span>
                  ),
                },
              ],
            }}
          />
        </FormField>
      </section>

      {/* Container Image Selection */}
      <section className="space-y-3">
        <Header variant="h3">컨테이너 이미지 선택</Header>
        <FormField
          errorText={errors.image_id}
          constraintText={
            !errors.image_id
              ? "연구에 필요한 프레임워크와 CUDA 버전을 확인하고 골라주세요."
              : undefined
          }
        >
          {groupedImages.length === 0 ? (
            <div className="py-4">
              <StatusIndicator type="loading">
                컨테이너 이미지 정보를 불러오고 있어요...
              </StatusIndicator>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedImages.map(([framework, images]) => (
                <div key={framework} className="space-y-2">
                  <div className="text-sm font-medium text-(--decs-text-secondary)">
                    {framework.charAt(0).toUpperCase() + framework.slice(1)}
                  </div>
                  <Cards
                    items={images}
                    trackBy="imageId"
                    columns={2}
                    selectionType="single"
                    selectedItems={images.filter(
                      (image) => formData.image_id === String(image.imageId)
                    )}
                    onSelectionChange={([image]) =>
                      handleImageSelect(image.imageId)
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
      </section>
    </div>
  );
};

export default StepServerSpec;
