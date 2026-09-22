import { useEffect, useState } from "react";
import { requestService } from "../services/requestService";
import { mapUserServer, mapPodStatus, daysLeft } from "../utils/decsMapper";

// 예시 데이터로 대체하는 코드는 없다 — 못 불러온 영역은 그냥 빈 채로 남는다.
const ERROR_MESSAGE = "일부 정보를 불러오지 못했습니다. 새로고침해도 같으면 관리자에게 문의해주세요.";

function getArrayData(res) {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return undefined;
}

function formatExpiresText(expiresAt) {
  if (!expiresAt) return "—";

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "—";

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 만료`;
}

// PENDING/FULFILLED 외의 값(PROCESSING, MIGRATING, EXPIRING 등)을 전부 "거절됨"으로
// 잘못 표시하던 자체 매핑을 없애고, 서버 상태와 동일한 단일 소스(mapPodStatus)를 쓴다.
function getStatusLabel(status) {
  return mapPodStatus(status).label;
}

function mapActivity(request) {
  const createdAt = request.createdAt ?? request.created_at;

  return {
    label: createdAt ? String(createdAt).slice(0, 10) : "—",
    value: `서버 신청 · ${getStatusLabel(request.status)}`,
    requestId: request.requestId ?? request.request_id,
    status: request.status,
    statusLabel: getStatusLabel(request.status),
    createdAt,
    resourceGroupName: request.resourceGroup?.resourceGroupName ?? request.resource_group?.resource_group_name,
    serverName: request.resourceGroup?.serverName ?? request.resource_group?.server_name,
    imageName: request.imageName ?? request.image_name,
    imageVersion: request.imageVersion ?? request.image_version,
    usagePurpose: request.usagePurpose ?? request.usage_purpose,
    expiresAt: request.expiresAt ?? request.expires_at,
    comment: request.comment,
  };
}

function getImageDate(imageVersion) {
  const match = String(imageVersion ?? "").match(/(\d{6})(?!.*\d{6})/);
  return match ? Number(match[1]) : 0;
}

function sortImagesByLatest(a, b) {
  const bImageId = Number(b.imageId ?? 0);
  const aImageId = Number(a.imageId ?? 0);
  if (bImageId !== aImageId) return bImageId - aImageId;
  return getImageDate(b.imageVersion) - getImageDate(a.imageVersion);
}

function normalizeGpuOption(gpu) {
  const rsgroupId = gpu.rsgroupId ?? gpu.rsgroup_id ?? gpu.resourceGroupId ?? gpu.resource_group_id ?? gpu.id;
  const nodeId = gpu.nodeId ?? gpu.node_id ?? gpu.nodeName ?? gpu.node_name;
  return {
    rsgroupId,
    resourceGroupName: gpu.resourceGroupName ?? gpu.resource_group_name ?? gpu.gpuModel ?? gpu.gpu_model ?? "GPU",
    serverName: gpu.serverName ?? gpu.server_name ?? "—",
    ramGb: gpu.ramGb ?? gpu.ram_gb ?? gpu.ramGiB ?? gpu.ram_gib,
    availableNodes: gpu.availableNodes ?? gpu.available_nodes ?? gpu.availableNodeCount ?? gpu.available_node_count ?? 0,
    nodeId,
    description: gpu.description ?? "",
  };
}

function buildGpuOptions(gpuTypes) {
  return Object.values(
    gpuTypes.reduce((acc, rawGpu) => {
      const gpu = normalizeGpuOption(rawGpu);
      if (gpu.rsgroupId == null) return acc;
      const key = String(gpu.rsgroupId);
      if (!acc[key]) {
        acc[key] = { id: key, title: gpu.resourceGroupName, desc: "", memory: gpu.ramGb ? `${gpu.ramGb} GB` : "—", availableNodes: 0, serverNames: [], nodeIds: [] };
      }
      acc[key].availableNodes += Number(gpu.availableNodes) || 0;
      if (gpu.serverName && !acc[key].serverNames.includes(gpu.serverName)) acc[key].serverNames.push(gpu.serverName);
      if (gpu.nodeId && !acc[key].nodeIds.includes(gpu.nodeId)) acc[key].nodeIds.push(gpu.nodeId);
      return acc;
    }, {})
  ).map((option) => ({
    ...option,
    serverName: option.serverNames[0] ?? "",
    desc: option.nodeIds.map((n) => n.toUpperCase()).join(", ") || option.serverNames.join(", ") || "—",
    memory: `${option.memory} VRAM · 가용 노드 ${option.nodeIds.length || option.availableNodes || 1}개`,
  }));
}

function buildServerVm(dto, groupNameByGid = {}) {
  const vm = mapUserServer(dto);
  const serverName = dto.resourceGroup?.serverName ?? "";
  // 웹 계정 하나당 우분투 유저네임이 하나로 고정되면서, 한 사용자가 컨테이너를 여러 개
  // 동시에 가질 때 ubuntuUsername만으로는 서로 구분이 안 된다 — 신청 시 적어낸 사용
  // 목적이 그나마 본인이 알아볼 수 있는 유일한 값이라 이걸 제목으로 쓴다.
  const usagePurpose = dto.usagePurpose ?? dto.usage_purpose;

  return {
    requestId: vm.id,
    ubuntuUsername: dto.ubuntuUsername ?? "—",
    usagePurpose,
    image: vm.image,
    expiresAt: vm.expiresAt,
    gpuName: serverName || vm.gpuName,
    gpuSpec: serverName ? vm.gpuName : null,
    statusType: vm.statusType ?? "success",
    statusLabel: vm.statusLabel ?? "사용 가능",
    jobBadge: `내 서버 · ${serverName || vm.gpuName}`,
    jobTitle: usagePurpose || "내 서버",
    daysLeft: vm.daysLeft ?? daysLeft(dto.expiresAt),
    expiresText: formatExpiresText(vm.expiresAt),
    sshCommand: vm.sshCommand || "—",
    jupyterUrl: vm.jupyterUrl || "—",
    extraPorts: vm.extraPorts ?? [],
    // SaveRequestResponseDTO.ubuntuGids는 gid만 준다 — 이름은 /api/groups 조회 결과(groupOptions와
    // 같은 소스)에서 찾아 붙인다. 그룹 목록 API에 없는 gid는 관리자가 DB에서 그룹을 지운 경우라
    // 이름 대신 "GID <n>"으로 표시한다.
    groups: (dto.ubuntuGids ?? []).map((gid) => ({
      ubuntuGid: gid,
      groupName: groupNameByGid[String(gid)] ?? `GID ${gid}`,
    })),
  };
}

export function useDecsUserData() {
  const [servers, setServers] = useState(undefined);
  const [activities, setActivities] = useState(undefined);
  const [gpuOptions, setGpuOptions] = useState(undefined);
  const [envOptions, setEnvOptions] = useState(undefined);
  const [groupOptions, setGroupOptions] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      requestService.getApprovedRequests(),
      requestService.getUserRequests(),
      requestService.getGpuTypes(),
      requestService.getContainerImages(),
      requestService.getGroups(),
    ]).then(([serversResult, requestsResult, gpuTypesResult, imagesResult, groupsResult]) => {
      if (cancelled) return;

      let hasError = false;

      // 그룹명 조회를 서버 목록보다 먼저 풀어서, 신청 응답의 gid 목록(ubuntuGids)을
      // 그룹명과 짝지어 "내 컨테이너"의 소속 그룹 표시에 쓴다.
      let groupNameByGid = {};
      if (groupsResult.status === "fulfilled" && groupsResult.value?.status === 200) {
        const groups = getArrayData(groupsResult.value);
        if (groups) {
          groupNameByGid = Object.fromEntries(
            groups.map((g) => [String(g.ubuntuGid ?? g.ubuntu_gid), g.groupName ?? g.group_name])
          );
          setGroupOptions(groups.map((g) => ({
            value: String(g.ubuntuGid ?? g.ubuntu_gid),
            label: `${g.groupName ?? g.group_name} (${g.ubuntuGid ?? g.ubuntu_gid})`,
            groupName: g.groupName ?? g.group_name,
            ubuntuGid: g.ubuntuGid ?? g.ubuntu_gid,
          })).filter((g) => g.value !== "undefined"));
        } else {
          hasError = true;
        }
      } else {
        hasError = true;
      }

      if (serversResult.status === "fulfilled" && serversResult.value?.status === 200) {
        const serverDtos = getArrayData(serversResult.value);
        if (serverDtos) {
          // 만료 임박 순 — 대시보드 단일 카드와 만료 경고는 가장 급한 컨테이너 기준
          setServers(
            serverDtos
              .map((dto) => buildServerVm(dto, groupNameByGid))
              .sort((a, b) => a.daysLeft - b.daysLeft)
          );
        } else {
          hasError = true;
        }
      } else {
        hasError = true;
      }

      if (requestsResult.status === "fulfilled" && requestsResult.value?.status === 200) {
        const requests = getArrayData(requestsResult.value);
        if (requests) {
          setActivities(
            [...requests]
              .sort((a, b) => {
                const aDate = a.createdAt ?? a.created_at;
                const bDate = b.createdAt ?? b.created_at;
                return new Date(bDate).getTime() - new Date(aDate).getTime();
              })
              .slice(0, 3)
              .map(mapActivity)
          );
        } else {
          hasError = true;
        }
      } else {
        hasError = true;
      }

      if (gpuTypesResult.status === "fulfilled" && gpuTypesResult.value?.status === 200) {
        const gpuTypes = getArrayData(gpuTypesResult.value);
        if (gpuTypes) {
          const options = buildGpuOptions(gpuTypes);
          if (options.length > 0) {
            setGpuOptions(options);
          }
        } else {
          hasError = true;
        }
      } else {
        hasError = true;
      }

      if (imagesResult.status === "fulfilled" && imagesResult.value?.status === 200) {
        const images = getArrayData(imagesResult.value);
        if (images) {
          const decsImages = images.filter((im) => im.imageName === "dguailab/decs");
          const visibleImages = decsImages.length > 0 ? decsImages : images;
          const options = [...visibleImages].sort(sortImagesByLatest).map((im) => ({
            value: String(im.imageId),
            label: [im.imageName, im.imageVersion].filter(Boolean).join(" "),
            description: im.description ?? undefined,
          }));
          if (options.length > 0) {
            setEnvOptions(options);
          }
        } else {
          hasError = true;
        }
      } else {
        hasError = true;
      }

      if (hasError) {
        setError(ERROR_MESSAGE);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const server = servers?.[0];
  const expiryDays =
    server && server.daysLeft != null && server.daysLeft <= 7
      ? server.daysLeft
      : null;

  return { server, servers, expiryDays, activities, gpuOptions, envOptions, groupOptions, error };
}
