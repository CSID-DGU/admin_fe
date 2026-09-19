import { toPublicPort } from "./publicEndpoint";

// portMappings는 "신청 때 요청한 포트"라 externalPort가 없다 — 실제 배정된 NodePort는
// pod_external_ports에 있고, 사용자에게 안내할 값은 공인 IP 쪽으로 변환한 포트다.
const mapPortMappings = (request) => {
  const ports = request.podExternalPorts ?? request.pod_external_ports;
  if (!Array.isArray(ports) || ports.length === 0) return request.portMappings || [];
  return ports.map((port) => ({
    ...port,
    externalPort: toPublicPort(port.externalPort) ?? port.externalPort,
  }));
};

export const mapRequestDtoToUiModel = (request) => ({
  request_id: request.requestId,
  user_id: request.user.userId,
  user_name: request.user.name,
  user_email: request.user.email,
  user_phone: request.user.phone,
  student_id: request.user.studentId,
  department: request.user.department,
  is_active: request.user.isActive,
  rsgroup_id: request.resourceGroupId,
  rsgroup_name: request.resourceGroup.resourceGroupName,
  rsgroup_description: request.resourceGroup.description,
  server_name: request.resourceGroup.serverName,
  image_id: request.imageId,
  image_name: request.imageName,
  image_version: request.imageVersion,
  ubuntu_username: request.ubuntuUsername,
  ubuntu_gids: request.ubuntuGids,
  volume_size_GB: request.volumeSizeGiB,
  expires_at: request.expiresAt,
  usage_purpose: request.usagePurpose,
  form_answers: request.formAnswers,
  status: request.status,
  admin_comment: request.comment,
  approved_at: request.approvedAt,
  created_at: request.createdAt,
  updated_at: request.updatedAt,
  port_mappings: mapPortMappings(request),
  ubuntu_uid: request.ubuntuUid ?? null,
  ubuntu_gid: request.ubuntuGid ?? null,
});

export const mapApprovedRequestDtoToApplicationModel = (request) => ({
  request_id: request.requestId,
  gpu_model: request.resourceGroup?.resourceGroupName || "Unknown GPU",
  image_name: request.imageName,
  image_version: request.imageVersion,
  expires_at: request.expiresAt ? request.expiresAt.split("T")[0] : "N/A",
  group_names: request.ubuntuGids || [],
  usage_purpose: request.usagePurpose,
  status: request.status,
  server_name: request.resourceGroup?.serverName || "Unknown Server",
  ubuntu_username: request.ubuntuUsername,
  port_mappings: mapPortMappings(request),
  ubuntu_uid: request.ubuntuUid ?? null,
  ubuntu_gid: request.ubuntuGid ?? null,
});
