// RequestWizard — 사용 목적 → GPU → 기간 → 개발 환경 → 확인 (Wizard + 고급설정 ExpandableSection)
import React from "react";
import { Wizard, Cards, FormField, Select, Input, ExpandableSection, KeyValuePairs, Alert, Container, Header, StatusIndicator, Button } from "../../../design-system";

function RequestWizard({ onCancel, onDone, gpuOptions: gpuOptionsProp, envOptions: envOptionsProp, onSubmit: onSubmitProp }) {
  const [step, setStep] = React.useState(0);
  const [purpose, setPurpose] = React.useState([]);
  const [gpu, setGpu] = React.useState([]);
  const [period, setPeriod] = React.useState("14");
  const [env, setEnv] = React.useState("");
  const [ubuntuUsername, setUbuntuUsername] = React.useState("");
  const [ubuntuPassword, setUbuntuPassword] = React.useState("");
  const [volumeSizeGiB, setVolumeSizeGiB] = React.useState("20");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [envErrors, setEnvErrors] = React.useState({});

  const purposeOptions = [
    { id: "basic", title: "기본 실험용", desc: "간단한 코드 검증과 소규모 실험" },
    { id: "train", title: "대용량 모델 학습용", desc: "큰 배치와 오랜 학습 시간이 필요해요" },
    { id: "infer", title: "추론 서버용", desc: "모델을 띄워 요청을 처리해요" },
  ];
  const gpuOptions = React.useMemo(() => gpuOptionsProp ?? [], [gpuOptionsProp]);
  const envOptions = React.useMemo(() => envOptionsProp ?? [], [envOptionsProp]);
  const ubuntuUsernamePattern = /^[a-z][a-z0-9_-]{2,49}$/;
  const ubuntuUsernameFormatError = ubuntuUsername && !ubuntuUsernamePattern.test(ubuntuUsername)
    ? "소문자로 시작하고 소문자·숫자·_·-만 사용해 3~50자로 입력해주세요."
    : null;
  const ubuntuPasswordLengthError = ubuntuPassword && ubuntuPassword.length < 8
    ? "비밀번호는 8자 이상 입력해주세요."
    : null;
  const ubuntuUsernameError = envErrors.ubuntuUsername || ubuntuUsernameFormatError;
  const ubuntuPasswordError = envErrors.ubuntuPassword || ubuntuPasswordLengthError;

  React.useEffect(() => {
    if (!env && envOptions.length > 0) setEnv(String(envOptions[0].value));
  }, [env, envOptions]);

  function validateDevelopmentStep() {
    const nextErrors = {};
    if (!ubuntuUsername) {
      nextErrors.ubuntuUsername = "Ubuntu 사용자명을 입력해주세요.";
    } else if (!ubuntuUsernamePattern.test(ubuntuUsername)) {
      nextErrors.ubuntuUsername = "소문자로 시작하고 소문자·숫자·_·-만 사용해 3~50자로 입력해주세요.";
    }
    if (!ubuntuPassword) {
      nextErrors.ubuntuPassword = "Ubuntu 비밀번호를 입력해주세요.";
    } else if (ubuntuPassword.length < 8) {
      nextErrors.ubuntuPassword = "비밀번호는 8자 이상 입력해주세요.";
    }
    setEnvErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNavigate(nextStep) {
    setError(null);
    if (step === 3 && nextStep > step && !validateDevelopmentStep()) return;
    setStep(nextStep);
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
          </p>
          <Button variant="primary" onClick={onDone}>신청 현황으로 가기</Button>
        </div>
      </Container>
    );
  }

  const steps = [
    {
      title: "사용 목적",
      description: "어떤 작업에 GPU를 사용하실 계획인가요? 목적에 맞춰 적절한 설정을 추천해 드려요.",
      content: <Cards columns={3} selectionType="single" trackBy="id" selectedItems={purpose} onSelectionChange={setPurpose}
        items={purposeOptions} cardDefinition={{ header: (o) => o.title, sections: [{ id: "d", content: (o) => o.desc }] }} />,
    },
    {
      title: "GPU 선택",
      description: "필요한 성능을 골라 주세요.",
      content: gpuOptions.length > 0 ? <Cards columns={2} selectionType="single" trackBy="id" selectedItems={gpu} onSelectionChange={setGpu}
        items={gpuOptions} cardDefinition={{ header: (o) => o.title, sections: [{ id: "d", content: (o) => o.desc }, { id: "m", header: "메모리", content: (o) => o.memory }] }} /> : <Alert type="info">신청 가능한 GPU 목록이 없습니다.</Alert>,
    },
    {
      title: "사용 기간",
      description: "얼마 동안 사용하실 계획인가요? 만료 전에 언제든 연장할 수 있어요.",
      content: (
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label="사용 기간">
            <Select selectedValue={period} onChange={setPeriod} options={[
              { value: "7", label: "7일" }, { value: "14", label: "14일 (권장)" }, { value: "30", label: "30일" },
            ]} />
          </FormField>
          <Alert type="info">기본 실험은 14일이면 충분한 경우가 많아요. 길게 잡을수록 승인이 늦어질 수 있어요.</Alert>
        </div>
      ),
    },
    {
      title: "개발 환경",
      description: "자주 쓰는 환경을 미리 준비해 드려요. 세부 설정은 필요할 때만 열어 보세요.",
      content: (
        <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label="기본 환경 (이미지)">
            <Select selectedValue={env} onChange={setEnv} options={envOptions} />
          </FormField>
          <FormField label="Ubuntu 사용자명 (필수)" errorText={ubuntuUsernameError}>
            <Input
              value={ubuntuUsername}
              onChange={(value) => { setUbuntuUsername(value); setEnvErrors((prev) => ({ ...prev, ubuntuUsername: null })); }}
              placeholder="소문자·숫자, 3~50자 (SSH 로그인 계정)"
              invalid={!!ubuntuUsernameError}
            />
          </FormField>
          <FormField label="Ubuntu 비밀번호 (필수)" errorText={ubuntuPasswordError}>
            <Input
              value={ubuntuPassword}
              onChange={(value) => { setUbuntuPassword(value); setEnvErrors((prev) => ({ ...prev, ubuntuPassword: null })); }}
              placeholder="SSH 접속에 사용할 비밀번호"
              type="password"
              invalid={!!ubuntuPasswordError}
            />
          </FormField>
          <ExpandableSection headerText="고급 설정 보기" variant="container">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)", paddingTop: 4 }}>
              <FormField label="저장공간 (GiB)">
                <Input value={volumeSizeGiB} onChange={setVolumeSizeGiB} type="number" />
              </FormField>
            </div>
          </ExpandableSection>
        </div>
      ),
    },
    {
      title: "확인",
      description: "아래 내용으로 신청할게요.",
      content: (
        <Container header={<Header variant="h2">신청 내용</Header>}>
          <KeyValuePairs columns={2} items={[
            { label: "사용 목적", value: (purposeOptions.find((o) => o.id === purpose[0]?.id) || {}).title || "기본 실험용" },
            { label: "GPU", value: (gpuOptions.find((o) => o.id === gpu[0]?.id) || {}).title || "—" },
            { label: "사용 기간", value: period + "일" },
            { label: "개발 환경", value: envOptions.find((o) => o.value === env)?.label ?? env },
            { label: "Ubuntu 사용자명", value: ubuntuUsername || <span style={{ color: "var(--decs-status-warning)", fontWeight: 700 }}>미입력</span> },
            { label: "저장공간", value: `${volumeSizeGiB || "—"} GiB` },
          ]} />
        </Container>
      ),
    },
  ];

  function submit() {
    const selectedPurpose = purposeOptions.find((o) => o.id === purpose[0]?.id);
    const selectedGpu = gpu[0];
    const missingFields = [
      !selectedPurpose ? "사용 목적" : null,
      !selectedGpu ? "GPU" : null,
      !env ? "개발 환경" : null,
      !ubuntuUsername ? "Ubuntu 사용자명" : null,
      !ubuntuPassword ? "Ubuntu 비밀번호" : null,
      !volumeSizeGiB ? "저장공간" : null,
    ].filter(Boolean);
    const developmentValid = validateDevelopmentStep();
    if (missingFields.length > 0 || !developmentValid) {
      setError(`필수 신청 정보를 확인해주세요: ${missingFields.join(", ") || "Ubuntu 계정 정보"}`);
      return undefined;
    }

    const payload = {
      purpose: selectedPurpose.id,
      usagePurpose: selectedPurpose.title,
      gpu: selectedGpu.id,
      period,
      env,
      ubuntuUsername,
      ubuntuPassword,
      volumeSizeGiB,
    };

    if (onSubmitProp) {
      setSubmitting(true);
      return Promise.resolve(onSubmitProp(payload)).then(() => setDone(true)).finally(() => setSubmitting(false));
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
    </div>
  );
}
export default RequestWizard;
