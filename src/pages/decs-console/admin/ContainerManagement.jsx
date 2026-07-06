// ContainerManagement — Table + 검색/필터 + 행 상세 + Pagination
import React from "react";
import { Table, Header, Container, StatusIndicator, Badge, Button, Input, Select, Pagination } from "../../../design-system";

const PAGE_SIZE = 10;

function ContainerManagement({ onOpenDetail, containers = [] }) {
  const all = containers;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sort, setSort] = React.useState({ col: null, desc: false });
  const [currentPage, setCurrentPage] = React.useState(1);

  let rows = all.filter((c) =>
    (q === "" || c.name.includes(q) || c.user.includes(q)) &&
    (statusFilter === "all" || c.status === statusFilter)
  );
  if (sort.col) {
    const f = sort.col.sortingField;
    rows = [...rows].sort((a, b) => String(a[f]).localeCompare(String(b[f])) * (sort.desc ? -1 : 1));
  }
  const pagesCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [q, statusFilter]);

  React.useEffect(() => {
    if (currentPage > pagesCount) setCurrentPage(pagesCount);
  }, [currentPage, pagesCount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Header variant="h1" description="검색·필터로 원하는 컨테이너를 찾고 상세 정보를 확인합니다">컨테이너 관리</Header>

      <Container disablePadding header={
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
          <Header variant="h2" counter={`(${rows.length})`}
            actions={<Badge color="grey">작업 기능 추후 구현</Badge>}>
            컨테이너
          </Header>
          <div style={{ display: "flex", gap: "var(--decs-space-s)" }}>
            <div style={{ flex: 1, maxWidth: 320 }}>
              <Input value={q} onChange={setQ} iconName="magnifying-glass" placeholder="이름 또는 사용자 검색" type="search" />
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
            { id: "name", header: "이름", sortingField: "name", cell: (c) => <a href="#" onClick={(e) => { e.preventDefault(); onOpenDetail(c); }} style={{ color: "var(--decs-text-link)", fontWeight: 600, textDecoration: "none" }}>{c.name}</a> },
            { id: "user", header: "사용자", sortingField: "user", cell: (c) => c.user },
            { id: "gpu", header: "리소스 그룹", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
            { id: "node", header: "노드", sortingField: "node", cell: (c) => c.node },
            { id: "status", header: "상태", cell: (c) => <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
            { id: "expires", header: "만료", sortingField: "expires", cell: (c) => <span style={{ color: "var(--decs-text-secondary)" }}>{c.expires}</span> },
            { id: "actions", header: "", width: 90, cell: (c) => <Button variant="normal" onClick={() => onOpenDetail(c)}>상세</Button> },
          ]}
          footer={rows.length > PAGE_SIZE ? <div style={{ display: "flex", justifyContent: "flex-end" }}><Pagination currentPage={currentPage} pagesCount={pagesCount} onChange={setCurrentPage} /></div> : null}
        />
      </Container>
    </div>
  );
}
export default ContainerManagement;
