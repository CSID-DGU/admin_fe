import apiClient from "./api.js";

export const testPodService = {
  // 202: 노드마다 신청 번호를 만들어 돌려준다. 결과는 컨테이너 목록의 test 항목으로 확인한다.
  // groupIds: Pod를 만들면서 내 계정을 넣을 공유 그룹(일반 신청서의 groupIds와 같은 값). 비우면 그룹을 바꾸지 않는다.
  create: ({ imageId, nodeIds, internalPorts, groupIds = [] }) =>
    apiClient.post("/api/admin/test-pods", { imageId, nodeIds, internalPorts, groupIds }),
};
