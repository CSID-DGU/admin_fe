import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsRightLeftIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import Card from "../components/UI/Card";
import Badge from "../components/UI/Badge";
import Button from "../components/UI/Button";
import Alert from "../components/UI/Alert";
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
          const changeRequestsArray = response.data.data || [];
          setChangeRequests(changeRequestsArray);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">대기중</Badge>;
      case "FULFILLED":
        return <Badge variant="success">승인됨</Badge>;
      case "DENIED":
        return <Badge variant="danger">거절됨</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "FULFILLED":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "PENDING":
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case "DENIED":
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getChangeTypeDisplay = (changeType) => {
    switch (changeType) {
      case "VOLUME_SIZE":
        return "볼륨 크기";
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
    if (changeType === "VOLUME_SIZE") {
      return `${value} GiB`;
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">변경 요청 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert && (
        <Alert type={alert.type} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 변경 요청 현황</h1>
        <p className="text-gray-600 mt-1">
          제출한 서버 변경 요청의 처리 상태를 확인할 수 있습니다.
        </p>
      </div>

      {/* Status Filter */}
      <Card>
        <div className="flex space-x-1">
          {[
            { key: "ALL", label: "전체" },
            { key: "PENDING", label: "대기중" },
            { key: "FULFILLED", label: "승인됨" },
            { key: "DENIED", label: "거절됨" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label} ({statusCounts[tab.key]})
            </button>
          ))}
        </div>
      </Card>

      {/* Change Requests List */}
      {filteredChangeRequests.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ArrowsRightLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "ALL"
                ? "변경 요청이 없습니다"
                : `${
                    filter === "PENDING"
                      ? "대기중인"
                      : filter === "FULFILLED"
                      ? "승인된"
                      : "거절된"
                  } 변경 요청이 없습니다`}
            </h3>
            <p className="text-gray-600">
              {filter === "ALL"
                ? "아직 제출된 변경 요청이 없습니다."
                : "다른 상태의 변경 요청을 확인해보세요."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredChangeRequests.map((changeRequest) => (
            <Card key={changeRequest.changeRequestId}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(changeRequest.status)}
                    <h3 className="text-lg font-semibold text-gray-900">
                      변경 요청 #{changeRequest.changeRequestId}
                    </h3>
                    {getStatusBadge(changeRequest.status)}
                  </div>

                  {/* Change Details */}
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ArrowsRightLeftIcon className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-800">
                        {getChangeTypeDisplay(changeRequest.changeType)} 변경 요청
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700 font-medium">이전 값:</p>
                        <p className="text-blue-900">
                          {formatChangeValue(changeRequest.changeType, changeRequest.oldValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700 font-medium">새로운 값:</p>
                        <p className="text-blue-900">
                          {formatChangeValue(changeRequest.changeType, changeRequest.newValue)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-blue-700 font-medium">변경 사유:</p>
                      <p className="text-blue-900">{changeRequest.reason}</p>
                    </div>
                  </div>

                  {/* Request Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        원본 요청 ID
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        #{changeRequest.originalRequestId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        요청 일시
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {formatDate(changeRequest.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        변경 유형
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {getChangeTypeDisplay(changeRequest.changeType)}
                      </p>
                    </div>
                  </div>

                  {/* Status-specific information */}
                  {changeRequest.status === "FULFILLED" && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-4">
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">승인 완료</p>
                        <p>{changeRequest.adminComment || "변경 요청이 승인되었습니다."}</p>
                      </div>
                    </div>
                  )}

                  {changeRequest.status === "DENIED" && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
                      <div className="text-sm text-red-700">
                        <p className="font-medium mb-1">거절됨</p>
                        <p><strong>사유:</strong> {changeRequest.adminComment || "변경 요청이 거절되었습니다."}</p>
                      </div>
                    </div>
                  )}

                  {changeRequest.status === "PENDING" && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium mb-1">승인 대기 중</p>
                        <p>관리자가 검토 중입니다. 잠시만 기다려 주세요.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedChangeRequest(changeRequest)}
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    상세보기
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedChangeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    변경 요청 상세 정보
                  </h2>
                  <p className="text-sm text-gray-600">
                    Change Request ID: {selectedChangeRequest.changeRequestId}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedChangeRequest.status)}
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedChangeRequest(null)}
                  >
                    닫기
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Change Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ArrowsRightLeftIcon className="w-5 h-5 mr-2 text-brand-500" />
                    변경 내용
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-blue-700">변경 유형</p>
                      <p className="text-sm text-blue-900">
                        {getChangeTypeDisplay(selectedChangeRequest.changeType)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-700">이전 값</p>
                        <p className="text-sm text-blue-900">
                          {formatChangeValue(selectedChangeRequest.changeType, selectedChangeRequest.oldValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">새로운 값</p>
                        <p className="text-sm text-blue-900">
                          {formatChangeValue(selectedChangeRequest.changeType, selectedChangeRequest.newValue)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">변경 사유</p>
                      <p className="text-sm text-blue-900">{selectedChangeRequest.reason}</p>
                    </div>
                  </div>
                </div>

                {/* Request Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-brand-500" />
                    요청 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">변경 요청 ID</p>
                        <p className="text-sm text-gray-900">{selectedChangeRequest.changeRequestId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">원본 요청 ID</p>
                        <p className="text-sm text-gray-900">#{selectedChangeRequest.originalRequestId}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">요청 일시</p>
                        <p className="text-sm text-gray-900">{formatDate(selectedChangeRequest.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">처리 상태</p>
                        <div className="mt-1">
                          {getStatusBadge(selectedChangeRequest.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                {(selectedChangeRequest.status === "FULFILLED" || selectedChangeRequest.status === "DENIED") && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-brand-500" />
                      처리 결과
                    </h3>
                    <div className={`border-l-4 p-4 ${
                      selectedChangeRequest.status === "FULFILLED" 
                        ? "bg-green-50 border-green-400" 
                        : "bg-red-50 border-red-400"
                    }`}>
                      <div className={`text-sm ${
                        selectedChangeRequest.status === "FULFILLED" 
                          ? "text-green-700" 
                          : "text-red-700"
                      }`}>
                        <p className="font-medium mb-1">
                          {selectedChangeRequest.status === "FULFILLED" ? "승인 완료" : "요청 거절됨"}
                        </p>
                        <p>
                          <strong>관리자 메시지:</strong>{" "}
                          {selectedChangeRequest.adminComment || 
                           (selectedChangeRequest.status === "FULFILLED" 
                             ? "변경 요청이 승인되었습니다." 
                             : "변경 요청이 거절되었습니다.")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyChangeRequestsPage;