// RequestWizard — 사용 목적 → GPU → 기간 → 개발 환경 → 확인 (Wizard + 고급설정 ExpandableSection)
import React from "react";
import { Wizard, Cards, FormField, Select, Input, ExpandableSection, KeyValuePairs, Alert, Container, Header, StatusIndicator, Button } from "../../../design-system";

const DEFAULT_GPU_OPTIONS = [
  { id: "a100-1", title: "A100 40GB", desc: "대부분의 실험에 충분", memory: "40 GB" },
  { id: "h100-2", title: "H100 80GB × 2", desc: "대용량 학습에 권장", memory: "160 GB" },
];

const DEFAULT_ENV_OPTIONS = [
  { value: "pytorch", label: "PyTorch 2.3 (CUDA 12.1)", description: "가장 많이 쓰는 환경" },
  { value: "tf", label: "TensorFlow 2.16" },
  { value: "plain", label: "Ubuntu 22.04 (빈 환경)" },
];

function RequestWizard({ onCancel, onDone, gpuOptions: gpuOptionsProp, envOptions: envOptionsProp, onSubmit: onSubmitProp }) {
  const [step, setStep] = React.useState(0);
  const [purpose, setPurpose] = React.useState([]);
  const [gpu, setGpu] = React.useState([]);
  const [period, setPeriod] = React.useState("14");
  const [env, setEnv] = React.useState("pytorch");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const purposeOptions = [
    { id: "basic", title: "기본 실험용", desc: "간단한 코드 검증과 소규모 실험" },
    { id: "train", title: "대용량 모델 학습용", desc: "큰 배치와 오랜 학습 시간이 필요해요" },
    { id: "infer", title: "추론 서버용", desc: "모델을 띄워 요청을 처리해요" },
  ];
  const gpuOptions = gpuOptionsProp ?? DEFAULT_GPU_OPTIONS;
  const envOptions = envOptionsProp ?? DEFAULT_ENV_OPTIONS;

  if (done) {
    return (
      <Container>
        <div style={{ textAlign: "center", padding: "var(--decs-space-xxl) var(--decs-space-l)" }}>
          <div style={{ color: "var(--decs-status-success)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <StatusIndicator type="success"><span style={{ fontSize: 18, fontWeight: 700 }}>신청이 접수되었어요</span></StatusIndicator>
          </div>
          <p style={{ color: "var(--decs-text-secondary)", fontSize: 15, maxWidth: 420, margin: "0 auto 20px" }}>
            관리자 승인 후 컨테이너를 준비할게요. 준비가 끝나면 대시보드에서 바로 접속할 수 있어요.
          </p>
          <Button variant="primary" onClick={onDone}>대시보드로 가기</Button>
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
      content: <Cards columns={2} selectionType="single" trackBy="id" selectedItems={gpu} onSelectionChange={setGpu}
        items={gpuOptions} cardDefinition={{ header: (o) => o.title, sections: [{ id: "d", content: (o) => o.desc }, { id: "m", header: "메모리", content: (o) => o.memory }] }} />,
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
          <ExpandableSection headerText="고급 설정 보기" variant="container">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)", paddingTop: 4 }}>
              <FormField label="CPU / Memory Limit" constraintText="비워 두면 기본값이 적용돼요">
                <Input value="16 vCPU · 128 GiB" onChange={() => {}} />
              </FormField>
              <FormField label="저장공간 (PVC)"><Input value="200 GiB" onChange={() => {}} /></FormField>
              <FormField label="포트 포워딩" constraintText="예: 8888 (Jupyter)"><Input value="8888" onChange={() => {}} /></FormField>
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
            { label: "GPU", value: (gpuOptions.find((o) => o.id === gpu[0]?.id) || {}).title || "A100 40GB" },
            { label: "사용 기간", value: period + "일" },
            { label: "개발 환경", value: envOptions.find((o) => o.value === env)?.label ?? env },
          ]} />
        </Container>
      ),
    },
  ];

  function submit() {
    if (onSubmitProp) {
      setSubmitting(true);
      return Promise.resolve(onSubmitProp({ purpose: purpose[0]?.id, gpu: gpu[0]?.id, period, env })).then(() => setDone(true)).finally(() => setSubmitting(false));
    }
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setDone(true); }, 1100);
  }

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 20px", fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>GPU 신청</h1>
      <Container>
        <Wizard steps={steps} activeStepIndex={step} onNavigate={setStep} onCancel={onCancel} onSubmit={submit} submitLabel="신청하기" isLoadingNextStep={submitting} />
      </Container>
    </div>
  );
}
export default RequestWizard;
