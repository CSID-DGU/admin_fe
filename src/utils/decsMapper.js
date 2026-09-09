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
  // BE가 legacy portMappings를 빈 배열로 함께 내려서, 비어있지 않은 첫 배열을 골라야 한다
  const ports = [dto.portMappings, dto.port_mappings, dto.podExternalPorts, dto.pod_external_ports]
    .find((candidate) => Array.isArray(candidate) && candidate.length > 0);
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
    // 한 사용자가 컨테이너를 여러 개 동시에 가질 수 있어 ubuntuUsername은 행마다 겹칠 수
    // 있다 — id가 겹치면 목록의 Table trackBy와 상세 페이지 라우팅(/admin/containers/:id)이
    // 같은 유저의 다른 컨테이너를 클릭해도 항상 같은(첫 번째로 매칭되는) 컨테이너를 가리켜서,
    // 엉뚱한 컨테이너를 보거나 지우게 된다. requestId는 컨테이너 하나당 유일하므로 이걸로 쓴다.
    id: String(dto.requestId ?? dto.ubuntuUsername ?? dto.userId),
    requestId: dto.requestId,
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
    id: dto.requestId,
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
