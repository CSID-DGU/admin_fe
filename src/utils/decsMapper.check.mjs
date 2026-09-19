// 접속 정보 포트 선택 자체 점검 — `node src/utils/decsMapper.check.mjs`
// (확장자 없는 import를 Vite처럼 풀어주는 resolve 훅이 필요해 register를 먼저 건다)
import { register } from "node:module";
register("data:text/javascript," +
  "export async function resolve(s,c,n){try{return await n(s,c)}catch{return n(s+'.js',c)}}" +
  "export function load(u,c,n){return u.endsWith('.json')?n(u,{...c,importAttributes:{type:'json'}}):n(u,c)}");

const assert = (await import("node:assert")).default;
const { mapUserServer } = await import("./decsMapper.js");

// 신청 때 요청한 포트(portMappings)가 차 있어도 실제 배정된 NodePort로 접속 정보를 만든다
const vm = mapUserServer({
  requestId: 11, ubuntuUsername: "dongmin0204", status: "FULFILLED", expiresAt: "2026-10-03T23:59:59",
  portMappings: [{ internalPort: 6080, usagePurpose: "novnc", isActive: false }],
  pod_external_ports: [
    { internalPort: 22, externalPort: 30007, usagePurpose: "ssh" },
    { internalPort: 8888, externalPort: 30008, usagePurpose: "jupyter" },
    { internalPort: 6080, externalPort: 30010, usagePurpose: "novnc" },
    { internalPort: 6006, externalPort: 30011, usagePurpose: "tensorboard" },
  ],
});
assert.equal(vm.sshCommand, "ssh dongmin0204@210.94.179.19 -p 9307");
assert.equal(vm.jupyterUrl, "http://210.94.179.19:9308");
// noVNC만 브라우저 주소를 준다. 일반 추가 포트는 주소만(url=null) 안내한다.
assert.deepEqual(
  vm.extraPorts.map((port) => [port.purpose, port.address, port.url, port.isVnc]),
  [
    ["novnc", "210.94.179.19:9310", "http://210.94.179.19:9310", true],
    ["tensorboard", "210.94.179.19:9311", null, false],
  ]
);

// DNAT 대역(30000~30097) 밖 NodePort는 외부 접속 불가로 표시한다
const outOfBand = mapUserServer({
  requestId: 12, ubuntuUsername: "u", status: "FULFILLED", expiresAt: "2026-10-03T23:59:59",
  pod_external_ports: [{ internalPort: 6080, externalPort: 30120, usagePurpose: "novnc" }],
});
assert.equal(outOfBand.extraPorts[0].reachable, false);

console.log("decsMapper check ok");
