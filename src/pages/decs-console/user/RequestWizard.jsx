// RequestWizard — 사용 목적 → 서버 선택 → GPU → 기간 → 개발 환경 → 확인
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Wizard, Modal, Cards, FormField, Select, Input, KeyValuePairs, Alert, Container, Header, StatusIndicator, Button, Badge, Table } from "../../../design-system";
import { requestService } from "../../../services/requestService";
import { toGroupOption } from "../../../utils/groupOption";

const GROUP_NAME_PATTERN = /^[a-z_][a-z0-9_-]*$/;
// BE(SaveRequestRequestDTO.usagePurpose)와 같은 한도. 승인자가 이 글만 보고 판단하므로 최소 길이를 둔다.
const PURPOSE_MIN_LENGTH = 200;
const PURPOSE_MAX_LENGTH = 1000;
// 신청서 폼 응답(formAnswers) 전체가 10,000자로 묶여 있어 한 칸은 짧게 받는다.
const TEAM_INFO_MAX_LENGTH = 300;
// 팀 신청은 순서가 중요하다 — 팀원이 팀장보다 먼저 신청하면 고를 그룹이 없다.
const TEAM_STEPS = [
  { role: "leader", textKey: "wizard.teamStep1" },
  { role: "leader", textKey: "wizard.teamStep2" },
  { role: "member", textKey: "wizard.teamStep3" },
];

function toLocalDateInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function RequestWizard({ onCancel, onDone, gpuOptions: gpuOptionsProp, envOptions: envOptionsProp, groupOptions: groupOptionsProp, onSubmit: onSubmitProp, accountUsername }) {
  const { t } = useTranslation();
  const [step, setStep] = React.useState(0);
  const [purpose, setPurpose] = React.useState("");
  const purposeLength = purpose.trim().length;
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
      setStepErrors((prev) => ({ ...prev, period: t("wizard.errPeriodPast") }));
      return false;
    }
    if (picked > maxDate) {
      setStepErrors((prev) => ({ ...prev, period: t("wizard.errPeriodTooFar") }));
      return false;
    }
    return true;
  }

  function validateStep(nextStep) {
    if (step === 0 && nextStep > step && purposeLength < PURPOSE_MIN_LENGTH) {
      setStepErrors((prev) => ({ ...prev, purpose: t("wizard.purposeCount", { min: PURPOSE_MIN_LENGTH, current: purposeLength }) }));
      return false;
    }
    if (step === 1 && nextStep > step && !selectedServer) {
      setStepErrors((prev) => ({ ...prev, server: t("wizard.errServer") }));
      return false;
    }
    if (step === 2 && nextStep > step && gpu.length === 0) {
      setStepErrors((prev) => ({ ...prev, gpu: t("wizard.errGpu") }));
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
      setGroupCreateError(t("wizard.errGroupName"));
      return;
    }
    setCreatingGroup(true);
    setGroupCreateError(null);
    try {
      // 그룹은 바로 생긴다(gid 없음). 인프라 그룹은 이 그룹을 고른 신청이 승인될 때 만들어진다.
      const res = await requestService.createGroup(groupName);
      const dto = res.data?.data ?? res.data;
      if (dto?.groupId == null) {
        setGroupCreateError(t("wizard.errGroupCreate"));
        return;
      }
      const group = toGroupOption(dto);
      setCreatedGroups((prev) => [...prev, group]);
      setSelectedGroups((prev) => [...prev, group]);
      setNewGroupName("");
    } catch (e) {
      setGroupCreateError(e.message || t("wizard.errGroupCreate"));
    } finally {
      setCreatingGroup(false);
    }
  }

  function addPort() {
    const parsedPort = Number(portNumber);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setPortError(t("wizard.errPortRange"));
      return;
    }
    if ([22, 8888].includes(parsedPort)) {
      setPortError(t("wizard.errPortReserved"));
      return;
    }
    if (portRequests.some((p) => p.internalPort === parsedPort)) {
      setPortError(t("wizard.errPortDuplicate"));
      return;
    }
    setPortRequests((prev) => [...prev, { internalPort: parsedPort, usagePurpose: portPurpose.trim() || t("data.portDefault", { port: parsedPort }) }]);
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
            <StatusIndicator type="success"><span style={{ fontSize: "var(--decs-fs-body-l)", fontWeight: 700 }}>{t("wizard.doneTitle")}</span></StatusIndicator>
          </div>
          <p style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)", maxWidth: 420, margin: "0 auto 20px" }}>
            {t("wizard.doneBody")}
          </p>
          <Button variant="primary" onClick={onDone}>{t("portal.viewRequests")}</Button>
        </div>
      </Container>
    );
  }

  const steps = [
    {
      title: t("wizard.stepPurpose"),
      content: (
        <div style={{ maxWidth: 560 }}>
          <FormField
            label={t("wizard.stepPurpose")}
            description={t("wizard.purposeHelp")}
            errorText={stepErrors.purpose}
            constraintText={(
              <span style={{ color: purposeLength >= PURPOSE_MIN_LENGTH ? "var(--decs-status-success)" : undefined }}>
                {t("wizard.purposeCount", { min: PURPOSE_MIN_LENGTH, current: purposeLength })}
              </span>
            )}
          >
            <textarea
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value); setStepErrors((prev) => ({ ...prev, purpose: null })); }}
              rows={6}
              maxLength={PURPOSE_MAX_LENGTH}
              placeholder={t("wizard.purposeExample")}
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
      title: t("wizard.stepServer"),
      description: t("wizard.stepServerDesc"),
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
      ) : <Alert type="info">{t("wizard.noServer")}</Alert>,
    },
    {
      title: t("wizard.stepGpu"),
      description: t("wizard.stepGpuDesc"),
      content: filteredGpuOptions.length > 0 ? (
        <FormField errorText={stepErrors.gpu}>
          <Cards columns={2} selectionType="single" trackBy="id" selectedItems={gpu}
            onSelectionChange={(items) => { setGpu(items); setStepErrors((prev) => ({ ...prev, gpu: null })); }}
            items={filteredGpuOptions} cardDefinition={{ header: (o) => o.title, sections: [{ id: "d", content: (o) => o.desc }, { id: "m", header: t("wizard.memory"), content: (o) => o.memory }] }} />
        </FormField>
      ) : <Alert type="info">{t("wizard.noGpu")}</Alert>,
    },
    {
      title: t("wizard.stepPeriod"),
      description: t("wizard.stepPeriodDesc"),
      content: (
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label={t("wizard.endDate")} errorText={stepErrors.period} constraintText={t("wizard.endDateHelp")}>
            <Input
              value={expiresDate}
              onChange={(value) => { setExpiresDate(value); setStepErrors((prev) => ({ ...prev, period: null })); }}
              type="date"
              invalid={!!stepErrors.period}
            />
          </FormField>
          <Alert type="info">{t("wizard.periodTip")}</Alert>
        </div>
      ),
    },
    {
      title: t("wizard.stepEnv"),
      description: t("wizard.stepEnvDesc"),
      content: (
        <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          <FormField label={t("wizard.stepEnv")} constraintText={t("wizard.envHelp")}>
            <Select selectedValue={env} onChange={setEnv} options={envOptions} />
          </FormField>
          <FormField label={t("wizard.serverId")} constraintText={t("wizard.serverIdHelp")}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-xs)", minHeight: 32 }}>
              <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>{t("wizard.ownAccount")}</span>
              {accountUsername
                ? <Badge color="grey">{accountUsername}</Badge>
                : <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-m)" }}>—</span>}
            </div>
          </FormField>
          <Alert type="info" header={t("wizard.passwordSameTitle")}>
            {t("wizard.passwordSameBody")}
          </Alert>
          <Alert type="info" header={t("wizard.teamTitle")}>
            <ol style={{ listStyle: "none", margin: "var(--decs-space-xs) 0", padding: 0, display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)" }}>
              {TEAM_STEPS.map((step, i) => (
                <li key={step.textKey} style={{ display: "flex", alignItems: "baseline", gap: "var(--decs-space-xs)" }}>
                  <span style={{ fontWeight: "var(--decs-fw-bold)", minWidth: "1.2em" }}>{i + 1}.</span>
                  <Badge color={step.role === "leader" ? "blue" : "green"} style={{ flexShrink: 0 }}>{t(step.role === "leader" ? "wizard.roleLeader" : "wizard.roleMember")}</Badge>
                  <span>{t(step.textKey)}</span>
                </li>
              ))}
            </ol>
            <Trans i18nKey="wizard.teamNote" components={{ b: <b /> }} />
          </Alert>
          <FormField label={t("wizard.sharedGroupOptional")} constraintText={t("wizard.sharedGroupHelp")}>
            <Select selectedValue="" onChange={addGroup} options={groupSelectOptions} placeholder={t("wizard.pickGroup")} />
            {selectedGroups.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xs)" }}>
                {selectedGroups.map((group) => (
                  <span key={group.value} style={{ display: "inline-flex", alignItems: "center", gap: "var(--decs-space-xxxs)" }}>
                    <Badge color="blue">{group.label}</Badge>
                    <Button variant="icon" iconName="x-mark" onClick={() => removeGroup(group.value)} ariaLabel={t("wizard.removeGroupAria", { name: group.label })} />
                  </span>
                ))}
              </div>
            ) : null}
          </FormField>
          <FormField label={t("wizard.newGroup")} errorText={groupCreateError} constraintText={t("wizard.newGroupHelp")}>
            <div style={{ display: "flex", gap: "var(--decs-space-xs)" }}>
              <Input
                value={newGroupName}
                onChange={(value) => { setNewGroupName(value); setGroupCreateError(null); }}
                placeholder={t("wizard.newGroupPlaceholder")}
                invalid={!!groupCreateError}
                style={{ flex: 1 }}
              />
              <Button onClick={createNewGroup} disabled={!newGroupName.trim() || creatingGroup} loading={creatingGroup} ariaLabel={t("wizard.newGroupAria")}>{t("wizard.createNew")}</Button>
            </div>
          </FormField>
          <FormField label={t("wizard.teamInfoLabel")} constraintText={t("wizard.teamInfoHelp")}>
            <Input
              value={teamInfo}
              onChange={(value) => setTeamInfo(value.slice(0, TEAM_INFO_MAX_LENGTH))}
              placeholder={t("wizard.teamInfoPlaceholder")}
              ariaLabel={t("wizard.teamInfo")}
            />
          </FormField>
          <FormField label={t("wizard.extraPortsOptional")} errorText={portError} constraintText={t("wizard.extraPortsHelp")}>
            <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) auto", gap: "var(--decs-space-xs)" }}>
              <Input value={portNumber} onChange={(value) => { setPortNumber(value); setPortError(null); }} type="number" min={1} max={65535} step={1} placeholder={t("wizard.portPlaceholder")} invalid={!!portError} />
              <Input value={portPurpose} onChange={setPortPurpose} placeholder={t("wizard.portPurposePlaceholder")} />
              <Button iconName="plus" onClick={addPort} ariaLabel={t("wizard.addPortAria")}>{t("common.add")}</Button>
            </div>
            {portRequests.length > 0 ? (
              <Table
                density="compact"
                trackBy="internalPort"
                items={portRequests}
                style={{ marginTop: "var(--decs-space-xs)" }}
                columns={[
                  { id: "port", header: t("wizard.port"), cell: (p) => p.internalPort },
                  { id: "purpose", header: t("wizard.portPurpose"), cell: (p) => p.usagePurpose },
                  { id: "remove", header: "", width: 60, cell: (p) => <Button variant="icon" iconName="trash" onClick={() => removePort(p.internalPort)} ariaLabel={t("wizard.removePortAria", { port: p.internalPort })} /> },
                ]}
              />
            ) : null}
          </FormField>
        </div>
      ),
    },
    {
      title: t("wizard.stepReview"),
      description: t("wizard.stepReviewDesc"),
      content: (
        <Container header={<Header variant="h2">{t("wizard.reviewTitle")}</Header>}>
          <KeyValuePairs columns={2} items={[
            { label: t("wizard.stepPurpose"), value: purpose.trim() || "—", fullWidth: true, multiline: true },
            { label: t("wizard.server"), value: selectedServer || "—" },
            { label: "GPU", value: (filteredGpuOptions.find((o) => o.id === gpu[0]?.id) || {}).title || "—" },
            { label: t("wizard.endDate"), value: expiresDate || "—" },
            { label: t("wizard.stepEnv"), value: envOptions.find((o) => o.value === env)?.label ?? env },
            { label: t("wizard.serverId"), value: accountUsername || "—" },
            { label: t("wizard.serverPassword"), value: t("wizard.passwordSameShort") },
            { label: t("wizard.sharedGroup"), value: selectedGroups.length > 0 ? selectedGroups.map((g) => g.label).join(", ") : "—" },
            { label: t("wizard.teamInfo"), value: teamInfo.trim() || "—" },
            { label: t("wizard.extraPorts"), value: portRequests.length > 0 ? portRequests.map((p) => `${p.internalPort} (${p.usagePurpose})`).join(", ") : "—" },
          ]} />
        </Container>
      ),
    },
  ];

  function submit() {
    const purposeText = purpose.trim();
    const selectedGpu = gpu[0];
    const missingFields = [
      purposeText.length < PURPOSE_MIN_LENGTH ? t("wizard.missingPurpose", { min: PURPOSE_MIN_LENGTH }) : null,
      !selectedServer ? t("wizard.server") : null,
      !selectedGpu ? "GPU" : null,
      !env ? t("wizard.stepEnv") : null,
    ].filter(Boolean);
    const periodValid = validatePeriod();
    if (missingFields.length > 0 || !periodValid) {
      setError(t("wizard.errMissing", { fields: missingFields.join(", ") || t("wizard.endDate") }));
      return undefined;
    }

    const payload = {
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
        .catch((submitError) => setError(submitError.message || t("wizard.errSubmit")))
        .finally(() => setSubmitting(false));
    }
    setDone(true);
  }

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <Header variant="h1">{t("wizard.title")}</Header>
      {error ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Alert type="error">{error}</Alert></div> : null}
      <Container>
        <Wizard steps={steps} activeStepIndex={step} onNavigate={handleNavigate} onCancel={onCancel} onSubmit={submit} submitLabel={t("wizard.submit")} isLoadingNextStep={submitting} />
      </Container>
      <Modal
        visible={clusterNoticeStep !== null}
        onDismiss={() => setClusterNoticeStep(null)}
        header={t("wizard.clusterNoticeTitle")}
        footer={<Button variant="primary" onClick={() => { setStep(clusterNoticeStep); setClusterNoticeStep(null); }}>{t("common.confirm")}</Button>}
      >
        {t("wizard.clusterNoticeBody")}
      </Modal>
    </div>
  );
}
export default RequestWizard;
