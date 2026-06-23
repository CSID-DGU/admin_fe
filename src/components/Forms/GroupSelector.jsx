import { useState } from "react";
import { UsersIcon, XMarkIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import { requestService } from "../../services/requestService";

const GroupSelector = ({
  selectedGroups,
  availableGroups,
  onAddGroup,
  onRemoveGroup,
  onCreateGroup,
  ubuntuUsername,
  label = "그룹 (선택사항)"
}) => {
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const getGroupName = (gid) => {
    const group = availableGroups.find((g) => g.ubuntu_gid === gid);
    return group ? group.group_name : `GID: ${gid}`;
  };

  const getGroupDisplayName = (gid) => {
    const group = availableGroups.find((g) => g.ubuntu_gid === gid);
    return group ? `${group.group_name} (${gid})` : `GID: ${gid}`;
  };

  const handleSelectChange = (e) => {
    if (e.target.value) {
      onAddGroup(parseInt(e.target.value));
      e.target.value = ""; // 선택 후 초기화
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      return;
    }

    // 그룹명 중복 체크
    if (availableGroups.some(group => group.group_name === newGroupName.trim())) {
      alert("이미 존재하는 그룹명입니다.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await requestService.createGroup(newGroupName.trim(), ubuntuUsername);
      
      if (response.status === 201) {
        // API 응답에서 데이터 안전하게 추출
        const responseData = response.data;
        if (responseData && responseData.ubuntuGid && responseData.groupName) {
          const newGroup = {
            ubuntu_gid: responseData.ubuntuGid,
            group_name: responseData.groupName
          };
          
          // 부모 컴포넌트에 그룹 생성 알림 (availableGroups 업데이트용)
          onCreateGroup(newGroup);
          
          // API 요청이 성공한 후에만 선택된 그룹에 추가
          onAddGroup(newGroup.ubuntu_gid);
          
          setNewGroupName("");
          setShowCreateForm(false);
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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <UsersIcon className="w-4 h-4 inline mr-1" />
        {label}
      </label>

      {/* 선택된 그룹들 표시 */}
      {selectedGroups.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map((gid) => (
              <span
                key={gid}
                className="inline-flex items-center px-3 py-1 text-sm font-medium bg-white border border-brand-500 text-brand-500"
              >
                {getGroupDisplayName(gid)}
                <button
                  type="button"
                  onClick={() => onRemoveGroup(gid)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 hover:bg-gray-100 focus:outline-none"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 새 그룹 생성 섹션 */}
      <div className="mb-4 p-4 border border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">새 그룹 생성</h4>
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-brand-500 bg-white border border-brand-500 hover:bg-brand-500 hover:text-white focus:outline-none"
          >
            {showCreateForm ? (
              <MinusIcon className="w-3 h-3 mr-1" />
            ) : (
              <PlusIcon className="w-3 h-3 mr-1" />
            )}
            {showCreateForm ? "취소" : "새 그룹 만들기"}
          </button>
        </div>

        {showCreateForm && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                그룹명
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="예: developers"
                disabled={isCreating}
                className="block w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || isCreating}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "그룹 생성 중..." : "그룹 생성 및 선택"}
            </button>
          </div>
        )}
      </div>

      {/* 기존 그룹 선택 섹션 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">기존 그룹 선택</h4>
        <select
          value=""
          onChange={handleSelectChange}
          className="block w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">기존 그룹을 추가하려면 선택하세요</option>
          {availableGroups
            .filter((group) => !selectedGroups.includes(group.ubuntu_gid))
            .map((group) => (
              <option key={group.ubuntu_gid} value={group.ubuntu_gid}>
                {group.group_name} (GID: {group.ubuntu_gid})
              </option>
            ))}
        </select>
      </div>

      <p className="text-xs text-gray-500">
        {selectedGroups.length > 0
          ? `${selectedGroups.length}개 그룹이 선택됨. 뱃지의 X 버튼을 클릭하여 제거할 수 있습니다.`
          : "새 그룹을 생성하거나 기존 그룹을 선택할 수 있습니다."}
      </p>
    </div>
  );
};

export default GroupSelector;