import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import DashboardLayout from "./components/Layout/DashboardLayout";
import { Container, Header, Icon } from "./design-system";
import AdminConsoleApp from "./pages/decs-console/admin/AdminConsoleApp";
import UserPortalApp from "./pages/decs-console/user/UserPortalApp";

const PlaceholderPage = ({ title }) => (
  <div className="space-y-6">
    <Header variant="h1">{title}</Header>
    <Container>
      <div className="flex flex-col items-center gap-3 py-12 text-(--decs-text-secondary)">
        <Icon name="cog-6-tooth" size={24} />
        <p className="text-sm">아직 준비하고 있어요. 곧 이곳에서 확인할 수 있어요.</p>
      </div>
    </Container>
  </div>
);

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

// Admin Pages
import RequestManagementPage from "./pages/admin/RequestManagementPage";
import ChangeRequestManagementPage from "./pages/admin/ChangeRequestManagementPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ResourceMonitoringPage from "./pages/admin/ResourceMonitoringPage";
import ImageManagementPage from "./pages/admin/ImageManagementPage";
import MessageTemplatePage from "./pages/admin/MessageTemplatePage";

// Other Pages
import AccountPage from "./pages/AccountPage";
import ServerApplicationPage from "./pages/ServerApplicationPage";
import RequestStatusPage from "./pages/RequestStatusPage";
import MyChangeRequestsPage from "./pages/MyChangeRequestsPage";
import UserResourceMonitoringPage from "./pages/ResourceMonitoringPage";

const AppContent = () => {
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "ADMIN" ? "/admin/request-management" : "/application"}
              replace
            />
          ) : (
            <LoginPage onLogin={login} />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "ADMIN" ? "/admin/request-management" : "/application"}
              replace
            />
          ) : (
            <SignupPage />
          )
        }
      />
      {/* DECS Console 예시 (디자인 시스템 데모) */}
      <Route
        path="/decs/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminConsoleApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/decs/user"
        element={
          <ProtectedRoute>
            <UserPortalApp />
          </ProtectedRoute>
        }
      />

      {/* Protected User Routes */}
      <Route
        path="/application"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <ServerApplicationPage user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <RequestStatusPage user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-change-requests"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <MyChangeRequestsPage user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <AccountPage user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/monitoring"
        element={
          <ProtectedRoute>
            <DashboardLayout user={user} onLogout={logout}>
              <UserResourceMonitoringPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/admin/request-management"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <RequestManagementPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/change-request-management"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <ChangeRequestManagementPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/applications"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <PlaceholderPage title="신청 관리" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <UserManagementPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/monitoring"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <ResourceMonitoringPage user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/containers"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <PlaceholderPage title="컨테이너 관리" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/images"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <ImageManagementPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/message-templates"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <MessageTemplatePage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requireAdmin>
            <DashboardLayout user={user} onLogout={logout}>
              <PlaceholderPage title="시스템 설정" />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Root Route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "ADMIN" ? "/admin/request-management" : "/application"}
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch All */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-8">페이지를 찾을 수 없습니다.</p>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium text-white bg-brand-500 hover:bg-brand-600"
              >
                홈으로 돌아가기
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
