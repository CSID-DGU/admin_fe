// UserDashboard — "지금 상태 + 다음 행동" (Toss식 행동 중심, Cards 우선)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Container, Header, Button, StatusIndicator, Badge, Alert, KeyValuePairs, Modal } from "../../../design-system";

const ACTIVITY_STATUS_TYPE = {
  PENDING: "pending",
  FULFILLED: "success",
  DENIED: "error",
  MODIFICATION_REQUESTED: "pending",
  MODIFICATION_APPROVED: "success",
  MODIFICATION_REJECTED: "error",
};

function ActivityDetailModal({ activity, onDismiss }) {
  const { t } = useTranslation();
  if (!activity) return null;
  return (
    <Modal visible header={t("dashboard.detailTitle")} onDismiss={onDismiss} footer={<Button variant="primary" onClick={onDismiss}>{t("common.close")}</Button>}>
      <KeyValuePairs columns={2} items={[
        { label: t("dashboard.status"), value: <StatusIndicator type={ACTIVITY_STATUS_TYPE[activity.status] ?? "pending"}>{activity.statusLabel}</StatusIndicator> },
        { label: t("dashboard.createdAt"), value: activity.createdAt ? String(activity.createdAt).slice(0, 10) : "—" },
        { label: t("dashboard.server"), value: [activity.serverName, activity.resourceGroupName].filter(Boolean).join(" · ") || "—" },
        { label: t("dashboard.image"), value: [activity.imageName, activity.imageVersion].filter(Boolean).join(" ") || "—" },
        { label: t("dashboard.purpose"), value: activity.usagePurpose || "—" },
        { label: t("dashboard.expiresAt"), value: activity.expiresAt ? String(activity.expiresAt).slice(0, 10) : "—" },
      ]} />
      {activity.comment ? (
        <div style={{ marginTop: "var(--decs-space-l)" }}>
          <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>{t("dashboard.adminComment")}</div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-body)" }}>{activity.comment}</div>
        </div>
      ) : null}
    </Modal>
  );
}

function BigStatus({ onConnect, onExtend, onDetail, server }) {
  const { t } = useTranslation();
  return (
    <div style={{ background: "var(--decs-surface-container)", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-xl)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>{t("dashboard.currentGpu")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{server.gpuName}</span>
            <StatusIndicator type={server.statusType}>{server.statusLabel}</StatusIndicator>
          </div>
          {server.gpuSpec ? <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)", marginTop: 2 }}>{server.gpuSpec}</div> : null}
          <div style={{ marginTop: 8 }}><Badge color="grey">{server.jobBadge}</Badge></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>{t("dashboard.timeLeft")}</div>
          <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{t("dashboard.days", { count: server.daysLeft })}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--decs-space-s)", marginTop: "var(--decs-space-l)" }}>
        <Button variant="primary" iconName="arrow-up-right" onClick={onConnect}>{t("dashboard.connect")}</Button>
        <Button variant="normal" iconName="calendar" onClick={onExtend}>{t("dashboard.extend")}</Button>
        <Button variant="link" onClick={onDetail}>{t("dashboard.viewDetail")}</Button>
      </div>
    </div>
  );
}

function UserDashboard({ onRequest, onConnect, onExtend, onDetail, userName, server, expiryDays, activities = [] }) {
  const { t } = useTranslation();
  const [selectedActivity, setSelectedActivity] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)", maxWidth: 900, margin: "0 auto" }}>
      <Header variant="h1" description={t("dashboard.description")}>{t("dashboard.greeting", { name: userName })}</Header>

      {expiryDays != null ? (<Alert type="warning" header={t("dashboard.expiryHeader", { count: expiryDays })} action={<Button variant="normal" onClick={onExtend}>{t("dashboard.extendShort")}</Button>}>
        {t("dashboard.expiryBody")}
      </Alert>) : null}

      {server ? (
        <BigStatus onConnect={onConnect} onExtend={onExtend} onDetail={onDetail} server={server} />
      ) : (
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", padding: "24px 0", textAlign: "center" }}>
            {t("dashboard.empty")}
          </div>
        </Container>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <div style={{ background: "var(--decs-surface-container)", border: "1px dashed var(--decs-brand-300)", borderRadius: "var(--decs-radius-container)", padding: "var(--decs-space-xl)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--decs-fs-body-l)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{t("dashboard.needGpuTitle")}</div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)", margin: "6px 0 16px" }}>{t("dashboard.needGpuBody")}</div>
          <Button variant="primary" iconName="plus" onClick={onRequest}>{t("dashboard.requestGpu")}</Button>
        </div>
        <Container header={<Header variant="h2">{t("dashboard.recentActivity")}</Header>}>
          {activities.length === 0 ? (
            <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "8px 0" }}>
              {t("dashboard.noActivity")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)" }}>
              {activities.map((activity, i) => (
                <button
                  key={activity.requestId ?? i}
                  onClick={() => setSelectedActivity(activity)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    borderRadius: "var(--decs-radius-item)", padding: "var(--decs-space-xs) var(--decs-space-xs)",
                    cursor: "pointer", font: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "2px" }}>{activity.label}</div>
                    <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-body)" }}>{activity.value}</div>
                  </div>
                  <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>{t("dashboard.more")}</span>
                </button>
              ))}
            </div>
          )}
        </Container>
      </div>

      <ActivityDetailModal activity={selectedActivity} onDismiss={() => setSelectedActivity(null)} />
    </div>
  );
}
export default UserDashboard;
