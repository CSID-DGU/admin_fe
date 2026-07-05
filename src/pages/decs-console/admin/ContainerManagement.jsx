// ContainerManagement — Table + 검색/필터 + 대량 작업 + 행 액션 + 삭제 확인 Modal
import React from "react";
import { Table, Header, Container, StatusIndicator, Badge, Button, ButtonDropdown, Input, Select, Pagination, Modal, Flashbar } from "../../../design-system";
import { DECS_ADMIN } from "./data";

function ContainerManagement({ onOpenDetail }) {
  const all = DECS_ADMIN.containers;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sel, setSel] = React.useState([]);
  const [sort, setSort] = React.useState({ col: null, desc: false });
  const [confirm, setConfirm] = React.useState(null); // {mode, items}
  const [flashes, setFlashes] = React.useState([]);

  let rows = all.filter((c) =>
    (q === "" || c.name.includes(q) || c.user.includes(q)) &&
    (statusFilter === "all" || c.status === statusFilter)
  );
  if (sort.col) {
    const f = sort.col.sortingField;
    rows = [...rows].sort((a, b) => String(a[f]).localeCompare(String(b[f])) * (sort.desc ? -1 : 1));
  }

  function runAction(mode, items) {
    if (mode === "delete") { setConfirm({ mode, items }); return; }
    const verb = mode === "restart" ? "재시작" : mode === "stop" ? "중지" : mode;
    setFlashes([{ id: Date.now(), type: "in-progress", header: `${items.length}개 컨테이너 ${verb} 요청됨`, content: "K8s에 작업을 전달했습니다. 완료까지 시간이 걸릴 수 있습니다.", dismissible: true, onDismiss: () => setFlashes([]) }]);
    setSel([]);
  }
  function confirmDelete() {
    const n = confirm.items.length;
    setConfirm(null); setSel([]);
    setFlashes([{ id: Date.now(), type: "success", header: `${n}개 컨테이너를 삭제했습니다`, dismissible: true, onDismiss: () => setFlashes([]) }]);
  }

  const rowActions = (c) => [
    { id: "detail", text: "상세 보기", iconName: "arrow-up-right", onClick: () => onOpenDetail(c) },
    { id: "restart", text: "재시작", iconName: "arrow-path", onClick: () => runAction("restart", [c]) },
    { id: "stop", text: "중지", iconName: "power", onClick: () => runAction("stop", [c]) },
    { id: "logs", text: "로그 보기", iconName: "document-text", onClick: () => onOpenDetail(c) },
    { id: "delete", text: "삭제", iconName: "trash", variant: "danger", onClick: () => runAction("delete", [c]) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      <Header variant="h1" description="검색·필터로 원하는 컨테이너를 찾고, 선택해 일괄 작업합니다">컨테이너 관리</Header>
      {flashes.length ? <Flashbar items={flashes} /> : null}

      <Container disablePadding header={
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-s)" }}>
          <Header variant="h2" counter={`(${rows.length})`}
            actions={sel.length > 0
              ? <div style={{ display: "flex", gap: "var(--decs-space-xs)", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--decs-text-secondary)" }}>{sel.length}개 선택</span>
                  <Button variant="normal" iconName="arrow-path" onClick={() => runAction("restart", sel)}>재시작</Button>
                  <Button variant="normal" iconName="power" onClick={() => runAction("stop", sel)}>중지</Button>
                  <Button variant="normal" iconName="trash" onClick={() => runAction("delete", sel)}>삭제</Button>
                </div>
              : <Button variant="primary" iconName="plus">컨테이너 생성</Button>}>
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
          density="compact" trackBy="id" selectionType="multi"
          selectedItems={sel} onSelectionChange={setSel}
          sortingColumn={sort.col} sortingDescending={sort.desc}
          onSortingChange={({ sortingColumn, sortingDescending }) => setSort({ col: sortingColumn, desc: sortingDescending })}
          items={rows}
          empty="조건에 맞는 컨테이너가 없습니다."
          columns={[
            { id: "name", header: "이름", sortingField: "name", cell: (c) => <a href="#" onClick={(e) => { e.preventDefault(); onOpenDetail(c); }} style={{ color: "var(--decs-text-link)", fontWeight: 600, textDecoration: "none" }}>{c.name}</a> },
            { id: "user", header: "사용자", sortingField: "user", cell: (c) => c.user },
            { id: "gpu", header: "GPU", cell: (c) => <Badge color="brand">{c.gpu}</Badge> },
            { id: "node", header: "노드", sortingField: "node", cell: (c) => c.node },
            { id: "status", header: "상태", cell: (c) => <StatusIndicator type={c.status}>{c.label}</StatusIndicator> },
            { id: "expires", header: "만료", sortingField: "expires", cell: (c) => <span style={{ color: "var(--decs-text-secondary)" }}>{c.expires}</span> },
            { id: "actions", header: "", width: 90, cell: (c) => <ButtonDropdown items={rowActions(c)}>작업</ButtonDropdown> },
          ]}
          footer={<div style={{ display: "flex", justifyContent: "flex-end" }}><Pagination currentPage={1} pagesCount={4} onChange={() => {}} /></div>}
        />
      </Container>

      <Modal
        visible={!!confirm} onDismiss={() => setConfirm(null)}
        header={`컨테이너를 삭제할까요?`}
        footer={<>
          <Button variant="link" onClick={() => setConfirm(null)}>취소</Button>
          <Button variant="primary" onClick={confirmDelete}>삭제</Button>
        </>}
      >
        {confirm ? <>선택한 <b>{confirm.items.length}개</b> 컨테이너와 연결된 볼륨이 해제됩니다. 이 작업은 되돌릴 수 없습니다.</> : null}
      </Modal>
    </div>
  );
}
export default ContainerManagement;
