import i18n from "../i18n";

const STATUS_MAP = {
  Running: { type: "success", key: "running" },
  Pending: { type: "in-progress", key: "provisioning" },
  ContainerCreating: { type: "in-progress", key: "provisioning" },
  Failed: { type: "error", key: "error" },
  Error: { type: "error", key: "error" },
  CrashLoopBackOff: { type: "error", key: "error" },
  Succeeded: { type: "stopped", key: "stopped" },
  Completed: { type: "stopped", key: "stopped" },
  PENDING: { type: "pending", key: "pending" },
  FULFILLED: { type: "success", key: "running" },
  DENIED: { type: "error", key: "denied" },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function getApiHost() {
  try {
    return new URL(API_BASE_URL).hostname;
  } catch {
    return "localhost";
  }
}

function getApiProtocol() {
  try {
    return new URL(API_BASE_URL).protocol;
  } catch {
    return "http:";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toISOString().slice(0, 10);
}

function getPodExternalPorts(dto) {
  const ports = dto.podExternalPorts ?? dto.pod_external_ports;
  return Array.isArray(ports) ? ports : [];
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
  const status = STATUS_MAP[podStatus];
  return status ? { type: status.type, label: i18n.t(`status.${status.key}`) } : { type: "pending", label: podStatus || i18n.t("status.unknown") };
}

/**
 * @param {{ userId: string | number, userName: string, ubuntuUsername: string, podName: string, nodeName: string, imageName: string, imageVersion: string, resourceGroupId: string | number, expiresAt: string }} dto ContainerInfoDTO
 * @returns {{ id: string, name: string, user: string, gpu: string, node: string, status: string, label: string, expires: string }}
 */
export function mapAdminContainer(dto) {
  const status = mapPodStatus(dto.status);
  const image = [dto.imageName, dto.imageVersion].filter(Boolean).join(":");

  return {
    id: String(dto.ubuntuUsername ?? dto.userId),
    name: dto.ubuntuUsername ?? dto.userName ?? "—",
    user: dto.ubuntuUsername ?? dto.userName ?? "—",
    userName: dto.userName,
    podName: dto.podName,
    gpu: dto.resourceGroupId != null ? `리소스 그룹 ${dto.resourceGroupId}` : "—",
    node: dto.nodeName ?? "—",
    status: status.type,
    label: status.label,
    expires: formatDate(dto.expiresAt),
    image: image || "—",
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
 * @param {{ requestId: string | number, podExternalPorts?: Array, pod_external_ports?: Array, expiresAt: string, volumeSizeGiB: number, resourceGroupId: string | number, resourceGroup?: { resourceGroupName?: string }, imageName?: string, imageVersion?: string, ubuntuUsername?: string, status: string }} dto SaveRequestResponseDTO
 * @returns {{ id: string | number, gpuName: string, statusType: string, statusLabel: string, expiresAt: string, daysLeft: number, serverAddress: string, sshCommand: string, jupyterUrl: string, image: string, volumeSizeGiB: number }}
 */
export function mapUserServer(dto) {
  const status = mapPodStatus(dto.status);
  const resourceGroup = dto.resourceGroup ?? {};
  const ports = getPodExternalPorts(dto);
  const host = getApiHost();
  const sshPort = getExternalPort(findPort(ports, "ssh", 22));
  const jupyterPort = getExternalPort(findPort(ports, "jupyter", 8888));
  const sshCommand = sshPort && dto.ubuntuUsername
    ? `ssh ${dto.ubuntuUsername}@${host} -p ${sshPort}`
    : "—";
  const jupyterUrl = jupyterPort ? `${getApiProtocol()}//${host}:${jupyterPort}` : "—";

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
    volumeSizeGiB: dto.volumeSizeGiB,
    cpuCoreCount: dto.cpuCoreCount,
    memoryGB: dto.memoryGB,
  };
}
