// FARM/LAB 서버별 GPU 사용량·활성 컨테이너를 Prometheus 지표로 직접 표시하는 모니터링 페이지
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  Alert,
  Badge,
  Button,
  Container,
  Header,
  ProgressBar,
  StatusIndicator,
  KeyValuePairs,
} from "../design-system";
import { monitoringService } from "../services/grafanaService";

const REFRESH_INTERVAL_MS = 30_000;

function GpuServerCard({ server }) {
  const { t } = useTranslation();
  const util = server.gpuUtil ?? 0;
  // ProgressBar: "success" | "in-progress" | "error"
  const barStatus = util >= 80 ? "error" : "in-progress";
  const badgeColor = util >= 80 ? "red" : util >= 50 ? "yellow" : "green";
  return (
    <div className="flex flex-col gap-2 p-4 rounded-(--decs-radius-item) border border-(--decs-border-container) bg-(--decs-surface-container)">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-(--decs-text-heading) uppercase tracking-wide text-sm">
          {server.hostname}
        </span>
        <Badge color={badgeColor}>{t("monitoring.gpuCount", { count: server.gpuCount })}</Badge>
      </div>
      <ProgressBar
        value={util}
        label={t("monitoring.gpuUtil")}
        description={`${util}%`}
        status={barStatus}
      />
    </div>
  );
}

const ResourceMonitoringPage = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await monitoringService.getMetrics();
      if (res?.status === 200 && res.data?.data) {
        setMetrics(res.data.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(i18n.t("monitoring.loadFailed"));
      }
    } catch {
      setError(i18n.t("monitoring.connectFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const farmServers = metrics?.gpuServers ?? [];
  const activeContainers = metrics?.activeContainers ?? {};
  const containerItems = Object.entries(activeContainers).map(([cluster, count]) => ({
    label: t("monitoring.activeContainers", { cluster: cluster.toUpperCase() }),
    value: (
      <span className="text-xl font-bold text-(--decs-text-heading)">
        {count}
        <span className="text-sm font-normal text-(--decs-text-secondary) ml-1">{t("monitoring.countUnit")}</span>
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <Header
        variant="h1"
        description={t("monitoring.autoRefresh")}
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-sm text-(--decs-text-secondary)">
                {t("monitoring.asOf", { time: lastUpdated.toLocaleTimeString(i18n.resolvedLanguage) })}
              </span>
            )}
            <Button variant="normal" iconName="refresh" onClick={fetchMetrics}>
              {t("monitoring.refresh")}
            </Button>
          </div>
        }
      >
        {t("shell.resourceMonitoring")}
      </Header>

      {error && (
        <Alert type="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center p-12">
          <StatusIndicator type="loading">{t("monitoring.loading")}</StatusIndicator>
        </div>
      ) : (
        <>
          {/* 활성 컨테이너 요약 */}
          {containerItems.length > 0 && (
            <Container header={<Header variant="h2">{t("monitoring.clusterStatus")}</Header>}>
              <KeyValuePairs columns={containerItems.length} items={containerItems} />
            </Container>
          )}

          {/* GPU 서버별 사용률 */}
          <Container
            header={
              <Header
                variant="h2"
                description={t("monitoring.gpuUtilDesc")}
              >
                {t("monitoring.gpuUtil")}
              </Header>
            }
          >
            {farmServers.length === 0 ? (
              <StatusIndicator type="warning">
                {t("monitoring.noGpuData")}
              </StatusIndicator>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {farmServers.map((s) => (
                  <GpuServerCard key={s.hostname} server={s} />
                ))}
              </div>
            )}
          </Container>
        </>
      )}
    </div>
  );
};

export default ResourceMonitoringPage;
