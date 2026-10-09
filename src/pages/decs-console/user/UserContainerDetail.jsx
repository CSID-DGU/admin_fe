// UserContainerDetail — 접속·상태 이해 (친절한 문구 + 복사 가능한 접속 정보)
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Container, Header, KeyValuePairs, StatusIndicator, Button, Alert, ExpandableSection, Badge } from "../../../design-system";
import RestartContainerModal from "../../../components/RestartContainerModal";
import { requestService } from "../../../services/requestService";

const CONTACT_FORM_URL = "https://forms.gle/nACaxj2UeJF56V2i7";

// 기간 연장·그룹 추가·포트 변경은 여기서 내지 않는다 — 사이드바의 변경 요청 화면 한 곳에서 낸다.
function UserContainerDetail({ onBack, onRestarted, servers = [] }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const [restartNotice, setRestartNotice] = useState(null);

  const server = servers.find((s) => s.requestId === selectedId) ?? servers[0];

  if (!server) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
        <Button variant="link" iconName="arrow-left" onClick={onBack}>{t("common.dashboard")}</Button>
        <Header variant="h1">{t("container.title")}</Header>
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", padding: "24px 0", textAlign: "center" }}>
            {t("container.empty")}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <div>
        <Button variant="link" iconName="arrow-left" onClick={onBack}>{t("common.dashboard")}</Button>
        <Header variant="h1" actions={<StatusIndicator type={server.statusType}>{server.statusLabel}</StatusIndicator>}>{server.jobTitle}</Header>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color="brand">{server.gpuName}</Badge>
          <Badge color="grey">{server.ubuntuUsername}</Badge>
        </div>
      </div>

      {servers.length > 1 ? (
        <Container header={<Header variant="h2" description={t("container.listDesc")}>{t("container.listTitle")}</Header>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
            {servers.map((item) => (
              <div
                key={item.requestId}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(item.requestId)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(item.requestId); }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", cursor: "pointer",
                  borderRadius: "var(--decs-radius-input)",
                  border: item.requestId === server.requestId
                    ? "2px solid var(--decs-brand-300)"
                    : "1px solid var(--decs-border-container)",
                }}
              >
                <div>
                  {/* 내 컨테이너 전부 같은 우분투 유저네임을 쓰므로(웹 계정당 하나로 고정),
                      그걸 제목으로 쓰면 여러 개일 때 전혀 구분이 안 된다 — 신청 시 적어낸
                      사용 목적을 대신 쓴다. */}
                  <div style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>{item.jobTitle}</div>
                  <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>
                    {item.gpuName}{item.gpuSpec ? ` · ${item.gpuSpec}` : ""} · {item.expiresText}
                  </div>
                </div>
                <StatusIndicator type={item.statusType}>{item.statusLabel}</StatusIndicator>
              </div>
            ))}
          </div>
        </Container>
      ) : null}

      <Container header={<Header variant="h2" description={t("container.connectDesc")}>{t("container.connectTitle")}</Header>}>
        <KeyValuePairs columns={1} items={[
          { label: t("container.sshCommand"), value: server.sshCommand, copyable: true },
          { label: t("container.password"), value: t("container.passwordHint") },
        ]} />
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <ExpandableSection headerText={t("container.jupyterTitle")}>
            <KeyValuePairs columns={1} items={[
              { label: t("container.address"), value: server.jupyterUrl, copyable: true },
              { label: t("container.tokenLabel"), value: t("container.tokenHint") },
            ]} />
          </ExpandableSection>
        </div>
        {/* 신청 때 추가한 포트(원격 데스크톱 novnc 6080 등)의 외부 주소를 알 방법이 여기밖에 없다 */}
        {server.extraPorts?.length ? (
          <div style={{ marginTop: "var(--decs-space-m)" }}>
            <ExpandableSection headerText={t("container.extraPortsTitle")}>
              <KeyValuePairs columns={1} items={server.extraPorts.map((port) => ({
                label: t("container.extraPortLabel", { purpose: port.purpose, port: port.internalPort }),
                // noVNC만 브라우저로 바로 여는 주소를 준다. 나머지는 무엇을 띄웠는지 알 수 없어
                // http를 붙이면 틀린 안내가 되므로 주소만 알려준다.
                value: !port.reachable
                  ? t("container.portUnreachable", { address: port.address })
                  : port.url
                  ? port.url
                  : t("container.portAddressOnly", { address: port.address }),
                copyable: port.reachable,
              }))} />
              {server.extraPorts.some((port) => port.isVnc) ? (
                <div style={{ marginTop: "var(--decs-space-s)", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
                  <Trans i18nKey="container.vncHint" components={{ code: <code /> }} />
                </div>
              ) : null}
            </ExpandableSection>
          </div>
        ) : null}
      </Container>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <Container header={<Header variant="h2">{t("container.usage")}</Header>}>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
            {t("container.usageTodo")}
          </div>
        </Container>
        <Container header={<Header variant="h2">{t("container.period")}</Header>}>
          <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{t("container.daysLeft", { count: server.daysLeft })}</div>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", marginTop: 4 }}>{server.expiresText}</div>
        </Container>
      </div>

      <Container header={<Header variant="h2" description={t("container.groupsDesc")}>{t("container.groups")}</Header>}>
        {(server.groups ?? []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)" }}>
            {server.groups.map((group) => (
              <Badge key={group.ubuntuGid} color="grey">{group.groupName}</Badge>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
            {t("container.noGroups")}
          </div>
        )}
        {/* 팀 디렉터리는 따로 만들지 않는다. 홈은 711(남은 지나가기만)이라, 홈 아래 폴더의 그룹을 팀 그룹으로
            바꾸면 그 팀원만 그룹 권한으로 들어온다. 컨테이너의 group-dir-share 가 그룹·권한을 한 번에 맞춘다. */}
        {(server.groups ?? []).length > 0 ? (
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", marginTop: "var(--decs-space-xs)" }}>
            <Trans i18nKey="container.shareHint" components={{ code: <code /> }} shouldUnescape />
          </div>
        ) : null}
      </Container>

      {/* 강제 종료 경고는 재시작 확인 창이 자세히 보여 준다 — 여기서는 언제 쓰는지만 적는다. */}
      <Container>
        <Header
          variant="h2"
          description={t("container.restartDesc")}
          actions={<Button iconName="arrow-path" onClick={() => setRestartOpen(true)}>{t("container.restart")}</Button>}
        >
          {t("container.restartTitle")}
        </Header>
        {/* 컨테이너가 여러 개면 다른 컨테이너를 골랐을 때 이 결과가 따라가지 않게 한다 */}
        {restartNotice?.requestId === server.requestId ? (
          <div style={{ marginTop: "var(--decs-space-m)" }}>
            <Alert type={restartNotice.type}>{restartNotice.message}</Alert>
          </div>
        ) : null}
      </Container>

      <Alert type="info" header={t("container.helpTitle")}>
        <Trans i18nKey="container.helpBody" components={{ a: <a href={CONTACT_FORM_URL} target="_blank" rel="noreferrer" /> }} />
      </Alert>

      <RestartContainerModal
        visible={restartOpen}
        start={(keepChanges) => requestService.restartMyContainer(server.requestId, keepChanges)}
        fetchLatest={() => requestService.getMyLatestRestart(server.requestId)}
        onDismiss={() => setRestartOpen(false)}
        onDone={(notice) => {
          setRestartNotice({ ...notice, requestId: server.requestId });
          setRestartOpen(false);
          onRestarted?.();
        }}
      />
    </div>
  );
}
export default UserContainerDetail;
