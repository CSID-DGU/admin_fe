import { useState, useEffect } from "react";
import userService from "../../services/userService";
import { waitForGroupOperation } from "../../services/groupOperation";
import { Alert, Button, Modal, Table } from "../../design-system";

/**
 * 사용자가 속한 공용 그룹을 보여 주고 그룹에서 뺀다. 추가는 사용자의 그룹 변경 신청 승인으로만 한다.
 * 제거는 되돌리려면 다시 신청·승인을 거쳐야 하므로 한 번 더 확인받는다.
 */
const UserGroupsModal = ({ user, onDismiss }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUserGroups(user.userId);
      setGroups(response.data.data || []);
    } catch (e) {
      setError(`그룹 목록을 불러오지 못했습니다: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.userId]);

  const handleRemove = async () => {
    try {
      setRemoving(true);
      setError(null);
      const response = await userService.removeUserFromGroup(user.userId, confirming.groupId);
      // 제거는 작업으로 등록된다 — 끝난 뒤에야 목록에서 빠진다.
      const operation = await waitForGroupOperation(response.data?.data ?? response.data);
      setConfirming(null);
      // 목록을 다시 불러오면 알림이 지워지므로, 불러온 뒤에 결과를 알린다.
      await loadGroups();
      if (operation?.status === "FAILED") {
        setError("그룹에서 빼지 못했습니다. 다시 누르면 이어서 처리합니다.");
      } else if (operation?.status === "PROCESSING") {
        setError("반영에 시간이 걸리고 있습니다. 잠시 뒤에 다시 열어 확인해 주세요.");
      }
    } catch (e) {
      setError(`그룹에서 빼지 못했습니다: ${e.message}`);
    } finally {
      setRemoving(false);
    }
  };

  const columns = [
    { id: "name", header: "그룹", cell: (g) => g.groupName },
    { id: "gid", header: "GID", cell: (g) => g.ubuntuGid },
    {
      id: "actions",
      header: "",
      cell: (g) => (
        <Button variant="normal" disabled={removing} onClick={() => setConfirming(g)}>
          제거
        </Button>
      ),
    },
  ];

  return (
    <Modal
      visible
      onDismiss={removing ? undefined : onDismiss}
      dismissible={!removing}
      header={`${user.name} 그룹 관리`}
      footer={
        confirming ? (
          <>
            <Button variant="normal" disabled={removing} onClick={() => setConfirming(null)}>
              취소
            </Button>
            <Button variant="primary" loading={removing} onClick={handleRemove}>
              {confirming.groupName}에서 제거
            </Button>
          </>
        ) : (
          <Button variant="normal" onClick={onDismiss}>
            닫기
          </Button>
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
        {error && <Alert type="error">{error}</Alert>}
        {confirming && (
          <Alert type="warning">
            {user.name} 님을 <b>{confirming.groupName}</b> 그룹에서 뺍니다. 팀 공유 폴더(
            <code>~/shared/{confirming.groupName}</code>)에 더는 접근할 수 없고, 다시 넣으려면 그룹 변경
            신청을 승인해야 합니다. 팀 폴더에 남긴 파일은 그대로 남아 다른 팀원이 계속 씁니다.
          </Alert>
        )}
        <Table
          density="compact"
          trackBy="groupId"
          columns={columns}
          items={groups}
          loading={loading}
          empty="속한 공용 그룹이 없습니다."
        />
      </div>
    </Modal>
  );
};

export default UserGroupsModal;
