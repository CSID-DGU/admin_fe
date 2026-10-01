import { useCallback, useEffect, useRef, useState } from "react";
import userService from "../../services/userService";
import { Button, Container, Header, StatusIndicator, Table } from "../../design-system";

// 컨테이너에 반영 중인 신청이 있으면 끝날 때까지 이 간격으로 목록을 다시 읽는다.
const POLL_MS = 3000;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "-";

/**
 * 처리할 비밀번호 재설정 신청(승인 대기·컨테이너 반영 중). 신청이 없으면 아무것도 그리지 않는다.
 *
 * 승인은 반영 작업만 등록하고 돌아오므로, 결과는 목록을 다시 읽어 판정한다 — 반영 중이던 신청이 목록에서
 * 사라지면 적용된 것이고, 승인 대기로 돌아오면 실패한 것이다.
 *
 * reloadKey가 바뀌면 다시 읽는다(관리자 직접 초기화 뒤). onNotice({type, message})로 결과를 알린다.
 */
const PasswordResetRequestsPanel = ({ reloadKey, onNotice }) => {
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  // 직전에 읽은 목록에서 반영 중이던 신청: 번호 → 이름
  const processingRef = useRef(new Map());

  const load = useCallback(async () => {
    let next;
    try {
      const response = await userService.getPasswordResets();
      next = response.data?.data || [];
    } catch (error) {
      onNotice({ type: "error", message: `비밀번호 재설정 신청을 불러오지 못했어요: ${error.message}` });
      return;
    }
    const byId = new Map(next.map((request) => [request.passwordResetRequestId, request]));
    processingRef.current.forEach((name, id) => {
      const now = byId.get(id);
      if (!now) {
        onNotice({ type: "success", message: `${name} 님의 새 비밀번호가 적용됐어요.` });
      } else if (now.status === "PENDING") {
        onNotice({
          type: "error",
          message: `${name} 님의 새 비밀번호를 컨테이너에 반영하지 못했어요. 다시 승인하면 다시 반영해요.`,
        });
      }
    });
    processingRef.current = new Map(
      next.filter((request) => request.status === "PROCESSING").map((request) => [request.passwordResetRequestId, request.name])
    );
    setRequests(next);
  }, [onNotice]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const hasProcessing = requests.some((request) => request.status === "PROCESSING");
  useEffect(() => {
    if (!hasProcessing) return undefined;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, load]);

  const decide = async (request, action) => {
    setBusyId(request.passwordResetRequestId);
    try {
      if (action === "approve") {
        const response = await userService.approvePasswordReset(request.passwordResetRequestId);
        // 리눅스 계정이 없는 사용자는 반영할 컨테이너가 없어 바로 적용된다.
        if (response.data?.data?.status === "APPLIED") {
          onNotice({ type: "success", message: `${request.name} 님의 새 비밀번호가 적용됐어요.` });
        }
      } else {
        await userService.rejectPasswordReset(request.passwordResetRequestId);
        onNotice({ type: "success", message: `${request.name} 님의 재설정 신청을 거절했어요.` });
      }
    } catch (error) {
      onNotice({ type: "error", message: error.message || "처리하지 못했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusyId(null);
      load();
    }
  };

  if (requests.length === 0) return null;

  const columns = [
    {
      id: "user",
      header: "신청자",
      cell: (request) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>{request.name}</div>
          <div style={{ color: "var(--decs-text-secondary)" }}>{request.email}</div>
        </div>
      ),
    },
    { id: "ubuntuUsername", header: "Ubuntu 유저네임", cell: (request) => request.ubuntuUsername || "-" },
    {
      id: "status",
      header: "상태",
      cell: (request) =>
        request.status === "PROCESSING" ? (
          <StatusIndicator type="in-progress">컨테이너에 반영 중</StatusIndicator>
        ) : (
          <StatusIndicator type="pending">승인 대기</StatusIndicator>
        ),
    },
    { id: "updatedAt", header: "신청 시각", cell: (request) => formatDate(request.updatedAt || request.createdAt) },
    {
      id: "actions",
      header: "처리",
      cell: (request) =>
        request.status === "PENDING" ? (
          <div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
            <Button
              variant="primary"
              loading={busyId === request.passwordResetRequestId}
              disabled={busyId !== null}
              onClick={() => decide(request, "approve")}
            >
              승인
            </Button>
            <Button disabled={busyId !== null} onClick={() => decide(request, "reject")}>
              거절
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <Container disablePadding>
      <Table
        density="compact"
        trackBy="passwordResetRequestId"
        columns={columns}
        items={requests}
        header={
          <Header
            variant="h2"
            counter={`(${requests.length})`}
            description="승인하면 웹 로그인과 SSH 비밀번호가 함께 바뀌어요. 실행 중인 컨테이너에 반영한 뒤 적용되고, 신청자에게 메일로 알려요."
          >
            비밀번호 재설정 신청
          </Header>
        }
      />
    </Container>
  );
};

export default PasswordResetRequestsPanel;
