import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Badge from "../../components/UI/Badge";
import Alert from "../../components/UI/Alert";
import { requestService } from "../../services/requestService";
import {
  ServerIcon,
  ClockIcon,
  PlusIcon,
  CogIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

const UserDashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await requestService.getDashboardServers("ALL");

        if (response.status === 200) {
          // API 응답 구조에 맞춰 데이터 추출
          const apiData = response.data;
          const servers = apiData?.data || [];

          // servers가 배열인지 확인
          if (!Array.isArray(servers)) {
            setError("서버 데이터 형식이 올바르지 않습니다.");
            return;
          }

          // 서버 데이터를 상태별로 분류
          const approvedServers = servers.filter(
            (server) =>
              server.status === "APPROVED" || server.status === "FULFILLED"
          );
          const pendingRequests = servers.filter(
            (server) => server.status === "PENDING"
          );
          const activeServers = approvedServers.filter(
            (server) => server.serverAddress !== null
          );

          setDashboardData({
            totalServers: approvedServers.length,
            activeServers: activeServers.length,
            approvedServers: approvedServers,
            pendingRequests: pendingRequests,
          });
        } else {
          setError(
            "대시보드 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요."
          );
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        setError(
          "대시보드 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">대시보드 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "FULFILLED":
      case "APPROVED":
        return <Badge variant="success">승인완료</Badge>;
      case "PENDING":
        return <Badge variant="warning">승인대기</Badge>;
      case "DENIED":
        return <Badge variant="danger">거절됨</Badge>;
      default:
        return <Badge variant="default">알 수 없음</Badge>;
    }
  };

  const getServerStatusBadge = (serverAddress) => {
    return serverAddress ? (
      <Badge variant="success">활성</Badge>
    ) : (
      <Badge variant="danger">비활성</Badge>
    );
  };

  const formatBytes = (sizeGiB) => {
    return sizeGiB + " GB";
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          안녕하세요, {user?.name || "사용자"}님!
        </h1>
        <p className="text-gray-600 mt-1">
          승인받은 서버 현황을 확인하고 관리하세요.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert type="error" title="오류">
          {error}
        </Alert>
      )}

      {/* Status Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="전체 서버">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ServerIcon className="w-8 h-8 text-brand-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.totalServers}
                  </p>
                  <p className="text-sm text-gray-600">승인받은 서버</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="활성 서버">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ComputerDesktopIcon className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.activeServers}
                  </p>
                  <p className="text-sm text-gray-600">현재 사용 가능</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="대기 중인 신청">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="w-8 h-8 text-yellow-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.pendingRequests.length}
                  </p>
                  <p className="text-sm text-gray-600">승인 대기 중</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Server Request Alert */}
      {dashboardData && dashboardData.approvedServers.length === 0 && (
        <Alert type="info" title="서버 신청 안내">
          아직 승인된 서버가 없습니다. 새로운 서버를 신청해보세요.
          <div className="mt-3">
            <Link to="/application">
              <Button variant="outline" size="small">
                <PlusIcon className="w-4 h-4 mr-1" />
                서버 신청하기
              </Button>
            </Link>
          </div>
        </Alert>
      )}

      {/* Approved Servers */}
      {dashboardData && dashboardData.approvedServers.length > 0 && (
        <Card title="승인받은 서버 목록">
          <div className="space-y-6">
            {dashboardData.approvedServers.map((server) => {
              const daysLeft = getDaysUntilExpiry(server.expiresAt);
              const isExpiringSoon = daysLeft <= 7;

              return (
                <div
                  key={server.requestId}
                  className="border border-gray-300 p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        요청 #{server.requestId} - {server.resourceGroupName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {server.containerImage.imageName}{" "}
                        {server.containerImage.imageVersion}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {getStatusBadge(server.status)}
                      {getServerStatusBadge(server.serverAddress)}
                    </div>
                  </div>

                  {/* Server Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        서버 주소
                      </p>
                      <p className="text-sm font-mono text-gray-900 mt-1">
                        {server.serverAddress || "배정 대기 중"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        만료일
                      </p>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isExpiringSoon ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {new Date(server.expiresAt).toLocaleDateString()} (D-
                        {daysLeft})
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        볼륨 크기
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {formatBytes(server.volumeSizeGiB)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        CUDA 버전
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {server.containerImage.cudaVersion}
                      </p>
                    </div>
                  </div>

                  {/* Hardware Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 p-3">
                      <div className="flex items-center">
                        <CpuChipIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-900">
                          CPU
                        </span>
                      </div>
                      <p className="text-sm text-blue-800 mt-1">
                        {server.cpuCoreCount} 코어
                      </p>
                    </div>
                    <div className="bg-green-50 p-3">
                      <div className="flex items-center">
                        <ComputerDesktopIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-900">
                          메모리
                        </span>
                      </div>
                      <p className="text-sm text-green-800 mt-1">
                        {server.memoryGB} GB
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3">
                      <div className="flex items-center">
                        <CpuChipIcon className="w-5 h-5 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-purple-900">
                          리소스 그룹
                        </span>
                      </div>
                      <p className="text-sm text-purple-800 mt-1">
                        {server.resourceGroupName}
                      </p>
                    </div>
                  </div>

                  {/* Container Image Info */}
                  <div className="bg-indigo-50 p-3 mb-4">
                    <div className="flex items-center">
                      <ServerIcon className="w-5 h-5 text-indigo-600 mr-2" />
                      <span className="text-sm font-medium text-indigo-900">
                        컨테이너 이미지
                      </span>
                    </div>
                    <p className="text-sm text-indigo-800 mt-1">
                      {server.containerImage.description}
                    </p>
                  </div>

                  {/* Warning for expiring servers */}
                  {isExpiringSoon && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-3">
                      <p className="text-sm text-red-700">
                        ⚠️ 서버 사용 기간이 {daysLeft}일 남았습니다. 연장이
                        필요한 경우 관리자에게 문의하세요.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 mt-4">
                    {server.serverAddress && (
                      <Button
                        variant="outline"
                        size="small"
                        className="border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
                        onClick={() => {
                          navigator.clipboard.writeText(server.serverAddress);
                          // TODO: 토스트 메시지 추가
                        }}
                      >
                        접속 정보 복사
                      </Button>
                    )}
                    <Button variant="outline" size="small">
                      사용 가이드
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pending Requests */}
      {dashboardData && dashboardData.pendingRequests.length > 0 && (
        <Card title="승인 대기 중인 신청">
          <div className="space-y-4">
            {dashboardData.pendingRequests.map((request) => (
              <div
                key={request.requestId}
                className="border border-gray-300 p-4 bg-yellow-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      요청 #{request.requestId} - {request.resourceGroupName}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.containerImage.imageName}{" "}
                      {request.containerImage.imageVersion}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-600">
                      <span>CPU: {request.cpuCoreCount} 코어</span>
                      <span>메모리: {request.memoryGB} GB</span>
                      <span>볼륨: {formatBytes(request.volumeSizeGiB)}</span>
                      <span>
                        만료일:{" "}
                        {new Date(request.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card title="빠른 작업">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/application">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col justify-center"
            >
              <PlusIcon className="w-5 h-5 mb-1" />
              <span className="text-sm">새 서버 신청</span>
            </Button>
          </Link>
          <Link to="/requests">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col justify-center"
            >
              <ClipboardDocumentListIcon className="w-5 h-5 mb-1" />
              <span className="text-sm">신청 현황 조회</span>
            </Button>
          </Link>
          <Link to="/account">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col justify-center"
            >
              <CogIcon className="w-5 h-5 mb-1" />
              <span className="text-sm">계정 설정</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default UserDashboard;
