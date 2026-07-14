import { useState, useEffect } from "react";
import {
  Container,
  Header,
  Table,
  Tabs,
  Button,
  Modal,
  Flashbar,
  Alert,
  StatusIndicator,
  Badge,
  KeyValuePairs,
} from "../../design-system";
import { requestService } from "../../services/requestService";

const STATUS_META = {
  PENDING: { type: "pending", label: "대기중" },
  FULFILLED: { type: "success", label: "승인됨" },
  DENIED: { type: "error", label: "거절됨" },
};
const APPROVAL_BLOCK_REASON = {
  GROUP: "DB 그룹만 변경되고 Ubuntu 계정 그룹에는 반영되지 않습니다.",
  RESOURCE_GROUP: "DB 리소스 그룹만 변경되고 실행 중인 Pod에는 반영되지 않습니다.",
  CONTAINER_IMAGE: "DB 이미지 정보만 변경되고 실행 중인 Pod 이미지는 변경되지 않습니다.",
  PORT: "백엔드 승인 서비스가 포트 변경을 아직 처리하지 않습니다.",
};

const renderStatus = (status) => {
  const meta = STATUS_META[status];
  if (!meta) return <StatusIndicator type="info">{status}</StatusIndicator>;
  return <StatusIndicator type={meta.type}>{meta.label}</StatusIndicator>;
};

