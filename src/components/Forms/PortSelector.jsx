import { useState } from "react";
import { ServerIcon, XMarkIcon } from "@heroicons/react/24/outline";

// 포트 사용 목적 입력 컴포넌트
const PortUsagePurposeInput = ({ portRequest, onUpdate }) => {
  const [value, setValue] = useState(portRequest.usagePurpose);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleBlur = () => {
    onUpdate(portRequest.internalPort, value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="사용 목적을 입력하세요"
      className="flex-1 px-3 py-1 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
    />
  );
};

const PortSelector = ({ 
  selectedPorts, 
  onAddPort, 
  onRemovePort, 
  onUpdatePortUsagePurpose,
  label = "개방이 필요한 내부 포트 (선택사항)" 
}) => {
  const [newPortInput, setNewPortInput] = useState("");
  const [newPortUsage, setNewPortUsage] = useState("");

  const handleAddPort = () => {
    const port = parseInt(newPortInput);
    if (port && port > 0 && port <= 65535) {
      const usagePurpose = newPortUsage.trim() || `포트 ${port}`;
      onAddPort(port, usagePurpose);
      setNewPortInput("");
      setNewPortUsage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPort();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <ServerIcon className="w-4 h-4 inline mr-1" />
        {label}
      </label>

      {/* 선택된 포트들 표시 */}
      {selectedPorts.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedPorts.map((portRequest) => (
            <div
              key={portRequest.internalPort}
              className="flex items-center gap-2 p-3 border border-gray-200 bg-gray-50"
            >
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800">
                포트 {portRequest.internalPort}
              </span>
              <PortUsagePurposeInput 
                portRequest={portRequest} 
                onUpdate={onUpdatePortUsagePurpose}
              />
              <button
                type="button"
                onClick={() => onRemovePort(portRequest.internalPort)}
                className="inline-flex items-center justify-center w-6 h-6 hover:bg-red-100 focus:outline-none text-red-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 포트 입력 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            value={newPortInput}
            onChange={(e) => setNewPortInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="포트 번호 (1-65535)"
            min="1"
            max="65535"
            className="w-64 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <input
            type="text"
            value={newPortUsage}
            onChange={(e) => setNewPortUsage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="사용 목적 (예: 웹 서버, API 서버)"
            className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <button
            type="button"
            onClick={handleAddPort}
            disabled={
              !newPortInput ||
              parseInt(newPortInput) <= 0 ||
              parseInt(newPortInput) > 65535
            }
            className="px-4 py-2 bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            추가
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {selectedPorts.length > 0
          ? `${selectedPorts.length}개 포트가 설정됨. 각 포트의 사용 목적을 명확히 기입해주세요.`
          : "외부에서 접근이 필요한 포트 번호와 사용 목적을 입력하세요. 예: 8080 (웹 서버), 3000 (API 서버) 등"}
      </p>
    </div>
  );
};

export default PortSelector;