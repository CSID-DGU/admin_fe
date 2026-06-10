import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Alert from "../components/UI/Alert";
import { useAuth } from "../hooks/useAuth";
import { requestService } from "../services/requestService";
import { mapRequestDtoToUiModel } from "../utils/requestMapper";
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  EyeIcon,
  PlusIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const RequestStatusPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setAlert(null);

      try {
        const response = await requestService.getUserRequests();

        if (response.status === 200) {
          // API 응답 데이터를 기존 UI에 맞게 변환
          const transformedRequests = response.data.data.map(
            mapRequestDtoToUiModel
          );

          setRequests(transformedRequests);
        } else {
          setAlert({
            type: "error",
            message:
              "요청 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setAlert({
          type: "error",
          message:
            "요청 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRequests();
    }
  }, [user]);

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F68313] mx-auto"></div>
          <p className="mt-4 text-gray-600">신청 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">신청 현황 조회</h1>
          <p className="text-gray-600 mt-1">
            서버 신청 내역과 승인 상태를 확인하세요.
          </p>
        </div>
        <Link to="/application">
          <Button
            variant="primary"
            className="bg-[#F68313] hover:bg-[#E6750F] border-[#F68313] hover:border-[#E6750F]"
          >
            <PlusIcon className="w-4 h-4 mr-1" />새 신청
          </Button>
        </Link>
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
                ? "신청 내역이 없습니다"
                : `${
                    filter === "PENDING"
                      ? "대기중인"
                      : filter === "FULFILLED"
                      ? "승인된"
                      : "거절된"
                  } 신청이 없습니다`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === "ALL"
                ? "첫 번째 서버를 신청해보세요."
                : "다른 상태의 신청을 확인해보세요."}
            </p>
            {filter === "ALL" && (
              <Link to="/application">
                <Button
                  variant="primary"
                  className="bg-[#F68313] hover:bg-[#E6750F] border-[#F68313] hover:border-[#E6750F]"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  서버 신청하기
                </Button>
              </Link>
            )}
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
                      #{request.request_id} - {request.ubuntu_username}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                        볼륨 크기
                      </p>
                      <p className="text-sm text-gray-900 mt-1 tracking-tight">
                        {request.volume_size_GB} GiB
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

                      {/* Port Information - pod_external_ports 우선, fallback to port_mappings */}
                  {(() => {
                    const ports = request.pod_external_ports || request.port_mappings;
                    if (!ports || ports.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-tight mb-2">
                          외부 포트 정보
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ports.map((port, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium text-center ${
                                port.isActive !== false
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {port.externalPort}:{port.internalPort}
                              {port.usagePurpose && ` (${port.usagePurpose})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}                  {/* Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-3 pt-3 border-t border-gray-100">
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
                        Ubuntu 계정
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {request.ubuntu_username}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 tracking-tight">
                        신청일
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 tracking-tight">
                        Ubuntu GIDs
                      </p>
                      <p className="text-sm text-gray-700 mt-1 tracking-tight">
                        {request.ubuntu_gids?.join(", ") || "설정되지 않음"}
                      </p>
                    </div>
                  </div>

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

                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedRequest(request)}
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

                {/* Server Access Information (for approved requests) */}
                {selectedRequest.status === "FULFILLED" && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <ServerIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                      서버 접속 정보
                    </h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            사용자명
                          </p>
                          <code className="block mt-1 p-2 bg-white border text-sm rounded">
                            {selectedRequest.ubuntu_username}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            리소스 그룹
                          </p>
                          <code className="block mt-1 p-2 bg-white border text-sm rounded">
                            {selectedRequest.rsgroup_name}
                          </code>
                        </div>
                      </div>
                      {selectedRequest.image_name && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700">
                            컨테이너 이미지
                          </p>
                          <code className="block mt-1 p-2 bg-white border text-sm rounded">
                            {selectedRequest.image_name}:
                            {selectedRequest.image_version}
                          </code>
                        </div>
                      )}
                      {(selectedRequest.ubuntu_uid != null || selectedRequest.ubuntu_gid != null) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {selectedRequest.ubuntu_uid != null && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Ubuntu UID</p>
                              <code className="block mt-1 p-2 bg-white border text-sm rounded">
                                {selectedRequest.ubuntu_uid}
                              </code>
                            </div>
                          )}
                          {selectedRequest.ubuntu_gid != null && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Ubuntu GID</p>
                              <code className="block mt-1 p-2 bg-white border text-sm rounded">
                                {selectedRequest.ubuntu_gid}
                              </code>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SSH/Jupyter/추가 포트 접속 정보 - pod_external_ports 기준 */}
                      {(() => {
                        const ports = selectedRequest.pod_external_ports || selectedRequest.port_mappings;
                        if (!ports || ports.length === 0) return null;
                        const sshPort = ports.find(p => p.internalPort === 22);
                        const jupyterPort = ports.find(p => p.internalPort === 8888);
                        const otherPorts = ports.filter(p => p.internalPort !== 22 && p.internalPort !== 8888);
                        return (
                          <div className="mt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">접속 포트 정보 (NodePort: 30000-32767)</p>
                            {sshPort && (
                              <div className="bg-white border p-3 rounded">
                                <p className="text-xs font-medium text-gray-500 mb-1">SSH 접속</p>
                                <code className="text-sm text-gray-900">
                                  ssh {selectedRequest.ubuntu_username}@&lt;서버IP&gt; -p {sshPort.externalPort}
                                </code>
                              </div>
                            )}
                            {jupyterPort && (
                              <div className="bg-white border p-3 rounded">
                                <p className="text-xs font-medium text-gray-500 mb-1">Jupyter 접속</p>
                                <code className="text-sm text-gray-900">
                                  http://&lt;서버IP&gt;:{jupyterPort.externalPort}
                                </code>
                              </div>
                            )}
                            {otherPorts.length > 0 && (
                              <div className="bg-white border p-3 rounded">
                                <p className="text-xs font-medium text-gray-500 mb-1">추가 포트</p>
                                <div className="space-y-1">
                                  {otherPorts.map((port, idx) => (
                                    <div key={idx} className="text-sm text-gray-900">
                                      <code>{port.externalPort} → {port.internalPort}</code>
                                      {port.usagePurpose && <span className="text-gray-500 ml-2">({port.usagePurpose})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Port Mappings Information - pod_external_ports 우선 */}
                {(() => {
                  const ports = selectedRequest.pod_external_ports || selectedRequest.port_mappings;
                  if (!ports || ports.length === 0) return null;
                  return (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <ServerIcon className="w-5 h-5 mr-2 text-[#F68313]" />
                        외부 포트 상세 정보
                      </h3>
                      <div className="bg-gray-50 p-4">
                        <div className="space-y-3">
                          {ports.map((port, index) => (
                            <div key={index} className="bg-white p-3 border border-gray-300">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-700 text-center">
                                    외부 포트 (NodePort)
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
                                    port.isActive !== false
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {port.isActive !== false ? "활성" : "비활성"}
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
                  );
                })()}

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestStatusPage;
