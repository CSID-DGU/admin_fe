import { useCallback, useEffect, useState } from "react";
import { requestService } from "../../services/requestService";
import { Alert, Button, Container, Header, Table } from "../../design-system";

/**
 * 사용자가 낸 그룹 탈퇴 신청 중 승인을 기다리는 것. 승인하면 관리자가 직접 그룹에서 뺄 때와 같은 제거 작업이 등록되고,
 * 작업이 끝나야 소속이 빠진다. 대기 중인 신청이 없으면 아무것도 그리지 않는다.
 */
const GroupLeaveRequestsPanel = () => {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await requestService.getPendingGroupLeaveRequests();
      setItems(response.data?.data ?? []);
    } catch (e) {
      setNotice({ type: "error", text: `그룹 탈퇴 신청을 불러오지 못했습니다: ${e.message}` });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item, approve) => {
    setBusyId(item.leaveRequestId);
    setNotice(null);
    try {
      if (approve) {
        await requestService.approveGroupLeaveRequest(item.leaveRequestId);
        setNotice({ type: "success", text: `${item.userName}님의 ${item.groupName} 탈퇴를 승인했습니다. 그룹 제거 작업이 반영 중입니다.` });
      } else {
        await requestService.rejectGroupLeaveRequest(item.leaveRequestId);
        setNotice({ type: "success", text: `${item.userName}님의 ${item.groupName} 탈퇴 신청을 거절했습니다.` });
      }
    } catch (e) {
      setNotice({ type: "error", text: e.message || "처리하지 못했습니다." });
    } finally {
      setBusyId(null);
      load();
    }
  };

  if (items.length === 0 && !notice) return null;

  const columns = [
    { id: "user", header: "사용자", cell: (item) => item.userName },
    { id: "group", header: "그룹", cell: (item) => item.groupName },
    { id: "createdAt", header: "신청일", cell: (item) => new Date(item.createdAt).toLocaleDateString("ko-KR") },
    {
      id: "actions",
      header: "처리",
      cell: (item) => (
        <div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
          <Button variant="primary" loading={busyId === item.leaveRequestId} disabled={busyId !== null} onClick={() => decide(item, true)}>승인</Button>
          <Button disabled={busyId !== null} onClick={() => decide(item, false)}>거절</Button>
        </div>
      ),
    },
  ];

  return (
    <Container>
      {notice ? <Alert type={notice.type} dismissible onDismiss={() => setNotice(null)}>{notice.text}</Alert> : null}
      <Table
        density="compact"
        trackBy="leaveRequestId"
        columns={columns}
        items={items}
        empty="승인을 기다리는 그룹 탈퇴 신청이 없습니다."
        header={<Header variant="h2" counter={`(${items.length})`}>그룹 탈퇴 신청</Header>}
      />
    </Container>
  );
};

export default GroupLeaveRequestsPanel;
