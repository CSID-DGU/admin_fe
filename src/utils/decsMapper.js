import i18n from "../i18n";
import { PUBLIC_HOST, toPublicPort } from "./publicEndpoint";

const STATUS_MAP = {
  Running: { type: "success", key: "running" },
  Pending: { type: "in-progress", key: "provisioning" },
  ContainerCreating: { type: "in-progress", key: "provisioning" },
  Failed: { type: "error", key: "error" },
  Error: { type: "error", key: "error" },
  CrashLoopBackOff: { type: "error", key: "crash-loop" },
  ImagePullBackOff: { type: "error", key: "image-pull-error" },
  ErrImagePull: { type: "error", key: "image-pull-error" },
  OOMKilled: { type: "error", key: "oom-killed" },
  Evicted: { type: "error", key: "evicted" },
  Succeeded: { type: "stopped", key: "stopped" },
  Completed: { type: "stopped", key: "stopped" },
  ready: { type: "success", key: "running" },
  failed: { type: "error", key: "error" },
  unknown: { type: "pending", key: "unknown" },
  started: { type: "in-progress", key: "provisioning" },
  selecting_node: { type: "in-progress", key: "provisioning" },
  building_pod_spec: { type: "in-progress", key: "provisioning" },
  allocating_nodeport: { type: "in-progress", key: "provisioning" },
  deploying_krb5: { type: "in-progress", key: "provisioning" },
  creating_pod: { type: "in-progress", key: "provisioning" },
  waiting_ready: { type: "in-progress", key: "provisioning" },
  creating_services: { type: "in-progress", key: "provisioning" },
  PENDING: { type: "pending", key: "pending" },
  PROCESSING: { type: "in-progress", key: "provisioning" },
  FULFILLED: { type: "success", key: "running" },
  DENIED: { type: "error", key: "denied" },
  MIGRATING: { type: "in-progress", key: "migrating" },
  EXPIRING: { type: "in-progress", key: "expiring" },
  DELETED: { type: "stopped", key: "deleted" },
  "lookup-failed": { type: "error", key: "lookup-failed" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toISOString().slice(0, 10);
}

function getPodExternalPorts(dto) {
  // portMappings는 "신청 때 요청한 포트"라 externalPort가 없고, pod_external_ports가 실제 배정된
  // NodePort다. 추가 포트를 한 개라도 신청하면 portMappings가 비지 않으므로 "비어있지 않은 첫
  // 배열"로 고르면 접속 정보가 통째로 "—"가 된다 — externalPort를 실제로 가진 배열을 고른다.
  const ports = [dto.podExternalPorts, dto.pod_external_ports, dto.portMappings, dto.port_mappings]
    .find((candidate) => Array.isArray(candidate) && candidate.some((port) => getExternalPort(port) != null));
  return ports ?? [];
}

function getExternalPort(port) {
  return port?.externalPort ?? port?.external_port;
}

function getInternalPort(port) {
  return port?.internalPort ?? port?.internal_port;
}

function getUsagePurpose(port) {
  return port?.usagePurpose ?? port?.usage_purpose ?? "";
}

// SSH/Jupyter 외의 추가 포트(예: novnc 6080)는 지금까지 어느 화면에도 안 나와서,
// 사용자가 배정받은 외부 포트를 알 방법이 없었다.
function toExtraPort(port) {
  const internalPort = getInternalPort(port);
  const externalPort = getExternalPort(port);
  const publicPort = toPublicPort(externalPort);
  const purpose = String(getUsagePurpose(port) || `포트 ${internalPort}`);

  // noVNC는 컨테이너가 websockify로 웹 페이지를 띄우므로 브라우저 주소로 안내할 수 있다.
  // 그 밖의 추가 포트는 사용자가 무엇을 띄울지 모르니(HTTP라는 보장이 없다) 주소만 알려준다.
  const isVnc = /vnc/i.test(purpose) || internalPort === 6080;

  return {
    internalPort,
    purpose,
    isVnc,
    // NodePort가 DNAT 대역(30000~30097) 밖이면 내부만 열리고 외부는 막힌다 — 주소를 안내하면 안 된다
    reachable: publicPort != null,
    address: publicPort != null ? `${PUBLIC_HOST}:${publicPort}` : "—",
    url: publicPort != null && isVnc ? `http://${PUBLIC_HOST}:${publicPort}` : null,
  };
}

function findPort(ports, usagePurpose, internalPort) {
  return ports.find((port) => {
    const purpose = String(getUsagePurpose(port)).toLowerCase();
    return purpose.includes(usagePurpose) || getInternalPort(port) === internalPort;
  });
}

/**
 * @param {string} podStatus K8s Pod status 또는 신청 status 문자열
 * @returns {{ type: string, label: string }}
 */
export function mapPodStatus(podStatus) {
  const normalized = typeof podStatus === "string" ? podStatus.trim() : "";
  const status = STATUS_MAP[normalized] ?? STATUS_MAP[normalized.toLowerCase()];
  return status ? { type: status.type, label: i18n.t(`status.${status.key}`) } : { type: "pending", label: podStatus || i18n.t("status.unknown") };
}

/**
 * @param {{ requestId: string | number, userId: string | number, userName: string, ubuntuUsername: string, podName: string, nodeName: string, imageName: string, imageVersion: string, resourceGroupId: string | number, expiresAt: string }} dto ContainerInfoDTO
 * @returns {{ id: string, requestId: string | number, name: string, user: string, gpu: string, node: string, status: string, label: string, expires: string }}
 */
export function mapAdminContainer(dto) {
  const status = mapPodStatus(dto.status);
  const image = [dto.imageName, dto.imageVersion].filter(Boolean).join(":");
  const detail = dto.podDetail ?? {};

  const ports = getPodExternalPorts(dto);
  const sshPort = getExternalPort(findPort(ports, "ssh", 22));
  const jupyterPort = getExternalPort(findPort(ports, "jupyter", 8888));
  const sshPublicPort = toPublicPort(sshPort);
  const jupyterPublicPort = toPublicPort(jupyterPort);
  const sshCommand = sshPort && dto.ubuntuUsername
    ? `ssh ${dto.ubuntuUsername}@${PUBLIC_HOST} -p ${sshPublicPort ?? sshPort}`
    : "—";
  const jupyterUrl = jupyterPort
    ? `http://${PUBLIC_HOST}:${jupyterPublicPort ?? jupyterPort}`
    : "—";

  return {
    // 행 식별자이자 상세 화면 주소(/admin/containers/:id). 웹 계정당 우분투 유저네임이 하나라 한 사용자가
    // 컨테이너를 여러 개 가지면 유저네임으로는 겹쳐, 표 행이 섞이고 상세가 늘 첫 컨테이너를 열었다.
    id: String(dto.requestId ?? dto.podName ?? dto.ubuntuUsername ?? dto.userId),
    requestId: dto.requestId,
    // 계정 회수(DELETE /api/admin/users/{userId}/ubuntu-account)가 사용자 번호로 대상을 정한다.
    userId: dto.userId,
    name: dto.ubuntuUsername ?? dto.userName ?? "—",
    user: dto.ubuntuUsername ?? dto.userName ?? "—",
    userName: dto.userName,
    podName: dto.podName,
    gpu: dto.resourceGroupId != null ? `리소스 그룹 ${dto.resourceGroupId}` : "—",
    node: detail.nodeName ?? dto.nodeName ?? "—",
    namespace: detail.namespace ?? "—",
    hostIP: detail.hostIP ?? "—",
    createdAt: formatDate(detail.creationTimestamp),
    podContainers: detail.containers ?? [],
    status: status.type,
    label: status.label,
    statusReason: detail.reason ?? null,
    expires: formatDate(dto.expiresAt),
    image: image || "—",
    sshCommand,
    jupyterUrl,
  };
}

/**
 * @param {string} dateStr 만료 일시 문자열
 * @param {Date} now 기준 일시
 * @returns {number}
 */
export function daysLeft(dateStr, now = new Date()) {
  const expiresAt = new Date(dateStr);
  if (Number.isNaN(expiresAt.getTime())) {
    return 0;
  }

  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

/**
 * @param {{ requestId: string | number, podExternalPorts?: Array, pod_external_ports?: Array, expiresAt: string, resourceGroupId: string | number, resourceGroup?: { resourceGroupName?: string }, imageName?: string, imageVersion?: string, ubuntuUsername?: string, status: string }} dto SaveRequestResponseDTO
 * @returns {{ id: string | number, gpuName: string, statusType: string, statusLabel: string, expiresAt: string, daysLeft: number, serverAddress: string, sshCommand: string, jupyterUrl: string, image: string }}
 */
export function mapUserServer(dto) {
  const status = mapPodStatus(dto.status);
  const resourceGroup = dto.resourceGroup ?? {};
  const ports = getPodExternalPorts(dto);
  const sshEntry = findPort(ports, "ssh", 22);
  const jupyterEntry = findPort(ports, "jupyter", 8888);
  const sshPort = getExternalPort(sshEntry);
  const jupyterPort = getExternalPort(jupyterEntry);
  const sshPublicPort = toPublicPort(sshPort);
  const jupyterPublicPort = toPublicPort(jupyterPort);
  const sshCommand = sshPort && dto.ubuntuUsername
    ? `ssh ${dto.ubuntuUsername}@${PUBLIC_HOST} -p ${sshPublicPort ?? sshPort}`
    : "—";
  const jupyterUrl = jupyterPort
    ? `http://${PUBLIC_HOST}:${jupyterPublicPort ?? jupyterPort}`
    : "—";
  const extraPorts = ports
    .filter((port) => port !== sshEntry && port !== jupyterEntry)
    .map(toExtraPort);

  return {
    id: dto.requestId,
    extraPorts,
    gpuName: resourceGroup.resourceGroupName ?? dto.resourceGroupName ?? (
      dto.resourceGroupId != null ? `리소스 그룹 ${dto.resourceGroupId}` : "—"
    ),
    statusType: status.type,
    statusLabel: status.label,
    expiresAt: dto.expiresAt,
    daysLeft: daysLeft(dto.expiresAt),
    serverAddress: sshCommand,
    sshCommand,
    jupyterUrl,
    image: [dto.imageName, dto.imageVersion].filter(Boolean).join(":")
      || dto.containerImage?.imageName
      || dto.containerImage?.name
      || "—",
    cpuCoreCount: dto.cpuCoreCount,
    memoryGB: dto.memoryGB,
  };
}
