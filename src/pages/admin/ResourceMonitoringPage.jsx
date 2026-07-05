import { useState, useEffect } from "react";
import {
  Alert,
  Badge,
  Button,
  Container,
  Header,
  StatusIndicator,
  Tabs,
} from "../../design-system";

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
      await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
      });
      return true;
    } catch {
      return false;
    }
  };

  // 컴포넌트 마운트 시 iframe 접근 가능성 테스트
  useEffect(() => {
    const checkIframeAccess = async () => {
      try {
        const canAccess = await testIframeAccess(currentUrls[selectedService]);
        setIframeError(!canAccess);
      } catch {
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
    },
    {
      id: "lab",
      name: "LAB 서버",
      description: "연구실 서버 리소스 모니터링",
    },
  ];

  const currentService = services.find((s) => s.id === selectedService);

  // Grafana 대시보드 영역 (탭 내용)
  const dashboardBody = (
    <div className="space-y-4">
      {isTestingIframe ? (
        <div className="flex justify-center py-12 border border-(--decs-border-divider) bg-(--decs-surface-sunken)">
          <StatusIndicator type="in-progress">
            대시보드 연결을 확인 중
          </StatusIndicator>
        </div>
      ) : !iframeError ? (
        <>
          <StatusIndicator type="success">
            대시보드를 iframe으로 로드할 수 있습니다.
          </StatusIndicator>
          <div className="relative w-full" style={{ height: "600px" }}>
            <iframe
              src={currentUrls[selectedService]}
              className="w-full h-full border border-(--decs-border-divider)"
              onError={handleIframeError}
              title={`${currentService?.name} 대시보드`}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        </>
      ) : (
        <div className="text-center p-8 border border-dashed border-(--decs-border-divider) bg-(--decs-surface-sunken)">
          <h3 className="text-(--decs-text-heading) font-medium mb-2">
            iframe으로 표시할 수 없습니다
          </h3>
          <p className="text-(--decs-text-secondary) mb-4">
            보안 정책으로 인해 대시보드를 페이지 안에 포함할 수 없는
            상태입니다. 새 창에서 대시보드를 확인하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              iconName="arrow-top-right-on-square"
              onClick={() =>
                window.open(currentUrls[selectedService], "_blank")
              }
            >
              {currentService?.name} 대시보드 열기
            </Button>
            <Button
              iconName="clipboard"
              onClick={() => {
                navigator.clipboard.writeText(currentUrls[selectedService]);
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
  );

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          dismissible
          onDismiss={() => setAlert(null)}
          header={alert.type === "success" ? "성공" : "오류"}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Header
        variant="h1"
        description="실시간 서버 리소스 사용량을 모니터링합니다"
        actions={
          <span className="inline-flex items-center gap-2">
            <span className="text-(--decs-text-secondary)">권한:</span>
            <Badge color={isAdmin ? "red" : "green"}>
              {isAdmin ? "관리자" : "사용자"}
            </Badge>
          </span>
        }
      >
        리소스 모니터링
      </Header>

      {/* Dashboard */}
      <Container
        header={
          <Header
            variant="h2"
            description={currentService?.description}
            actions={
              <Button
                iconName="arrow-top-right-on-square"
                onClick={() =>
                  window.open(currentUrls[selectedService], "_blank")
                }
              >
                새 창에서 열기
              </Button>
            }
          >
            {currentService?.name} 대시보드
          </Header>
        }
      >
        <Tabs
          activeTabId={selectedService}
          onChange={(id) => setSelectedService(id)}
          tabs={services.map((service) => ({
            id: service.id,
            label: service.name,
            content: dashboardBody,
          }))}
        />
      </Container>

      {/* Info Notice */}
      <Container header={<Header variant="h3">모니터링 정보</Header>}>
        <ul className="list-disc pl-5 space-y-1 text-(--decs-text-secondary) m-0">
          <li>실시간 CPU, 메모리, GPU 사용률을 확인할 수 있습니다</li>
          <li>네트워크 트래픽 및 디스크 I/O 정보를 제공합니다</li>
          <li>데이터는 실시간으로 업데이트됩니다</li>
          <li className="text-(--decs-status-warning)">
            보안 정책으로 인해 새 창에서 대시보드를 확인해주세요
          </li>
          {!isAdmin && (
            <li className="text-(--decs-status-warning)">
              사용자 권한으로는 제한된 정보만 확인 가능합니다
            </li>
          )}
        </ul>
      </Container>
    </div>
  );
};

export default ResourceMonitoringPage;
