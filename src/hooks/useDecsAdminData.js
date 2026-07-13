import { useEffect, useState } from "react";
import { podService } from "../services/podService";
import userService from "../services/userService";
import { mapAdminContainer } from "../utils/decsMapper";

const ERROR_MESSAGE = "실데이터를 불러오지 못해 예시 데이터를 표시합니다.";

function getArrayData(res) {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return undefined;
}

export function useDecsAdminData() {
  const [containers, setContainers] = useState(undefined);
  const [users, setUsers] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([podService.getActiveContainers(), podService.getAllPods(), userService.getAllUsers()]).then(
      ([containersResult, podsResult, usersResult]) => {
        if (cancelled) return;

        let hasError = false;

        if (containersResult.status === "fulfilled" && containersResult.value?.status === 200) {
          const activeContainers = getArrayData(containersResult.value);
          const pods = podsResult.status === "fulfilled" ? getArrayData(podsResult.value) : [];
          if (activeContainers) {
            const statusByPodName = new Map((pods || []).map((pod) => [pod.podName ?? pod.name, pod.status]));
            setContainers(activeContainers.map((container) => mapAdminContainer({ ...container, status: container.status ?? statusByPodName.get(container.podName) })));
          } else {
            hasError = true;
          }
        } else {
          hasError = true;
        }

        if (podsResult.status !== "fulfilled") hasError = true;

        if (usersResult.status === "fulfilled" && usersResult.value?.status === 200) {
          const userList = getArrayData(usersResult.value);
          if (userList) {
            setUsers(userList);
          } else {
            hasError = true;
          }
        } else {
          hasError = true;
        }

        if (hasError) {
          setError(ERROR_MESSAGE);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return { containers, users, error };
}
