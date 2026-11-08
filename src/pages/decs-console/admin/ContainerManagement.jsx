// ContainerManagement — Table + 검색/필터 + 행 상세 + 무한 스크롤 + 여러 개 골라 재시작
import React from "react";
import { useLocation } from "react-router-dom";
import { Table, Header, Container, StatusIndicator, Badge, Button, Input, Select, Alert } from "../../../design-system";
import BulkRestartModal from "./BulkRestartModal";

const BATCH_SIZE = 10;

// 재시작은 신청이 사용 중(FULFILLED)일 때만 시작할 수 있다(그 밖이면 admin_be가 409로 거절). 고를 수 없으면 그 이유를 돌려준다.
function restartBlockedReason(c) {
  if (c.requestId == null) return "신청 번호가 없어 재시작할 수 없습니다";
  if (c.requestStatus === "FULFILLED") return null;
  if (c.requestStatus === "MIGRATING") return "재시작·이동이 진행 중입니다";
  if (c.requestStatus === "EXPIRING") return "회수가 진행 중입니다";
  return "사용 중인 신청이 아니라 재시작할 수 없습니다";
}
const canRestart = (c) => restartBlockedReason(c) === null;

function ContainerManagement({ onOpenDetail, onRefetch, containers = [] }) {
  const location = useLocation();
  const all = containers;
  const [q, setQ] = React.useState("");
  // 대시보드 "오류" 카드/알림에서 넘어올 때 location.state로 초기 필터를 지정할 수 있게 한다.
  const [statusFilter, setStatusFilter] = React.useState(location.state?.statusFilter ?? "all");
  const [sort, setSort] = React.useState({ col: null, desc: false });
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  const sentinelRef = React.useRef(null);
  const [selectedIds, setSelectedIds] = React.useState(() => new Set());
  const [restartOpen, setRestartOpen] = React.useState(false);
  const [notice, setNotice] = React.useState(null);

  // 한 사용자가 컨테이너를 여러 개 가질 수 있어 이름·사용자만으로는 구분되지 않는다 — 신청 번호와
  // Pod 이름으로도 찾을 수 있게 한다.
  let rows = all.filter((c) =>
    (q === "" || c.name.includes(q) || c.user.includes(q) ||
      (c.podName ?? "").includes(q) || String(c.requestId ?? "") === q.replace(/^#/, "")) &&
    (statusFilter === "all" || c.status === statusFilter)
  );
  if (sort.col) {
    const f = sort.col.sortingField;
    rows = [...rows].sort((a, b) => String(a[f]).localeCompare(String(b[f])) * (sort.desc ? -1 : 1));
  }
  const hasMore = visibleCount < rows.length;
  const pageRows = rows.slice(0, visibleCount);

  // 검색·필터·정렬이 바뀌면 선택도 비운다. 화면에 없는 행이 선택된 채 남아 모르고 재시작되지 않게 한다.
  React.useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setSelectedIds(new Set());
  }, [q, statusFilter, sort.col, sort.desc]);

  // 목록을 다시 불러와 재시작할 수 없게 된(재시작·회수가 시작된) 컨테이너는 선택에서 뺀다.
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(containers.filter((c) => prev.has(c.id) && canRestart(c)).map((c) => c.id));
      return next.size === prev.size ? prev : next;
    });
  }, [containers]);

  const selectedRows = pageRows.filter((c) => selectedIds.has(c.id));

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((count) => Math.min(count + BATCH_SIZE, rows.length));
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, rows.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Header variant="h1" description="검색·필터로 원하는 컨테이너를 찾고 상세 정보를 확인합니다">컨테이너 관리</Header>

      {notice ? <Alert type={notice.type} dismissible onDismiss={() => setNotice(null)}>{notice.message}</Alert> : null}

      <Container disablePadding header={
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
          <Header
            variant="h2" counter={`(${rows.length})`}
            // 상태는 admin_be가 5분마다 한꺼번에 읽어 둔 값이다 — 모든 행이 같은 시각에 확인된 값이다.
            description={all[0]?.statusCheckedAt ? `상태 마지막 확인 ${all[0].statusCheckedAt.toLocaleString("ko-KR")} · 5분마다 자동 확인` : undefined}
            actions={
              <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)" }}>
                {selectedRows.length > 0 ? (
                  <Button variant="link" onClick={() => setSelectedIds(new Set())}>선택 해제</Button>
                ) : null}
                <Button variant="normal" iconName="arrow-path" disabled={selectedRows.length === 0} onClick={() => setRestartOpen(true)}>
                  {selectedRows.length > 0 ? `선택한 ${selectedRows.length}개 재시작` : "선택한 컨테이너 재시작"}
                </Button>
              </div>
            }
          >
            컨테이너
          </Header>
          <div style={{ display: "flex", gap: "var(--decs-space-s)" }}>
            <div style={{ flex: 1, maxWidth: 320 }}>
              <Input value={q} onChange={setQ} iconName="magnifying-glass" placeholder="이름·사용자·Pod 이름·신청 번호 검색" type="search" />
            </div>
            <div style={{ width: 200 }}>
              <Select selectedValue={statusFilter} onChange={setStatusFilter} options={[
                { value: "all", label: "모든 상태" },
                { value: "success", label: "실행 중" },
                { value: "in-progress", label: "프로비저닝 중" },
                { value: "pending", label: "승인 대기" },
                { value: "error", label: "오류" },
                { value: "stopped", label: "만료" },
              ]} />
            </div>
          </div>
        </div>
      }>
        <Table
          density="compact" trackBy="id"
          sortingColumn={sort.col} sortingDescending={sort.desc}
          onSortingChange={({ sortingColumn, sortingDescending }) => setSort({ col: sortingColumn, desc: sortingDescending })}
          items={pageRows}
          selectionType="multi"
          selectedItems={selectedRows}
          onSelectionChange={(items) => setSelectedIds(new Set(items.map((c) => c.id)))}
          isItemDisabled={restartBlockedReason}
          empty="조건에 맞는 컨테이너가 없습니다."
          columns={[
            {
              id: "name",
              header: "이름",
              sortingField: "name",
              cell: (c) => (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xxxs)" }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); onOpenDetail(c); }} style={{ color: "var(--decs-text-link)", fontWeight: 600, textDecoration: "none" }}>{c.name}</a>
                  {/* 같은 사용자의 컨테이너끼리는 이름이 같다(웹 계정당 우분투 유저네임 하나) — 신청 번호와 Pod 이름으로 구분한다. */}
                  <span style={{ color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>
                    {[c.requestId != null ? `신청 #${c.requestId}` : null, c.podName].filter(Boolean).join(" · ") || "—"}
                  </span>
                </div>
              ),
            },
            { id: "user", header: "사용자", sortingField: "user", cell: (c) => c.user },
            { id: "gpu", header: "GPU", cell: (c) => <Badge color="brand" style={{ maxWidth: "none" }}>{c.gpu}</Badge> },
            { id: "node", header: "노드", sortingField: "node", cell: (c) => c.node },
            {
              id: "status",
              header: "상태",
              cell: (c) => (
                <span title={c.statusReason ?? undefined}>
                  <StatusIndicator type={c.status}>{c.label}</StatusIndicator>
                </span>
              ),
            },
            { id: "expires", header: "만료", sortingField: "expires", cell: (c) => <span style={{ color: "var(--decs-text-secondary)" }}>{c.expires}</span> },
            { id: "actions", header: "", width: 90, cell: (c) => <Button variant="normal" onClick={() => onOpenDetail(c)}>상세</Button> },
          ]}
          footer={rows.length > 0 ? (
            <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)", minHeight: "1px" }}>
              {hasMore ? "스크롤하면 더 불러옵니다…" : null}
            </div>
          ) : null}
        />
      </Container>

      <BulkRestartModal
        visible={restartOpen}
        containers={selectedRows}
        onDismiss={() => setRestartOpen(false)}
        onFinished={({ accepted, rejected }) => {
          setRestartOpen(false);
          setSelectedIds(new Set());
          setNotice(accepted > 0
            ? { type: rejected > 0 ? "warning" : "success", message: `컨테이너 ${accepted}개의 재시작을 요청했습니다${rejected > 0 ? ` (${rejected}개는 거절됨)` : ""}. 서버가 한 번에 4개씩 차례로 재시작하며, 진행 상황은 각 컨테이너 상세의 작업 기록에서 확인할 수 있습니다.` }
            : { type: "error", message: "재시작 요청이 모두 거절되었습니다." });
          onRefetch?.();
        }}
      />
    </div>
  );
}
export default ContainerManagement;
