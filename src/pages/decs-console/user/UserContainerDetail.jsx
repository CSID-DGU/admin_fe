// UserContainerDetail — 접속·상태 이해 (친절한 문구 + 복사 가능한 접속 정보)
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Header, KeyValuePairs, StatusIndicator, Button, Alert, ExpandableSection, Badge, FormField, Input, Modal } from "../../../design-system";

function UserContainerDetail({ onBack, onExtend, servers = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [expiresDate, setExpiresDate] = useState("");
  const [reason, setReason] = useState("");
  const [extendError, setExtendError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoExtended, setAutoExtended] = useState(false);

  const server = servers.find((s) => s.requestId === selectedId) ?? servers[0];

  // 대시보드 연장 버튼 경유(location.state.extend) 시 서버 로드 후 모달 자동 오픈
  // eslint-disable-next-line react-hooks/exhaustive-deps -- openExtension은 매 렌더 새로 생성, autoExtended 가드로 1회만 실행
  useEffect(() => {
    if (location.state?.extend && server && !autoExtended) {
      setAutoExtended(true);
      // history.state를 비워 새로고침 시 모달이 재오픈되지 않게 함
      navigate(location.pathname, { replace: true, state: null });
      openExtension();
    }
  }, [location.state, server, autoExtended]);

  function openExtension() {
    const suggested = new Date(server.expiresAt);
    suggested.setDate(suggested.getDate() + 14);
    setExpiresDate(toLocalDateInput(suggested));
    setReason("");
    setExtendError(null);
    setExtendOpen(true);
  }

  async function submitExtension() {
    const next = new Date(`${expiresDate}T23:59:59`);
    const current = new Date(server.expiresAt);
    if (!expiresDate || Number.isNaN(next.getTime()) || next <= current || next <= new Date()) {
      setExtendError("현재 만료일보다 뒤인 날짜를 선택해주세요.");
      return;
    }
    if (!reason.trim()) {
      setExtendError("기간 연장 사유를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setExtendError(null);
    try {
      await onExtend({ requestId: server.requestId, expiresAt: `${expiresDate}T23:59:59`, reason: reason.trim() });
    } catch (error) {
      setExtendError(error.message || "기간 연장 요청에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!server) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
        <Button variant="link" iconName="arrow-left" onClick={onBack}>대시보드</Button>
        <Header variant="h1">내 컨테이너</Header>
        <Container>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", padding: "24px 0", textAlign: "center" }}>
            아직 접속할 수 있는 GPU가 없어요. 신청이 승인되면 접속 정보가 표시됩니다.
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <div>
        <Button variant="link" iconName="arrow-left" onClick={onBack}>대시보드</Button>
        <Header variant="h1" actions={<StatusIndicator type={server.statusType}>{server.statusLabel}</StatusIndicator>}>{server.jobTitle}</Header>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color="brand">{server.gpuName}</Badge>
          <Badge color="grey">{server.ubuntuUsername}</Badge>
        </div>
      </div>

      {servers.length > 1 ? (
        <Container header={<Header variant="h2" description="컨테이너를 선택하면 아래에 접속 정보가 표시됩니다">내 컨테이너 목록</Header>}>
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
                  <div style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>{item.ubuntuUsername}</div>
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

      <Container header={<Header variant="h2" description="터미널에 아래 명령을 붙여넣어 접속하세요">접속 정보</Header>}>
        <KeyValuePairs columns={1} items={[
          { label: "접속 명령", value: server.sshCommand, copyable: true },
          { label: "비밀번호", value: "최초 발급된 비밀번호를 사용하세요" },
        ]} />
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <ExpandableSection headerText="Jupyter로 접속하기">
            <KeyValuePairs columns={1} items={[
              { label: "주소", value: server.jupyterUrl, copyable: true },
              { label: "토큰", value: "승인 안내 메일에서 확인할 수 있어요" },
            ]} />
          </ExpandableSection>
        </div>
      </Container>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--decs-space-m)" }}>
        <Container header={<Header variant="h2">사용량</Header>}>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", padding: "16px 0", textAlign: "center" }}>
            사용량 지표는 추후 구현 예정입니다
          </div>
        </Container>
        <Container header={<Header variant="h2">사용 기간</Header>}>
          <div style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{`${server.daysLeft}일 남음`}</div>
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", marginTop: 4 }}>{server.expiresText}</div>
          <div style={{ marginTop: "var(--decs-space-m)" }}><Button variant="primary" iconName="calendar" onClick={openExtension}>연장하기</Button></div>
        </Container>
      </div>

      <Alert type="info" header="문제가 있나요?">
        접속이 안 되면 컨테이너를 재시작해 보세요. 그래도 안 되면 대시보드의 도움말에서 관리자에게 문의할 수 있어요.
      </Alert>

      <Modal
        visible={extendOpen}
        onDismiss={() => !submitting && setExtendOpen(false)}
        header="사용 기간 연장 요청"
        footer={<>
          <Button variant="normal" disabled={submitting} onClick={() => setExtendOpen(false)}>취소</Button>
          <Button variant="primary" loading={submitting} onClick={submitExtension}>연장 요청</Button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
          {extendError ? <Alert type="error">{extendError}</Alert> : null}
          <FormField label="현재 만료일">
            <Input value={toLocalDateInput(new Date(server.expiresAt))} readOnly />
          </FormField>
          <FormField label="새 만료일" constraintText="현재 만료일 이후 날짜를 선택해주세요.">
            <Input type="date" value={expiresDate} onChange={setExpiresDate} />
          </FormField>
          <FormField label="연장 사유">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="예: 실험 일정 연장으로 GPU 사용 기간이 더 필요합니다."
              style={{
                width: "100%", boxSizing: "border-box", resize: "vertical",
                padding: "var(--decs-space-s) var(--decs-space-m)",
                font: "inherit", color: "var(--decs-text-body)",
                background: "var(--decs-surface-input)",
                border: "thin solid var(--decs-border-input)",
                borderRadius: "var(--decs-radius-input)",
              }}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
export default UserContainerDetail;

function toLocalDateInput(date) {
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
