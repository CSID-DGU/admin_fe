// 관리자용 GPU 사용 현황: 노드별 GPU 격자와 소유자별 점유 표. 폴링 방식은 MyGpuUsage와 같다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Container, Header, PHONE_QUERY, ProgressBar, Select, Table, useMediaQuery } from "../../design-system";
import { gpuUsageService } from "../../services/gpuUsageService";

const REFRESH_MS = 30_000;
const ALL = "";
const UNKNOWN = "\u0000unknown";

const num = (v) => (Number.isFinite(v) ? v : 0);
const formatMiB = (value) => {
  const mib = num(value);
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${Math.round(mib)} MiB`;
};
const toneOf = (pct) => (pct >= 90 ? "error" : pct >= 70 ? "warning" : "success");

function formatElapsed(t, seconds) {
  const s = Math.max(0, Math.floor(num(seconds)));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return t("container.elapsedDH", { d, h });
  if (h > 0) return t("container.elapsedHM", { h, m });
  return t("container.elapsedM", { m });
}

const isBusy = (gpu) => num(gpu.utilizationPercent) > 0 || (gpu.processes ?? []).length > 0;

// 노드·GPU 전체를 소유자별로 묶는다. 소유자를 모르는 프로세스는 한 행('미확인')으로 모은다.
function groupByOwner(nodes) {
  const map = new Map();
  for (const node of nodes) {
    if (!node.processesAvailable) continue;
    for (const gpu of node.gpus ?? []) {
      for (const p of gpu.processes ?? []) {
        const name = p.ownerName || p.ubuntuUsername || null;
        const key = p.userId != null ? `u${p.userId}` : name ?? UNKNOWN;
        const row = map.get(key) ?? { key, name, gpuKeys: new Set(), memory: 0, procs: [] };
        row.gpuKeys.add(`${node.nodeName}/${gpu.index}`);
        row.memory += num(p.memoryUsedMiB);
        row.procs.push({ ...p, nodeName: node.nodeName, gpuIndex: gpu.index });
        map.set(key, row);
      }
    }
  }
  return [...map.values()].map((r) => ({ ...r, gpus: r.gpuKeys.size }));
}

function GpuTile({ gpu }) {
  const { t } = useTranslation();
  const total = num(gpu.memoryTotalMiB);
  const memPct = total > 0 ? Math.round((num(gpu.memoryUsedMiB) / total) * 100) : 0;
  const util = Math.round(num(gpu.utilizationPercent));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-xs)", minWidth: 0, padding: "var(--decs-space-xs)", border: "1px solid var(--decs-border-container)", borderRadius: "var(--decs-radius-item)" }}>
      <div style={{ fontWeight: 600, color: "var(--decs-text-heading)", overflowWrap: "anywhere" }}>
        {t("container.gpuTitle", { index: gpu.index })}
        <div style={{ fontWeight: 400, fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>{gpu.model}</div>
      </div>
      <ProgressBar value={util} tone={toneOf(util)} label={t("container.gpuUtil")} />
      <ProgressBar value={memPct} tone={toneOf(memPct)} label={t("gpuUsage.mem")} description={`${formatMiB(gpu.memoryUsedMiB)} / ${formatMiB(total)}`} />
    </div>
  );
}

function NodeSection({ node }) {
  const { t } = useTranslation();
  const gpus = node.gpus ?? [];
  const avg = gpus.length ? Math.round(gpus.reduce((s, g) => s + num(g.utilizationPercent), 0) / gpus.length) : 0;
  const small = { fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" };
  return (
    <section>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "var(--decs-space-xs)", marginBottom: "var(--decs-space-xs)" }}>
        <h3 style={{ margin: 0, fontSize: "var(--decs-fs-heading-s)", color: "var(--decs-text-heading)" }}>{node.nodeName}</h3>
        <span style={small}>{t("gpuUsage.nodeMeta", { count: gpus.length, util: avg })}</span>
        {!node.processesAvailable ? <span style={small}>· {t("gpuUsage.nodeUnavailable")}</span> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 120px), 1fr))", gap: "var(--decs-space-xs)" }}>
        {gpus.map((gpu) => <GpuTile key={`${gpu.index}-${gpu.uuid}`} gpu={gpu} />)}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: "var(--decs-fs-heading-s)", fontWeight: 700, color: "var(--decs-text-heading)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

export default function GpuUsagePage() {
  const { t } = useTranslation();
  const phone = useMediaQuery(PHONE_QUERY);
  const [nodes, setNodes] = useState(undefined);
  const [nodeNames, setNodeNames] = useState([]);
  const [selected, setSelected] = useState(ALL);
  const [failed, setFailed] = useState(null); // null | "error" | "notFound"
  const [sort, setSort] = useState({ field: "gpus", desc: true });
  const inFlight = useRef(false);

  const load = useCallback(async (isCancelled) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await gpuUsageService.getGpuUsage(selected || undefined);
      if (isCancelled()) return;
      const data = res?.data?.data;
      const list = Array.isArray(data) ? data : [];
      setNodes(list);
      if (!selected) setNodeNames(list.map((n) => n.nodeName));
      setFailed(null);
    } catch (e) {
      if (!isCancelled()) setFailed(e?.response?.status === 404 ? "notFound" : "error");
    } finally {
      inFlight.current = false;
    }
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const tick = () => {
      if (!document.hidden) load(isCancelled);
    };
    tick();
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      inFlight.current = false;
    };
  }, [load]);

  const summary = useMemo(() => {
    const gpus = (nodes ?? []).flatMap((n) => n.gpus ?? []);
    const avg = gpus.length ? Math.round(gpus.reduce((s, g) => s + num(g.utilizationPercent), 0) / gpus.length) : 0;
    return { nodes: (nodes ?? []).length, gpus: gpus.length, busy: gpus.filter(isBusy).length, avg };
  }, [nodes]);

  const rows = useMemo(() => {
    const unknownLabel = t("gpuUsage.unknownOwner");
    const list = groupByOwner(nodes ?? []).map((r) => ({ ...r, label: r.name ?? unknownLabel, procCount: r.procs.length }));
    const dir = sort.desc ? -1 : 1;
    return list.sort((a, b) => {
      // 미확인 행은 정렬 방향과 상관없이 맨 아래에 둔다.
      if ((a.key === UNKNOWN) !== (b.key === UNKNOWN)) return a.key === UNKNOWN ? 1 : -1;
      const av = sort.field === "label" ? a.label : a[sort.field];
      const bv = sort.field === "label" ? b.label : b[sort.field];
      return (typeof av === "string" ? av.localeCompare(bv) : av - bv) * dir || a.label.localeCompare(b.label);
    });
  }, [nodes, sort, t]);

  const skipped = (nodes ?? []).filter((n) => !n.processesAvailable).length;
  const small = { fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" };
  const num_ = { fontVariantNumeric: "tabular-nums" };

  const procList = (r) => (
    <details>
      <summary style={{ cursor: "pointer" }}>{t("gpuUsage.procCount", { count: r.procCount })}</summary>
      <ul style={{ margin: "var(--decs-space-xxs) 0 0", paddingLeft: "var(--decs-space-m)", ...small }}>
        {r.procs.map((p, i) => (
          <li key={`${p.containerId}-${p.nodeName}-${p.gpuIndex}-${i}`} style={{ overflowWrap: "anywhere" }}>
            {t("gpuUsage.proc", { node: p.nodeName, index: p.gpuIndex, name: p.processName ?? "", memory: formatMiB(p.memoryUsedMiB), elapsed: formatElapsed(t, p.elapsedSeconds) })}
          </li>
        ))}
      </ul>
    </details>
  );
  const ownerCell = (r) => (
    <span style={{ overflowWrap: "anywhere", fontWeight: r.key === UNKNOWN ? 400 : 600, color: r.key === UNKNOWN ? "var(--decs-text-secondary)" : "var(--decs-text-heading)" }}>{r.label}</span>
  );
  // 폰에서는 프로세스 열을 따로 두지 않고 소유자 아래에 펼침으로 붙여 가로 스크롤을 없앤다.
  const columns = [
    { id: "label", header: t("gpuUsage.colOwner"), sortingField: "label", cell: phone ? (r) => <>{ownerCell(r)}<div style={small}>{procList(r)}</div></> : ownerCell },
    { id: "gpus", header: t("gpuUsage.colGpus"), sortingField: "gpus", cell: (r) => <span style={num_}>{r.gpus}</span> },
    { id: "memory", header: t("gpuUsage.colMemory"), sortingField: "memory", cell: (r) => <span style={num_}>{formatMiB(r.memory)}</span> },
    ...(phone ? [] : [{ id: "procCount", header: t("gpuUsage.colProcs"), sortingField: "procCount", cell: procList }]),
  ];

  const nodeOptions = [{ value: ALL, label: t("gpuUsage.allNodes") }, ...nodeNames.map((n) => ({ value: n, label: n }))];
  const body = () => {
    if (nodes === undefined) {
      return failed
        ? <Alert type="error">{t(failed === "notFound" ? "gpuUsage.notFound" : "gpuUsage.error")}</Alert>
        : <div style={small}>{t("gpuUsage.loading")}</div>;
    }
    if (nodes.length === 0) return <Container><div style={small}>{t("gpuUsage.empty")}</div></Container>;
    return (
      <>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "var(--decs-space-s)" }}>
            <Stat label={t("gpuUsage.sumNodes")} value={summary.nodes} />
            <Stat label={t("gpuUsage.sumGpus")} value={summary.gpus} />
            <Stat label={t("gpuUsage.sumBusy")} value={summary.busy} />
            <Stat label={t("gpuUsage.sumUtil")} value={`${summary.avg}%`} />
          </div>
        </Container>
        <Container header={<Header variant="h2" description={t("gpuUsage.usersDesc")}>{t("gpuUsage.users")}</Header>}>
          {skipped > 0 ? <div style={{ ...small, marginBottom: "var(--decs-space-s)" }}>{t("gpuUsage.unavailableNote", { count: skipped })}</div> : null}
          <Table
            trackBy="key"
            items={rows}
            columns={columns}
            empty={t("gpuUsage.noUsers")}
            sortingColumn={columns.find((c) => c.sortingField === sort.field)}
            sortingDescending={sort.desc}
            onSortingChange={({ sortingColumn, sortingDescending }) => setSort({ field: sortingColumn.sortingField, desc: sortingDescending })}
          />
        </Container>
        <Container header={<Header variant="h2">{t("gpuUsage.byNode")}</Header>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
            {nodes.map((n) => <NodeSection key={n.nodeName} node={n} />)}
          </div>
        </Container>
      </>
    );
  };

  const picker = <div style={{ minWidth: "180px" }}><Select ariaLabel={t("gpuUsage.node")} options={nodeOptions} selectedValue={selected} onChange={(v) => { setSelected(v); setNodes(undefined); }} /></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
      <Header variant="h1" description={t("gpuUsage.desc")} actions={phone ? null : picker}>{t("gpuUsage.title")}</Header>
      {phone ? picker : null}
      {failed && nodes !== undefined ? <Alert type="warning">{t("gpuUsage.stale")}</Alert> : null}
      {body()}
    </div>
  );
}
