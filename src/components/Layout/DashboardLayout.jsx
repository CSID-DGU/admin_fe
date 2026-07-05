import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout, SideNavigation } from "../../design-system";

/**
 * DashboardLayout — DECS AppLayout 셸 조합.
 * 다크 TopNavigation(브랜드 + 유틸리티) + 라이트 SideNavigation + 앱 배경 콘텐츠.
 * 로그인 이후의 모든 페이지가 이 셸 안에서 렌더링된다.
 */
const USER_NAV_ITEMS = [
  { type: "link", text: "서버 신청", href: "/application", icon: "server-stack" },
  { type: "link", text: "신청 현황", href: "/requests", icon: "clipboard" },
  { type: "link", text: "변경 요청 현황", href: "/my-change-requests", icon: "arrow-path" },
  { type: "link", text: "리소스 모니터링", href: "/monitoring", icon: "chart-bar" },
  { type: "link", text: "계정 설정", href: "/account", icon: "user-circle" },
];

const ADMIN_NAV_ITEMS = [
  { type: "link", text: "신청서 관리", href: "/admin/request-management", icon: "document-text" },
  { type: "link", text: "변경 요청 관리", href: "/admin/change-request-management", icon: "arrow-path" },
  { type: "link", text: "사용자 관리", href: "/admin/users", icon: "users" },
  { type: "link", text: "리소스 모니터링", href: "/admin/monitoring", icon: "chart-bar" },
  { type: "link", text: "컨테이너 관리", href: "/admin/containers", icon: "cube" },
  { type: "link", text: "이미지 관리", href: "/admin/images", icon: "folder" },
  { type: "link", text: "양식 관리", href: "/admin/message-templates", icon: "pencil-square" },
  { type: "link", text: "시스템 설정", href: "/admin/settings", icon: "cog-6-tooth" },
];

const DashboardLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  const navItems = isAdmin
    ? [
        ...USER_NAV_ITEMS,
        { type: "divider" },
        { type: "section", text: "관리자 전용", items: ADMIN_NAV_ITEMS },
      ]
    : USER_NAV_ITEMS;

  return (
    <div className="h-screen">
      <AppLayout
        identity={{
          title: "DGU AI Lab",
          href: "/",
          onFollow: () => navigate("/"),
        }}
        utilities={[
          {
            iconName: "user-circle",
            text: user?.name || "사용자",
            onClick: () => navigate("/account"),
          },
          { iconName: "power", text: "로그아웃", onClick: onLogout },
        ]}
        navigation={
          <SideNavigation
            items={navItems}
            activeHref={location.pathname}
            onFollow={(item) => navigate(item.href)}
          />
        }
      >
        {children}
      </AppLayout>
    </div>
  );
};

export default DashboardLayout;
