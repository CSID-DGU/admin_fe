// UserContainerDetail — 접속·상태 이해 (친절한 문구 + 복사 가능한 접속 정보)
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Header, KeyValuePairs, StatusIndicator, Button, Alert, ExpandableSection, Badge, FormField, Input, Select, Modal } from "../../../design-system";
import RestartContainerModal from "../../../components/RestartContainerModal";
import { requestService } from "../../../services/requestService";

function UserContainerDetail({ onBack, onExtend, onGroupChange, onRestarted, groupOptions = [], servers = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [expiresDate, setExpiresDate] = useState("");
  const [reason, setReason] = useState("");
  const [extendError, setExtendError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoExtended, setAutoExtended] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [addedGroups, setAddedGroups] = useState([]);
  const [groupReason, setGroupReason] = useState("");
  const [groupError, setGroupError] = useState(null);
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [restartNotice, setRestartNotice] = useState(null);

  const server = servers.find((s) => s.requestId === selectedId) ?? servers[0];
  const currentGroupIds = new Set((server?.groups ?? []).map((g) => String(g.ubuntuGid)));
  const addedGroupIds = new Set(addedGroups.map((g) => g.value));
  const groupSelectOptions = groupOptions
    .filter((g) => !currentGroupIds.has(g.value))
    .map((g) => ({ ...g, disabled: addedGroupIds.has(g.value) }));

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
      setExtendError("지금 끝나는 날보다 뒤의 날짜를 골라 주세요.");
      return;
    }
    if (!reason.trim()) {
      setExtendError("왜 더 필요한지 적어 주세요.");
      return;
    }
    setSubmitting(true);
    setExtendError(null);
    try {
      await onExtend({ requestId: server.requestId, expiresAt: `${expiresDate}T23:59:59`, reason: reason.trim() });
    } catch (error) {
      setExtendError(error.message || "연장을 요청하지 못했어요. 잠시 뒤에 다시 해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function openGroupRequest() {
    setSelectedGroupId("");
    setAddedGroups([]);
    setGroupReason("");
    setGroupError(null);
    setGroupModalOpen(true);
  }

  function addGroupToRequest() {
    const group = groupOptions.find((g) => g.value === selectedGroupId);
    if (!group || currentGroupIds.has(group.value) || addedGroupIds.has(group.value)) return;
    setAddedGroups((prev) => [...prev, group]);
    setSelectedGroupId("");
  }

  function removeGroupFromRequest(value) {
    setAddedGroups((prev) => prev.filter((g) => g.value !== value));
  }

  async function submitGroupRequest() {
    if (addedGroups.length === 0) {
      setGroupError("추가할 그룹을 하나 이상 골라 주세요.");
      return;
    }
    if (!groupReason.trim()) {
      setGroupError("왜 이 그룹이 필요한지 적어 주세요.");
      return;
    }
    setGroupSubmitting(true);
    setGroupError(null);
    try {
      const groupIds = [
        ...(server.groups ?? []).map((g) => g.ubuntuGid),
        ...addedGroups.map((g) => Number(g.value)),
      ];
      await onGroupChange({ requestId: server.requestId, groupIds, reason: groupReason.trim() });
      setGroupModalOpen(false);
    } catch (error) {
      setGroupError(error.message || "그룹 추가를 요청하지 못했어요. 잠시 뒤에 다시 해 주세요.");
    } finally {
      setGroupSubmitting(false);
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
        <Container header={<Header variant="h2" description="컨테이너를 고르면 아래에 접속 방법이 나와요">내 컨테이너 목록</Header>}>
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

      <Container header={<Header variant="h2" description="터미널(Windows는 PowerShell)에 아래 명령어를 붙여 넣고 Enter를 누르세요">접속 정보</Header>}>
        <KeyValuePairs columns={1} items={[
          { label: "접속 명령어", value: server.sshCommand, copyable: true },
          { label: "비밀번호", value: "이 사이트의 로그인 비밀번호와 같아요 (입력할 때 글자가 안 보이는 게 정상이에요)" },
        ]} />
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <ExpandableSection headerText="웹 브라우저로 접속하기 (JupyterLab)">
            <KeyValuePairs columns={1} items={[
              { label: "주소", value: server.jupyterUrl, copyable: true },
              { label: "token(처음 한 번만)", value: "서버 준비 메일에 확인 방법이 있어요" },
            ]} />
          </ExpandableSection>
        </div>
        {/* 신청 때 추가한 포트(원격 데스크톱 novnc 6080 등)의 외부 주소를 알 방법이 여기밖에 없다 */}
        {server.extraPorts?.length ? (
          <div style={{ marginTop: "var(--decs-space-m)" }}>
            <ExpandableSection headerText="추가 포트로 접속하기">
              <KeyValuePairs columns={1} items={server.extraPorts.map((port) => ({
                label: `${port.purpose} (컨테이너 ${port.internalPort})`,
                // noVNC만 브라우저로 바로 여는 주소를 준다. 나머지는 무엇을 띄웠는지 알 수 없어
                // http를 붙이면 틀린 안내가 되므로 주소만 알려준다.
                value: !port.reachable
                  ? `${port.address} — 외부 공개 대역(9300~9397) 밖이라 외부에서는 접속할 수 없어요`
                  : port.url
                  ? port.url
                  : `${port.address} — 컨테이너에 직접 띄운 서비스의 접속 방법에 맞춰 사용하세요`,
                copyable: port.reachable,
              }))} />
              {server.extraPorts.some((port) => port.isVnc) ? (
                <div style={{ marginTop: "var(--decs-space-s)", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
                  원격 데스크톱(noVNC)은 위 주소를 브라우저에서 열면 바로 화면이 뜹니다. 접속 비밀번호는
                  SSH로 들어가 <code>~/vnc_password.txt</code>를 확인하세요.
                </div>
              ) : null}
            </ExpandableSection>
          </div>
        ) : null}
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

      <Container header={<Header variant="h2" description="이 컨테이너에서 같이 쓰는 팀 폴더예요">그룹</Header>}>
        {(server.groups ?? []).length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)" }}>
            {server.groups.map((group) => (
              <Badge key={group.ubuntuGid} color="grey">{group.groupName}</Badge>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
            소속된 공유 그룹이 없어요.
          </div>
        )}
        {/* 팀 공유 폴더는 /home/_g_<그룹>에 있고, 컨테이너가 로그인 때마다 ~/shared/<그룹> 링크를 맞춘다
            (admin_infra-proposed#174). 경로를 모르면 홈에서 작업하는 사용자는 찾아갈 방법이 없다. */}
        {(server.groups ?? []).length > 0 ? (
          <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", marginTop: "var(--decs-space-xs)" }}>
            팀원과 파일을 같이 쓰려면 <code>~/shared/&lt;그룹 이름&gt;</code> 폴더에 넣으세요
            (실제 위치 <code>/home/_g_&lt;그룹 이름&gt;</code>). 새로 추가된 그룹은 승인되고 5분쯤 지나야 열려요.
            그 전에는 Permission denied가 나올 수 있으니, 5분 뒤에 SSH로 다시 접속해 주세요.
          </div>
        ) : null}
        <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", marginTop: "var(--decs-space-xs)" }}>
          여기서는 그룹 추가만 신청할 수 있어요. 그룹에서 빠지려면 <a href="https://forms.gle/nACaxj2UeJF56V2i7" target="_blank" rel="noreferrer">문의 폼</a>으로 알려 주세요.
        </div>
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <Button iconName="plus" onClick={openGroupRequest}>그룹 추가 신청</Button>
        </div>
      </Container>

      <Container header={<Header variant="h2" description="접속이 안 되거나 GPU가 안 보일 때 컨테이너를 새로 띄워요">컨테이너 재시작</Header>}>
        {/* 컨테이너가 여러 개면 다른 컨테이너를 골랐을 때 이 결과가 따라가지 않게 한다 */}
        {restartNotice?.requestId === server.requestId ? (
          <div style={{ marginBottom: "var(--decs-space-m)" }}>
            <Alert type={restartNotice.type}>{restartNotice.message}</Alert>
          </div>
        ) : null}
        <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
          홈 폴더의 파일은 그대로 남고, 지금 돌고 있는 프로그램은 끝나요. 1시간에 5번까지 할 수 있어요.
        </div>
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <Button iconName="arrow-path" onClick={() => setRestartOpen(true)}>재시작</Button>
        </div>
      </Container>

      <Alert type="info" header="문제가 있나요?">
        먼저 서버 준비 메일의 사용 설명서에서 같은 문제를 찾아보세요. 그래도 안 되면{" "}
        <a href="https://forms.gle/nACaxj2UeJF56V2i7" target="_blank" rel="noreferrer">문의 폼</a>으로 오류 메시지와 시각을 함께 알려 주세요.
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

      <Modal
        visible={extendOpen}
        onDismiss={() => !submitting && setExtendOpen(false)}
        header="사용 기간 연장하기"
        footer={<>
          <Button variant="normal" disabled={submitting} onClick={() => setExtendOpen(false)}>취소</Button>
          <Button variant="primary" loading={submitting} onClick={submitExtension}>연장 요청하기</Button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
          {extendError ? <Alert type="error">{extendError}</Alert> : null}
          <FormField label="지금 끝나는 날">
            <Input value={toLocalDateInput(new Date(server.expiresAt))} readOnly />
          </FormField>
          <FormField label="새로 끝나는 날" constraintText="지금 끝나는 날보다 뒤의 날짜를 골라 주세요.">
            <Input type="date" value={expiresDate} onChange={setExpiresDate} />
          </FormField>
          <FormField label="연장하는 이유" constraintText="무엇이 남아서 얼마나 더 필요한지 적어 주세요.">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="예: 논문 제출 전에 모델 3개를 더 비교해야 해서 2주가 더 필요해요."
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

      <Modal
        visible={groupModalOpen}
        onDismiss={() => !groupSubmitting && setGroupModalOpen(false)}
        header="공유 그룹 추가 신청"
        footer={<>
          <Button variant="normal" disabled={groupSubmitting} onClick={() => setGroupModalOpen(false)}>취소</Button>
          <Button variant="primary" loading={groupSubmitting} onClick={submitGroupRequest}>추가 요청하기</Button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
          {groupError ? <Alert type="error">{groupError}</Alert> : null}
          <Alert type="info" header="승인되고 조금 기다려야 열려요">
            관리자가 승인하면 5분쯤 뒤에 팀 폴더가 열려요. 이미 켜져 있는 컨테이너는 30분쯤 걸릴 수 있어요.
            열리지 않으면 SSH 접속을 끊었다가 다시 접속해 보세요.
          </Alert>
          <FormField label="지금 들어가 있는 그룹">
            {(server.groups ?? []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)" }}>
                {server.groups.map((group) => (
                  <Badge key={group.ubuntuGid} color="grey">{group.groupName}</Badge>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>없음</span>
            )}
          </FormField>
          <FormField label="추가할 그룹">
            <div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
              <Select selectedValue={selectedGroupId} onChange={setSelectedGroupId} options={groupSelectOptions} placeholder="공유 그룹 고르기" style={{ flex: 1 }} />
              <Button iconName="plus" onClick={addGroupToRequest} disabled={!selectedGroupId || addedGroupIds.has(selectedGroupId)} ariaLabel="그룹 추가">추가</Button>
            </div>
            {addedGroups.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xs)" }}>
                {addedGroups.map((group) => (
                  <span key={group.value} style={{ display: "inline-flex", alignItems: "center", gap: "var(--decs-space-xxxs)" }}>
                    <Badge color="blue">{group.label}</Badge>
                    <Button variant="icon" iconName="x-mark" onClick={() => removeGroupFromRequest(group.value)} ariaLabel={`그룹 ${group.label} 제거`} />
                  </span>
                ))}
              </div>
            ) : null}
          </FormField>
          <FormField label="필요한 이유">
            <textarea
              value={groupReason}
              onChange={(event) => setGroupReason(event.target.value)}
              rows={4}
              placeholder="예: 연구실 팀원들과 같은 데이터셋을 쓰려고 vision-lab 그룹이 필요해요."
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
