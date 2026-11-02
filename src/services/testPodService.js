import apiClient from "./api.js";

export const testPodService = {
  // 202: 노드마다 신청 번호를 만들어 돌려준다. 결과는 컨테이너 목록의 test 항목으로 확인한다.
  create: ({ imageId, nodeIds, internalPorts }) =>
    apiClient.post("/api/admin/test-pods", { imageId, nodeIds, internalPorts }),
};
