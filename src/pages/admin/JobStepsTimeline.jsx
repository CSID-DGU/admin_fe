import { useCallback, useEffect, useState } from "react";
import { Button, StatusIndicator } from "../../design-system";
import { requestService } from "../../services/requestService";

// 신청의 생성·회수 작업 단계 기록. 진행 배너는 현재 단계 하나만 보이고 작업은 수 초 만에 끝나므로,
// 어떤 단계를 거쳤는지는 여기서 확인한다. 기록 원본은 config-server 작업 이력이고 admin_be 관리자
// API로만 받는다(접근 시험 근거에 내부 정보가 섞일 수 있어 config-server가 요약만 준다).

const ACTION_LABELS = {
  CREATE_ACCOUNT: "계정 생성",
  CREATE_HOME: "홈 디렉터리 생성",
  CREATE_KRB5_PRINCIPAL: "Kerberos 계정 생성",
  FETCH_USER_CONFIG: "사용자 설정 조회",
  SELECT_NODE: "노드 선택",
  ALLOCATE_NODEPORT: "접속 포트 할당",
  DEPLOY_KRB5: "Kerberos 키 배포",
  CREATE_POD_K8S: "컨테이너 생성",
  WAIT_READY: "컨테이너 준비 대기",
  CREATE_SERVICE: "접속 포트 연결",
  DELETE_SERVICE: "접속 포트 해제",
  RELEASE_NODEPORT: "접속 포트 반환",
  DELETE_POD_K8S: "컨테이너 삭제",
  DELETE_ACCOUNT: "계정 삭제",
  DELETE_HOME: "홈 디렉터리 삭제",
  REMOVE_KRB5: "Kerberos 정리",
};

const KIND_LABELS = { provision: "생성 작업", revoke: "회수 작업" };

const PROBE_LABELS = {
  uid: "계정 권한",
  krb5_ticket: "인증 티켓",
  home_io: "홈 디렉터리 사용",
  gpu: "GPU",
  endpoint: "외부 SSH 접속",
  revoked: "컨테이너 접속",
  account_revoked: "계정 접근",
};

// 재시도 행과 DEGRADED 작업에는 단계의 함수 이름이 온다.
const STEP_LABELS = {
  step_create_account: "계정 생성",
  step_create_home: "홈 디렉터리 생성",
  step_create_krb5_principal: "Kerberos 계정 생성",
  step_fetch_user_config: "사용자 설정 조회",
  step_select_node: "노드 선택",
  step_build_pod_spec: "컨테이너 설정 준비",
  step_create_pod_k8s: "컨테이너 생성",
  step_wait_ready: "컨테이너 준비 대기",
  step_create_services: "접속 포트 연결",
  step_delete_services: "접속 포트 해제",
  step_release_nodeports: "접속 포트 반환",
  step_delete_pod_k8s: "컨테이너 삭제",
  step_cleanup_pod_node_krb5: "노드의 Kerberos 키 정리",
  step_check_account_revocable: "계정 회수 가능 여부 확인",
  step_delete_account: "계정 삭제",
  step_remove_krb5: "Kerberos 정리",
  step_verify_uid: "접근 확인: 계정 권한",
  step_verify_krb5: "접근 확인: 인증 티켓",
  step_verify_home_io: "접근 확인: 홈 디렉터리 사용",
  step_verify_gpu: "접근 확인: GPU",
  step_verify_endpoint: "접근 확인: 외부 SSH 접속",
  step_capture_access_targets: "차단 확인 대상 기록",
  step_verify_revoked: "차단 확인: 컨테이너 접속",
  step_verify_account_revoked: "차단 확인: 계정 접근",
};

const PHASE_META = {
  SUCCESS: { type: "success", label: "성공" },
  FAIL: { type: "error", label: "실패" },
  RETRY: { type: "warning", label: "다시 시도" },
  UNKNOWN: { type: "warning", label: "결과 불명" },
  START: { type: "in-progress", label: "진행 중" },
};

const ERROR_LABELS = {
  DEGRADED: "자동 복구 실패, 관리자 확인 필요",
  VERIFY_TOOL_FAILED: "시험 명령 실행 오류",
  USER_CONFIG_NOT_FOUND: "사용자 설정 없음",
  INTERRUPTED: "제어기 재시작으로 중단",
  JOB_INPUT_MISSING: "작업 입력 없음",
  UNEXPECTED_ERROR: "예기치 않은 오류",
  "user not found": "계정 없음",
  ACCOUNT_NODE_UNKNOWN: "계정이 배포된 노드를 모름",
  ACCOUNT_IN_USE: "다른 컨테이너가 계정 사용 중",
};

