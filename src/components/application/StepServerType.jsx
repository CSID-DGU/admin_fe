import { useApplication } from "../../contexts/ApplicationContext";
import {
  ServerIcon,
  CpuChipIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const StepServerType = () => {
  const { formData, updateField, serverTypes, errors } = useApplication();

  const handleSelect = (serverName) => {
    updateField("server_type", serverName);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900">서버 유형을 선택하세요</h2>
        <p className="text-gray-500 mt-2">사용할 서버를 선택해주세요.</p>
      </div>

      {serverTypes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F68313] mx-auto mb-3"></div>
          서버 유형 정보를 불러오는 중...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {serverTypes.map((server) => {
            const isSelected = formData.server_type === server.name;
            return (
              <button
                key={server.name}
                type="button"
                onClick={() => handleSelect(server.name)}
                className={`relative p-6 border-2 text-left transition-all duration-200 group
                  ${isSelected
                    ? "border-[#F68313] bg-orange-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
              >
                {isSelected && (
                  <CheckCircleIcon className="absolute top-4 right-4 w-6 h-6 text-[#F68313]" />
                )}

                <div className="flex items-center mb-3">
                  <div
                    className={`p-2.5 rounded-lg ${
                      isSelected ? "bg-[#F68313] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    }`}
                  >
                    <ServerIcon className="w-6 h-6" />
                  </div>
                </div>

                <h3
                  className={`text-lg font-semibold mb-1 ${
                    isSelected ? "text-[#F68313]" : "text-gray-900"
                  }`}
                >
                  {server.name}
                </h3>

                <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <CpuChipIcon className="w-4 h-4" />
                    GPU {server.gpuCount}종
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                      server.totalNodes > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {server.totalNodes > 0
                      ? `${server.totalNodes}노드 가용`
                      : "가용 노드 없음"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {errors.server_type && (
        <p className="text-sm text-red-600 text-center mt-4">{errors.server_type}</p>
      )}
    </div>
  );
};

export default StepServerType;
