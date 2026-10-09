import { useState, useEffect, useRef } from "react";
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
import RequestDecisionModal from "../../components/RequestDecisionModal";

const STATUS_META = {
  PENDING: { type: "pending", label: "대기중" },
  // 승인은 했고 계정·컨테이너에 반영하는 작업이 도는 중이다(공유 그룹 추가, 추가 포트 변경, 비밀번호 변경). 끝나면 승인됨, 실패하면 대기중으로 돌아온다.
  PROCESSING: { type: "in-progress", label: "반영 중" },
  FULFILLED: { type: "success", label: "승인됨" },
  DENIED: { type: "error", label: "거절됨" },
};
const APPROVAL_BLOCK_REASON = {
  RESOURCE_GROUP: "DB 리소스 그룹만 변경되고 실행 중인 Pod에는 반영되지 않습니다.",
  CONTAINER_IMAGE: "DB 이미지 정보만 변경되고 실행 중인 Pod 이미지는 변경되지 않습니다.",
};

// 승인은 되지만 즉시 반영되지는 않는 변경 유형. 차단이 아니라 정보로 보여준다.
// GROUP: 그룹 변경은 Ubuntu 계정까지 반영된다(admin_be applyGroupChange → config-server →
// AD). 다만 NAS가 그룹 목록을 GSS 컨텍스트 수립 시점에 고정해 두기 때문에, 이미 떠 있는
// 컨테이너는 재조정 잡이 NAS 캐시를 비울 때까지 기다려야 한다(admin_infra-proposed#153).
// 컨테이너를 새로 만드는 경우는 새 컨텍스트라 즉시 반영된다.
const APPROVAL_DELAY_NOTE = {
  GROUP: "그룹 변경은 이미 실행 중인 컨테이너에 최대 약 30분 뒤에 반영됩니다. 새로 만드는 컨테이너는 즉시 반영됩니다.",
  PASSWORD: "웹 로그인과 SSH(Ubuntu 계정) 비밀번호가 함께 바뀝니다. 신청자가 가입한 메일로 본인 확인을 마친 요청이고, 적용되면 신청자의 기존 로그인은 끊깁니다.",
};

