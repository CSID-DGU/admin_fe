import React from "react";
import { AppLayout, SideNavigation, Header, Container } from "../../../design-system";
import AdminDashboard from "./AdminDashboard";
import ContainerManagement from "./ContainerManagement";
import ContainerDetail from "./ContainerDetail";
import { DECS_ADMIN } from "./data";
import donggukLogo from "../../../assets/dongguk_university_logo.svg";

function AdminConsoleApp() {
  const [page, setPage] = React.useState("dashboard");
  const [detail, setDetail] = React.useState(null);

  const nav = {
    header: { text: "DECS Admin", href: "#dashboard" },
    activeHref: "#" + (detail ? "containers" : page),
    onFollow: (it) => { const p = (it.href || "").slice(1); if (p) { setDetail(null); setPage(p); } },
    items: [
      { text: "대시보드", href: "#dashboard", icon: "home" },
      { text: "사용자 관리", href: "#users", icon: "users" },
      { text: "컨테이너 관리", href: "#containers", icon: "cube", badge: DECS_ADMIN.containers.length },
      { type: "divider" },
      { type: "section", text: "시스템", items: [
        { text: "GPU 자원", href: "#resources", icon: "cpu-chip" },
        { text: "이미지", href: "#images", icon: "folder" },
        { text: "설정", href: "#settings", icon: "cog-6-tooth" },
      ]},
    ],
  };

  let content;
  if (detail) content = <ContainerDetail item={detail} onBack={() => setDetail(null)} />;
  else if (page === "dashboard") content = <AdminDashboard onOpenContainers={() => setPage("containers")} />;
  else if (page === "containers") content = <ContainerManagement onOpenDetail={(c) => setDetail(c)} />;
  else content = <PlaceholderPage page={page} />;

  return (
    <div style={{ height: "100vh" }}>
      <AppLayout
        identity={{ title: "DECS 관리자 콘솔", href: "#dashboard", logo: donggukLogo, onFollow: () => { setDetail(null); setPage("dashboard"); } }}
        utilities={[
          { iconName: "bell", ariaLabel: "알림", badge: 3 },
          { type: "menu", iconName: "user-circle", text: "admin@dgu" },
        ]}
        navigation={<SideNavigation {...nav} />}
        navigationWidth={248}
      >
        {content}
      </AppLayout>
    </div>
  );
}

function PlaceholderPage({ page }) {
  const titles = { users: "사용자 관리", resources: "GPU 자원 관리", images: "이미지 관리", settings: "시스템 설정" };
  return (
    <div>
      <Header variant="h1">{titles[page] || page}</Header>
      <div style={{ height: 16 }} />
      <Container><div style={{ color: "var(--decs-text-secondary)", padding: "24px 0", textAlign: "center" }}>이 화면은 동일한 AppLayout · Table · Cards 패턴으로 구성됩니다. §4 매핑표를 참고하세요.</div></Container>
    </div>
  );
}

export default AdminConsoleApp;
