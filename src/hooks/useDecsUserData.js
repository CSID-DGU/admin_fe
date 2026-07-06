import { useEffect, useState } from "react";
import { requestService } from "../services/requestService";
import { mapUserServer, daysLeft } from "../utils/decsMapper";

const ERROR_MESSAGE = "실데이터를 불러오지 못해 예시 데이터를 표시합니다.";

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

function getStatusLabel(status) {
  if (status === "PENDING") return "대기중";
  if (status === "FULFILLED") return "승인됨";
  return "거절됨";
}

function mapActivity(request) {
  const createdAt = request.createdAt ?? request.created_at;

  return {
    label: createdAt ? String(createdAt).slice(0, 10) : "—",
    value: `서버 신청 · ${getStatusLabel(request.status)}`,
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

export function useDecsUserData() {
  const [server, setServer] = useState(undefined);
  const [activities, setActivities] = useState(undefined);
  const [gpuOptions, setGpuOptions] = useState(undefined);
  const [envOptions, setEnvOptions] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      requestService.getApprovedRequests(),
      requestService.getUserRequests(),
      requestService.getGpuTypes(),
      requestService.getContainerImages(),
    ]).then(([serversResult, requestsResult, gpuTypesResult, imagesResult]) => {
      if (cancelled) return;

      let hasError = false;

      if (serversResult.status === "fulfilled" && serversResult.value?.status === 200) {
        const servers = getArrayData(serversResult.value);
        if (servers && servers.length > 0) {
          const dto = servers[0];
          const vm = mapUserServer(dto);

          setServer({
            gpuName: vm.gpuName,
            statusType: vm.statusType ?? "success",
            statusLabel: vm.statusLabel ?? "사용 가능",
            jobBadge: `내 서버 · ${vm.gpuName}`,
            jobTitle: "내 서버",
            daysLeft: vm.daysLeft ?? daysLeft(dto.expiresAt),
            expiresText: formatExpiresText(vm.expiresAt),
            sshCommand: vm.sshCommand || "—",
            jupyterUrl: vm.jupyterUrl || "—",
          });
        } else if (!servers) {
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
          const options = gpuTypes.map((g) => ({
            id: String(g.rsgroupId),
            title: g.resourceGroupName,
            desc: g.description ?? "",
            memory: g.ramGb ? `${g.ramGb} GB` : "—",
          }));
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

  const expiryDays =
    server && server.daysLeft != null && server.daysLeft <= 7
      ? server.daysLeft
      : null;

  return { server, expiryDays, activities, gpuOptions, envOptions, error };
}
