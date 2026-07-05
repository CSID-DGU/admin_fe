import React from "react";
import { AppLayout, SideNavigation, Container } from "../../../design-system";
import UserDashboard from "./UserDashboard";
import RequestWizard from "./RequestWizard";
import UserContainerDetail from "./UserContainerDetail";
import donggukLogo from "../../../assets/dongguk_university_logo.svg";

function UserPortalApp() {
  const [page, setPage] = React.useState("dashboard");

  const nav = {
    header: { text: "DECS", href: "#dashboard" },
    activeHref: "#" + page,
    onFollow: (it) => { const p = (it.href || "").slice(1); if (p) setPage(p); },
    items: [
      { text: "대시보드", href: "#dashboard", icon: "home" },
      { text: "내 컨테이너", href: "#detail", icon: "cube" },
      { text: "GPU 신청", href: "#request", icon: "plus" },
      { text: "사용 기록", href: "#history", icon: "chart-bar" },
      { type: "divider" },
      { text: "공지사항", href: "#notice", icon: "bell" },
      { text: "도움말", href: "#help", icon: "information-circle" },
    ],
  };

  let content;
  if (page === "dashboard") content = <UserDashboard onRequest={() => setPage("request")} onConnect={() => setPage("detail")} onExtend={() => setPage("detail")} onDetail={() => setPage("detail")} />;
  else if (page === "request") content = <RequestWizard onCancel={() => setPage("dashboard")} onDone={() => setPage("dashboard")} />;
  else if (page === "detail") content = <UserContainerDetail onBack={() => setPage("dashboard")} onExtend={() => setPage("detail")} />;
  else content = <Placeholder page={page} />;

  return (
    <div style={{ height: "100vh" }}>
      <AppLayout
        identity={{ title: "DGU GPU 포털", href: "#dashboard", logo: donggukLogo, onFollow: () => setPage("dashboard") }}
        utilities={[
          { iconName: "bell", ariaLabel: "알림", badge: 1 },
          { type: "menu", iconName: "user-circle", text: "현진" },
        ]}
        navigation={<SideNavigation {...nav} />}
        navigationWidth={240}
      >
        {content}
      </AppLayout>
    </div>
  );
}

function Placeholder({ page }) {
  const t = { history: "사용 기록", notice: "공지사항", help: "도움말" };
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: "var(--decs-fs-heading-xl)", fontWeight: 700, color: "var(--decs-text-heading)" }}>{t[page] || page}</h1>
      <Container><div style={{ color: "var(--decs-text-secondary)", padding: "24px 0", textAlign: "center" }}>사용자 화면은 목적 언어와 Cards 중심으로 단순하게 구성합니다.</div></Container>
    </div>
  );
}

export default UserPortalApp;
