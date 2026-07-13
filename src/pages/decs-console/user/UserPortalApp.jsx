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
import RoleSwitch from "../../../components/RoleSwitch";
import { useTranslation } from "react-i18next";

function UserPortalApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { server, expiryDays, activities, gpuOptions, envOptions, groupOptions, error } = useDecsUserData();
  const [submitError, setSubmitError] = React.useState(null);
  const userName = user?.name || user?.email || "사용자";
  const isAdmin = user?.role === "ADMIN";

  const nav = {
    header: { text: "DECS", href: "/user" },
    activeHref: getActiveHref(location.pathname),
    onFollow: (it) => navigate(it.href),
    items: [
      { text: t("shell.dashboard"), href: "/user", icon: "home" },
      { text: t("shell.myContainer"), href: "/user/container", icon: "cube" },
      { text: t("shell.gpuRequest"), href: "/user/request", icon: "plus" },
      { text: t("shell.requests"), href: "/user/requests", icon: "clipboard" },
      { text: t("shell.changeRequests"), href: "/user/change-requests", icon: "arrow-path" },
      { type: "divider" },
      { text: t("shell.resourceMonitoring"), href: "/user/monitoring", icon: "chart-bar" },
      { text: t("shell.account"), href: "/user/account", icon: "user-circle" },
    ],
  };

  const utilities = [
    ...(isAdmin ? [{ type: "custom", content: <RoleSwitch current="user" /> }] : []),
    { text: t("common.language"), onClick: () => i18n.changeLanguage(i18n.language === "en" ? "ko" : "en") },
    { iconName: "bell", ariaLabel: t("common.notifications"), badge: 1 },
    {
      type: "menu",
      iconName: "user-circle",
      text: userName,
      items: [
        { text: t("common.logout"), onClick: () => { logout(); navigate("/login"); } },
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
      navigate("/user/requests");
    } catch (error) {
      setSubmitError(error.message || "신청에 실패했습니다.");
      throw error;
    }
  }

  return (
    <div style={{ height: "100vh" }}>
      <AppLayout
        identity={{ title: t("shell.userTitle"), href: "/user", logo: donggukLogo, onFollow: () => navigate("/user") }}
        utilities={utilities}
        navigation={<SideNavigation {...nav} />}
        navigationWidth={240}
      >
        {error ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Flashbar items={[{ id: "decs-user-data", type: "warning", header: error, dismissible: false }]} /></div> : null}
        {submitError ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Flashbar items={[{ id: "decs-request-submit", type: "error", header: submitError, dismissible: false }]} /></div> : null}
        <Routes>
          <Route index element={<UserDashboard userName={userName} server={server} expiryDays={expiryDays} activities={activities ?? []} onRequest={() => navigate("/user/request")} onConnect={() => navigate("/user/container")} onExtend={() => navigate("/user/container")} onDetail={() => navigate("/user/container")} />} />
          <Route path="request" element={<RequestWizard onCancel={() => navigate("/user")} onDone={() => navigate("/user/requests")} gpuOptions={gpuOptions ?? []} envOptions={envOptions ?? []} groupOptions={groupOptions ?? []} onSubmit={submitRequest} />} />
          <Route path="container" element={<UserContainerDetail onBack={() => navigate("/user")} onExtend={() => navigate("/user/container")} server={server} />} />
          <Route path="requests" element={<RequestStatusPage />} />
          <Route path="change-requests" element={<MyChangeRequestsPage />} />
          <Route path="account" element={<AccountPage user={user} />} />
          <Route path="monitoring" element={<ResourceMonitoringPage />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </AppLayout>
    </div>
  );
}

function getActiveHref(pathname) {
  if (pathname.startsWith("/user/container")) return "/user/container";
  if (pathname.startsWith("/user/request") && !pathname.startsWith("/user/requests")) return "/user/request";
  if (pathname.startsWith("/user/requests")) return "/user/requests";
  if (pathname.startsWith("/user/change-requests")) return "/user/change-requests";
  if (pathname.startsWith("/user/account")) return "/user/account";
  if (pathname.startsWith("/user/monitoring")) return "/user/monitoring";
  return "/user";
}

function toRequestPayload(form) {
  return {
    resourceGroupId: parseInt(form.gpu, 10),
    imageId: parseInt(form.env, 10),
    ubuntuUsername: form.ubuntuUsername,
    ubuntuPassword: window.btoa(unescape(encodeURIComponent(form.ubuntuPassword))),
    volumeSizeGiB: parseInt(form.volumeSizeGiB, 10),
    usagePurpose: form.usagePurpose,
    formAnswers: { purpose: form.purpose },
    expiresAt: form.expiresAt,
    ubuntuGids: (form.ubuntuGids ?? []).map((gid) => parseInt(gid, 10)),
    portRequests: form.portRequests ?? [],
  };
}

export default UserPortalApp;
