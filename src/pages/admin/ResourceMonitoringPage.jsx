import { useState, useEffect } from "react";
import { ChartBarIcon, ServerIcon } from "@heroicons/react/24/outline";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Alert from "../../components/UI/Alert";

const ResourceMonitoringPage = ({ user }) => {
  const [selectedService, setSelectedService] = useState("farm");
  const [alert, setAlert] = useState(null);
  const [iframeError, setIframeError] = useState(false);
  const [isTestingIframe, setIsTestingIframe] = useState(true);

  // Grafana 대시보드 URL 설정
  const dashboardUrls = {
    admin: {
      farm: "http://210.94.179.19:9751/public-dashboards/b435c9ce4d194a499231454113d609e2",
      lab: "http://210.94.179.19:9751/public-dashboards/00c16592c6b04014b31479880fa6000a",
    },
    user: {
      farm: "http://210.94.179.19:9751/public-dashboards/df47892cd8f4484380698b97cda6771e",
      lab: "http://210.94.179.19:9751/public-dashboards/c09764ddfffe422dba101cfffebae898",
    },
  };

  const isAdmin = user?.role === "ADMIN";
  const currentUrls = isAdmin ? dashboardUrls.admin : dashboardUrls.user;

  // iframe 접근 가능성을 테스트하는 함수
  const testIframeAccess = async (url) => {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
      });
      return true;
    } catch (error) {
      return false;
    }
  };

  // 컴포넌트 마운트 시 iframe 접근 가능성 테스트
  useEffect(() => {
    const checkIframeAccess = async () => {
      try {
        const canAccess = await testIframeAccess(currentUrls[selectedService]);
        setIframeError(!canAccess);
      } catch (error) {
        setIframeError(true);
      } finally {
        setIsTestingIframe(false);
      }
    };

    checkIframeAccess();
  }, [selectedService, currentUrls]);

  // iframe 로드 에러 핸들러
  const handleIframeError = () => {
    setIframeError(true);
    setAlert({
      type: "info",
      message:
        "대시보드를 iframe으로 로드할 수 없습니다. 새 창에서 열기를 사용해주세요.",
    });
  };

  const services = [
    {
      id: "farm",
      name: "FARM 서버",
      description: "GPU 클러스터 리소스 모니터링",
      icon: ServerIcon,
    },
    {
      id: "lab",
      name: "LAB 서버",
      description: "연구실 서버 리소스 모니터링",
      icon: ChartBarIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          onClose={() => setAlert(null)}
          title={alert.type === "success" ? "성공" : "오류"}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리소스 모니터링</h1>
          <p className="text-gray-600 mt-1">
            실시간 서버 리소스 사용량을 모니터링합니다
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">권한:</span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              isAdmin
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {isAdmin ? "관리자" : "사용자"}
          </span>
        </div>
      </div>

      {/* Service Selection */}
      <Card>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            모니터링 서비스 선택
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => {
              const IconComponent = service.icon;
              return (
                <div
                  key={service.id}
                  className={`p-4 border-2 cursor-pointer transition-all duration-200 ${
                    selectedService === service.id
                      ? "border-brand-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent
                      className={`w-6 h-6 ${
                        selectedService === service.id
                          ? "text-brand-500"
                          : "text-gray-400"
                      }`}
                    />
                    <div>
                      <h3
                        className={`font-medium ${
                          selectedService === service.id
                            ? "text-brand-500"
                            : "text-gray-900"
                        }`}
                      >
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Dashboard */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {services.find((s) => s.id === selectedService)?.name} 대시보드
            </h2>
            <Button
              variant="outline"
              size="medium"
              onClick={() =>
                window.open(currentUrls[selectedService], "_blank")
              }
            >
              새 창에서 열기
            </Button>
          </div>

          {/* Dashboard */}
          <div className="space-y-4">
            {isTestingIframe ? (
              <div className="text-center p-8 border border-gray-200 bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
                <p className="text-gray-600">대시보드 연결을 확인 중...</p>
              </div>
            ) : !iframeError ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <p className="text-sm text-green-700">
                    ✓ 대시보드를 iframe으로 로드할 수 있습니다.
                  </p>
                </div>
                <div className="relative w-full" style={{ height: "600px" }}>
                  <iframe
                    src={currentUrls[selectedService]}
                    className="w-full h-full border border-gray-300 rounded"
                    onError={handleIframeError}
                    title={`${
                      services.find((s) => s.id === selectedService)?.name
                    } 대시보드`}
                    sandbox="allow-same-origin allow-scripts allow-forms"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-gray-300 bg-gray-50">
                <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Grafana 대시보드에 접속하세요
                </h3>
                <p className="text-gray-600 mb-4">
                  보안 정책으로 인해 iframe으로 표시할 수 없습니다.
                  <br />
                  아래 버튼을 클릭하여 새 창에서 대시보드를 확인하세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(currentUrls[selectedService], "_blank")
                    }
                  >
                    <ChartBarIcon className="w-4 h-4 mr-2" />
                    {services.find((s) => s.id === selectedService)?.name}{" "}
                    대시보드 열기
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        currentUrls[selectedService]
                      );
                      setAlert({
                        type: "success",
                        message: "대시보드 URL이 클립보드에 복사되었습니다.",
                      });
                    }}
                  >
                    URL 복사
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Info Notice */}
      <Card>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                모니터링 정보
              </h3>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p>• 실시간 CPU, 메모리, GPU 사용률을 확인할 수 있습니다</p>
                <p>• 네트워크 트래픽 및 디스크 I/O 정보를 제공합니다</p>
                <p>• 데이터는 실시간으로 업데이트됩니다</p>
                <p className="text-amber-600">
                  • 보안 정책으로 인해 새 창에서 대시보드를 확인해주세요
                </p>
                {!isAdmin && (
                  <p className="text-amber-600">
                    • 사용자 권한으로는 제한된 정보만 확인 가능합니다
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ResourceMonitoringPage;
