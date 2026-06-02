import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import Card from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import Alert from "../../components/UI/Alert";
import { requestService } from "../../services/requestService";

const RequestManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      setAlert(null);

      try {
        const response = await requestService.getAllRequests();

        if (response.status === 200) {
          // API 응답 데이터를 기존 UI에 맞게 변환
          // response.data는 서버 응답이고, response.data.data가 실제 배열
          const requestsArray = response.data.data || [];
          const transformedRequests = requestsArray.map((request) => ({
            request_id: request.requestId,
            user_id: request.user.userId,
            user_name: request.user.name,
            user_email: request.user.email,
            user_phone: request.user.phone,
            student_id: request.user.studentId,
            department: request.user.department,
            is_active: request.user.isActive,
            rsgroup_id: request.resourceGroupId,
            rsgroup_name: request.resourceGroup.resourceGroupName,
            rsgroup_description: request.resourceGroup.description,
            server_name: request.resourceGroup.serverName,
            image_id: request.imageId, // 허용 버튼 처리 시 사용할 imageId 저장
            image_name: request.imageName,
            image_version: request.imageVersion,
            ubuntu_username: request.ubuntuUsername,
            ubuntu_gids: request.ubuntuGids,
            volume_size_GB: request.volumeSizeGiB,
            expires_at: request.expiresAt,
            usage_purpose: request.usagePurpose,
            form_answers: request.formAnswers,
            status: request.status,
            admin_comment: request.comment,
            approved_at: request.approvedAt,
            created_at: request.createdAt,
            updated_at: request.updatedAt,
            port_mappings: request.portMappings || [],
          }));

          setRequests(transformedRequests);
        } else {
          setAlert({
            type: "error",
            message:
              "신청서 목록을 불러올 수 없습니다. 서버 상태를 확인하시거나 관리자에게 문의해주세요.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setAlert({
          type: "error",
          message:
            "신청서 목록 로딩 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하시고 페이지를 새로고침해주세요.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const filteredRequests = requests
    .filter((request) => {
      if (filter === "ALL") return true;
      return request.status === filter;
    })
    .sort((a, b) => {
      // Sort by priority: PENDING > FULFILLED > DENIED
      const statusPriority = { PENDING: 1, FULFILLED: 2, DENIED: 3 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      // Within same status, sort by date (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    FULFILLED: requests.filter((r) => r.status === "FULFILLED").length,
    DENIED: requests.filter((r) => r.status === "DENIED").length,
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

  const handleStatusUpdate = async (request, newStatus, comment = "") => {
    try {
      let response;

      if (newStatus === "FULFILLED") {
        // 승인 API 호출
        const approvalData = {
          requestId: request.request_id,
          imageId: request.image_id,
          resourceGroupId: request.rsgroup_id,
          volumeSizeGiB: request.volume_size_GB,
          adminComment: comment,
        };
        response = await requestService.approveRequest(approvalData);
      } else if (newStatus === "DENIED") {
        // 거절 API 호출
        const rejectData = {
          requestId: request.request_id,
          adminComment: comment,
        };
        response = await requestService.rejectRequest(rejectData);
      } else {
        // 기존 API 사용 (다른 상태들)
        response = await requestService.updateRequestStatus(
          request.request_id,
          newStatus,
          comment
        );
      }

      if (response.status === 200) {
        // API 응답으로 받은 업데이트된 데이터로 state 업데이트
        const updatedRequest = response.data?.data || response.data;
        
        // 승인/거절 API의 경우 newStatus를 기반으로 상태 설정
        const finalStatus = (newStatus === "FULFILLED" || newStatus === "DENIED") 
          ? newStatus 
          : updatedRequest.status;
        
        setRequests((prev) =>
          prev.map((req) =>
            req.request_id === request.request_id
              ? {
                  ...req,
                  status: finalStatus,
                  admin_comment: updatedRequest.comment,
                  updated_at: updatedRequest.updatedAt,
                  approved_at: updatedRequest.approvedAt,
                  ubuntu_gids: updatedRequest.ubuntuGids,
                }
              : req
          )
        );

        setAlert({
          type: "success",
          message: `${request.user_name}님의 신청서가 성공적으로 ${
            newStatus === "FULFILLED" ? "승인" : "거절"
          }되었습니다.`,
        });

        setSelectedRequest(null);

        // 승인 처리 시 추가 정보 로깅
        if (newStatus === "FULFILLED") {
          console.log("승인 처리 완료:", {
            requestId: request.request_id,
            imageId: request.image_id,
            userId: request.user_id,
            resourceGroupId: request.rsgroup_id,
            ubuntuGids: updatedRequest.ubuntuGids,
          });
        }
      } else if (response.status === 409) {
        setAlert({
          type: "error",
          message:
            "이 신청서는 이미 처리되었습니다. 페이지를 새로고침하여 최신 상태를 확인해주세요.",
        });
      } else {
        setAlert({
          type: "error",
          message:
            "신청서 처리 중 오류가 발생했습니다. 네트워크 연결을 확인하시거나 잠시 후 다시 시도해주세요.",
        });
      }
    } catch (error) {
      console.error("Failed to update request status:", error);

      // 409 상태 코드 처리
      if (error.message && error.message.includes("409")) {
        setAlert({
          type: "error",
          message:
            "이 신청서는 이미 다른 관리자에 의해 처리되었습니다. 페이지를 새로고침해주세요.",
        });
      } else {
        setAlert({
          type: "error",
          message:
            "서버와의 연결에 문제가 발생했습니다. 인터넷 연결을 확인하시고 잠시 후 다시 시도해주세요.",
        });
      }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F68313] mx-auto"></div>
          <p className="mt-4 text-gray-600">신청서 목록을 불러오는 중...</p>
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
        <h1 className="text-2xl font-bold text-gray-900">신청서 관리</h1>
        <p className="text-gray-600 mt-1">
          사용자들의 서버 사용 신청서를 검토하고 승인/거절할 수 있습니다.
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
                  ? "bg-[#F68313] text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label} ({statusCounts[tab.key]})
            </button>
          ))}
        </div>
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "ALL"
                ? "신청서가 없습니다"
                : `${
                    filter === "PENDING"
                      ? "대기중인"
                      : filter === "FULFILLED"
                      ? "승인된"
                      : "거절된"
                  } 신청서가 없습니다`}
            </h3>
            <p className="text-gray-600">
              {filter === "ALL"
                ? "아직 제출된 신청서가 없습니다."
                : "다른 상태의 신청서를 확인해보세요."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.request_id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(request.status)}
                    <h3 className="text-lg font-semibold text-gray-900">
                      #{request.request_id} - {request.user_name}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        사용자 정보
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {request.student_id} | {request.department}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        리소스 그룹
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {request.rsgroup_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        이미지 & 볼륨
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {request.image_name}:{request.image_version}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight">
                        만료일
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {new Date(request.expires_at).toLocaleDateString(
                          "ko-KR"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-600 tracking-tight">
                        이메일
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {request.user_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 tracking-tight">
                        서버
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {request.server_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 tracking-tight">
                        볼륨 크기
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {request.volume_size_GB} GiB
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 tracking-tight">
                        Ubuntu 계정
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {request.ubuntu_username}
                      </p>
                    </div>
                  </div>

                  {/* Port Mappings */}
                  {request.port_mappings && request.port_mappings.length > 0 && (
                    <div className="mt-3 pt-3 mb-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-tight mb-2">
                        포트 매핑
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {request.port_mappings.map((port, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium text-center ${
                              port.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {port.externalPort}:{port.internalPort}
                            {port.usagePurpose && ` (${port.usagePurpose})`}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 border-b border-gray-100"></div>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-tight mb-1">
                      사용 목적
                    </p>
                    <p className="text-sm text-gray-900 tracking-tight">
                      {request.usage_purpose}
                    </p>
                  </div>

                  {/* Status-specific information */}
                  {request.status === "FULFILLED" && request.approved_at && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-4">
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">승인 완료</p>
                        <p>승인일: {formatDate(request.approved_at)}</p>
                      </div>
                    </div>
                  )}

                  {request.status === "DENIED" && request.admin_comment && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
                      <div className="text-sm text-red-700">
                        <p className="font-medium mb-1">거절 사유</p>
                        <p>{request.admin_comment}</p>
                      </div>
                    </div>
                  )}

                  {request.status === "PENDING" && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                      <div className="text-sm text-yellow-700">
                        <p className="font-medium mb-1">승인 대기 중</p>
                        <p>관리자 검토가 필요합니다.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    상세보기
                  </Button>

                  {request.status === "FULFILLED" && (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => {
                        const comment = prompt("승인철회 사유를 입력하세요:");
                        if (comment) {
                          handleStatusUpdate(request, "DENIED", comment);
                        }
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XMarkIcon className="w-4 h-4 mr-1" />
                      승인철회
                    </Button>
                  )}

                  {request.status === "PENDING" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const comment = prompt(
                            "승인 사유를 입력하세요:",
                            "승인되었습니다."
                          );
                          if (comment !== null) {
                            handleStatusUpdate(
                              request,
                              "FULFILLED",
                              comment || "승인되었습니다."
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors flex items-center"
                      >
                        <CheckIcon className="w-4 h-4 mr-1" />
                        승인
                      </button>
                      <button
                        onClick={() => {
                          const comment = prompt("거절 사유를 입력하세요:");
                          if (comment) {
                            handleStatusUpdate(request, "DENIED", comment);
                          }
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors flex items-center"
                      >
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        거절
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    신청 상세 정보
                  </h2>
                  <p className="text-sm text-gray-600">
                    Request ID: {selectedRequest.request_id}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedRequest.status)}
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedRequest(null)}
                  >
                    닫기
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {/* User Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                    사용자 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          이름
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.user_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          이메일
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.user_email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          계정 상태
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.is_active ? (
                            <Badge variant="success">활성</Badge>
                          ) : (
                            <Badge variant="danger">비활성</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          학번
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.student_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          학과
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.department}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          전화번호
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.user_phone || "등록되지 않음"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Group Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ServerIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                    리소스 그룹 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          리소스 그룹명
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.rsgroup_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          서버명
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.server_name}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          설명
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.rsgroup_description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                    신청 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Ubuntu 사용자명
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.ubuntu_username}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          볼륨 크기
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.volume_size_GB} GiB
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          컨테이너 이미지
                        </p>
                        <p className="text-sm text-gray-900">
                          {selectedRequest.image_name}:
                          {selectedRequest.image_version}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          만료일
                        </p>
                        <p className="text-sm text-gray-900">
                          {new Date(
                            selectedRequest.expires_at
                          ).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      {selectedRequest.ubuntu_gids &&
                        selectedRequest.ubuntu_gids.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Ubuntu GIDs
                            </p>
                            <p className="text-sm text-gray-900">
                              {selectedRequest.ubuntu_gids.join(", ")}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">
                      사용 목적
                    </p>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">
                      {selectedRequest.usage_purpose}
                    </p>
                  </div>
                  {selectedRequest.form_answers &&
                    Object.keys(selectedRequest.form_answers).length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          추가 정보
                        </p>
                        <div className="bg-gray-50 p-3 rounded space-y-2">
                          {Object.entries(selectedRequest.form_answers).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-sm font-medium text-gray-600 capitalize">
                                  {key.replace("_", " ")}:
                                </span>
                                <span className="text-sm text-gray-900">
                                  {value}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Port Mappings Information */}
                {selectedRequest.port_mappings && selectedRequest.port_mappings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <ServerIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                      포트 매핑 정보
                    </h3>
                    <div className="bg-gray-50 p-4">
                      <div className="space-y-3">
                        {selectedRequest.port_mappings.map((port, index) => (
                          <div key={index} className="bg-white p-3 border border-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700 text-center">
                                  외부 포트
                                </p>
                                <code className="block mt-1 p-1 bg-gray-100 text-sm text-center">
                                  {port.externalPort}
                                </code>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 text-center">
                                  내부 포트
                                </p>
                                <code className="block mt-1 p-1 bg-gray-100 text-sm text-center">
                                  {port.internalPort}
                                </code>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 text-center">
                                  상태
                                </p>
                                <span className={`inline-flex items-center justify-center w-full px-2 py-1 text-xs font-medium mt-1 text-center ${
                                  port.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {port.isActive ? "활성" : "비활성"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 text-center">
                                  사용 목적
                                </p>
                                <p className="text-sm text-gray-900 mt-1 text-center">
                                  {port.usagePurpose || "지정되지 않음"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status History */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                    처리 이력
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-900">
                        신청 제출: {formatDate(selectedRequest.created_at)}
                      </span>
                    </div>
                    {selectedRequest.approved_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-900">
                          승인 완료: {formatDate(selectedRequest.approved_at)}
                        </span>
                      </div>
                    )}
                    {selectedRequest.status === "DENIED" && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-900">
                          거절: {formatDate(selectedRequest.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedRequest.admin_comment && (
                    <div className="mt-4 bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-700">
                        관리자 의견
                      </p>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedRequest.admin_comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedRequest.status === "PENDING" && (
                <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                  <Button
                    variant="success"
                    onClick={() => {
                      const comment = prompt(
                        "승인 사유를 입력하세요:",
                        "승인되었습니다."
                      );
                      if (comment !== null) {
                        handleStatusUpdate(
                          selectedRequest,
                          "FULFILLED",
                          comment || "승인되었습니다."
                        );
                      }
                    }}
                  >
                    <CheckIcon className="w-4 h-4 mr-1" />
                    승인
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      const comment = prompt("거절 사유를 입력하세요:");
                      if (comment) {
                        handleStatusUpdate(selectedRequest, "DENIED", comment);
                      }
                    }}
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    거절
                  </Button>
                </div>
              )}

              {selectedRequest.status === "FULFILLED" && (
                <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                  <Button
                    variant="danger"
                    onClick={() => {
                      const comment = prompt("승인철회 사유를 입력하세요:");
                      if (comment) {
                        handleStatusUpdate(selectedRequest, "DENIED", comment);
                      }
                    }}
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    승인철회
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestManagementPage;
