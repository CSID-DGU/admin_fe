import { useState, useEffect } from "react";
import {
  Alert,
  Badge,
  Button,
  Cards,
  Container,
  Header,
  Icon,
  StatusIndicator,
} from "../design-system";

const ResourceMonitoringPage = () => {
  const [selectedService, setSelectedService] = useState("farm");
  const [alert, setAlert] = useState(null);
  const [iframeError, setIframeError] = useState(false);
  const [isTestingIframe, setIsTestingIframe] = useState(true);

  // Grafana 대시보드 URL 설정 (사용자용)
  const dashboardUrls = {
    farm: "http://210.94.179.19:9751/public-dashboards/df47892cd8f4484380698b97cda6771e",
    lab: "http://210.94.179.19:9751/public-dashboards/c09764ddfffe422dba101cfffebae898",
  };

  const services = [
    {
      id: "farm",
      name: "FARM 서버",
      description: "GPU 클러스터 리소스 모니터링",
      iconName: "server-stack",
    },
    {
      id: "lab",
      name: "LAB 서버",
      description: "연구실 서버 리소스 모니터링",
      iconName: "chart-bar",
    },
  ];

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
        const canAccess = await testIframeAccess(
          dashboardUrls[selectedService]
        );
        setIframeError(!canAccess);
      } catch {
        setIframeError(true);
      } finally {
        setIsTestingIframe(false);
      }
    };

    checkIframeAccess();
  }, [selectedService, dashboardUrls]);

  // iframe 로드 에러 핸들러
  const handleIframeError = () => {
    setIframeError(true);
    setAlert({
      type: "info",
      message:
        "대시보드를 화면 안에서 바로 보여줄 수 없어요. 새 창에서 열기를 이용해 주세요.",
    });
  };

  const selectedServiceItem = services.find((s) => s.id === selectedService);

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Header
        variant="h1"
        description="실시간 서버 리소스 사용량을 확인할 수 있어요."
        actions={
          <span className="inline-flex items-center gap-2 text-sm text-(--decs-text-secondary)">
            권한 <Badge color="green">사용자</Badge>
          </span>
        }
      >
        리소스 모니터링
      </Header>

      {/* Service Selection */}
      <div className="space-y-3">
        <Header variant="h2" description="확인할 서버를 선택해 주세요.">
          모니터링 서비스 선택
        </Header>
        <Cards
          columns={2}
          items={services}
          trackBy="id"
          selectionType="single"
          selectedItems={selectedServiceItem ? [selectedServiceItem] : []}
          onSelectionChange={([service]) =>
            service && setSelectedService(service.id)
          }
          cardDefinition={{
            header: (service) => (
              <span className="inline-flex items-center gap-2">
                <Icon name={service.iconName} size={20} />
                {service.name}
              </span>
            ),
            sections: [
              {
                id: "description",
                content: (service) => service.description,
              },
            ],
          }}
        />
      </div>

      {/* Dashboard */}
      <Container
        header={
          <Header
            variant="h2"
            actions={
              <Button
                variant="normal"
                iconName="arrow-top-right-on-square"
                onClick={() =>
                  window.open(dashboardUrls[selectedService], "_blank")
                }
              >
                새 창에서 열기
              </Button>
            }
          >
            {selectedServiceItem?.name} 대시보드
          </Header>
        }
      >
        <div className="space-y-4">
          {isTestingIframe ? (
            <div className="text-center p-8 bg-(--decs-surface-sunken) rounded-(--decs-radius-item)">
              <StatusIndicator type="loading">
                대시보드 연결을 확인하고 있어요
              </StatusIndicator>
            </div>
          ) : !iframeError ? (
            <div className="space-y-4">
              <StatusIndicator type="success">
                대시보드에 연결됐어요
              </StatusIndicator>
              <div className="relative w-full" style={{ height: "600px" }}>
                <iframe
                  src={dashboardUrls[selectedService]}
                  className="w-full h-full border border-(--decs-border-container) rounded-(--decs-radius-item)"
                  onError={handleIframeError}
                  title={`${selectedServiceItem?.name} 대시보드`}
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-8 border-2 border-dashed border-(--decs-border-divider) bg-(--decs-surface-sunken) rounded-(--decs-radius-item) space-y-4">
              <Icon
                name="chart-bar"
                size={48}
                color="var(--decs-text-inactive)"
                style={{ margin: "0 auto" }}
              />
              <div className="space-y-1">
                <p className="text-(--decs-text-heading) font-bold">
                  새 창에서 대시보드를 확인해 주세요
                </p>
                <p className="text-(--decs-text-secondary)">
                  보안 정책 때문에 이 화면 안에서는 대시보드를 보여줄 수
                  없어요. 아래 버튼으로 새 창에서 확인할 수 있어요.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="normal"
                  iconName="arrow-top-right-on-square"
                  onClick={() =>
                    window.open(dashboardUrls[selectedService], "_blank")
                  }
                >
                  {selectedServiceItem?.name} 대시보드 열기
                </Button>
                <Button
                  variant="normal"
                  iconName="clipboard"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      dashboardUrls[selectedService]
                    );
                    setAlert({
                      type: "success",
                      message: "대시보드 URL을 클립보드에 복사했어요.",
                    });
                  }}
                >
                  URL 복사
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Info Notice */}
      <Alert type="info" header="모니터링 안내">
        <ul className="list-disc list-inside space-y-1">
          <li>실시간 서버 리소스 사용량을 확인할 수 있어요</li>
          <li>사용자 권한으로 제한된 정보가 제공돼요</li>
          <li>데이터는 실시간으로 업데이트돼요</li>
          <li>보안 정책 때문에 새 창에서 확인해야 할 수 있어요</li>
          <li>자세한 시스템 정보는 관리자에게 문의해 주세요</li>
        </ul>
      </Alert>
    </div>
  );
};

export default ResourceMonitoringPage;
