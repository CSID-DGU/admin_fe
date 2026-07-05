import { useState } from "react";
import { FormField, Input, Button, Badge } from "../../design-system";

// 포트 사용 목적 입력 컴포넌트
const PortUsagePurposeInput = ({ portRequest, onUpdate }) => {
  const [value, setValue] = useState(portRequest.usagePurpose);

  const commit = () => {
    onUpdate(portRequest.internalPort, value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <div className="flex-1" onBlur={commit}>
      <Input
        value={value}
        onChange={setValue}
        onKeyDown={handleKeyDown}
        placeholder="사용 목적을 입력하세요"
        ariaLabel={`포트 ${portRequest.internalPort} 사용 목적`}
      />
    </div>
  );
};

const PortSelector = ({
  selectedPorts,
  onAddPort,
  onRemovePort,
  onUpdatePortUsagePurpose,
  label = "열어둘 포트 (선택사항)",
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPort();
    }
  };

  return (
    <FormField
      label={label}
      constraintText={
        selectedPorts.length > 0
          ? `${selectedPorts.length}개 포트를 열어둘 예정이에요. 각 포트의 사용 목적을 적어주세요.`
          : "외부에서 접속이 필요한 포트 번호와 사용 목적을 입력하세요. 예: 8080 (웹 서버), 3000 (API 서버)"
      }
    >
      <div className="space-y-2">
        {selectedPorts.map((portRequest) => (
          <div
            key={portRequest.internalPort}
            className="flex items-center gap-2 p-2 border border-(--decs-border-divider) rounded-(--decs-radius-item) bg-(--decs-surface-sunken)"
          >
            <Badge color="blue">포트 {portRequest.internalPort}</Badge>
            <PortUsagePurposeInput
              portRequest={portRequest}
              onUpdate={onUpdatePortUsagePurpose}
            />
            <Button
              variant="icon"
              iconName="x-mark"
              ariaLabel={`포트 ${portRequest.internalPort} 제거`}
              onClick={() => onRemovePort(portRequest.internalPort)}
            />
          </div>
        ))}

        <div className="flex gap-2">
          <Input
            type="number"
            value={newPortInput}
            onChange={setNewPortInput}
            onKeyDown={handleKeyDown}
            placeholder="포트 번호 (1-65535)"
            ariaLabel="포트 번호"
            style={{ width: "220px" }}
          />
          <Input
            value={newPortUsage}
            onChange={setNewPortUsage}
            onKeyDown={handleKeyDown}
            placeholder="사용 목적 (예: 웹 서버, API 서버)"
            ariaLabel="포트 사용 목적"
            style={{ flex: 1 }}
          />
          <Button
            variant="normal"
            iconName="plus"
            disabled={
              !newPortInput ||
              parseInt(newPortInput) <= 0 ||
              parseInt(newPortInput) > 65535
            }
            onClick={handleAddPort}
          >
            추가
          </Button>
        </div>
      </div>
    </FormField>
  );
};

export default PortSelector;
