import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppLayout, SideNavigation, Flashbar } from "../../../design-system";
import AdminDashboard from "./AdminDashboard";
import ContainerManagement from "./ContainerManagement";
import ContainerDetail from "./ContainerDetail";
import { useDecsAdminData } from "../../../hooks/useDecsAdminData";
import { useAuth } from "../../../hooks/useAuth";
import RequestManagementPage from "../../admin/RequestManagementPage";
import ChangeRequestManagementPage from "../../admin/ChangeRequestManagementPage";
import UserManagementPage from "../../admin/UserManagementPage";
import ResourceMonitoringPage from "../../admin/ResourceMonitoringPage";
import ImageManagementPage from "../../admin/ImageManagementPage";
import MessageTemplatePage from "../../admin/MessageTemplatePage";
import donggukLogo from "../../../assets/dongguk_university_logo.svg";
import RoleSwitch from "../../../components/RoleSwitch";
import { useTranslation } from "react-i18next";

function AdminConsoleApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { containers, users, error } = useDecsAdminData();

  const nav = {
    header: { text: "DECS Admin", href: "/decs/admin" },
    activeHref: getActiveHref(location.pathname),
    onFollow: (it) => navigate(it.href),
    items: [
      { text: t("shell.dashboard"), href: "/decs/admin", icon: "home" },
      { text: t("shell.containers"), href: "/decs/admin/containers", icon: "cube", badge: containers?.length ?? 0 },
      { text: t("shell.requestManagement"), href: "/decs/admin/requests", icon: "document-text" },
      { text: t("shell.changeManagement"), href: "/decs/admin/change-requests", icon: "arrow-path" },
      { text: t("shell.users"), href: "/decs/admin/users", icon: "users" },
      { type: "divider" },
      { type: "section", text: t("shell.system"), items: [
        { text: t("shell.monitoring"), href: "/decs/admin/monitoring", icon: "chart-bar" },
        { text: t("shell.images"), href: "/decs/admin/images", icon: "folder" },
        { text: t("shell.templates"), href: "/decs/admin/message-templates", icon: "pencil-square" },
      ]},
    ],
  };

  const displayName = user?.name || user?.email || "사용자";
  const utilities = [
    { type: "custom", content: <RoleSwitch current="admin" /> },
    { text: t("common.language"), onClick: () => i18n.changeLanguage(i18n.language === "en" ? "ko" : "en") },
    { iconName: "bell", ariaLabel: t("common.notifications"), badge: 3 },
    {
      type: "menu",
      iconName: "user-circle",
      text: displayName,
      items: [
        { text: t("common.logout"), onClick: () => { logout(); navigate("/login"); } },
      ],
    },
  ];

  return (
    <div style={{ height: "100vh" }}>
      <AppLayout
        identity={{ title: t("shell.adminTitle"), href: "/decs/admin", logo: donggukLogo, onFollow: () => navigate("/decs/admin") }}
        utilities={utilities}
        navigation={<SideNavigation {...nav} />}
        navigationWidth={248}
      >
        {error ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Flashbar items={[{ id: "decs-admin-data", type: "warning", header: error, dismissible: false }]} /></div> : null}
        <Routes>
          <Route index element={<AdminDashboard onOpenContainers={() => navigate("/decs/admin/containers")} containers={containers ?? []} users={users ?? []} />} />
          <Route path="containers" element={<ContainerManagement onOpenDetail={(c) => navigate(`/decs/admin/containers/${c.id}`)} containers={containers ?? []} />} />
          <Route path="containers/:containerId" element={<ContainerDetailRoute containers={containers ?? []} />} />
          <Route path="requests" element={<RequestManagementPage />} />
          <Route path="change-requests" element={<ChangeRequestManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="monitoring" element={<ResourceMonitoringPage user={user} />} />
          <Route path="images" element={<ImageManagementPage />} />
          <Route path="message-templates" element={<MessageTemplatePage />} />
          <Route path="*" element={<Navigate to="/decs/admin" replace />} />
        </Routes>
      </AppLayout>
    </div>
  );
}

function ContainerDetailRoute({ containers }) {
  const { containerId } = useParams();
  const navigate = useNavigate();
  const item = containers.find((container) => String(container.id) === containerId);
  return <ContainerDetail item={item} onBack={() => navigate("/decs/admin/containers")} />;
}

function getActiveHref(pathname) {
  if (pathname.startsWith("/decs/admin/containers")) return "/decs/admin/containers";
  if (pathname.startsWith("/decs/admin/change-requests")) return "/decs/admin/change-requests";
  if (pathname.startsWith("/decs/admin/requests")) return "/decs/admin/requests";
  if (pathname.startsWith("/decs/admin/users")) return "/decs/admin/users";
  if (pathname.startsWith("/decs/admin/monitoring")) return "/decs/admin/monitoring";
  if (pathname.startsWith("/decs/admin/images")) return "/decs/admin/images";
  if (pathname.startsWith("/decs/admin/message-templates")) return "/decs/admin/message-templates";
  return "/decs/admin";
}

export default AdminConsoleApp;
