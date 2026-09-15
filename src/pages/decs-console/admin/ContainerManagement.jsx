// ContainerManagement — Table + 검색/필터 + 행 상세 + 무한 스크롤
import React from "react";
import { useLocation } from "react-router-dom";
import { Table, Header, Container, StatusIndicator, Badge, Button, Input, Select } from "../../../design-system";

const BATCH_SIZE = 10;

function ContainerManagement({ onOpenDetail, containers = [] }) {
  const location = useLocation();
  const all = containers;
  const [q, setQ] = React.useState("");
  // 대시보드 "오류" 카드/알림에서 넘어올 때 location.state로 초기 필터를 지정할 수 있게 한다.
  const [statusFilter, setStatusFilter] = React.useState(location.state?.statusFilter ?? "all");
  const [sort, setSort] = React.useState({ col: null, desc: false });
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  const sentinelRef = React.useRef(null);

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
  }, [q, statusFilter, sort.col, sort.desc]);

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
          <Header variant="h2" counter={`(${rows.length})`}>
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
            { id: "gpu", header: "리소스 그룹", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
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
    </div>
  );
}
export default ContainerManagement;
