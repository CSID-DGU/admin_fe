import React from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Alert, AppLayout, Button, SideNavigation, Flashbar } from "../../../design-system";
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
  const { server, servers, expiryDays, activities, awaitingRequestId, gpuOptions, envOptions, groupOptions, error, refetch } = useDecsUserData();
  const userName = user?.name || user?.email || t("portal.defaultUserName");
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
    const response = await requestService.createRequest(toRequestPayload(form));
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(t("portal.submitFailed"));
    }
    refetch();
    navigate("/user/requests");
  }

  async function submitChangeRequest({ requestId, changeType, newValue, reason }) {
    if (!requestId) throw new Error(t("portal.changeTargetMissing"));
    const pendingTypes = await loadPendingChangeTypes(requestId);
    if (pendingTypes.includes(changeType)) throw new Error(t("portal.changeAlreadyPending"));
    await requestService.createChangeRequest(requestId, { changeType, newValue, reason });
    navigate("/user/change-requests");
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
        <Routes>
          <Route index element={<UserDashboard userName={userName} server={server} expiryDays={expiryDays} activities={activities ?? []} onRequest={() => navigate("/user/request")} onConnect={() => navigate("/user/container")} onExtend={() => navigate("/user/container", { state: { extend: true } })} onDetail={() => navigate("/user/container")} />} />
          <Route path="request" element={awaitingRequestId != null ? <AwaitingRequestNotice onView={() => navigate("/user/requests")} /> : <RequestWizard onCancel={() => navigate("/user")} onDone={() => navigate("/user/requests")} gpuOptions={gpuOptions ?? []} envOptions={envOptions ?? []} groupOptions={groupOptions ?? []} onSubmit={submitRequest} accountUsername={user?.ubuntuUsername} />} />
          <Route path="container" element={<UserContainerDetail onBack={() => navigate("/user")} onChangeRequest={submitChangeRequest} loadPendingChangeTypes={loadPendingChangeTypes} groupOptions={groupOptions ?? []} servers={servers ?? []} onRestarted={refetch} />} />
          <Route path="requests" element={<RequestStatusPage onChanged={refetch} />} />
          <Route path="change-requests" element={<MyChangeRequestsPage />} />
          <Route path="account" element={<AccountPage user={user} />} />
          <Route path="monitoring" element={<ResourceMonitoringPage />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </AppLayout>
    </div>
  );
}

// 이 신청에 검토 중으로 걸려 있는 변경 요청 종류. 같은 종류는 한 번에 하나만 검토받는다(서버 규칙).
async function loadPendingChangeTypes(requestId) {
  const changes = await requestService.getMyChangeRequests();
  return (changes.data?.data ?? [])
    .filter((change) => change.originalRequestId === requestId && change.status === "PENDING")
    .map((change) => change.changeType);
}

// 승인을 기다리는 신청은 한 건만 둘 수 있다. 내용을 바꾸려면 그 신청을 취소하고 다시 낸다.
function AwaitingRequestNotice({ onView }) {
  const { t } = useTranslation();
  return (
    <Alert type="info" header={t("portal.awaitingTitle")} action={<Button onClick={onView}>{t("portal.viewRequests")}</Button>}>
      {t("portal.awaitingBody")}
    </Alert>
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
    // 30083 신청 DTO의 레거시 필수 필드. PVC UI에서는 노출하지 않는다.
    volumeSizeGiB: 20,
    usagePurpose: form.usagePurpose,
    formAnswers: form.teamInfo ? { teamInfo: form.teamInfo } : {},
    expiresAt: form.expiresAt,
    // 그룹 id로 보낸다 — 새 그룹(승인 대기)은 gid가 아직 없다.
    groupIds: (form.groupIds ?? []).map((id) => parseInt(id, 10)),
    portRequests: form.portRequests ?? [],
  };
}

export default UserPortalApp;
