import { useEffect, useState } from "react";
import { podService } from "../services/podService";
import userService from "../services/userService";
import { mapAdminContainer } from "../utils/decsMapper";

const ERROR_MESSAGE = "일부 Pod 상세 정보를 불러오지 못했습니다.";

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

    async function load() {
      const [containersResult, usersResult] = await Promise.allSettled([
        podService.getActiveContainers(),
        userService.getAllUsers(),
      ]);
      if (cancelled) return;

      let hasError = false;

      if (containersResult.status === "fulfilled" && containersResult.value?.status === 200) {
        const activeContainers = getArrayData(containersResult.value);
        if (activeContainers) {
          const details = await Promise.allSettled(activeContainers.map((container) =>
            container.podName ? podService.getPod(container.podName) : Promise.resolve(null)
          ));
          if (cancelled) return;
          setContainers(activeContainers.map((container, index) => {
            const result = details[index];
            const detail = result.status === "fulfilled" ? result.value?.data : null;
            if (container.podName && !detail) hasError = true;
            return mapAdminContainer({ ...container, podDetail: detail, status: detail?.status });
          }));
        } else {
          hasError = true;
        }
      } else {
        hasError = true;
      }

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

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { containers, users, error };
}
