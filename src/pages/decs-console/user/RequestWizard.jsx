// RequestWizard — 사용 목적 → 서버 선택 → GPU → 기간 → 개발 환경 → 확인
import React from "react";
import { Wizard, Modal, Cards, FormField, Select, Input, KeyValuePairs, Alert, Container, Header, StatusIndicator, Button, Badge, Table } from "../../../design-system";
import { requestService } from "../../../services/requestService";

const GROUP_NAME_PATTERN = /^[a-z_][a-z0-9_-]*$/;
// BE(SaveRequestRequestDTO.usagePurpose)와 같은 한도. 승인자가 이 글만 보고 판단하므로 최소 길이를 둔다.
const PURPOSE_MIN_LENGTH = 50;
const PURPOSE_MAX_LENGTH = 1000;
const PURPOSE_GUIDE = [
  ["무엇을 하나요?", "졸업 프로젝트, 논문 실험, 수업 과제 등"],
  ["어떤 프로그램을 쓰나요?", "PyTorch, TensorFlow, Hugging Face 등"],
  ["데이터는 얼마나 되나요?", "이미지 2만 장, 텍스트 10GB 등"],
  ["얼마나 오래 돌리나요?", "한 번 학습에 6시간, 일주일에 2~3번 등"],
];
const PURPOSE_EXAMPLE = "졸업 프로젝트로 PyTorch를 사용해 흉부 X-ray 사진을 분류하는 모델을 학습하려고 합니다. 사진은 약 2만 장(10GB)이고, 한 번 학습하는 데 GPU 1장으로 6시간 정도 걸릴 것 같습니다. 일주일에 2~3번 학습할 예정입니다.";

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
  const [portNumber, setPortNumber] = React.useState("");
  const [portPurpose, setPortPurpose] = React.useState("");
  const [portRequests, setPortRequests] = React.useState([]);
  const [portError, setPortError] = React.useState(null);
  const [clusterNoticeStep, setClusterNoticeStep] = React.useState(null);

  const gpuOptions = React.useMemo(() => gpuOptionsProp ?? [], [gpuOptionsProp]);
  const envOptions = React.useMemo(() => envOptionsProp ?? [], [envOptionsProp]);
  const groupOptions = React.useMemo(() => [...(groupOptionsProp ?? []), ...createdGroups], [groupOptionsProp, createdGroups]);
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
      setStepErrors((prev) => ({ ...prev, period: "만료일은 오늘 이후 날짜로 선택해주세요." }));
      return false;
    }
    if (picked > maxDate) {
      setStepErrors((prev) => ({ ...prev, period: "만료일은 오늘부터 1년 이내로 선택해주세요." }));
      return false;
    }
    return true;
  }

  function validateStep(nextStep) {
    if (step === 0 && nextStep > step && purpose.trim().length < PURPOSE_MIN_LENGTH) {
      setStepErrors((prev) => ({ ...prev, purpose: `사용 목적을 ${PURPOSE_MIN_LENGTH}자 이상 적어주세요. 지금 ${purpose.trim().length}자예요.` }));
      return false;
    }
    if (step === 1 && nextStep > step && !selectedServer) {
      setStepErrors((prev) => ({ ...prev, server: "서버를 선택해주세요." }));
      return false;
    }
    if (step === 2 && nextStep > step && gpu.length === 0) {
      setStepErrors((prev) => ({ ...prev, gpu: "GPU를 선택해주세요." }));
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
      setGroupCreateError("그룹명은 소문자나 밑줄로 시작하고 소문자·숫자·밑줄·하이픈만 32자 이내로 쓸 수 있어요.");
      return;
    }
    setCreatingGroup(true);
    setGroupCreateError(null);
    try {
      const res = await requestService.createGroup(groupName);
      const dto = res.data?.data ?? res.data;
      const group = {
        value: String(dto.ubuntuGid),
        label: `${dto.groupName} (${dto.ubuntuGid})`,
        groupName: dto.groupName,
        ubuntuGid: dto.ubuntuGid,
      };
      setCreatedGroups((prev) => [...prev, group]);
      setSelectedGroups((prev) => [...prev, group]);
      setNewGroupName("");
    } catch (e) {
      setGroupCreateError(e.message || "그룹 생성에 실패했습니다.");
    } finally {
      setCreatingGroup(false);
    }
  }

  function addPort() {
    const parsedPort = Number(portNumber);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setPortError("포트 번호는 1~65535 사이의 숫자로 입력해주세요.");
      return;
    }
    if ([22, 8888].includes(parsedPort)) {
      setPortError("22(SSH), 8888(Jupyter) 포트는 기본 포트와 충돌합니다.");
      return;
    }
    if (portRequests.some((p) => p.internalPort === parsedPort)) {
      setPortError("이미 추가한 포트입니다.");
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
            <StatusIndicator type="success"><span style={{ fontSize: "var(--decs-fs-body-l)", fontWeight: 700 }}>신청이 접수되었어요</span></StatusIndicator>
          </div>
          <p style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", maxWidth: 420, margin: "0 auto 20px" }}>
            관리자 승인 후 컨테이너를 준비할게요. 준비가 끝나면 대시보드에서 바로 접속할 수 있어요.
            SSH 접속에는 이 사이트에 로그인할 때 쓰는 비밀번호를 쓰세요.
          </p>
          <Button variant="primary" onClick={onDone}>신청 현황으로 가기</Button>
        </div>
      </Container>
    );
  }

  const steps = [
    {
      title: "사용 목적",
      description: "GPU 서버로 무엇을 하실 건가요? 승인하는 교수님이 이 글만 보고 판단하니 자세히 적어주세요.",
      content: (
        <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <Alert type="info" header="아래 네 가지를 넣어 적어주세요">
            <ol style={{ margin: 0, paddingLeft: "var(--decs-space-l)" }}>
              {PURPOSE_GUIDE.map(([question, hint]) => (
                <li key={question}><strong>{question}</strong> <span style={{ color: "var(--decs-text-secondary)" }}>(예: {hint})</span></li>
              ))}
            </ol>
            <p style={{ margin: "var(--decs-space-s) 0 0" }}><strong>이렇게 쓰면 돼요</strong></p>
            <p style={{ margin: 0, color: "var(--decs-text-secondary)" }}>{PURPOSE_EXAMPLE}</p>
          </Alert>
          <FormField
            label="사용 목적"
            errorText={stepErrors.purpose}
            constraintText={purpose.trim().length < PURPOSE_MIN_LENGTH
              ? `${purpose.trim().length}자 / 최소 ${PURPOSE_MIN_LENGTH}자 — ${PURPOSE_MIN_LENGTH - purpose.trim().length}자 더 적어주세요.`
              : `${purpose.trim().length}자 / 최대 ${PURPOSE_MAX_LENGTH}자 — 좋아요!`}
          >
            <textarea
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value); setStepErrors((prev) => ({ ...prev, purpose: null })); }}
              rows={6}
              maxLength={PURPOSE_MAX_LENGTH}
              placeholder="위 네 가지를 넣어 두세 문장으로 적어주세요."
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
      description: "사용할 GPU 클러스터를 선택해주세요.",
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
      ) : <Alert type="info">신청 가능한 서버 정보가 없습니다.</Alert>,
    },
    {
      title: "GPU 선택",
      description: "필요한 성능을 골라 주세요.",
      content: filteredGpuOptions.length > 0 ? (
        <FormField errorText={stepErrors.gpu}>
          <Cards columns={2} selectionType="single" trackBy="id" selectedItems={gpu}
            onSelectionChange={(items) => { setGpu(items); setStepErrors((prev) => ({ ...prev, gpu: null })); }}
            items={filteredGpuOptions} cardDefinition={{ header: (o) => o.title, sections: [{ id: "d", content: (o) => o.desc }, { id: "m", header: "메모리", content: (o) => o.memory }] }} />
        </FormField>
      ) : <Alert type="info">선택한 서버에 신청 가능한 GPU가 없습니다.</Alert>,
    },
    {
      title: "사용 기간",
      description: "언제까지 사용하실 계획인가요? 만료 전에 언제든 연장할 수 있어요.",
      content: (
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label="사용 만료일" errorText={stepErrors.period} constraintText="서버 사용을 마칠 날짜예요. (오늘부터 1년 이내)">
            <Input
              value={expiresDate}
              onChange={(value) => { setExpiresDate(value); setStepErrors((prev) => ({ ...prev, period: null })); }}
              type="date"
              invalid={!!stepErrors.period}
            />
          </FormField>
          <Alert type="info">기본 실험은 2주면 충분한 경우가 많아요. 길게 잡을수록 승인이 늦어질 수 있어요.</Alert>
        </div>
      ),
    },
    {
      title: "개발 환경",
      description: "컨테이너 환경과 접속 계정을 설정해 주세요.",
      content: (
        <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label="기본 환경">
            <Select selectedValue={env} onChange={setEnv} options={envOptions} />
          </FormField>
          <FormField label="Ubuntu 사용자명" constraintText="가입할 때 정한 계정 이름이라 신청마다 바꿀 수 없어요.">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", minHeight: 32 }}>
              <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>본인 계정</span>
              {accountUsername
                ? <Badge color="grey">{accountUsername}</Badge>
                : <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>—</span>}
            </div>
          </FormField>
          <Alert type="info" header="SSH 비밀번호는 이 사이트의 로그인 비밀번호예요">
            컨테이너의 Ubuntu 계정도 로그인 비밀번호로 만들어져요. 비밀번호를 바꾸면 떠 있는 컨테이너에도 함께 반영돼요.
          </Alert>
          <FormField label="공유 그룹 (선택)" constraintText="같은 연구실·팀 사람들과 파일을 함께 쓰고 싶을 때만 골라요. 잘 모르면 비워 두세요. 고른 그룹은 승인되면 이 계정의 모든 컨테이너에 함께 적용돼요.">
            <Select selectedValue="" onChange={addGroup} options={groupSelectOptions} placeholder="공유 그룹 선택" />
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
          <FormField label="새 공유 그룹 만들기 (선택)" errorText={groupCreateError} constraintText="목록에 우리 팀 그룹이 없을 때만 만들어요. 영어 소문자로 시작하고 소문자·숫자·밑줄(_)·하이픈(-)만, 32자 이내로 적어요. 예: vision-lab, nlp_team">
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
          <FormField label="추가 포트 (선택)" errorText={portError} constraintText="SSH(22)와 JupyterLab(8888)은 자동으로 열려요. 그 밖에 웹으로 볼 프로그램이 있을 때만 추가하세요. 잘 모르면 비워 두세요. 예: 6006 + TensorBoard">
            <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) auto", gap: "var(--decs-space-xs)" }}>
              <Input value={portNumber} onChange={(value) => { setPortNumber(value); setPortError(null); }} type="number" placeholder="예: 6006" invalid={!!portError} />
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
      description: "아래 내용으로 신청할게요.",
      content: (
        <Container header={<Header variant="h2">신청 내용</Header>}>
          <KeyValuePairs columns={2} items={[
            { label: "사용 목적", value: purpose.trim() || "—" },
            { label: "서버", value: selectedServer || "—" },
            { label: "GPU", value: (filteredGpuOptions.find((o) => o.id === gpu[0]?.id) || {}).title || "—" },
            { label: "사용 만료일", value: expiresDate || "—" },
            { label: "개발 환경", value: envOptions.find((o) => o.value === env)?.label ?? env },
            { label: "Ubuntu 사용자명", value: accountUsername || "—" },
            { label: "SSH 비밀번호", value: "로그인 비밀번호와 같음" },
            { label: "공유 그룹", value: selectedGroups.length > 0 ? selectedGroups.map((g) => g.label).join(", ") : "—" },
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
      setError(`필수 신청 정보를 확인해주세요: ${missingFields.join(", ") || "사용 기간"}`);
      return undefined;
    }

    const payload = {
      purpose: purposeText,
      usagePurpose: purposeText,
      gpu: selectedGpu.id,
      expiresAt: `${expiresDate}T23:59:59`,
      env,
      ubuntuGids: selectedGroups.map((g) => g.value),
      portRequests,
    };

    if (onSubmitProp) {
      setSubmitting(true);
      return Promise.resolve(onSubmitProp(payload))
        .then((success) => { if (success !== false) setDone(true); })
        .catch((submitError) => setError(submitError.message || "신청에 실패했습니다."))
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
        header="클러스터 배정 안내"
        footer={<Button variant="primary" onClick={() => { setStep(clusterNoticeStep); setClusterNoticeStep(null); }}>확인</Button>}
      >
        이미 많은 사용자가 선택한 클러스터를 이용 중이라면, 관리자 승인 과정에서 사용 목적을 검토해 다른 클러스터로 배정될 수 있습니다.
      </Modal>
    </div>
  );
}
export default RequestWizard;
