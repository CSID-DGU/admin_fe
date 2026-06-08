import { useApplication } from "../../contexts/ApplicationContext";
import {
  CpuChipIcon,
  ComputerDesktopIcon,
  ServerIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const StepServerSpec = () => {
  const { formData, updateField, gpuTypes, containerImages, errors } =
    useApplication();

  const hasId = (id) => id !== undefined && id !== null;

  const filteredGpuTypes = gpuTypes.filter(
    (gpu) => gpu.serverName === formData.server_type
  );

  const groupedGpus = Object.entries(
    filteredGpuTypes.reduce((acc, gpu) => {
      if (!hasId(gpu.rsgroupId)) return acc;
      const key = `${gpu.gpuModel}-${gpu.ramGb}GB`;
      if (!acc[key]) {
        acc[key] = { ...gpu, availableNodes: 0, nodeIds: [] };
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
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">서버 사양을 선택하세요</h2>
        <p className="text-gray-500 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 text-sm font-medium bg-orange-100 text-[#F68313] mr-1">
            {formData.server_type}
          </span>
          서버의 GPU와 컨테이너 이미지를 선택합니다.
        </p>
      </div>

      {/* GPU Selection */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
          <CpuChipIcon className="w-5 h-5 mr-2 text-[#F68313]" />
          GPU 선택
        </h3>

        {groupedGpus.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            선택한 서버에 사용 가능한 GPU가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {groupedGpus.map(([gpuKey, gpu]) => {
              const isSelected = formData.rsgroup_id === String(gpu.rsgroupId);
              const isDisabled = gpu.availableNodes === 0;
              return (
                <button
                  key={gpuKey}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleGpuSelect(gpu.rsgroupId)}
                  className={`relative w-full p-4 border-2 text-left transition-all duration-200
                    ${isDisabled
                      ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                      : isSelected
                        ? "border-[#F68313] bg-orange-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                >
                  {isSelected && (
                    <CheckCircleIcon className="absolute top-3 right-3 w-5 h-5 text-[#F68313]" />
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {gpu.gpuModel}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium ${
                            gpu.availableNodes > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {gpu.availableNodes > 0 ? "사용 가능" : "사용 불가"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{gpu.description}</p>
                      <div className="flex gap-4 text-xs text-gray-400 mt-2">
                        <span>메모리: {gpu.ramGb}GB</span>
                        <span>가용 노드: {gpu.availableNodes}개</span>
                        <span>노드 ID: {gpu.nodeIds.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {errors.rsgroup_id && (
          <p className="text-sm text-red-600 mt-2">{errors.rsgroup_id}</p>
        )}
      </section>

      {/* Container Image Selection */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
          <ComputerDesktopIcon className="w-5 h-5 mr-2 text-[#F68313]" />
          컨테이너 이미지 선택
        </h3>

        {Object.keys(groupedImages).length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            컨테이너 이미지 정보를 불러오는 중...
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedImages).map(([framework, images]) => (
              <div key={framework}>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <ServerIcon className="w-4 h-4 mr-1 text-gray-400" />
                  {framework.charAt(0).toUpperCase() + framework.slice(1)}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {images.map((image) => {
                    const isSelected =
                      formData.image_id === String(image.imageId);
                    return (
                      <button
                        key={image.imageId}
                        type="button"
                        onClick={() => handleImageSelect(image.imageId)}
                        className={`relative w-full p-4 border-2 text-left transition-all duration-200
                          ${isSelected
                            ? "border-[#F68313] bg-orange-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                      >
                        {isSelected && (
                          <CheckCircleIcon className="absolute top-3 right-3 w-5 h-5 text-[#F68313]" />
                        )}
                        <div>
                          <span className="font-semibold text-gray-900">
                            {image.imageName} {image.imageVersion}
                          </span>
                          {image.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {image.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-xs text-gray-400 mt-2">
                            <span>CUDA: {image.cudaVersion}</span>
                            <span>ID: {image.imageId}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.image_id && (
          <p className="text-sm text-red-600 mt-2">{errors.image_id}</p>
        )}
        {!errors.image_id && (
          <p className="text-xs text-gray-400 mt-2">
            연구에 필요한 프레임워크와 CUDA 버전을 고려하여 선택하세요
          </p>
        )}
      </section>
    </div>
  );
};

export default StepServerSpec;