const REASON_LABELS = {
  RETRIES_EXHAUSTED: "재시도 횟수를 모두 씀",
  OBSERVE_FAILED: "실제 상태를 확인하지 못함",
  UNRESUMABLE_UNKNOWN: "결과를 모르는 단계라 다시 실행하지 않음",
};

const errorLabel = (code) => {
  if (!code) return null;
  if (ERROR_LABELS[code]) return ERROR_LABELS[code];
  if (/^VERIFY_.+_FAILED$/.test(code)) return "시험 통과 못 함";
  return code;
};

const compensationLabel = (value) => {
  if (!value) return null;
  if (value === "account_removed") return "이번 작업이 만든 계정을 되돌림";
  const [kind, code] = String(value).split(":");
  if (kind === "held") return `계정 되돌리기 보류 (${errorLabel(code)})`;
  if (kind === "failed") return `계정 되돌리기 실패 (${errorLabel(code)})`;
  return value;
};

const stepTitle = (s) => {
  if (s.action === "VERIFY_ACCESS") return `접근 확인: ${PROBE_LABELS[s.probe] ?? s.probe}`;
  if (s.action === "VERIFY_REVOKED") return `차단 확인: ${PROBE_LABELS[s.probe] ?? s.probe}`;
  if (s.phase === "RETRY") return `다시 시도: ${STEP_LABELS[s.step] ?? s.step}`;
  if (s.action === "PROVISION" || s.action === "REVOKE") return "작업 종료";
  return ACTION_LABELS[s.action] ?? s.action;
};

// 접근·차단 시험 결과를 한 문장으로. 요약 항목 이름을 그대로 보이면 "읽기·쓰기 예"처럼 뜻이 안 통한다.
const probeSentence = (s, x, ok) => {
  switch (s.probe) {
    case "uid":
      return x.expected_uid != null ? `UID ${x.expected_uid}${ok ? "로 실행됨" : "로 실행되지 않음"}` : null;
    case "krb5_ticket":
      return ok ? "유효한 인증 티켓 있음" : "유효한 인증 티켓 없음";
    case "home_io": {
      const parts = [x.roundtrip ? "홈에 파일 쓰기·읽기 성공" : "홈에 파일 쓰기·읽기 실패"];
      if (!ok && x.owner_uid != null) parts.push(`홈 소유자가 UID ${x.owner_uid}로 보임`);
      if (x.likely_cause) parts.push(x.likely_cause);
      return parts.join(" · ");
    }
    case "gpu":
      if (x.requested == null) return null;
      return `GPU ${x.visible ?? 0}/${x.requested}개 보임${x.node ? ` (${x.node})` : ""}`;
    case "endpoint":
      if (x.connected == null) return null;
      return x.connected ? "SSH 접속됨" : "SSH 접속 거절됨";
    case "revoked":
      if (x.connected == null) return ok ? "접속 차단됨" : "접속이 남아 있음";
      return x.connected ? "아직 접속됨" : "접속 차단됨";
    case "account_revoked":
      return ok ? "계정 접근 차단됨" : "계정 접근이 남아 있음";
    default:
      return null;
  }
};

const endSentence = (x) => [
  x.step ? `멈춘 단계: ${STEP_LABELS[x.step] ?? x.step}` : null,
  x.reason ? REASON_LABELS[x.reason] ?? x.reason : null,
  x.interrupted_after ? `중단 직전 단계: ${STEP_LABELS[x.interrupted_after] ?? x.interrupted_after}` : null,
  compensationLabel(x.compensation),
  x.unknown ? "결과를 알 수 없는 오류였음" : null,
].filter(Boolean).join(" · ");

// 초를 "3분 35초"처럼. 1분 미만은 소수 한 자리까지.
const duration = (sec) => {
  if (sec == null) return null;
  if (sec < 60) return `${Number(sec).toFixed(1)}초`;
  const m = Math.floor(sec / 60);
  const r = Math.round(sec - m * 60);
  return r ? `${m}분 ${r}초` : `${m}분`;
};

// 컨테이너 준비 대기: 오래 걸린 이유(이미지 다운로드, 볼륨 마운트 재시도, 컨테이너 재시작)를 보인다.
const readySentence = (x) => [
  x.image_source === "pulled"
    ? `이미지 새로 받음${x.image_pull_seconds != null ? ` (${duration(x.image_pull_seconds)}${x.image_size_mb ? `, ${(x.image_size_mb / 1024).toFixed(1)}GB` : ""})` : ""}`
    : x.image_source === "cached" ? "노드에 있던 이미지 사용" : null,
  x.mount_retries ? `볼륨 마운트 재시도 ${x.mount_retries}번` : null,
  x.restarts ? `컨테이너 재시작 ${x.restarts}번` : null,
].filter(Boolean).join(" · ");