const ChangeRequestManagementPage = () => {
  const [changeRequests, setChangeRequests] = useState([]);
  const [, setAllRequests] = useState([]);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);
  const [processingChangeRequestId, setProcessingChangeRequestId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setAlert(null);

      try {
        // 변경 요청 목록과 모든 요청 목록을 병렬로 가져오기
        const [changeResponse, allResponse] = await Promise.all([
          requestService.getChangeRequests(),
          requestService.getAllRequests(),
        ]);

        if (changeResponse.status === 200 && allResponse.status === 200) {
          const changeRequestsArray = changeResponse.data?.data ?? [];
          const allRequestsArray = allResponse.data?.data ?? [];

          // 변경 요청 데이터를 원본 요청과 연결
          const transformedChangeRequests = changeRequestsArray
            .filter((changeReq) => changeReq.changeType !== "VOLUME_SIZE")
            .map((changeReq) => {
              const originalRequest = allRequestsArray.find(
                (req) => req.requestId === changeReq.originalRequestId
              );

              return {
                changeRequestId: changeReq.changeRequestId,
                originalRequestId: changeReq.originalRequestId,
                changeType: changeReq.changeType,
                oldValue: changeReq.oldValue,
                newValue: changeReq.newValue,
                reason: changeReq.reason,
                status: changeReq.status,
                requestedBy: changeReq.requestedBy,
                createdAt: changeReq.createdAt,
                adminComment: changeReq.adminComment, // 관리자 코멘트 추가
                originalRequest: originalRequest ? {
                  requestId: originalRequest.requestId,
                  resourceGroup: originalRequest.resourceGroup,
                  user: originalRequest.user,
                  imageName: originalRequest.imageName,
                  imageVersion: originalRequest.imageVersion,
                  ubuntuUsername: originalRequest.ubuntuUsername,
                  usagePurpose: originalRequest.usagePurpose,
                  expiresAt: originalRequest.expiresAt,
                  status: originalRequest.status,
                  portMappings: originalRequest.portMappings || [],
                } : null,
              };
            });

          setChangeRequests(transformedChangeRequests);
          setAllRequests(allRequestsArray);
        } else {
          setAlert({
            type: "error",
            message:
              "변경 요청 목록을 불러올 수 없습니다. 서버 상태를 확인하시거나 관리자에게 문의해주세요.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch change requests:", error);
        setAlert({
          type: "error",
          message:
            "변경 요청 목록 로딩 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하시고 페이지를 새로고침해주세요.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredChangeRequests = changeRequests
    .filter((changeReq) => {
      if (filter === "ALL") return true;
      return changeReq.status === filter;
    })
    .sort((a, b) => {
      // Sort by priority: PENDING > FULFILLED > DENIED
      const statusPriority = { PENDING: 1, FULFILLED: 2, DENIED: 3 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      // Within same status, sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const statusCounts = {
    ALL: changeRequests.length,
    PENDING: changeRequests.filter((r) => r.status === "PENDING").length,
    FULFILLED: changeRequests.filter((r) => r.status === "FULFILLED").length,
    DENIED: changeRequests.filter((r) => r.status === "DENIED").length,
  };

  const getChangeTypeDisplay = (changeType) => {
    switch (changeType) {
      case "EXPIRES_AT":
        return "만료일";
      case "RESOURCE_GROUP":
        return "리소스 그룹";
      case "CONTAINER_IMAGE":
        return "컨테이너 이미지";
      case "GROUP":
        return "그룹";
      case "PORT":
        return "포트 매핑";
      default:
        return changeType;
    }
  };

  const formatChangeValue = (changeType, value) => {
    if (changeType === "EXPIRES_AT") {
      // 날짜 형식으로 포맷팅
      if (value) {
        return new Date(value).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return "날짜 없음";
    } else if (changeType === "RESOURCE_GROUP") {
      // 리소스 그룹 ID 또는 이름 표시
      return value;
    } else if (changeType === "CONTAINER_IMAGE") {
      // 이미지 정보 표시 (이미지명:태그 형식일 수 있음)
      if (typeof value === "object" && value !== null) {
        return `${value.imageName || value.name || ""}:${value.imageVersion || value.version || ""}`;
      }
      return value;
    } else if (changeType === "GROUP") {
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return value;
    } else if (changeType === "PORT") {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return "포트 없음";
        }
        return value.map(port => `${port.internalPort} (${port.usagePurpose || "목적 없음"})`).join(", ");
      }
      return "포트 없음";
    }
    return value;
  };

  const handleStatusUpdate = async (changeRequest, newStatus, comment = "") => {
    if (processingChangeRequestId !== null) return;
    if (newStatus === "FULFILLED" && APPROVAL_BLOCK_REASON[changeRequest.changeType]) {
      setAlert({
        type: "error",
        message: `현재 안전하게 승인할 수 없습니다. ${APPROVAL_BLOCK_REASON[changeRequest.changeType]}`,
      });
      return;
    }
    setProcessingChangeRequestId(changeRequest.changeRequestId);
    try {
      let response;

      if (newStatus === "FULFILLED") {
        // 승인 API 호출
        response = await requestService.approveChangeRequest(
          changeRequest.changeRequestId,
          comment
        );
      } else if (newStatus === "DENIED") {
        // 거절 API 호출
        response = await requestService.rejectChangeRequest(
          changeRequest.changeRequestId,
          comment
        );
      } else {
        throw new Error("지원하지 않는 상태 변경입니다.");
      }

      if (response.status === 200) {
        // 성공 시 상태 업데이트
        setChangeRequests((prev) =>
          prev.map((req) =>
            req.changeRequestId === changeRequest.changeRequestId
              ? { ...req, status: newStatus, adminComment: comment }
              : req
          )
        );

        setAlert({
          type: "success",
          message: `${changeRequest.requestedBy.name}님의 변경 요청이 성공적으로 ${
            newStatus === "FULFILLED" ? "승인" : "거절"
          }되었습니다. ${comment ? `사유: ${comment}` : ""}`,
        });

        setSelectedChangeRequest(null);
      } else if (response.status === 409) {
        setAlert({
          type: "error",
          message: "이미 처리된 변경 요청입니다. 페이지를 새로고침하여 최신 상태를 확인해주세요.",
        });
      } else {
        setAlert({
          type: "error",
          message:
            "변경 요청 처리 중 오류가 발생했습니다. 네트워크 연결을 확인하시거나 잠시 후 다시 시도해주세요.",
        });
      }
    } catch (error) {
      console.error("Failed to update change request status:", error);

      // 409 상태 코드 처리 (이미 처리된 요청)
      if (error.status === 409 || (error.message && error.message.includes("409"))) {
        setAlert({
          type: "error",
          message: "이미 처리된 변경 요청입니다. 페이지를 새로고침해주세요.",
        });
      } else if (error.message && error.message.includes("이미 처리된 신청입니다")) {
        setAlert({
          type: "error",
          message: "이미 다른 관리자에 의해 처리된 변경 요청입니다. 페이지를 새로고침해주세요.",
        });
      } else {
        setAlert({
          type: "error",
          message: error.status
            ? `변경 요청 처리에 실패했습니다. ${error.message}`
            : "서버와 연결할 수 없습니다. 네트워크를 확인하고 잠시 후 다시 시도해주세요.",
        });
      }
    } finally {
      setProcessingChangeRequestId(null);
    }
  };

  const promptApprove = (changeRequest) => {
    const comment = prompt(
      "승인 사유를 입력하세요:",
      "변경 요청이 승인되었습니다."
    );
    if (comment !== null) {
      handleStatusUpdate(
        changeRequest,
        "FULFILLED",
        comment || "변경 요청이 승인되었습니다."
      );
    }
  };

  const promptDeny = (changeRequest) => {
    const comment = prompt("거절 사유를 입력하세요:");
    if (comment) {
      handleStatusUpdate(changeRequest, "DENIED", comment);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const emptyText =
    filter === "ALL"
      ? "아직 제출된 변경 요청이 없습니다."
      : `${
          filter === "PENDING"
            ? "대기중인"
            : filter === "FULFILLED"
            ? "승인된"
            : "거절된"
        } 변경 요청이 없습니다. 다른 상태의 변경 요청을 확인해보세요.`;

  const columns = [
    {
      id: "id",
      header: "ID",
      width: "72px",
      cell: (r) => `#${r.changeRequestId}`,
    },
    {
      id: "requester",
      header: "요청자",
      minWidth: "160px",
      cell: (r) => (
        <div>
          <div>{r.requestedBy.name}</div>
          <div className="text-(--decs-text-secondary)">
            {r.requestedBy.email}
          </div>
        </div>
      ),
    },
    {
      id: "changeType",
      header: "변경 유형",
      cell: (r) => (
        <Badge color="blue">{getChangeTypeDisplay(r.changeType)}</Badge>
      ),
    },
    {
      id: "oldValue",
      header: "이전 값",
      minWidth: "120px",
      cell: (r) => formatChangeValue(r.changeType, r.oldValue),
    },
    {
      id: "newValue",
      header: "새로운 값",
      minWidth: "120px",
      cell: (r) => formatChangeValue(r.changeType, r.newValue),
    },
    {
      id: "createdAt",
      header: "요청일",
      cell: (r) => new Date(r.createdAt).toLocaleDateString("ko-KR"),
    },
    {
      id: "status",
      header: "상태",
      cell: (r) => renderStatus(r.status),
    },
    {
      id: "actions",
      header: "작업",
      minWidth: "150px",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Button
            variant="inline-link"
            onClick={() => setSelectedChangeRequest(r)}
          >
            상세
          </Button>
          {r.status === "PENDING" && (
            <>
              <Button
                variant="inline-link"
                disabled={processingChangeRequestId !== null || !!APPROVAL_BLOCK_REASON[r.changeType]}
                loading={processingChangeRequestId === r.changeRequestId}
                onClick={() => promptApprove(r)}
              >
                승인
              </Button>
              <Button
                variant="inline-link"
                disabled={processingChangeRequestId !== null}
                style={{ color: "var(--decs-status-error)" }}
                onClick={() => promptDeny(r)}
              >
                거절
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StatusIndicator type="loading">
          변경 요청 목록을 불러오는 중...
        </StatusIndicator>
      </div>
    );
  }

  const sel = selectedChangeRequest;

  return (
    <div className="space-y-6">
      {alert && (
        <Flashbar
          items={[
            {
              id: "page-alert",
              type: alert.type,
              content: alert.message,
              dismissible: true,
              onDismiss: () => setAlert(null),
            },
          ]}
        />
      )}

      <Header
        variant="h1"
        description="사용자들의 서버 변경 요청을 검토하고 승인/거절할 수 있습니다."
      >
        변경 요청 관리
      </Header>

      <Tabs
        tabs={[
          { key: "ALL", label: "전체" },
          { key: "PENDING", label: "대기중" },
          { key: "FULFILLED", label: "승인됨" },
          { key: "DENIED", label: "거절됨" },
        ].map((tab) => ({
          id: tab.key,
          label: `${tab.label} (${statusCounts[tab.key]})`,
        }))}
        activeTabId={filter}
        onChange={setFilter}
      />

      <Container disablePadding>
        <Table
          density="compact"
          columns={columns}
          items={filteredChangeRequests}
          trackBy="changeRequestId"
          header={
            <Header variant="h2" counter={`(${filteredChangeRequests.length})`}>
              변경 요청
            </Header>
          }
          empty={emptyText}
        />
      </Container>

      {/* Detail Modal */}
      {sel && (
        <Modal
          visible
          size="large"
          onDismiss={() => setSelectedChangeRequest(null)}
          header={`변경 요청 상세 정보 #${sel.changeRequestId}`}
          footer={
            <>
              <Button
                variant="normal"
                onClick={() => setSelectedChangeRequest(null)}
              >
                닫기
              </Button>
              {sel.status === "PENDING" && (
                <>
                  <Button
                    variant="normal"
                    style={{
                      color: "var(--decs-status-error)",
                      borderColor: "var(--decs-status-error)",
                    }}
                    onClick={() => promptDeny(sel)}
                    disabled={processingChangeRequestId !== null}
                  >
                    거절
                  </Button>
                  <Button
                    variant="primary"
                    disabled={processingChangeRequestId !== null || !!APPROVAL_BLOCK_REASON[sel.changeType]}
                    loading={processingChangeRequestId === sel.changeRequestId}
                    onClick={() => promptApprove(sel)}
                  >
                    승인
                  </Button>
                </>
              )}
            </>
          }
        >
          <div className="space-y-6">
            <div>{renderStatus(sel.status)}</div>
            {sel.status === "PENDING" && APPROVAL_BLOCK_REASON[sel.changeType] && (
              <Alert type="warning" header="현재 승인할 수 없는 변경 유형입니다">
                {APPROVAL_BLOCK_REASON[sel.changeType]}
              </Alert>
            )}

            <div>
              <Header variant="h3">변경 내용</Header>
              <KeyValuePairs
                columns={2}
                style={{ marginTop: "var(--decs-space-s)" }}
                items={[
                  {
                    label: "변경 유형",
                    value: (
                      <Badge color="blue">
                        {getChangeTypeDisplay(sel.changeType)}
                      </Badge>
                    ),
                  },
                  {
                    label: "원본 요청 ID",
                    value: `#${sel.originalRequestId}`,
                  },
                  {
                    label: "이전 값",
                    value: formatChangeValue(sel.changeType, sel.oldValue),
                  },
                  {
                    label: "새로운 값",
                    value: formatChangeValue(sel.changeType, sel.newValue),
                  },
                ]}
              />
              <div className="mt-4">
                <div className="text-(--decs-text-inactive) mb-1">변경 사유</div>
                <div className="bg-(--decs-surface-sunken) p-3">
                  {sel.reason}
                </div>
              </div>
            </div>

            <div>
              <Header variant="h3">요청자</Header>
              <KeyValuePairs
                columns={2}
                style={{ marginTop: "var(--decs-space-s)" }}
                items={[
                  { label: "이름", value: sel.requestedBy.name },
                  { label: "이메일", value: sel.requestedBy.email },
                  { label: "사용자 ID", value: sel.requestedBy.userId },
                  { label: "요청 일시", value: formatDate(sel.createdAt) },
                ]}
              />
            </div>

            {sel.originalRequest && (
              <div>
                <Header variant="h3">원본 요청</Header>
                <KeyValuePairs
                  columns={2}
                  style={{ marginTop: "var(--decs-space-s)" }}
                  items={[
                    {
                      label: "원본 요청 ID",
                      value: `#${sel.originalRequest.requestId}`,
                    },
                    {
                      label: "리소스 그룹",
                      value:
                        sel.originalRequest.resourceGroup.resourceGroupName,
                    },
                    {
                      label: "이미지",
                      value: `${sel.originalRequest.imageName}:${sel.originalRequest.imageVersion}`,
                    },
                    {
                      label: "Ubuntu 계정",
                      value: sel.originalRequest.ubuntuUsername,
                    },
                    {
                      label: "만료",
                      value: new Date(
                        sel.originalRequest.expiresAt
                      ).toLocaleDateString("ko-KR"),
                    },
                    {
                      label: "원본 상태",
                      value: renderStatus(sel.originalRequest.status),
                    },
                  ]}
                />
                <div className="mt-4">
                  <div className="text-(--decs-text-inactive) mb-1">
                    사용 목적
                  </div>
                  <div className="bg-(--decs-surface-sunken) p-3">
                    {sel.originalRequest.usagePurpose}
                  </div>
                </div>
                {sel.originalRequest.portMappings.length > 0 && (
                  <div className="mt-4">
                    <div className="text-(--decs-text-inactive) mb-1">
                      포트 매핑
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sel.originalRequest.portMappings.map((port, index) => (
                        <Badge
                          key={index}
                          color={port.isActive ? "green" : "grey"}
                        >
                          {port.externalPort}:{port.internalPort}
                          {port.usagePurpose ? ` (${port.usagePurpose})` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(sel.status === "FULFILLED" || sel.status === "DENIED") && (
              <Alert
                type={sel.status === "DENIED" ? "error" : "success"}
                header={sel.status === "DENIED" ? "거절 사유" : "승인 완료"}
              >
                {sel.adminComment ||
                  (sel.status === "DENIED"
                    ? "변경 요청이 거절되었습니다."
                    : "변경 요청이 승인되었습니다.")}
              </Alert>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChangeRequestManagementPage;
