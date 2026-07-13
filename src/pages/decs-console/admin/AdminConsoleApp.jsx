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
    header: { text: "DECS Admin", href: "/admin" },
    activeHref: getActiveHref(location.pathname),
    onFollow: (it) => navigate(it.href),
    items: [
      { text: t("shell.dashboard"), href: "/admin", icon: "home" },
      { text: t("shell.containers"), href: "/admin/containers", icon: "cube", badge: containers?.length ?? 0 },
      { text: t("shell.requestManagement"), href: "/admin/requests", icon: "document-text" },
      { text: t("shell.changeManagement"), href: "/admin/change-requests", icon: "arrow-path" },
      { text: t("shell.users"), href: "/admin/users", icon: "users" },
      { type: "divider" },
      { type: "section", text: t("shell.system"), items: [
        { text: t("shell.images"), href: "/admin/images", icon: "folder" },
        { text: t("shell.templates"), href: "/admin/message-templates", icon: "pencil-square" },
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
        identity={{ title: t("shell.adminTitle"), href: "/admin", logo: donggukLogo, onFollow: () => navigate("/admin") }}
        utilities={utilities}
        navigation={<SideNavigation {...nav} />}
        navigationWidth={248}
      >
        {error && (location.pathname === "/admin" || location.pathname.startsWith("/admin/containers")) ? <div style={{ marginBottom: "var(--decs-space-m)" }}><Flashbar items={[{ id: "decs-admin-data", type: "warning", header: error, dismissible: false }]} /></div> : null}
        <Routes>
          <Route index element={<AdminDashboard onOpenContainers={() => navigate("/admin/containers")} containers={containers ?? []} users={users ?? []} />} />
          <Route path="containers" element={<ContainerManagement onOpenDetail={(c) => navigate(`/admin/containers/${c.id}`)} containers={containers ?? []} />} />
          <Route path="containers/:containerId" element={<ContainerDetailRoute containers={containers ?? []} />} />
          <Route path="requests" element={<RequestManagementPage />} />
          <Route path="change-requests" element={<ChangeRequestManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="images" element={<ImageManagementPage />} />
          <Route path="message-templates" element={<MessageTemplatePage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AppLayout>
    </div>
  );
}

function ContainerDetailRoute({ containers }) {
  const { containerId } = useParams();
  const navigate = useNavigate();
  const item = containers.find((container) => String(container.id) === containerId);
  return <ContainerDetail item={item} onBack={() => navigate("/admin/containers")} />;
}

function getActiveHref(pathname) {
  if (pathname.startsWith("/admin/containers")) return "/admin/containers";
  if (pathname.startsWith("/admin/change-requests")) return "/admin/change-requests";
  if (pathname.startsWith("/admin/requests")) return "/admin/requests";
  if (pathname.startsWith("/admin/users")) return "/admin/users";
  if (pathname.startsWith("/admin/images")) return "/admin/images";
  if (pathname.startsWith("/admin/message-templates")) return "/admin/message-templates";
  return "/admin";
}

export default AdminConsoleApp;