const stepDetail = (s) => {
  const x = s.summary ?? {};
  const ok = s.phase === "SUCCESS";
  const parts = [];
  if (s.probe) parts.push(probeSentence(s, x, ok));
  else if (s.action === "PROVISION" || s.action === "REVOKE") parts.push(endSentence(x));
  else if (s.action === "WAIT_READY") parts.push(readySentence(x));
  if (s.error_code && !ok) {
    const label = errorLabel(s.error_code);
    // DEGRADED는 작업 결과 줄에서 이미 보인다
    if (!(s.action === "PROVISION" || s.action === "REVOKE") || s.error_code !== "DEGRADED") parts.push(label);
  }
  if (x.rc != null && x.rc !== 0) parts.push(`명령 종료 코드 ${x.rc}`);
  return parts.filter(Boolean).join(" · ");
};

const pad = (n) => String(n).padStart(2, "0");

const clock = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const dateClock = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${clock(iso)}`;
};

const seconds = (fromIso, toIso) => (new Date(toIso) - new Date(fromIso)) / 1000;

const JobBlock = ({ job }) => {
  const meta = PHASE_META[job.phase] ?? PHASE_META.START;
  const took = job.started_at && job.finished_at ? `${seconds(job.started_at, job.finished_at).toFixed(1)}초 걸림` : "진행 중";
  const failure = job.phase !== "SUCCESS" ? errorLabel(job.error_code) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xxs)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)", flexWrap: "wrap" }}>
        <span style={{ fontWeight: "var(--decs-fw-bold)", color: "var(--decs-text-heading)" }}>{KIND_LABELS[job.kind]}</span>
        <StatusIndicator type={meta.type}>{meta.label}</StatusIndicator>
        <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
          {dateClock(job.started_at)} 시작 · {took}
          {failure ? ` · ${failure}` : ""}
        </span>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: "0 0 0 var(--decs-space-l)", display: "flex", flexDirection: "column", gap: "var(--decs-space-xxs)" }}>
        {job.steps.map((s, index) => {
          const stepMeta = PHASE_META[s.phase] ?? PHASE_META.START;
          const detail = stepDetail(s);
          const elapsed = job.started_at && s.at ? seconds(job.started_at, s.at) : null;
          return (
            <li key={`${job.job_id}-${index}`} style={{ display: "flex", alignItems: "baseline", gap: "var(--decs-space-s)", flexWrap: "wrap" }}>
              <span
                title={s.at ? dateClock(s.at) : undefined}
                style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", fontVariantNumeric: "tabular-nums" }}
              >
                {clock(s.at)}
                {elapsed != null ? ` (+${elapsed.toFixed(1)}초)` : ""}
              </span>
              <StatusIndicator type={stepMeta.type}>
                {stepTitle(s)}
                {s.attempt > 1 ? ` · ${s.attempt}번째 시도` : ""}
              </StatusIndicator>
              {detail ? (
                <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>{detail}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const JobStepsTimeline = ({ requestId }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // admin_be가 아직 작업 기록 API를 제공하지 않는 환경(옛 동기 승인 경로)에서는 404가 온다.
  // 그때는 오류로 보이지 않게 이 영역을 통째로 숨긴다.
  const [unsupported, setUnsupported] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await requestService.getJobSteps(requestId);
      setHistory(res?.data?.data ?? null);
    } catch (error) {
      if (error?.response?.status === 404) setUnsupported(true);
      else setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    setHistory(null);
    load();
  }, [load]);

  // 생성·회수를 한 목록으로 합쳐 시작 시각 오름차순(오래된 작업이 위)으로 보여 준다.
  const jobs = history
    ? [
        ...(history.provision?.jobs ?? []).map((job) => ({ ...job, kind: "provision" })),
        ...(history.revoke?.jobs ?? []).map((job) => ({ ...job, kind: "revoke" })),
      ].sort((a, b) => new Date(a.started_at ?? 0) - new Date(b.started_at ?? 0))
    : [];

  if (unsupported) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)", marginTop: "var(--decs-space-m)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--decs-space-s)" }}>
        <span style={{ color: "var(--decs-text-inactive)" }}>작업 단계 기록</span>
        <Button variant="normal" iconName="arrow-path" loading={loading} onClick={load}>
          새로고침
        </Button>
      </div>
      {failed ? <StatusIndicator type="error">작업 기록을 불러오지 못했습니다.</StatusIndicator> : null}
      {!failed && !history && loading ? <StatusIndicator type="loading">작업 기록을 불러오는 중...</StatusIndicator> : null}
      {history && jobs.length === 0 ? <StatusIndicator type="info">아직 실행된 생성·회수 작업이 없습니다.</StatusIndicator> : null}
      {jobs.map((job) => (
        <JobBlock key={`${job.kind}-${job.job_id}`} job={job} />
      ))}
    </div>
  );
};
