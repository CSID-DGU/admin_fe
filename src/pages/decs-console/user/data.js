export const DECS_USER = {
  userName: "현진",
  server: {
    gpuName: "H100 × 2",
    statusType: "success",
    statusLabel: "사용 가능",
    jobBadge: "내 학습 작업 · gpu-job-114",
    jobTitle: "내 학습 작업",
    daysLeft: 12,
    expiresText: "2026년 7월 17일 만료",
    sshCommand: "ssh hjkim@gpu.dgu.ac.kr -p 32107",
    jupyterUrl: "https://gpu.dgu.ac.kr/jupyter/hjkim",
  },
  expiryDays: 3,
  activities: [
    { label: "7월 5일", value: "gpu-job-114 접속" },
    { label: "7월 1일", value: "H100 × 2 신청 승인됨" },
    { label: "6월 28일", value: "train-bert 작업 종료" },
  ],
};
