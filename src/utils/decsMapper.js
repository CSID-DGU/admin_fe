const STATUS_MAP = {
  Running: { type: "success", label: "실행 중" },
  Pending: { type: "in-progress", label: "프로비저닝 중" },
  ContainerCreating: { type: "in-progress", label: "프로비저닝 중" },
  Failed: { type: "error", label: "오류" },
  Error: { type: "error", label: "오류" },
  CrashLoopBackOff: { type: "error", label: "오류" },
  Succeeded: { type: "stopped", label: "종료" },
  Completed: { type: "stopped", label: "종료" },
  PENDING: { type: "pending", label: "승인 대기" },
  FULFILLED: { type: "success", label: "실행 중" },
  DENIED: { type: "error", label: "거절됨" },
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
  return STATUS_MAP[podStatus] || { type: "pending", label: podStatus || "알 수 없음" };
}

/**
 * @param {{ userId: string | number, userName: string, ubuntuUsername: string, podName: string, nodeName: string, imageName: string, imageVersion: string, resourceGroupId: string | number, expiresAt: string }} dto ContainerInfoDTO
 * @returns {{ id: string, name: string, user: string, gpu: string, node: string, status: string, label: string, expires: string }}
 */
export function mapAdminContainer(dto) {
  const status = mapPodStatus(dto.status ?? "FULFILLED");
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
