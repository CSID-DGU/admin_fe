// UserDashboard — "지금 상태 + 다음 행동" (Toss식 행동 중심, Cards 우선)
import { useState } from "react";
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
  if (!activity) return null;
  return (
    <Modal visible header="신청 상세" onDismiss={onDismiss} footer={<Button variant="primary" onClick={onDismiss}>닫기</Button>}>
      <KeyValuePairs columns={2} items={[
        { label: "상태", value: <StatusIndicator type={ACTIVITY_STATUS_TYPE[activity.status] ?? "pending"}>{activity.statusLabel}</StatusIndicator> },
        { label: "신청일", value: activity.createdAt ? String(activity.createdAt).slice(0, 10) : "—" },
        { label: "서버", value: [activity.serverName, activity.resourceGroupName].filter(Boolean).join(" · ") || "—" },
        { label: "이미지", value: [activity.imageName, activity.imageVersion].filter(Boolean).join(" ") || "—" },
        { label: "사용 목적", value: activity.usagePurpose || "—" },
        { label: "만료 예정일", value: activity.expiresAt ? String(activity.expiresAt).slice(0, 10) : "—" },
      ]} />
      {activity.comment ? (
        <div style={{ marginTop: "var(--decs-space-l)" }}>
          <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>관리자 코멘트</div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-body)" }}>{activity.comment}</div>
        </div>
      ) : null}
    </Modal>
  );
}

function BigStatus({ onConnect, onExtend, onDetail, server }) {
  return (
    <div style={{ background: "var(--decs-surface-container)", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-container)", boxShadow: "var(--decs-shadow-container)", padding: "var(--decs-space-xl)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>현재 사용 중인 GPU</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{server.gpuName}</span>
            <StatusIndicator type={server.statusType}>{server.statusLabel}</StatusIndicator>
          </div>
          {server.gpuSpec ? <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)", marginTop: 2 }}>{server.gpuSpec}</div> : null}
          <div style={{ marginTop: 8 }}><Badge color="grey">{server.jobBadge}</Badge></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)" }}>남은 기간</div>
          <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{`${server.daysLeft}일`}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--decs-space-s)", marginTop: "var(--decs-space-l)" }}>
        <Button variant="primary" iconName="arrow-up-right" onClick={onConnect}>컨테이너 접속하기</Button>
        <Button variant="normal" iconName="calendar" onClick={onExtend}>사용 기간 연장하기</Button>
        <Button variant="link" onClick={onDetail}>상세 보기</Button>
      </div>
    </div>
  );
}

function UserDashboard({ onRequest, onConnect, onExtend, onDetail, userName, server, expiryDays, activities = [] }) {
  const [selectedActivity, setSelectedActivity] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)", maxWidth: 900, margin: "0 auto" }}>
      <Header variant="h1" description="GPU 사용 현황과 최근 활동이에요.">안녕하세요, {userName}님</Header>

      {expiryDays != null ? (<Alert type="warning" header={`${expiryDays}일 뒤 사용 기간이 만료됩니다`} action={<Button variant="normal" onClick={onExtend}>연장하기</Button>}>
        만료되면 컨테이너가 정지되고 저장하지 않은 작업이 사라질 수 있어요. 미리 연장해 두세요.
      </Alert>) : null}

      {server ? (
        <BigStatus onConnect={onConnect} onExtend={onExtend} onDetail={onDetail} server={server} />
      ) : (
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", padding: "24px 0", textAlign: "center" }}>
            신청한 GPU가 없어요.
          </div>
        </Container>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <div style={{ background: "var(--decs-surface-container)", border: "1px dashed var(--decs-brand-300)", borderRadius: "var(--decs-radius-container)", padding: "var(--decs-space-xl)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--decs-fs-body-l)", fontWeight: 700, color: "var(--decs-text-heading)" }}>새 GPU가 필요하신가요?</div>
          <div style={{ fontSize: "var(--decs-fs-body-m)", color: "var(--decs-text-secondary)", margin: "6px 0 16px" }}>인프라 지식 없이 몇 번의 선택으로 신청할 수 있어요.</div>
          <Button variant="primary" iconName="plus" onClick={onRequest}>GPU 신청하기</Button>
        </div>
        <Container header={<Header variant="h2">최근 활동</Header>}>
          {activities.length === 0 ? (
            <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "8px 0" }}>
              아직 활동 내역이 없어요.
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
                  <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>자세히 &gt;</span>
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
