// UserContainerDetail — 접속·상태 이해 (친절한 문구 + 복사 가능한 접속 정보)
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Header, KeyValuePairs, StatusIndicator, Button, Alert, ExpandableSection, Badge, FormField, Input, Select, Modal } from "../../../design-system";

function UserContainerDetail({ onBack, onExtend, onGroupChange, groupOptions = [], servers = [] }) {
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
      setGroupError("추가할 그룹을 하나 이상 선택해주세요.");
      return;
    }
    if (!groupReason.trim()) {
      setGroupError("그룹 추가 사유를 입력해주세요.");
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
      setGroupError(error.message || "그룹 추가 요청에 실패했어요. 잠시 후 다시 시도해주세요.");
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

      <Container header={<Header variant="h2" description="터미널에 아래 명령을 붙여넣어 접속하세요">접속 정보</Header>}>
        <KeyValuePairs columns={1} items={[
          { label: "접속 명령", value: server.sshCommand, copyable: true },
          { label: "비밀번호", value: "서버 신청 때 직접 입력한 Ubuntu 비밀번호를 사용하세요" },
        ]} />
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <ExpandableSection headerText="Jupyter로 접속하기">
            <KeyValuePairs columns={1} items={[
              { label: "주소", value: server.jupyterUrl, copyable: true },
              { label: "토큰", value: "승인 안내 메일에서 확인할 수 있어요" },
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

      <Container header={<Header variant="h2" description="이 컨테이너가 소속된 공유 그룹이에요">그룹</Header>}>
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
            팀원과 파일을 나누려면 컨테이너 안의 <code>~/shared/&lt;그룹 이름&gt;</code> 폴더를 쓰세요
            (실제 위치 <code>/home/_g_&lt;그룹 이름&gt;</code>). 새로 추가된 그룹은 다음 SSH 접속부터 보여요.
          </div>
        ) : null}
        <div style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", marginTop: "var(--decs-space-xs)" }}>
          그룹을 빼려면 관리자에게 별도로 문의해주세요. 여기서는 추가만 신청할 수 있어요.
        </div>
        <div style={{ marginTop: "var(--decs-space-m)" }}>
          <Button iconName="plus" onClick={openGroupRequest}>그룹 추가 신청</Button>
        </div>
      </Container>

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

      <Modal
        visible={groupModalOpen}
        onDismiss={() => !groupSubmitting && setGroupModalOpen(false)}
        header="그룹 추가 신청"
        footer={<>
          <Button variant="normal" disabled={groupSubmitting} onClick={() => setGroupModalOpen(false)}>취소</Button>
          <Button variant="primary" loading={groupSubmitting} onClick={submitGroupRequest}>추가 요청</Button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
          {groupError ? <Alert type="error">{groupError}</Alert> : null}
          <Alert type="info" header="승인 후 반영까지 시간이 걸려요">
            관리자가 승인하면 그룹이 실제로 반영돼요. 다만 이미 켜져 있는 컨테이너는 접속을 다시 맺을
            때까지 최대 약 30분이 걸리고, 새로 만드는 컨테이너는 바로 반영돼요.
          </Alert>
          <FormField label="현재 소속 그룹">
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
              <Select selectedValue={selectedGroupId} onChange={setSelectedGroupId} options={groupSelectOptions} placeholder="공유 그룹 선택" style={{ flex: 1 }} />
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
          <FormField label="추가 사유">
            <textarea
              value={groupReason}
              onChange={(event) => setGroupReason(event.target.value)}
              rows={4}
              placeholder="예: 팀 공유 데이터셋 접근을 위해 team-a 그룹이 필요합니다."
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
