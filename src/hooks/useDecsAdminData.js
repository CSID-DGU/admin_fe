import { useCallback, useEffect, useRef, useState } from "react";
import { podService } from "../services/podService";
import userService from "../services/userService";
import { requestService } from "../services/requestService";
import { mapAdminContainer } from "../utils/decsMapper";

const GENERIC_ERROR_MESSAGE = "일부 정보를 불러오지 못했습니다.";

function getArrayData(res) {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return undefined;
}

// effectiveStatus는 phase(예: Running)보다 컨테이너 실제 waiting/terminated 사유(CrashLoopBackOff 등)를 우선한다.
// Pod가 없을 때: 아직 한 번도 읽지 못했으면 알 수 없음, 이동·만료 중이면 신청 상태, 그 밖엔 Pod 없음이다.
function containerStatusOf(container) {
  const pod = container.pod;
  if (pod) return pod.effectiveStatus ?? pod.status;
  if (!container.statusCheckedAt) return "unknown";
  if (container.status && container.status !== "FULFILLED") return container.status;
  return "pod-missing";
}

export function useDecsAdminData() {
  const [containers, setContainers] = useState(undefined);
  const [users, setUsers] = useState(undefined);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [pendingChangeRequestCount, setPendingChangeRequestCount] = useState(0);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);

    const [containersResult, usersResult, requestCountsResult, changeRequestsResult] = await Promise.allSettled([
      podService.getActiveContainers(),
      userService.getAllUsers(),
      requestService.getRequestStatusCounts(),
      requestService.getChangeRequests(),
    ]);
    if (cancelledRef.current) return;

    if (requestCountsResult.status === "fulfilled") {
      setPendingRequestCount(requestCountsResult.value?.data?.data?.PENDING ?? 0);
    }
    if (changeRequestsResult.status === "fulfilled") {
      const changeRequestsArray = getArrayData(changeRequestsResult.value) ?? [];
      setPendingChangeRequestCount(changeRequestsArray.filter((r) => r.status === "PENDING").length);
    }

    let hasError = false;
    // 어떤 컨테이너/데이터가 실패했는지 구체적으로 알려주기 위해 실패 사유를 모은다 —
    // "일부 정보를 불러오지 못했습니다"만 뜨면 관리자가 뭘 다시 확인해야 할지 알 수 없다.
    const failureDetails = [];

    if (containersResult.status === "fulfilled" && containersResult.value?.status === 200) {
      const activeContainers = getArrayData(containersResult.value);
      if (activeContainers) {
        // Pod 상태는 목록 응답에 이미 들어 있다(admin_be가 주기적으로 읽어 둔 값) — Pod마다 따로 묻지 않는다.
        setContainers(activeContainers.map((container) => mapAdminContainer({
          ...container,
          podDetail: container.pod,
          status: containerStatusOf(container),
        })));
      } else {
        hasError = true;
        failureDetails.push("컨테이너 목록");
      }
    } else {
      hasError = true;
      failureDetails.push("컨테이너 목록");
    }

    if (usersResult.status === "fulfilled" && usersResult.value?.status === 200) {
      const userList = getArrayData(usersResult.value);
      if (userList) {
        setUsers(userList);
      } else {
        hasError = true;
        failureDetails.push("사용자 목록");
      }
    } else {
      hasError = true;
      failureDetails.push("사용자 목록");
    }

    if (hasError) {
      setError(`${GENERIC_ERROR_MESSAGE} (${failureDetails.join(", ")})`);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();

    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  return { containers, users, pendingRequestCount, pendingChangeRequestCount, error, refetch: load };
}
