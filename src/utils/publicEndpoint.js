// 서버(FARM, LAB …)마다 공인 주소와 포트 포워딩 대역이 다르다. 새 서버는 여기에 한 줄만 더하면 된다.
// pfSense 오프셋 매핑: 공인 publicPortBase~ 가 같은 오프셋으로 NodePort nodePortBase~ 에 넘어간다.
const SERVER_ENDPOINTS = {
  // FARM: 210.94.179.19:9300-9397 → NodePort 30000-30097 (26-07-15)
  FARM: { host: "210.94.179.19", nodePortBase: 30000, publicPortBase: 9300, size: 98 },
  // LAB: 포트 포워딩 대역을 알려 주지 않아 NodePort를 그대로 안내한다(forwarding 생략)
  LAB: { host: "210.94.179.18" },
};

const DEFAULT_SERVER = "FARM";

// 서버 이름을 모르는 화면(관리자 목록 등)과 아직 등록 안 된 서버는 기본 서버 값으로 안내한다.
export function endpointOf(serverName) {
  const key = String(serverName ?? "").toUpperCase();
  const endpoint = SERVER_ENDPOINTS[key] ?? SERVER_ENDPOINTS[DEFAULT_SERVER];
  return {
    host: endpoint.host,
    // NodePort를 외부 공개 포트로 변환한다. 매핑 대역 밖이면 null(외부 접속 불가).
    toPublicPort(nodePort) {
      if (!endpoint.size) return Number(nodePort) || null;
      const offset = Number(nodePort) - endpoint.nodePortBase;
      return offset >= 0 && offset < endpoint.size ? endpoint.publicPortBase + offset : null;
    },
  };
}

const defaultEndpoint = endpointOf(DEFAULT_SERVER);
export const PUBLIC_HOST = defaultEndpoint.host;
export const toPublicPort = defaultEndpoint.toPublicPort;
