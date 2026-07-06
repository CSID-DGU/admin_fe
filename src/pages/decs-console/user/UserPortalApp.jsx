import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppLayout, SideNavigation, Flashbar } from "../../../design-system";
import UserDashboard from "./UserDashboard";
import RequestWizard from "./RequestWizard";
import UserContainerDetail from "./UserContainerDetail";
import { useAuth } from "../../../hooks/useAuth";
import { useDecsUserData } from "../../../hooks/useDecsUserData";
import { requestService } from "../../../services/requestService";
import RequestStatusPage from "../../RequestStatusPage";
import MyChangeRequestsPage from "../../MyChangeRequestsPage";
import AccountPage from "../../AccountPage";
import ResourceMonitoringPage from "../../ResourceMonitoringPage";
import donggukLogo from "../../../assets/dongguk_university_logo.svg";

function UserPortalApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { server, expiryDays, activities, gpuOptions, envOptions, error } = useDecsUserData();
  const [submitError, setSubmitError] = React.useState(null);
  const userName = user?.name || user?.email || "사용자";
  const isAdmin = user?.role === "ADMIN";

  const nav = {
    header: { text: "DECS", href: "/decs/user" },
    activeHref: getActiveHref(location.pathname),
    onFollow: (it) => navigate(it.href),
    items: [
      { text: "대시보드", href: "/decs/user", icon: "home" },
      { text: "내 컨테이너", href: "/decs/user/container", icon: "cube" },
      { text: "GPU 신청", href: "/decs/user/request", icon: "plus" },
      { text: "신청 현황", href: "/decs/user/requests", icon: "clipboard" },
      { text: "변경 요청 현황", href: "/decs/user/change-requests", icon: "arrow-path" },
      { type: "divider" },
      { text: "리소스 모니터링", href: "/decs/user/monitoring", icon: "chart-bar" },
      { text: "계정 설정", href: "/decs/user/account", icon: "user-circle" },
    ],
  };

  const utilities = [
    { iconName: "bell", ariaLabel: "알림", badge: 1 },
    {
      type: "menu",
      iconName: "user-circle",
      text: userName,
      items: [
        ...(isAdmin ? [{ text: "관리자 콘솔로", onClick: () => navigate("/decs/admin") }] : []),
        ...(isAdmin ? [{ type: "divider" }] : []),
        { text: "로그아웃", onClick: () => { logout(); navigate("/login"); } },
      ],
    },
  ];

  async function submitRequest(form) {
    setSubmitError(null);
    try {
      const response = await requestService.createRequest(toRequestPayload(form));
      if (response.status !== 200 && response.status !== 201) {
        throw new Error("신청에 실패했습니다.");
      }
      navigate("/decs/user/requests");
    } catch (error) {
      setSubmitError(error.message || "신청에 실패했습니다.");
      throw error;
    }
  }

  return (
    <div style={{ height: "100vh" }}>
      <AppLayout
        identity={{ title: "DGU GPU 포털", href: "/decs/user", logo: donggukLogo, onFollow: () => navigate("/decs/user") }}
        utilities={utilities}
        navigation={<SideNavigation {...nav} />}
        navigationWidth={240}
      >
        {error ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Flashbar items={[{ id: "decs-user-data", type: "warning", header: error, dismissible: false }]} /></div> : null}
        {submitError ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Flashbar items={[{ id: "decs-request-submit", type: "error", header: submitError, dismissible: false }]} /></div> : null}
        <Routes>
          <Route index element={<UserDashboard userName={userName} server={server} expiryDays={expiryDays} activities={activities ?? []} onRequest={() => navigate("/decs/user/request")} onConnect={() => navigate("/decs/user/container")} onExtend={() => navigate("/decs/user/container")} onDetail={() => navigate("/decs/user/container")} />} />
          <Route path="request" element={<RequestWizard onCancel={() => navigate("/decs/user")} onDone={() => navigate("/decs/user/requests")} gpuOptions={gpuOptions ?? []} envOptions={envOptions ?? []} onSubmit={submitRequest} />} />
          <Route path="container" element={<UserContainerDetail onBack={() => navigate("/decs/user")} onExtend={() => navigate("/decs/user/container")} server={server} />} />
          <Route path="requests" element={<RequestStatusPage />} />
          <Route path="change-requests" element={<MyChangeRequestsPage />} />
          <Route path="account" element={<AccountPage user={user} />} />
          <Route path="monitoring" element={<ResourceMonitoringPage />} />
          <Route path="*" element={<Navigate to="/decs/user" replace />} />
        </Routes>
      </AppLayout>
    </div>
  );
}

function getActiveHref(pathname) {
  if (pathname.startsWith("/decs/user/container")) return "/decs/user/container";
  if (pathname.startsWith("/decs/user/request") && !pathname.startsWith("/decs/user/requests")) return "/decs/user/request";
  if (pathname.startsWith("/decs/user/requests")) return "/decs/user/requests";
  if (pathname.startsWith("/decs/user/change-requests")) return "/decs/user/change-requests";
  if (pathname.startsWith("/decs/user/account")) return "/decs/user/account";
  if (pathname.startsWith("/decs/user/monitoring")) return "/decs/user/monitoring";
  return "/decs/user";
}

function toRequestPayload(form) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(form.period || 14));

  return {
    resourceGroupId: parseInt(form.gpu, 10),
    imageId: parseInt(form.env, 10),
    ubuntuUsername: form.ubuntuUsername,
    ubuntuPassword: window.btoa(unescape(encodeURIComponent(form.ubuntuPassword))),
    volumeSizeGiB: parseInt(form.volumeSizeGiB, 10),
    usagePurpose: form.usagePurpose,
    formAnswers: { purpose: form.purpose },
    expiresAt: expiresAt.toISOString(),
    ubuntuGids: [],
    portRequests: [],
  };
}

export default UserPortalApp;
