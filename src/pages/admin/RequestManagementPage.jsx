import { useState, useEffect, useRef } from "react";
import {
  Container,
  Header,
  Table,
  Tabs,
  Button,
  Modal,
  Flashbar,
  Alert,
  StatusIndicator,
  Badge,
  KeyValuePairs,
  FormField,
  Input,
  Select,
} from "../../design-system";

const PAGE_BATCH_SIZE = 20;
const PERIOD_OPTIONS = [
  { value: "1M", label: "최근 1개월", months: 1 },
  { value: "3M", label: "최근 3개월", months: 3 },
  { value: "6M", label: "최근 6개월", months: 6 },
  { value: "ALL", label: "전체 기간", months: null },
];
import { requestService } from "../../services/requestService";
import { podService } from "../../services/podService";
import { mapRequestDtoToUiModel } from "../../utils/requestMapper";

const STATUS_META = {
  PENDING: { type: "pending", label: "대기중" },
  PROCESSING: { type: "in-progress", label: "처리중" },
  FULFILLED: { type: "success", label: "승인됨" },
  DENIED: { type: "error", label: "거절됨" },
  MIGRATING: { type: "in-progress", label: "마이그레이션 중" },
  EXPIRING: { type: "in-progress", label: "만료 처리 중" },
  DELETED: { type: "stopped", label: "삭제됨" },
};

// 탭/카운트를 이 목록 하나로 유도해, 신규 상태값이 추가돼도 여기 한 곳만 고치면
// 목록 어딘가에서 행이 조용히 사라지는 일이 없다.
const STATUS_ORDER = Object.keys(STATUS_META);

const renderStatus = (status) => {
  const meta = STATUS_META[status];
  if (!meta) return <StatusIndicator type="info">{status}</StatusIndicator>;
  return <StatusIndicator type={meta.type}>{meta.label}</StatusIndicator>;
};

const RequestManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // isLoading은 새로고침 버튼 자체의 스피너에도 쓰인다 — 그걸 그대로 페이지 전체를
  // 가리는 조건으로 쓰면, 수동 새로고침이든 승인 후 폴링이 트리거한 백그라운드
  // 새로고침이든 fetchRequests()가 불릴 때마다 화면 전체가 스피너로 바뀌었다가
  // 돌아오며 깜빡인다. 최초 1회 로드에만 페이지 전체를 가리도록 따로 추적한다.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState("PENDING"); // PENDING, FULFILLED, DENIED, DELETED
  const [period, setPeriod] = useState("3M"); // 1M, 3M, 6M, ALL
  const [visibleCount, setVisibleCount] = useState(PAGE_BATCH_SIZE);
  const sentinelRef = useRef(null);
  const [alert, setAlert] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  // 승인 처리 중인 신청의 진행 상황 폴링 키. 한 사용자가 신청을 여러 개 동시에 가질 수
  // 있어(계정은 하나로 통합됐지만 Pod는 여러 개 발급 가능) username이 아니라 requestId로
  // 구분한다 — processingRequestId는 버튼 중복 클릭 방지용이라 응답이 오면 바로 풀리는데,
  // 이 값은 비동기 후처리(Pod 생성)가 끝날 때까지 별도로 살아있어야 해서 상태를 분리했다.
  const [pollingRequestId, setPollingRequestId] = useState(null);
  const [provisioningStatus, setProvisioningStatus] = useState(null);

  // 목록에 PROCESSING 상태인 신청서가 있으면(다른 관리자가 처리 중이거나, 내가 승인 처리
  // 중에 페이지를 나갔다가 새로고침해서 돌아온 경우) processingRequestId가 이번 세션에서
  // 클릭한 적 없어도 그 신청서 기준으로 상태 배너/폴링을 이어간다.
  const processingListRequest = requests.find((r) => r.status === "PROCESSING") || null;

  // 승인 처리 중(Pod 생성 포함)일 때 config-server의 세세한 진행 단계를 폴링해서 보여준다.
  // 조회 실패는 승인 흐름 자체에 영향을 주지 않으므로 조용히 무시한다.
  const provisioningTargetRequestId =
    pollingRequestId || processingListRequest?.request_id || null;

  useEffect(() => {
    if (!provisioningTargetRequestId) {
      setProvisioningStatus(null);
      return;
    }
    let cancelled = false;
    let intervalId = null;
    const poll = async () => {
      try {
        const res = await podService.getProvisioningStatus(provisioningTargetRequestId);
        const data = res?.data ?? null;
        if (cancelled) return;
        if (data) {
          // config-server가 단계 전환 사이에 message를 잠깐 비운 채 응답할 때가 있다.
          // 그대로 반영하면 "(현재 단계: ...)" 문구가 매 폴링(1초)마다 사라졌다
          // 나타나면서 배너 높이가 흔들려 깜빡이는 것처럼 보인다 — message가 없는
          // 응답에서는 직전에 표시하던 값을 그대로 유지한다.
          setProvisioningStatus((prev) => ({ ...data, message: data.message || prev?.message || null }));
        }
        // 승인 후처리는 비동기라 approveRequest() 응답만으로는 실제 완료 여부를 알 수
        // 없다 — config-server가 남기는 stage가 ready(성공)/failed(실패)로 끝나는 걸
        // 폴링으로 확인한 뒤에야 목록을 새로고침하고 최종 결과를 안내한다.
        if (data?.stage === "ready" || data?.stage === "failed") {
          // stage는 ready/failed로 끝난 뒤에도 config-server에 계속 그대로 남아있다.
          // 여기서 멈추지 않으면 다음 폴링(1초 뒤)에도 같은 stage를 또 감지해서
          // fetchRequests()와 배너 갱신이 끝없이 반복되며 화면이 계속 깜빡인다.
          if (intervalId) clearInterval(intervalId);
          setPollingRequestId(null);
          // fetchRequests()는 시작할 때 setAlert(null)로 배너를 지운다. 순서를 안 지키고
          // 아래 setAlert보다 먼저 fetchRequests()를 fire-and-forget으로 부르면, 같은
          // 렌더 사이클에서 배치되면서 방금 세팅한 실패/성공 배너가 곧바로 지워져
          // 화면에는 한 번도 안 뜬 것처럼 보인다 — 반드시 fetchRequests가 끝난 뒤에 세팅한다.
          await fetchRequests();
          setAlert({
            type: data.stage === "ready" ? "success" : "error",
            message:
              data.stage === "ready"
                ? "승인 처리가 완료되었습니다."
                : `승인 처리가 실패했습니다: ${data.message ?? "원인 불명"} — 요청이 대기중 상태로 되돌아갔을 수 있습니다.`,
          });
        }
      } catch {
        // ignore
      }
    };
    poll();
    intervalId = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [provisioningTargetRequestId]);

  const fetchRequests = async () => {
    setIsLoading(true);
    setAlert(null);

    try {
      const response = await requestService.getAllRequests();

      if (response.status === 200) {
        // API 응답 데이터를 기존 UI에 맞게 변환
        // response.data는 서버 응답이고, response.data.data가 실제 배열
        const requestsArray = response.data?.data ?? [];
        const transformedRequests = requestsArray.map(mapRequestDtoToUiModel);

        setRequests(transformedRequests);
        setLastUpdated(new Date());
      } else {
        setAlert({
          type: "error",
          message:
            "신청서 목록을 불러올 수 없습니다. 서버 상태를 확인하시거나 관리자에게 문의해주세요.",
        });
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setAlert({
        type: "error",
        message:
          "신청서 목록 로딩 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하시고 페이지를 새로고침해주세요.",
      });
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const periodCutoff = (() => {
    const months = PERIOD_OPTIONS.find((p) => p.value === period)?.months;
    if (!months) return null;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return cutoff;
  })();

  // 상태 탭 개수는 선택된 기간 내에서 집계 — 기간 필터와 별개로 통계가 헷갈리지 않도록
  const requestsInPeriod = periodCutoff
    ? requests.filter((r) => new Date(r.created_at) >= periodCutoff)
    : requests;

  const filteredRequests = requestsInPeriod
    .filter((request) => request.status === filter)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const statusCounts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, requestsInPeriod.filter((r) => r.status === status).length])
  );

  const hasMore = visibleCount < filteredRequests.length;
  const pageRequests = filteredRequests.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [filter, period]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((count) => Math.min(count + PAGE_BATCH_SIZE, filteredRequests.length));
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredRequests.length]);

  const handleStatusUpdate = async (request, newStatus, comment = "") => {
    if (processingRequestId !== null) return;
    setProcessingRequestId(request.request_id);
    if (newStatus === "FULFILLED") {
      // 같은 신청을 재승인할 때는 provisioningTargetRequestId가 안 바뀌어서
      // 폴링 useEffect가 재실행되지 않는다 — 이전 실패 시도의 진행 단계 메시지가
      // 첫 폴링(2초) 전까지 그대로 남아 보이는 걸 막기 위해 여기서 바로 지운다.
      setProvisioningStatus(null);
      setPollingRequestId(request.request_id);
    }
    let isSubmitSuccess = false;
    try {
      let response;

      if (newStatus === "FULFILLED") {
        // 승인 API 호출
        const approvalData = {
          requestId: request.request_id,
          imageId: request.image_id,
          resourceGroupId: request.rsgroup_id,
          volumeSizeGiB: request.volume_size_GB,
          adminComment: comment,
        };
        response = await requestService.approveRequest(approvalData);
      } else if (newStatus === "DENIED") {
        // 거절 API 호출
        const rejectData = {
          requestId: request.request_id,
          adminComment: comment,
        };
        response = await requestService.rejectRequest(rejectData);
      } else {
        return;
      }

      if (response.status === 200) {
        isSubmitSuccess = true;
        const processedAt = new Date().toISOString();
        // 승인(FULFILLED)은 이제 후처리가 비동기라, 응답이 왔다고 실제로 끝난 게 아니다 —
        // 서버가 돌려준 실제 상태(보통 PROCESSING)를 그대로 반영한다. 최종 완료/실패는
        // provisioningStatus 폴링이 ready/failed를 감지했을 때 별도로 안내한다.
        const actualStatus = newStatus === "FULFILLED"
          ? (response.data?.data?.status ?? response.data?.status ?? "PROCESSING")
          : newStatus;

        setRequests((prev) =>
          prev.map((req) =>
            req.request_id === request.request_id
              ? {
                  ...req,
                  status: actualStatus,
                  admin_comment: comment,
                  updated_at: processedAt,
                  approved_at: actualStatus === "FULFILLED" ? processedAt : req.approved_at,
                }
              : req
          )
        );

        // FULFILLED는 여기서 별도 안내를 띄우지 않는다 — processingRequestId를 이미 위에서
        // 세팅해뒀기 때문에 아래 상시 진행 배너가 이 렌더에서 바로 나타난다. 둘 다 띄우면
        // "시작했다"는 안내와 "진행 중이다"는 배너가 동시에 겹쳐 뜨는 것처럼 보인다.
        if (newStatus !== "FULFILLED") {
          setAlert({
            type: "success",
            message: `${request.user_name}님의 신청서가 성공적으로 거절되었습니다.`,
          });
        }

        setSelectedRequest(null);

      } else {
        setAlert({
          type: "error",
          message:
            "신청서 처리 중 오류가 발생했습니다. 네트워크 연결을 확인하시거나 잠시 후 다시 시도해주세요.",
        });
      }
    } catch (error) {
      console.error("Failed to update request status:", error);

      if (error.status === 409) {
        // 실제 원인은 두 가지다: ① 다른 관리자가 먼저 처리함 ② 본인이 새로고침 후 이미
        // PROCESSING/처리 완료된 자신의 요청에 다시 클릭한 경우. 서버 응답만으로는 구분할
        // 수 없으므로 원인을 단정하지 않고 사실만 안내한다.
        setAlert({
          type: "error",
          message:
            "처리 상태가 바뀌어 요청을 완료하지 못했습니다. 목록을 새로고침해 현재 상태를 확인해주세요.",
        });
      } else if (error.name === "TimeoutError" || error.name === "AbortError") {
        setAlert({
          type: "warning",
          message: "승인 응답 시간이 초과되었습니다. 재시도하기 전에 목록을 새로고침해 실제 처리 상태를 확인해주세요.",
        });
      } else {
        setAlert({
          type: "error",
          message: error.status
            ? `신청서 처리에 실패했습니다. ${error.message}`
            : "서버와 연결할 수 없습니다. 네트워크를 확인하고 잠시 후 다시 시도해주세요.",
        });
      }
    } finally {
      // processingRequestId는 버튼 중복 클릭 방지용이라 응답이 오면 바로 풀어도 된다.
      // pollingRequestId는 여기서 무조건 지우지 않는다 — FULFILLED 제출이 성공했다면
      // 비동기 후처리가 아직 진행 중이므로, 진행 상태 폴링 배너가 계속 보여야 한다
      // (ready/failed로 끝나는 걸 폴링이 감지하면 그때 지운다). 제출 자체가 실패했거나
      // 거절(DENIED)인 경우엔 더 이상 폴링할 이유가 없으니 여기서 지운다.
      setProcessingRequestId(null);
      if (newStatus !== "FULFILLED" || !isSubmitSuccess) {
        setPollingRequestId(null);
      }
    }
  };

  const promptApprove = (request) => {
    const comment = prompt("승인 사유를 입력하세요:", "승인되었습니다.");
    if (comment !== null) {
      handleStatusUpdate(request, "FULFILLED", comment || "승인되었습니다.");
    }
  };

  const promptDeny = (request) => {
    // PROCESSING 상태는 Pod 생성이 이미 진행 중일 수 있다 — 진행 단계가 멈춘 것처럼
    // 보인다고 오인해 실수로 취소하는 것을 막기 위해 별도로 확인한다.
    if (request.status === "PROCESSING") {
      const proceed = confirm(
        "이 신청서는 현재 Pod 생성 처리 중입니다. 거절하면 진행 중인 계정/Pod가 정리됩니다. 계속하시겠습니까?"
      );
      if (!proceed) return;
    }
    const comment = prompt("거절 사유를 입력하세요:", "거절되었습니다.");
    if (comment !== null) {
      handleStatusUpdate(request, "DENIED", comment || "거절되었습니다.");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const emptyText = `${
    filter === "PENDING"
      ? "대기중인"
      : filter === "PROCESSING"
      ? "처리중인"
      : filter === "FULFILLED"
      ? "승인된"
      : filter === "DENIED"
      ? "거절된"
      : "삭제된"
  } 신청서가 없습니다. 다른 상태나 기간을 확인해보세요.`;

  const columns = [
    {
      id: "id",
      header: "ID",
      width: "72px",
      cell: (r) => `#${r.request_id}`,
    },
    {
      id: "user",
      header: "사용자",
      minWidth: "160px",
      cell: (r) => (
        <div>
          <div>{r.user_name}</div>
          <div style={{ color: "var(--decs-text-secondary)" }}>
            {r.student_id} · {r.department}
          </div>
        </div>
      ),
    },
    {
      id: "rsgroup",
      header: "리소스 그룹",
      cell: (r) => r.rsgroup_name,
    },
    {
      id: "image",
      header: "이미지",
      cell: (r) => `${r.image_name}:${r.image_version}`,
    },
    {
      id: "expires",
      header: "만료",
      cell: (r) => new Date(r.expires_at).toLocaleDateString("ko-KR"),
    },
    {
      id: "status",
      header: "상태",
      cell: (r) => renderStatus(r.status),
    },
    {
      id: "actions",
      header: "작업",
      minWidth: "180px",
      cell: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)" }}>
          <Button variant="inline-link" onClick={() => setSelectedRequest(r)}>
            상세
          </Button>
          {r.status === "PENDING" && (
            <Button variant="inline-link" disabled={processingRequestId !== null} loading={processingRequestId === r.request_id} onClick={() => promptApprove(r)}>
              승인
            </Button>
          )}
          {(r.status === "PENDING" || r.status === "PROCESSING") && (
            <Button
              variant="inline-link"
              disabled={processingRequestId !== null}
              style={{ color: "var(--decs-status-error)" }}
              onClick={() => promptDeny(r)}
            >
              거절
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading && !hasLoadedOnce) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
        <StatusIndicator type="loading">
          신청서 목록을 불러오는 중...
        </StatusIndicator>
      </div>
    );
  }

  const sel = selectedRequest;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      {alert && (
        <Flashbar
          items={[
            {
              id: "page-alert",
              type: alert.type,
              content: alert.message,
              dismissible: true,
              onDismiss: () => setAlert(null),
            },
          ]}
        />
      )}
      {processingRequestId !== null || processingListRequest ? (
        <Alert type="info">
          {processingListRequest && processingRequestId === null
            ? `${processingListRequest.user_name}님의 신청서가 Pod 생성 처리 중입니다.`
            : "Pod 생성으로 승인 처리에 최대 10분이 걸릴 수 있습니다."}{" "}
          중복 클릭해도 안전하지만, 완료 전까지는 같은 신청서에 대한 새 승인 요청이 거부됩니다.
          {provisioningStatus?.message ? ` (현재 단계: ${provisioningStatus.message})` : null}
        </Alert>
      ) : null}

      <Header
        variant="h1"
        description="사용자들의 서버 사용 신청서를 검토하고 승인/거절할 수 있습니다."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)" }}>
            {lastUpdated ? (
              <span style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>
                {lastUpdated.toLocaleTimeString("ko-KR")} 기준
              </span>
            ) : null}
            <Button iconName="arrow-path" loading={isLoading} onClick={fetchRequests}>새로고침</Button>
          </div>
        }
      >
        신청서 관리
      </Header>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--decs-space-m)", flexWrap: "wrap" }}>
        <Tabs
          tabs={[
            { key: "PENDING", label: "대기중" },
            { key: "PROCESSING", label: "처리중" },
            { key: "FULFILLED", label: "승인됨" },
            { key: "MIGRATING", label: "마이그레이션 중" },
            { key: "EXPIRING", label: "만료 처리 중" },
            { key: "DENIED", label: "거절됨" },
            { key: "DELETED", label: "삭제됨" },
          ].map((tab) => ({
            id: tab.key,
            label: `${tab.label} (${statusCounts[tab.key]})`,
          }))}
          activeTabId={filter}
          onChange={setFilter}
        />
        <div style={{ width: "160px" }}>
          <Select
            selectedValue={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </div>
      </div>

      <Container disablePadding>
        <Table
          density="compact"
          columns={columns}
          items={pageRequests}
          trackBy="request_id"
          header={
            <Header variant="h2" counter={`(${filteredRequests.length})`}>
              신청서
            </Header>
          }
          empty={emptyText}
          footer={filteredRequests.length > 0 ? (
            <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", minHeight: "1px" }}>
              {hasMore ? "스크롤하면 더 불러옵니다…" : null}
            </div>
          ) : null}
        />
      </Container>

      {/* Detail Modal */}
      {sel && (
        <Modal
          visible
          size="large"
          onDismiss={() => setSelectedRequest(null)}
          header={`신청 상세 정보 #${sel.request_id}`}
          footer={
            <>
              <Button variant="normal" onClick={() => setSelectedRequest(null)}>
                닫기
              </Button>
              {(sel.status === "PENDING" || sel.status === "PROCESSING") && (
                <Button
                  variant="normal"
                  disabled={processingRequestId !== null}
                  style={{
                    color: "var(--decs-status-error)",
                    borderColor: "var(--decs-status-error)",
                  }}
                  onClick={() => promptDeny(sel)}
                >
                  거절
                </Button>
              )}
              {sel.status === "PENDING" && (
                <Button variant="primary" disabled={processingRequestId !== null} loading={processingRequestId === sel.request_id} onClick={() => promptApprove(sel)}>
                  승인
                </Button>
              )}
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
            <div>{renderStatus(sel.status)}</div>

            <div>
              <Header variant="h3">사용자</Header>
              <KeyValuePairs
                columns={2}
                style={{ marginTop: "var(--decs-space-s)" }}
                items={[
                  { label: "이름", value: sel.user_name },
                  { label: "학번", value: sel.student_id },
                  { label: "이메일", value: sel.user_email },
                  { label: "학과", value: sel.department },
                  {
                    label: "전화번호",
                    value: sel.user_phone || "등록되지 않음",
                  },
                  {
                    label: "계정 상태",
                    value: sel.is_active ? (
                      <StatusIndicator type="success">활성</StatusIndicator>
                    ) : (
                      <StatusIndicator type="stopped">비활성</StatusIndicator>
                    ),
                  },
                ]}
              />
            </div>

            <div>
              <Header variant="h3">리소스 그룹</Header>
              <KeyValuePairs
                columns={2}
                style={{ marginTop: "var(--decs-space-s)" }}
                items={[
                  { label: "리소스 그룹명", value: sel.rsgroup_name },
                  { label: "서버", value: sel.server_name },
                  { label: "설명", value: sel.rsgroup_description },
                ]}
              />
            </div>

            <div>
              <Header variant="h3">신청 정보</Header>
              <KeyValuePairs
                columns={2}
                style={{ marginTop: "var(--decs-space-s)" }}
                items={[
                  {
                    label: "Ubuntu 사용자명",
                    value: sel.ubuntu_username,
                    copyable: true,
                    copyText: sel.ubuntu_username,
                  },
                  {
                    label: "컨테이너 이미지",
                    value: `${sel.image_name}:${sel.image_version}`,
                  },
                  {
                    label: "만료",
                    value: new Date(sel.expires_at).toLocaleDateString("ko-KR"),
                  },
                  ...(sel.ubuntu_gids && sel.ubuntu_gids.length > 0
                    ? [{ label: "Ubuntu GIDs", value: sel.ubuntu_gids.join(", ") }]
                    : []),
                  ...(sel.ubuntu_uid != null
                    ? [{ label: "Ubuntu UID", value: sel.ubuntu_uid }]
                    : []),
                  ...(sel.ubuntu_gid != null
                    ? [{ label: "Ubuntu GID (Primary)", value: sel.ubuntu_gid }]
                    : []),
                ]}
              />
              <div style={{ marginTop: "var(--decs-space-m)" }}>
                <div style={{ color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>사용 목적</div>
                <div style={{ background: "var(--decs-surface-sunken)", padding: "var(--decs-space-s)" }}>
                  {sel.usage_purpose}
                </div>
              </div>
              {sel.form_answers &&
                Object.keys(sel.form_answers).length > 0 && (
                  <div style={{ marginTop: "var(--decs-space-m)" }}>
                    <div style={{ color: "var(--decs-text-inactive)", marginBottom: "var(--decs-space-xxs)" }}>
                      추가 정보
                    </div>
                    <KeyValuePairs
                      columns={2}
                      items={Object.entries(sel.form_answers).map(
                        ([key, value]) => ({
                          label: key.replace("_", " "),
                          value,
                        })
                      )}
                    />
                  </div>
                )}
            </div>

            {sel.port_mappings && sel.port_mappings.length > 0 && (
              <div>
                <Header variant="h3">외부 포트</Header>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xs)" }}>
                  {sel.port_mappings.map((port, index) => (
                    <Badge
                      key={index}
                      color={port.isActive !== false ? "green" : "grey"}
                    >
                      {port.externalPort}:{port.internalPort}
                      {port.usagePurpose ? ` (${port.usagePurpose})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Header variant="h3">처리 이력</Header>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)", marginTop: "var(--decs-space-xs)" }}>
                <StatusIndicator type="info">
                  신청 제출: {formatDate(sel.created_at)}
                </StatusIndicator>
                {sel.approved_at && (
                  <div>
                    <StatusIndicator type="success">
                      승인 완료: {formatDate(sel.approved_at)}
                    </StatusIndicator>
                  </div>
                )}
                {sel.status === "DENIED" && (
                  <div>
                    <StatusIndicator type="error">
                      거절: {formatDate(sel.updated_at)}
                    </StatusIndicator>
                  </div>
                )}
                {sel.status === "PENDING" && (
                  <div>
                    <StatusIndicator type="pending">
                      관리자 검토 대기 중
                    </StatusIndicator>
                  </div>
                )}
              </div>
              {sel.admin_comment && (
                <div style={{ marginTop: "var(--decs-space-s)" }}>
                  <Alert
                    type={sel.status === "DENIED" ? "error" : "info"}
                    header="관리자 의견"
                  >
                    {sel.admin_comment}
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default RequestManagementPage;