const POLL_MS = 3000;
const OPEN_STATUSES = new Set(["PENDING", "PROCESSING"]);

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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);
  const [processingChangeRequestId, setProcessingChangeRequestId] = useState(null);
  // 승인·거절 사유 입력 모달: { kind, request, title, defaultComment }
  const [decision, setDecision] = useState(null);

  // 반영 중인 변경 요청(번호 → 신청자 이름). 다시 불러왔을 때 끝난 것을 알아보는 데 쓴다.
  const processingRef = useRef(new Map());
  const fetchSeqRef = useRef(0);

  // quiet: 반영 중인 요청의 결과를 보려고 주기적으로 다시 부를 때 — 로딩 표시와 알림을 건드리지 않는다.
  const fetchData = async ({ quiet = false } = {}) => {
      // 승인·거절보다 먼저 떠난 조회가 늦게 돌아오면 방금 바꾼 상태를 옛 목록으로 덮는다. 떠날 때 번호를 받아 두고,
      // 돌아왔을 때 그 뒤로 새 조회나 승인·거절이 있었으면 버린다.
      const seq = ++fetchSeqRef.current;
      if (!quiet) {
        setIsLoading(true);
        setAlert(null);
      }

      try {
        // 변경 요청 목록과 모든 요청 목록을 병렬로 가져오기
        const [changeResponse, allResponse] = await Promise.all([
          requestService.getChangeRequests(),
          requestService.getAllRequests(),
        ]);

        if (seq !== fetchSeqRef.current) return;

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

          // 반영 중이던 요청이 끝났으면 결과를 알린다 — 실패하면 대기중으로 돌아와 다시 승인할 수 있다.
          transformedChangeRequests.forEach((changeReq) => {
            const name = processingRef.current.get(changeReq.changeRequestId);
            if (name === undefined) return;
            if (changeReq.status === "FULFILLED") {
              setAlert({ type: "success", message: `${name}님의 변경 요청이 반영되어 승인이 끝났습니다.` });
            } else if (changeReq.status === "PENDING") {
              setAlert({
                type: "error",
                message: `${name}님의 변경 요청을 반영하지 못해 대기중으로 되돌렸습니다. 다시 승인하면 이어서 반영합니다.`,
              });
            }
          });
          processingRef.current = new Map(
            transformedChangeRequests
              .filter((changeReq) => changeReq.status === "PROCESSING")
              .map((changeReq) => [changeReq.changeRequestId, changeReq.requestedBy?.name ?? ""])
          );
          setChangeRequests(transformedChangeRequests);
          setAllRequests(allRequestsArray);
          setLastUpdated(new Date());
        } else if (!quiet) {
          setAlert({
            type: "error",
            message:
              "변경 요청 목록을 불러올 수 없습니다. 서버 상태를 확인하시거나 관리자에게 문의해주세요.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch change requests:", error);
        // 주기적으로 다시 부르다 한 번 실패한 것은 다음 바퀴에 다시 본다.
        if (!quiet) setAlert({
          type: "error",
          message:
            "변경 요청 목록 로딩 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하시고 페이지를 새로고침해주세요.",
        });
      } finally {
        if (!quiet) setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hasProcessing = changeRequests.some((r) => r.status === "PROCESSING");
  useEffect(() => {
    if (!hasProcessing) return undefined;
    const timer = setInterval(() => fetchData({ quiet: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing]);

  const filteredChangeRequests = changeRequests
    .filter((changeReq) => {
      if (filter === "ALL") return true;
      // 반영 중인 요청은 아직 끝나지 않았으므로 대기중 탭에 함께 보인다.
      if (filter === "PENDING") return OPEN_STATUSES.has(changeReq.status);
      return changeReq.status === filter;
    })
    .sort((a, b) => {
      // Sort by priority: PENDING > FULFILLED > DENIED
      const statusPriority = { PENDING: 1, PROCESSING: 1, FULFILLED: 2, DENIED: 3 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      // Within same status, sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const statusCounts = {
    ALL: changeRequests.length,
    PENDING: changeRequests.filter((r) => OPEN_STATUSES.has(r.status)).length,
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
      case "PASSWORD":
        return "비밀번호";
      default:
        return changeType;
    }
  };

  const formatChangeValue = (changeType, value) => {
    if (changeType === "PASSWORD") {
      // 새 비밀번호는 서버도 해시로만 들고 있어 보여 줄 값이 없다.
      return "—";
    } else if (changeType === "EXPIRES_AT") {
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

      if (response.status === 200 || response.status === 202) {
        // 202는 반영 작업만 등록됐다는 뜻이다(공유 그룹 추가, 추가 포트 변경, 비밀번호 변경) — 반영 중으로 두고 목록을 다시 불러와 결과를 본다.
        const applied = response.status === 202 ? "PROCESSING" : newStatus;
        fetchSeqRef.current += 1;
        if (applied === "PROCESSING") {
          processingRef.current.set(changeRequest.changeRequestId, changeRequest.requestedBy.name);
        }
        setChangeRequests((prev) =>
          prev.map((req) =>
            req.changeRequestId === changeRequest.changeRequestId
              ? { ...req, status: applied, adminComment: comment }
              : req
          )
        );

        const delayNote =
          newStatus === "FULFILLED" ? APPROVAL_DELAY_NOTE[changeRequest.changeType] : null;
        const outcome =
          applied === "PROCESSING" ? "승인되어 반영 중입니다" : `성공적으로 ${newStatus === "FULFILLED" ? "승인" : "거절"}되었습니다`;
        setAlert({
          type: "success",
          message: `${changeRequest.requestedBy.name}님의 변경 요청이 ${outcome}. ${
            comment ? `사유: ${comment}` : ""
          }${delayNote ? ` ${delayNote}` : ""}`,
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

  const askApprove = (changeRequest) => {
    setDecision({
      kind: "approve",
      request: changeRequest,
      title: `변경 요청 #${changeRequest.changeRequestId}`,
      defaultComment: "변경 요청이 승인되었습니다.",
    });
  };

  const askDeny = (changeRequest) => {
    setDecision({
      kind: "deny",
      request: changeRequest,
      title: `변경 요청 #${changeRequest.changeRequestId}`,
      defaultComment: "거절되었습니다.",
    });
  };

  const confirmDecision = (comment) => {
    const { kind, request } = decision;
    setDecision(null);
    handleStatusUpdate(request, kind === "approve" ? "FULFILLED" : "DENIED", comment);
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
          <div style={{ color: "var(--decs-text-secondary)" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)" }}>
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
                onClick={() => askApprove(r)}
              >
                승인
              </Button>
              <Button
                variant="inline-link"
                disabled={processingChangeRequestId !== null}
                style={{ color: "var(--decs-status-error)" }}
                onClick={() => askDeny(r)}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
        <StatusIndicator type="loading">
          변경 요청 목록을 불러오는 중...
        </StatusIndicator>
      </div>
    );
  }

  const sel = selectedChangeRequest;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
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
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)" }}>
            {lastUpdated ? (
              <span style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>
                {lastUpdated.toLocaleTimeString("ko-KR")} 기준
              </span>
            ) : null}
            <Button iconName="arrow-path" loading={isLoading} onClick={fetchData}>새로고침</Button>
          </div>
        }
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
                    onClick={() => askDeny(sel)}
                    disabled={processingChangeRequestId !== null}
                  >
                    거절
                  </Button>
                  <Button
                    variant="primary"
                    disabled={processingChangeRequestId !== null || !!APPROVAL_BLOCK_REASON[sel.changeType]}
                    loading={processingChangeRequestId === sel.changeRequestId}
                    onClick={() => askApprove(sel)}
                  >
                    승인
                  </Button>
                </>
              )}
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
            <div>{renderStatus(sel.status)}</div>
            {sel.status === "PENDING" && APPROVAL_BLOCK_REASON[sel.changeType] && (
              <Alert type="warning" header="현재 승인할 수 없는 변경 유형입니다">
                {APPROVAL_BLOCK_REASON[sel.changeType]}
              </Alert>
            )}
            {sel.status === "PENDING" && APPROVAL_DELAY_NOTE[sel.changeType] && (
              <Alert type="info" header="승인 후 반영까지 시간이 걸립니다">
                {APPROVAL_DELAY_NOTE[sel.changeType]}
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
                    // 비밀번호 변경은 계정 단위라 대상 신청이 없다.
                    value: sel.originalRequestId == null ? "계정" : `#${sel.originalRequestId}`,
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
              <div style={{ marginTop: "var(--decs-space-m)" }}>
                <div style={{ color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>변경 사유</div>
                <div style={{ background: "var(--decs-surface-sunken)", padding: "var(--decs-space-s)" }}>
                  {sel.reason || "—"}
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
                <div style={{ marginTop: "var(--decs-space-m)" }}>
                  <div style={{ color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>
                    사용 목적
                  </div>
                  <div style={{ background: "var(--decs-surface-sunken)", padding: "var(--decs-space-s)" }}>
                    {sel.originalRequest.usagePurpose}
                  </div>
                </div>
                {sel.originalRequest.portMappings.length > 0 && (
                  <div style={{ marginTop: "var(--decs-space-m)" }}>
                    <div style={{ color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>
                      포트 매핑
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)" }}>
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

      <RequestDecisionModal
        decision={decision}
        submitting={processingChangeRequestId !== null}
        onCancel={() => setDecision(null)}
        onConfirm={confirmDecision}
      />
    </div>
  );
};

export default ChangeRequestManagementPage;
