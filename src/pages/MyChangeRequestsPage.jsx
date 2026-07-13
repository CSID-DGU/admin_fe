import { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Container,
  Header,
  KeyValuePairs,
  Modal,
  StatusIndicator,
  Tabs,
} from "../design-system";
import { requestService } from "../services/requestService";

const MyChangeRequestsPage = () => {
  const [changeRequests, setChangeRequests] = useState([]);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchChangeRequests = async () => {
      setIsLoading(true);
      setAlert(null);

      try {
        const response = await requestService.getMyChangeRequests();

        if (response.status === 200) {
          const changeRequestsArray = response.data?.data ?? [];
          setChangeRequests(changeRequestsArray.filter((request) => request.changeType !== "VOLUME_SIZE"));
        } else {
          setAlert({
            type: "error",
            message:
              "변경 요청 목록을 불러올 수 없습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch my change requests:", error);
        setAlert({
          type: "error",
          message:
            "변경 요청 목록 로딩 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하시고 페이지를 새로고침해주세요.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChangeRequests();
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

  const getStatusIndicator = (status) => {
    switch (status) {
      case "PENDING":
        return <StatusIndicator type="pending">대기중</StatusIndicator>;
      case "FULFILLED":
        return <StatusIndicator type="success">승인됨</StatusIndicator>;
      case "DENIED":
        return <StatusIndicator type="error">거절됨</StatusIndicator>;
      default:
        return <StatusIndicator type="info">{status}</StatusIndicator>;
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StatusIndicator type="loading">
          변경 요청 목록을 불러오고 있어요
        </StatusIndicator>
      </div>
    );
  }

  const changeRequestList =
    filteredChangeRequests.length === 0 ? (
      <Container>
        <div className="text-center py-12 space-y-2">
          <p className="text-(--decs-text-heading) font-bold">
            {filter === "ALL"
              ? "변경 요청이 없어요"
              : `${
                  filter === "PENDING"
                    ? "대기중인"
                    : filter === "FULFILLED"
                    ? "승인된"
                    : "거절된"
                } 변경 요청이 없어요`}
          </p>
          <p className="text-(--decs-text-secondary)">
            {filter === "ALL"
              ? "변경 요청을 제출하면 이곳에서 바로 확인할 수 있어요."
              : "다른 상태의 변경 요청을 확인해 보세요."}
          </p>
        </div>
      </Container>
    ) : (
      <div className="space-y-4">
        {filteredChangeRequests.map((changeRequest) => (
          <Container
            key={changeRequest.changeRequestId}
            header={
              <Header
                variant="h3"
                actions={
                  <Button
                    variant="normal"
                    onClick={() => setSelectedChangeRequest(changeRequest)}
                  >
                    상세보기
                  </Button>
                }
              >
                <span className="inline-flex items-center gap-3">
                  변경 요청 #{changeRequest.changeRequestId}
                  {getStatusIndicator(changeRequest.status)}
                </span>
              </Header>
            }
          >
            <div className="space-y-4">
              {/* Change Details */}
              <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4 space-y-3">
                <KeyValuePairs
                  columns={3}
                  items={[
                    {
                      label: "변경 유형",
                      value: getChangeTypeDisplay(changeRequest.changeType),
                    },
                    {
                      label: "이전 값",
                      value: formatChangeValue(
                        changeRequest.changeType,
                        changeRequest.oldValue
                      ),
                    },
                    {
                      label: "새로운 값",
                      value: formatChangeValue(
                        changeRequest.changeType,
                        changeRequest.newValue
                      ),
                    },
                  ]}
                />
                <KeyValuePairs
                  columns={1}
                  items={[
                    { label: "변경 사유", value: changeRequest.reason },
                  ]}
                />
              </div>

              {/* Request Information */}
              <KeyValuePairs
                columns={3}
                items={[
                  {
                    label: "원본 요청 ID",
                    value: `#${changeRequest.originalRequestId}`,
                  },
                  {
                    label: "요청 일시",
                    value: formatDate(changeRequest.createdAt),
                  },
                  {
                    label: "변경 유형",
                    value: getChangeTypeDisplay(changeRequest.changeType),
                  },
                ]}
              />

              {/* Status-specific information */}
              {changeRequest.status === "FULFILLED" && (
                <Alert type="success" header="승인이 완료됐어요">
                  {changeRequest.adminComment ||
                    "변경 요청이 승인되었습니다."}
                </Alert>
              )}

              {changeRequest.status === "DENIED" && (
                <Alert type="error" header="변경 요청이 거절됐어요">
                  사유:{" "}
                  {changeRequest.adminComment ||
                    "변경 요청이 거절되었습니다."}
                </Alert>
              )}

              {changeRequest.status === "PENDING" && (
                <Alert type="info" header="승인을 기다리고 있어요">
                  관리자가 검토 중이에요. 검토가 끝나면 이곳에서 결과를 확인할
                  수 있어요.
                </Alert>
              )}
            </div>
          </Container>
        ))}
      </div>
    );

  const filterTabs = [
    { key: "ALL", label: "전체" },
    { key: "PENDING", label: "대기중" },
    { key: "FULFILLED", label: "승인됨" },
    { key: "DENIED", label: "거절됨" },
  ].map((tab) => ({
    id: tab.key,
    label: `${tab.label} (${statusCounts[tab.key]})`,
    content: changeRequestList,
  }));

  return (
    <div className="space-y-6">
      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Header
        variant="h1"
        description="제출한 서버 변경 요청의 처리 상태를 확인할 수 있어요."
      >
        내 변경 요청 현황
      </Header>

      {/* Status Filter + List */}
      <Tabs tabs={filterTabs} activeTabId={filter} onChange={setFilter} />

      {/* Detail Modal */}
      {selectedChangeRequest && (
        <Modal
          visible
          size="large"
          onDismiss={() => setSelectedChangeRequest(null)}
          header={
            <span className="inline-flex items-center gap-3">
              변경 요청 상세 정보
              {getStatusIndicator(selectedChangeRequest.status)}
            </span>
          }
          footer={
            <Button
              variant="normal"
              onClick={() => setSelectedChangeRequest(null)}
            >
              닫기
            </Button>
          }
        >
          <div className="space-y-6">
            <p className="text-sm text-(--decs-text-secondary)">
              Change Request ID: {selectedChangeRequest.changeRequestId}
            </p>

            {/* Change Information */}
            <div className="space-y-3">
              <Header variant="h3">변경 내용</Header>
              <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4 space-y-3">
                <KeyValuePairs
                  columns={3}
                  items={[
                    {
                      label: "변경 유형",
                      value: getChangeTypeDisplay(
                        selectedChangeRequest.changeType
                      ),
                    },
                    {
                      label: "이전 값",
                      value: formatChangeValue(
                        selectedChangeRequest.changeType,
                        selectedChangeRequest.oldValue
                      ),
                    },
                    {
                      label: "새로운 값",
                      value: formatChangeValue(
                        selectedChangeRequest.changeType,
                        selectedChangeRequest.newValue
                      ),
                    },
                  ]}
                />
                <KeyValuePairs
                  columns={1}
                  items={[
                    {
                      label: "변경 사유",
                      value: selectedChangeRequest.reason,
                    },
                  ]}
                />
              </div>
            </div>

            {/* Request Information */}
            <div className="space-y-3">
              <Header variant="h3">요청 정보</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  {
                    label: "변경 요청 ID",
                    value: selectedChangeRequest.changeRequestId,
                  },
                  {
                    label: "원본 요청 ID",
                    value: `#${selectedChangeRequest.originalRequestId}`,
                  },
                  {
                    label: "요청 일시",
                    value: formatDate(selectedChangeRequest.createdAt),
                  },
                  {
                    label: "처리 상태",
                    value: getStatusIndicator(selectedChangeRequest.status),
                  },
                ]}
              />
            </div>

            {/* Status Information */}
            {(selectedChangeRequest.status === "FULFILLED" ||
              selectedChangeRequest.status === "DENIED") && (
              <div className="space-y-3">
                <Header variant="h3">처리 결과</Header>
                <Alert
                  type={
                    selectedChangeRequest.status === "FULFILLED"
                      ? "success"
                      : "error"
                  }
                  header={
                    selectedChangeRequest.status === "FULFILLED"
                      ? "승인이 완료됐어요"
                      : "변경 요청이 거절됐어요"
                  }
                >
                  관리자 메시지:{" "}
                  {selectedChangeRequest.adminComment ||
                    (selectedChangeRequest.status === "FULFILLED"
                      ? "변경 요청이 승인되었습니다."
                      : "변경 요청이 거절되었습니다.")}
                </Alert>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyChangeRequestsPage;
