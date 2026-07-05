import { useState } from "react";
import { requestService } from "../../services/requestService";
import {
  FormField,
  Select,
  Input,
  Button,
  ExpandableSection,
  Icon,
} from "../../design-system";

const GroupSelector = ({
  selectedGroups,
  availableGroups,
  onAddGroup,
  onRemoveGroup,
  onCreateGroup,
  ubuntuUsername,
  label = "함께 쓸 그룹 (선택사항)",
}) => {
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const getGroupDisplayName = (gid) => {
    const group = availableGroups.find((g) => g.ubuntu_gid === gid);
    return group ? `${group.group_name} (${gid})` : `GID: ${gid}`;
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      return;
    }

    // 그룹명 중복 체크
    if (availableGroups.some((group) => group.group_name === newGroupName.trim())) {
      alert("이미 존재하는 그룹명입니다.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await requestService.createGroup(
        newGroupName.trim(),
        ubuntuUsername
      );

      if (response.status === 201) {
        // API 응답에서 데이터 안전하게 추출
        const responseData = response.data;
        if (responseData && responseData.ubuntuGid && responseData.groupName) {
          const newGroup = {
            ubuntu_gid: responseData.ubuntuGid,
            group_name: responseData.groupName,
          };

          // 부모 컴포넌트에 그룹 생성 알림 (availableGroups 업데이트용)
          onCreateGroup(newGroup);

          // API 요청이 성공한 후에만 선택된 그룹에 추가
          onAddGroup(newGroup.ubuntu_gid);

          setNewGroupName("");
        } else {
          alert("서버 응답 형식이 올바르지 않습니다.");
        }
      } else {
        alert("그룹 생성에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("그룹 생성 오류:", error);
      alert("그룹 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <FormField
      label={label}
      constraintText={
        selectedGroups.length > 0
          ? `${selectedGroups.length}개 그룹을 선택했어요. X 버튼으로 뺄 수 있어요.`
          : "기존 그룹을 고르거나 새 그룹을 만들 수 있어요."
      }
    >
      <div className="space-y-3">
        {selectedGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map((gid) => (
              <span
                key={gid}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-(--decs-radius-badge) bg-(--decs-brand-100) text-(--decs-brand-700)"
              >
                {getGroupDisplayName(gid)}
                <button
                  type="button"
                  onClick={() => onRemoveGroup(gid)}
                  aria-label="그룹 제거"
                  className="inline-flex hover:opacity-70 focus:outline-none"
                >
                  <Icon name="x-mark" size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <Select
          options={availableGroups
            .filter((group) => !selectedGroups.includes(group.ubuntu_gid))
            .map((group) => ({
              value: group.ubuntu_gid,
              label: `${group.group_name} (GID: ${group.ubuntu_gid})`,
            }))}
          selectedValue={null}
          onChange={(value) => onAddGroup(parseInt(value))}
          placeholder="기존 그룹을 추가하려면 선택하세요"
        />

        <ExpandableSection headerText="새 그룹 만들기">
          <div className="flex items-start gap-2">
            <Input
              value={newGroupName}
              onChange={setNewGroupName}
              placeholder="예: developers"
              disabled={isCreating}
              ariaLabel="새 그룹명"
              style={{ flex: 1 }}
            />
            <Button
              variant="normal"
              loading={isCreating}
              disabled={!newGroupName.trim() || isCreating}
              onClick={handleCreateGroup}
            >
              그룹 생성 및 선택
            </Button>
          </div>
        </ExpandableSection>
      </div>
    </FormField>
  );
};

export default GroupSelector;
