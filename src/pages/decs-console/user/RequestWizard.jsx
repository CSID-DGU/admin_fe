// RequestWizard — 사용 목적 → 서버 선택 → GPU → 기간 → 개발 환경 → 확인
import React from "react";
import { Wizard, Modal, Cards, FormField, Select, Input, KeyValuePairs, Alert, Container, Header, StatusIndicator, Button, Badge, Table } from "../../../design-system";
import { requestService } from "../../../services/requestService";
import { toGroupOption } from "../../../utils/groupOption";

const GROUP_NAME_PATTERN = /^[a-z_][a-z0-9_-]*$/;
// BE(SaveRequestRequestDTO.usagePurpose)와 같은 한도. 승인자가 이 글만 보고 판단하므로 최소 길이를 둔다.
const PURPOSE_MIN_LENGTH = 50;
const PURPOSE_MAX_LENGTH = 1000;
// 신청서 폼 응답(formAnswers) 전체가 10,000자로 묶여 있어 한 칸은 짧게 받는다.
const TEAM_INFO_MAX_LENGTH = 300;
// 팀 신청은 순서가 중요하다 — 팀원이 팀장보다 먼저 신청하면 고를 그룹이 없다.
const TEAM_STEPS = [
  { role: "팀장", text: "아래 '새 공유 그룹 만들기'로 그룹을 만들고, 이 신청서를 끝까지 제출해요." },
  { role: "팀장", text: "만든 그룹 이름을 팀원에게 알려 줘요." },
  { role: "팀원", text: "'공유 그룹'에서 그 그룹을 골라 각자 신청해요. 그룹을 새로 만들지 마세요." },
];
const PURPOSE_EXAMPLE = "예: 졸업 프로젝트로 PyTorch를 사용해 흉부 X-ray 사진을 분류하는 모델을 학습하려고 합니다. 사진은 약 2만 장(10GB)이고, 한 번 학습하는 데 GPU 1장으로 6시간 정도 걸릴 것 같습니다. 일주일에 2~3번 학습할 예정입니다.";

function toLocalDateInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function RequestWizard({ onCancel, onDone, gpuOptions: gpuOptionsProp, envOptions: envOptionsProp, groupOptions: groupOptionsProp, onSubmit: onSubmitProp, accountUsername }) {
  const [step, setStep] = React.useState(0);
  const [purpose, setPurpose] = React.useState("");
  const [selectedServer, setSelectedServer] = React.useState("");
  const [gpu, setGpu] = React.useState([]);
  const [expiresDate, setExpiresDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toLocalDateInput(d);
  });
  const [env, setEnv] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [stepErrors, setStepErrors] = React.useState({});
  const [selectedGroups, setSelectedGroups] = React.useState([]);
  const [createdGroups, setCreatedGroups] = React.useState([]);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [groupCreateError, setGroupCreateError] = React.useState(null);
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [teamInfo, setTeamInfo] = React.useState("");
  const [portNumber, setPortNumber] = React.useState("");
  const [portPurpose, setPortPurpose] = React.useState("");
  const [portRequests, setPortRequests] = React.useState([]);
  const [portError, setPortError] = React.useState(null);
  const [clusterNoticeStep, setClusterNoticeStep] = React.useState(null);

  const gpuOptions = React.useMemo(() => gpuOptionsProp ?? [], [gpuOptionsProp]);
  const envOptions = React.useMemo(() => envOptionsProp ?? [], [envOptionsProp]);
  // 방금 만든 그룹이 서버 목록에도 들어오면(다시 불러온 경우) 한 번만 보이게 그룹 id로 거른다.
  const groupOptions = React.useMemo(() => {
    const seen = new Set();
    return [...(groupOptionsProp ?? []), ...createdGroups].filter((g) => !seen.has(g.value) && seen.add(g.value));
  }, [groupOptionsProp, createdGroups]);
  const serverOptions = React.useMemo(() => {
    const seen = new Set();
    return gpuOptions.reduce((acc, g) => {
      if (g.serverName && !seen.has(g.serverName)) {
        seen.add(g.serverName);
        acc.push({ id: g.serverName, title: g.serverName });
      }
      return acc;
    }, []);
  }, [gpuOptions]);
  const filteredGpuOptions = React.useMemo(
    () => (selectedServer ? gpuOptions.filter((g) => g.serverName === selectedServer) : gpuOptions),
    [gpuOptions, selectedServer],
  );
  const selectedGroupIds = React.useMemo(() => new Set(selectedGroups.map((g) => g.value)), [selectedGroups]);
  const groupSelectOptions = groupOptions.map((g) => ({ ...g, disabled: selectedGroupIds.has(g.value) }));

  React.useEffect(() => {
    if (!env && envOptions.length > 0) setEnv(String(envOptions[0].value));
  }, [env, envOptions]);

  function validatePeriod() {
    const picked = new Date(`${expiresDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 365);
    if (!expiresDate || Number.isNaN(picked.getTime()) || picked <= today) {
      setStepErrors((prev) => ({ ...prev, period: "내일이나 그 뒤의 날짜를 골라 주세요." }));
      return false;
    }
    if (picked > maxDate) {
      setStepErrors((prev) => ({ ...prev, period: "오늘부터 1년 안의 날짜를 골라 주세요." }));
      return false;
    }
    return true;
  }

  function validateStep(nextStep) {
    if (step === 0 && nextStep > step && purpose.trim().length < PURPOSE_MIN_LENGTH) {
      setStepErrors((prev) => ({ ...prev, purpose: `${PURPOSE_MIN_LENGTH}자 이상 적어 주세요. 지금 ${purpose.trim().length}자예요.` }));
      return false;
    }
    if (step === 1 && nextStep > step && !selectedServer) {
      setStepErrors((prev) => ({ ...prev, server: "서버를 하나 골라 주세요." }));
      return false;
    }
    if (step === 2 && nextStep > step && gpu.length === 0) {
      setStepErrors((prev) => ({ ...prev, gpu: "GPU를 하나 골라 주세요." }));
      return false;
    }
    if (step === 3 && nextStep > step && !validatePeriod()) return false;
    return true;
  }

  function handleNavigate(nextStep) {
    setError(null);
    if (!validateStep(nextStep)) return;
    // 서버 선택을 넘어갈 때 다른 클러스터 배정 가능성을 먼저 안내한다
    if (step === 1 && nextStep > step) {
      setClusterNoticeStep(nextStep);
      return;
    }
    setStep(nextStep);
  }

  // 고르는 즉시 추가한다. 따로 "추가"를 눌러야 하면 고르기만 하고 신청해 그룹이 빠지는 일이 생긴다.
  function addGroup(value) {
    const group = groupOptions.find((g) => g.value === value);
    if (!group || selectedGroupIds.has(group.value)) return;
    setSelectedGroups((prev) => [...prev, group]);
  }

  function removeGroup(value) {
    setSelectedGroups((prev) => prev.filter((g) => g.value !== value));
  }

  async function createNewGroup() {
    const groupName = newGroupName.trim();
    if (!groupName) return;
    if (!GROUP_NAME_PATTERN.test(groupName) || groupName.length > 32) {
      setGroupCreateError("그룹 이름은 영어 소문자로 시작하고, 영어 소문자·숫자·밑줄(_)·하이픈(-)만 써서 32자 안으로 지어 주세요.");
      return;
    }
    setCreatingGroup(true);
    setGroupCreateError(null);
    try {
      // 그룹은 바로 생긴다(gid 없음). 인프라 그룹은 이 그룹을 고른 신청이 승인될 때 만들어진다.
      const res = await requestService.createGroup(groupName);
      const dto = res.data?.data ?? res.data;
      if (dto?.groupId == null) {
        setGroupCreateError("그룹을 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      const group = toGroupOption(dto);
      setCreatedGroups((prev) => [...prev, group]);
      setSelectedGroups((prev) => [...prev, group]);
      setNewGroupName("");
    } catch (e) {
      setGroupCreateError(e.message || "그룹을 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
    } finally {
      setCreatingGroup(false);
    }
  }

  function addPort() {
    const parsedPort = Number(portNumber);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setPortError("포트 번호는 1부터 65535 사이의 숫자로 적어 주세요.");
      return;
    }
    if ([22, 8888].includes(parsedPort)) {
      setPortError("22번(SSH)과 8888번(JupyterLab)은 이미 열려 있어요. 다른 번호를 적어 주세요.");
      return;
    }
    if (portRequests.some((p) => p.internalPort === parsedPort)) {
      setPortError("이미 추가한 포트예요.");
      return;
    }
    setPortRequests((prev) => [...prev, { internalPort: parsedPort, usagePurpose: portPurpose.trim() || `포트 ${parsedPort}` }]);
    setPortNumber("");
    setPortPurpose("");
    setPortError(null);
  }

  function removePort(internalPort) {
    setPortRequests((prev) => prev.filter((p) => p.internalPort !== internalPort));
  }

  if (done) {
    return (
      <Container>
        <div style={{ textAlign: "center", padding: "var(--decs-space-xxl) var(--decs-space-l)" }}>
          <div style={{ color: "var(--decs-status-success)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <StatusIndicator type="success"><span style={{ fontSize: "var(--decs-fs-body-l)", fontWeight: 700 }}>신청했어요</span></StatusIndicator>
          </div>
          <p style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", maxWidth: 420, margin: "0 auto 20px" }}>
            관리자가 승인하면 컨테이너를 준비해 드려요. 준비가 끝나면 접속 방법을 메일로 보내 드리고, 대시보드에서도 볼 수 있어요.
            서버 비밀번호는 이 사이트의 로그인 비밀번호와 같아요.
          </p>
          <Button variant="primary" onClick={onDone}>신청 현황 보기</Button>
        </div>
      </Container>
    );
  }

  const steps = [
    {
      title: "사용 목적",
      content: (
        <div style={{ maxWidth: 560 }}>
          <FormField
            label="사용 목적"
            description="무엇을 하는지, 어떤 프로그램을 쓰는지, 데이터가 얼마나 되는지, 얼마나 오래 돌리는지 넣어 주세요."
            errorText={stepErrors.purpose}
            constraintText={`${purpose.trim().length} / ${PURPOSE_MIN_LENGTH}자 이상`}
          >
            <textarea
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value); setStepErrors((prev) => ({ ...prev, purpose: null })); }}
              rows={6}
              maxLength={PURPOSE_MAX_LENGTH}
              placeholder={PURPOSE_EXAMPLE}
              style={{
                width: "100%", padding: "8px 12px", fontSize: "var(--decs-fs-body-m)",
                background: "var(--decs-surface-input)", color: "var(--decs-text-body)",
                borderRadius: "var(--decs-radius-input)",
                border: `1px solid ${stepErrors.purpose ? "var(--decs-status-error)" : "var(--decs-border-input)"}`,
                outline: "none", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </FormField>
        </div>
      ),
    },
    {
      title: "서버 선택",
      description: "쓰고 싶은 서버를 골라 주세요.",
      content: serverOptions.length > 0 ? (
        <FormField errorText={stepErrors.server}>
          <Cards
            columns={Math.min(serverOptions.length, 3)}
            selectionType="single"
            trackBy="id"
            selectedItems={serverOptions.filter((s) => s.id === selectedServer)}
            onSelectionChange={(items) => {
              const next = items[0]?.id ?? "";
              setSelectedServer(next);
              setGpu([]);
              setStepErrors((prev) => ({ ...prev, server: null, gpu: null }));
            }}
            items={serverOptions}
            cardDefinition={{ header: (o) => o.title }}
          />
        </FormField>
      ) : <Alert type="info">지금 신청할 수 있는 서버가 없어요.</Alert>,
    },
    {
      title: "GPU 선택",
      description: "필요한 GPU를 골라 주세요.",
      content: filteredGpuOptions.length > 0 ? (
        <FormField errorText={stepErrors.gpu}>
          <Cards columns={2} selectionType="single" trackBy="id" selectedItems={gpu}
            onSelectionChange={(items) => { setGpu(items); setStepErrors((prev) => ({ ...prev, gpu: null })); }}
            items={filteredGpuOptions} cardDefinition={{ header: (o) => o.title, sections: [{ id: "d", content: (o) => o.desc }, { id: "m", header: "메모리", content: (o) => o.memory }] }} />
        </FormField>
      ) : <Alert type="info">고른 서버에서 지금 신청할 수 있는 GPU가 없어요. 다른 서버를 골라 주세요.</Alert>,
    },
    {
      title: "사용 기간",
      description: "언제까지 쓸지 골라 주세요. 끝나기 전에 언제든 연장할 수 있어요.",
      content: (
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label="끝나는 날" errorText={stepErrors.period} constraintText="이 날이 지나면 컨테이너가 정리돼요. 오늘부터 1년 안으로 고를 수 있어요.">
            <Input
              value={expiresDate}
              onChange={(value) => { setExpiresDate(value); setStepErrors((prev) => ({ ...prev, period: null })); }}
              type="date"
              invalid={!!stepErrors.period}
            />
          </FormField>
          <Alert type="info">보통 2주면 충분해요. 길게 잡을수록 승인이 늦어질 수 있어요.</Alert>
        </div>
      ),
    },
    {
      title: "개발 환경",
      description: "개발 환경을 고르고, 필요하면 공유 그룹과 포트를 추가해 주세요.",
      content: (
        <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label="개발 환경" constraintText="잘 모르면 처음 골라져 있는 것을 그대로 쓰세요.">
            <Select selectedValue={env} onChange={setEnv} options={envOptions} />
          </FormField>
          <FormField label="서버 아이디" constraintText="가입할 때 정한 이름이에요. 바꿀 수 없어요.">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", minHeight: 32 }}>
              <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>본인 계정</span>
              {accountUsername
                ? <Badge color="grey">{accountUsername}</Badge>
                : <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>—</span>}
            </div>
          </FormField>
          <Alert type="info" header="서버 비밀번호는 이 사이트의 로그인 비밀번호와 같아요">
            이 사이트에서 비밀번호를 바꾸면 서버 비밀번호도 같이 바뀌어요.
          </Alert>
          <Alert type="info" header="팀으로 신청하나요? 이 순서대로 해 주세요">
            <ol style={{ listStyle: "none", margin: "var(--decs-space-xs) 0", padding: 0, display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)" }}>
              {TEAM_STEPS.map((step, i) => (
                <li key={step.text} style={{ display: "flex", alignItems: "baseline", gap: "var(--decs-space-xs)" }}>
                  <span style={{ fontWeight: "var(--decs-fw-bold)", minWidth: "1.2em" }}>{i + 1}.</span>
                  <Badge color={step.role === "팀장" ? "blue" : "green"} style={{ flexShrink: 0 }}>{step.role}</Badge>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
            팀 프로젝트(캡스톤 디자인, 종합 설계, 공동 연구 등)는 <b>모든 팀원이 각자 신청</b>해야 승인돼요. 혼자 쓰면 아래 그룹·팀 칸은 비워 두세요.
          </Alert>
          <FormField label="공유 그룹 (선택)" constraintText="'(승인 시 생성)'이 붙은 그룹은 승인될 때 만들어지는 새 그룹이에요. 골라도 돼요. 승인되면 내 홈 아래 폴더를 이 그룹과 같이 쓸 수 있어요(폴더 하나는 그룹 하나와만).">
            <Select selectedValue="" onChange={addGroup} options={groupSelectOptions} placeholder="공유 그룹 고르기" />
            {selectedGroups.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xs)" }}>
                {selectedGroups.map((group) => (
                  <span key={group.value} style={{ display: "inline-flex", alignItems: "center", gap: "var(--decs-space-xxxs)" }}>
                    <Badge color="blue">{group.label}</Badge>
                    <Button variant="icon" iconName="x-mark" onClick={() => removeGroup(group.value)} ariaLabel={`공유 그룹 ${group.label} 제거`} />
                  </span>
                ))}
              </div>
            ) : null}
          </FormField>
          <FormField label="새 공유 그룹 만들기 (팀장만)" errorText={groupCreateError} constraintText="영어 소문자로 시작하고 영어 소문자·숫자·밑줄(_)·하이픈(-)만, 32자 안으로 지어요. 만들면 이 신청서에 바로 선택되고, 팀원도 목록에서 고를 수 있어요.">
            <div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
              <Input
                value={newGroupName}
                onChange={(value) => { setNewGroupName(value); setGroupCreateError(null); }}
                placeholder="예: vision-lab"
                invalid={!!groupCreateError}
                style={{ flex: 1 }}
              />
              <Button onClick={createNewGroup} disabled={!newGroupName.trim() || creatingGroup} loading={creatingGroup} ariaLabel="새 공유 그룹 만들기">새로 만들기</Button>
            </div>
          </FormField>
          <FormField label="팀 프로젝트 정보 (팀으로 신청할 때)" constraintText="'그룹 이름 / 팀원 전원 실명(본인 포함)'으로 적어요. 팀원 모두 같은 내용을 적고, 관리자가 모두 신청했는지 확인해 승인해요.">
            <Input
              value={teamInfo}
              onChange={(value) => setTeamInfo(value.slice(0, TEAM_INFO_MAX_LENGTH))}
              placeholder="예: vision-lab / 홍길동, 김철수, 이영희"
              ariaLabel="팀 프로젝트 정보"
            />
          </FormField>
          <FormField label="추가 포트 (선택)" errorText={portError} constraintText="SSH(22번)와 JupyterLab(8888번)은 자동으로 열려요. 그 밖에 웹 브라우저로 볼 프로그램이 있을 때만 추가해요. 잘 모르면 비워 두세요. 예: 6006번, TensorBoard">
            <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) auto", gap: "var(--decs-space-xs)" }}>
              <Input value={portNumber} onChange={(value) => { setPortNumber(value); setPortError(null); }} type="number" min={1} max={65535} step={1} placeholder="예: 6006" invalid={!!portError} />
              <Input value={portPurpose} onChange={setPortPurpose} placeholder="어디에 쓰나요? 예: TensorBoard" />
              <Button iconName="plus" onClick={addPort} ariaLabel="추가 포트 추가">추가</Button>
            </div>
            {portRequests.length > 0 ? (
              <Table
                density="compact"
                trackBy="internalPort"
                items={portRequests}
                style={{ marginTop: "var(--decs-space-xs)" }}
                columns={[
                  { id: "port", header: "포트", cell: (p) => p.internalPort },
                  { id: "purpose", header: "목적", cell: (p) => p.usagePurpose },
                  { id: "remove", header: "", width: 60, cell: (p) => <Button variant="icon" iconName="trash" onClick={() => removePort(p.internalPort)} ariaLabel={`추가 포트 ${p.internalPort} 제거`} /> },
                ]}
              />
            ) : null}
          </FormField>
        </div>
      ),
    },
    {
      title: "확인",
      description: "내용을 한 번 더 확인하고 [신청하기]를 눌러 주세요.",
      content: (
        <Container header={<Header variant="h2">신청 내용</Header>}>
          <KeyValuePairs columns={2} items={[
            { label: "사용 목적", value: purpose.trim() || "—", fullWidth: true, multiline: true },
            { label: "서버", value: selectedServer || "—" },
            { label: "GPU", value: (filteredGpuOptions.find((o) => o.id === gpu[0]?.id) || {}).title || "—" },
            { label: "끝나는 날", value: expiresDate || "—" },
            { label: "개발 환경", value: envOptions.find((o) => o.value === env)?.label ?? env },
            { label: "서버 아이디", value: accountUsername || "—" },
            { label: "서버 비밀번호", value: "로그인 비밀번호와 같아요" },
            { label: "공유 그룹", value: selectedGroups.length > 0 ? selectedGroups.map((g) => g.label).join(", ") : "—" },
            { label: "팀 프로젝트 정보", value: teamInfo.trim() || "—" },
            { label: "추가 포트", value: portRequests.length > 0 ? portRequests.map((p) => `${p.internalPort} (${p.usagePurpose})`).join(", ") : "—" },
          ]} />
        </Container>
      ),
    },
  ];

  function submit() {
    const purposeText = purpose.trim();
    const selectedGpu = gpu[0];
    const missingFields = [
      purposeText.length < PURPOSE_MIN_LENGTH ? `사용 목적(${PURPOSE_MIN_LENGTH}자 이상)` : null,
      !selectedServer ? "서버" : null,
      !selectedGpu ? "GPU" : null,
      !env ? "개발 환경" : null,
    ].filter(Boolean);
    const periodValid = validatePeriod();
    if (missingFields.length > 0 || !periodValid) {
      setError(`아직 채우지 않은 칸이 있어요: ${missingFields.join(", ") || "끝나는 날"}`);
      return undefined;
    }

    const payload = {
      purpose: purposeText,
      usagePurpose: purposeText,
      teamInfo: teamInfo.trim(),
      gpu: selectedGpu.id,
      expiresAt: `${expiresDate}T23:59:59`,
      env,
      groupIds: selectedGroups.map((g) => g.value),
      portRequests,
    };

    if (onSubmitProp) {
      setSubmitting(true);
      return Promise.resolve(onSubmitProp(payload))
        .then((success) => { if (success !== false) setDone(true); })
        .catch((submitError) => setError(submitError.message || "신청하지 못했어요. 잠시 뒤에 다시 해 주세요."))
        .finally(() => setSubmitting(false));
    }
    setDone(true);
  }

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <Header variant="h1">GPU 신청</Header>
      {error ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Alert type="error">{error}</Alert></div> : null}
      <Container>
        <Wizard steps={steps} activeStepIndex={step} onNavigate={handleNavigate} onCancel={onCancel} onSubmit={submit} submitLabel="신청하기" isLoadingNextStep={submitting} />
      </Container>
      <Modal
        visible={clusterNoticeStep !== null}
        onDismiss={() => setClusterNoticeStep(null)}
        header="다른 서버로 배정될 수 있어요"
        footer={<Button variant="primary" onClick={() => { setStep(clusterNoticeStep); setClusterNoticeStep(null); }}>확인</Button>}
      >
        고른 서버에 사람이 많으면, 관리자가 사용 목적을 보고 다른 서버로 배정할 수 있어요.
      </Modal>
    </div>
  );
}
export default RequestWizard;
