// pfSense FARM 공인 IP 오프셋 매핑(26-07-15): 210.94.179.19:9300-9397 → farm6:30000-30097(NodePort)을 사용자 안내용 외부 주소로 변환
export const PUBLIC_HOST = "210.94.179.19";

const NODEPORT_BASE = 30000;
const PUBLIC_PORT_BASE = 9300;
const BAND_SIZE = 98; // 외부 9300-9397

// NodePort를 외부 공개 포트로 변환한다. 매핑 대역 밖이면 null(외부 접속 불가 — 기존 표기로 폴백).
export function toPublicPort(nodePort) {
  const offset = Number(nodePort) - NODEPORT_BASE;
  return offset >= 0 && offset < BAND_SIZE ? PUBLIC_PORT_BASE + offset : null;
}
