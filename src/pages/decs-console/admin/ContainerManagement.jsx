// ContainerManagement — Table + 검색/필터 + 행 상세 + 무한 스크롤
import React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Table, Header, Container, StatusIndicator, Badge, Button, Input, Select, Modal, Alert } from "../../../design-system";
import { requestService } from "../../../services/requestService";
import { restartEach } from "../../../utils/bulkRestart";

const BATCH_SIZE = 10;

function ContainerManagement({ onOpenDetail, onRefetch, containers = [] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const all = containers;
  const [q, setQ] = React.useState("");
  // 대시보드 "오류" 카드/알림에서 넘어올 때 location.state로 초기 필터를 지정할 수 있게 한다.
  const [statusFilter, setStatusFilter] = React.useState(location.state?.statusFilter ?? "all");
  const [sort, setSort] = React.useState({ col: null, desc: false });
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  const sentinelRef = React.useRef(null);
  const [selected, setSelected] = React.useState([]);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [keepChanges, setKeepChanges] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [failures, setFailures] = React.useState(null); // null: 아직 실행 전, 배열: 실행 결과(실패 목록)
  const [okCount, setOkCount] = React.useState(0);

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

  React.useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setSelected([]);
  }, [q, statusFilter, sort.col, sort.desc]);

  // 신청 번호가 없는 행(승인 대기 테스트 등)은 재시작 대상이 아니다.
  const restartable = selected.filter((c) => c.requestId != null);

  const openBulk = () => { setKeepChanges(true); setFailures(null); setBulkOpen(true); };
  const closeBulk = () => { if (!running) { setBulkOpen(false); if (failures) setSelected([]); } };
  const runBulk = async () => {
    setRunning(true);
    try {
      const results = await restartEach(restartable, (c) => requestService.restartContainer(c.requestId, keepChanges));
      setOkCount(results.filter((r) => r.ok).length);
      setFailures(results.filter((r) => !r.ok));
      onRefetch?.();
    } finally {
      setRunning(false);
    }
  };

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

      <Container disablePadding header={
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
          <Header
            variant="h2" counter={`(${rows.length})`}
            actions={<Button variant="normal" disabled={restartable.length === 0} onClick={openBulk}>{`선택 재시작 (${restartable.length})`}</Button>}
            // 상태는 admin_be가 5분마다 한꺼번에 읽어 둔 값이다 — 모든 행이 같은 시각에 확인된 값이다.
            description={all[0]?.statusCheckedAt ? `상태 마지막 확인 ${all[0].statusCheckedAt.toLocaleString("ko-KR")} · 5분마다 자동 확인` : undefined}
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
          selectionType="multi" selectedItems={selected} onSelectionChange={setSelected}
          sortingColumn={sort.col} sortingDescending={sort.desc}
          onSortingChange={({ sortingColumn, sortingDescending }) => setSort({ col: sortingColumn, desc: sortingDescending })}
          items={pageRows}
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

      <Modal
        visible={bulkOpen}
        onDismiss={closeBulk}
        header={`컨테이너 ${restartable.length}개 재시작`}
        footer={failures ? (
          <Button variant="primary" onClick={closeBulk}>닫기</Button>
        ) : (
          <>
            <Button variant="normal" disabled={running} onClick={closeBulk}>취소</Button>
            <Button variant="primary" loading={running} onClick={runBulk}>재시작</Button>
          </>
        )}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
          {failures ? (
            <>
              <Alert type={failures.length === 0 ? "success" : "warning"}>
                {`${okCount}건 재시작을 시작했습니다.${failures.length ? ` ${failures.length}건은 시작하지 못했습니다.` : ""} 끝나기까지 몇 분 걸리며, 진행 상황은 목록의 상태에서 확인합니다.`}
              </Alert>
              {failures.map(({ item, error }) => (
                <div key={item.id}>
                  <strong>{item.user} ({item.name}) · 신청 #{item.requestId}</strong>
                  <div style={{ color: "var(--decs-status-error)" }}>{error?.status === 409 ? t("restart.errConflict") : (error?.message || t("restart.errFailed"))}</div>
                </div>
              ))}
            </>
          ) : (
            <>
              <Alert type="warning" header={t("restart.warnTitle")}>{t("restart.warnBody")}</Alert>
              <ul style={{ margin: 0, paddingLeft: "var(--decs-space-l)", maxHeight: 200, overflowY: "auto" }}>
                {restartable.map((c) => <li key={c.id}>{c.user} ({c.name}) · 신청 #{c.requestId}</li>)}
              </ul>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--decs-space-xs)" }}>
                <input type="checkbox" checked={keepChanges} onChange={(e) => setKeepChanges(e.target.checked)} disabled={running} />
                <span>
                  <span style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>{t("restart.keepChanges")}</span>
                  <span style={{ display: "block", color: "var(--decs-text-secondary)", fontSize: "var(--decs-fs-body-s)" }}>{t("restart.keepChangesHelp")}</span>
                </span>
              </label>
              {running ? <div style={{ color: "var(--decs-text-secondary)" }}>요청을 보내는 중입니다. 이 창을 닫지 말고 기다려 주시기 바랍니다.</div> : null}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
export default ContainerManagement;
