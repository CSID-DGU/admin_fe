// Mock data for the DECS admin console UI kit
export const DECS_ADMIN = {
  containers: [
    { id: "c-114", name: "gpu-job-114", user: "hjkim", gpu: "H100 ×2", node: "node-03", status: "success", label: "실행 중", expires: "2026-07-17", cpu: 72, mem: 61 },
    { id: "c-113", name: "train-bert-large", user: "sylee", gpu: "A100 ×1", node: "node-01", status: "in-progress", label: "프로비저닝 중", expires: "2026-07-20", cpu: 0, mem: 0 },
    { id: "c-112", name: "infer-svc-prod", user: "jwpark", gpu: "A100 ×1", node: "node-02", status: "error", label: "오류", expires: "2026-07-09", cpu: 0, mem: 0 },
    { id: "c-110", name: "diffusion-lab", user: "mkchoi", gpu: "H100 ×1", node: "node-03", status: "success", label: "실행 중", expires: "2026-07-11", cpu: 44, mem: 88 },
    { id: "c-108", name: "rl-sweep-07", user: "hjkim", gpu: "A100 ×4", node: "node-04", status: "pending", label: "승인 대기", expires: "—", cpu: 0, mem: 0 },
    { id: "c-104", name: "nlp-eval", user: "yjkang", gpu: "A100 ×1", node: "node-01", status: "stopped", label: "만료", expires: "2026-07-02", cpu: 0, mem: 0 },
    { id: "c-101", name: "vision-pretrain", user: "sylee", gpu: "H100 ×2", node: "node-02", status: "success", label: "실행 중", expires: "2026-07-25", cpu: 91, mem: 73 },
  ],
  users: [
    { id: "u1", name: "김현진", account: "hjkim", role: "USER", gpuHours: 412, active: 2 },
    { id: "u2", name: "이서연", account: "sylee", role: "USER", gpuHours: 388, active: 2 },
    { id: "u3", name: "박정우", account: "jwpark", role: "ADMIN", gpuHours: 96, active: 1 },
  ],
};

export const MOCK_DETAIL_SPEC = { image: "pytorch:2.3-cuda12.1", cpuMem: "16 vCPU · 128 GiB", volume: "workspace-114 · 200 GiB", uidGid: "1027 / 1027" };
export const MOCK_DETAIL_ACCESS = { host: "gpu.dgu.ac.kr", port: "32107", sshCommand: (user) => `ssh ${user}@gpu.dgu.ac.kr -p 32107` };
