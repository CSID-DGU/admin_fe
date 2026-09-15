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
  PROVISION: "생성 작업",
  REVOKE: "회수 작업",
};

const PROBE_LABELS = {
  uid: "계정 권한",
  krb5_ticket: "인증 티켓",
  home_io: "홈 읽기·쓰기",
  gpu: "GPU",
  endpoint: "외부 SSH 접속",
  revoked: "컨테이너 접속",
  account_revoked: "계정 접근",
};

// 재시도 행에는 다시 돌린 단계의 함수 이름이 온다.
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
  step_cleanup_pod_node_krb5: "노드 Kerberos 키 정리",
  step_check_account_revocable: "계정 회수 가능 확인",
  step_delete_account: "계정 삭제",
  step_remove_krb5: "Kerberos 정리",
  step_verify_uid: "접근 확인: 계정 권한",
  step_verify_krb5: "접근 확인: 인증 티켓",
  step_verify_home_io: "접근 확인: 홈 읽기·쓰기",
  step_verify_gpu: "접근 확인: GPU",
  step_verify_endpoint: "접근 확인: 외부 SSH 접속",
  step_capture_access_targets: "차단 확인 대상 기록",
  step_verify_revoked: "차단 확인: 컨테이너 접속",
  step_verify_account_revoked: "차단 확인: 계정 접근",
};

const PHASE_META = {
  SUCCESS: { type: "success", label: "성공" },
  FAIL: { type: "error", label: "실패" },
  RETRY: { type: "warning", label: "재시도" },
  UNKNOWN: { type: "warning", label: "결과 불명" },
  START: { type: "in-progress", label: "진행 중" },
};

const SUMMARY_LABELS = {
  expected_uid: "기대 UID",
  requested: "요청 GPU",
  visible: "보이는 GPU",
  node: "노드",
  placed_in_candidates: "후보 노드에 배치",
  roundtrip: "읽기·쓰기",
  owner_uid: "홈 소유자 UID",
  connected: "연결",
  reason: "사유",
  likely_cause: "원인 후보",
  step: "멈춘 단계",
  compensation: "뒷정리",
  interrupted_after: "중단 직전 단계",
  unknown: "결과 불명",
  degraded: "관리자 확인 필요",
  rc: "종료 코드",
};

const stepLabel = (s) => {
  if (s.action === "VERIFY_ACCESS") return `접근 확인: ${PROBE_LABELS[s.probe] ?? s.probe}`;
  if (s.action === "VERIFY_REVOKED") return `차단 확인: ${PROBE_LABELS[s.probe] ?? s.probe}`;
  if (s.phase === "RETRY") return `다시 시도: ${STEP_LABELS[s.step] ?? s.step}`;
  if (s.action === "PROVISION" || s.action === "REVOKE") return `${ACTION_LABELS[s.action]} 종료`;
  return ACTION_LABELS[s.action] ?? s.action;
};

const summaryText = (s) => {
  const parts = Object.entries(s.summary ?? {}).map(([key, value]) => {
    const shown = typeof value === "boolean" ? (value ? "예" : "아니오") : STEP_LABELS[value] ?? value;
    return `${SUMMARY_LABELS[key] ?? key} ${shown}`;
  });
  if (s.error_code && s.phase !== "SUCCESS") parts.unshift(`오류 ${s.error_code}`);
  return parts.join(" · ");
};

const formatTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("ko-KR", { hour12: false });
  return `${time}.${String(d.getMilliseconds()).padStart(3, "0").slice(0, 1)}`;
};

const durationText = (job) => {
  if (!job.started_at || !job.finished_at) return null;
  const sec = (new Date(job.finished_at) - new Date(job.started_at)) / 1000;
  return `${sec.toFixed(1)}초`;
};

const JobBlock = ({ job }) => {
  const meta = PHASE_META[job.phase] ?? PHASE_META.START;
  const duration = durationText(job);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xxs)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)", flexWrap: "wrap" }}>
        <StatusIndicator type={meta.type}>{meta.label}</StatusIndicator>
        <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
          작업 #{job.job_id} · 시작 {formatTime(job.started_at)}
          {duration ? ` · ${duration}` : ""}
          {job.error_code ? ` · ${job.error_code}` : ""}
        </span>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: "0 0 0 var(--decs-space-l)", display: "flex", flexDirection: "column", gap: "var(--decs-space-xxs)" }}>
        {job.steps.map((s, index) => {
          const stepMeta = PHASE_META[s.phase] ?? PHASE_META.START;
          const summary = summaryText(s);
          return (
            <li key={`${job.job_id}-${index}`} style={{ display: "flex", alignItems: "baseline", gap: "var(--decs-space-s)", flexWrap: "wrap" }}>
              <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", fontVariantNumeric: "tabular-nums" }}>
                {formatTime(s.at)}
              </span>
              <StatusIndicator type={stepMeta.type}>
                {stepLabel(s)}
                {s.attempt > 1 ? ` (시도 ${s.attempt})` : ""}
              </StatusIndicator>
              {summary ? (
                <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>{summary}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const KindSection = ({ title, steps }) => {
  const jobs = steps?.jobs ?? [];
  if (jobs.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
      <div style={{ color: "var(--decs-text-inactive)" }}>{title}</div>
      {jobs.map((job) => (
        <JobBlock key={job.job_id} job={job} />
      ))}
    </div>
  );
};

export const JobStepsTimeline = ({ requestId }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await requestService.getJobSteps(requestId);
      setHistory(res?.data?.data ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    setHistory(null);
    load();
  }, [load]);

  const empty = history && !(history.provision?.jobs?.length || history.revoke?.jobs?.length);

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
      {empty ? <StatusIndicator type="info">아직 실행된 생성·회수 작업이 없습니다.</StatusIndicator> : null}
      {history ? (
        <>
          <KindSection title="생성 작업 (승인)" steps={history.provision} />
          <KindSection title="회수 작업 (만료·삭제)" steps={history.revoke} />
        </>
      ) : null}
    </div>
  );
};
