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

/**
 * @param {string} podStatus K8s Pod status 또는 신청 status 문자열
 * @returns {{ type: string, label: string }}
 */
export function mapPodStatus(podStatus) {
  return STATUS_MAP[podStatus] || { type: "pending", label: podStatus || "알 수 없음" };
}

/**
 * @param {{ name: string, namespace: string, status: string, nodeName: string, creationTimestamp: string, labels?: { gpu?: string } }} dto PodResponseDTO
 * @returns {{ id: string, name: string, user: string, gpu: string, node: string, status: string, label: string, expires: string }}
 */
export function mapAdminContainer(dto) {
  const status = mapPodStatus(dto.status);

  return {
    id: dto.name,
    name: dto.name,
    user: dto.namespace?.replace(/^ns-/, "") ?? "—",
    gpu: dto.labels?.gpu ?? "—",
    node: dto.nodeName,
    status: status.type,
    label: status.label,
    expires: "—",
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
 * @param {{ requestId: string | number, serverAddress: string, expiresAt: string, volumeSizeGiB: number, cpuCoreCount: number, memoryGB: number, resourceGroupName: string, containerImage?: { imageName?: string, name?: string }, status: string }} dto UserServerResponseDTO
 * @returns {{ id: string | number, gpuName: string, statusType: string, statusLabel: string, expiresAt: string, daysLeft: number, serverAddress: string, image: string, volumeSizeGiB: number, cpuCoreCount: number, memoryGB: number }}
 */
export function mapUserServer(dto) {
  const status = mapPodStatus(dto.status);

  return {
    id: dto.requestId,
    gpuName: dto.resourceGroupName,
    statusType: status.type,
    statusLabel: status.label,
    expiresAt: dto.expiresAt,
    daysLeft: daysLeft(dto.expiresAt),
    serverAddress: dto.serverAddress,
    image: dto.containerImage?.imageName ?? dto.containerImage?.name ?? "—",
    volumeSizeGiB: dto.volumeSizeGiB,
    cpuCoreCount: dto.cpuCoreCount,
    memoryGB: dto.memoryGB,
  };
}
