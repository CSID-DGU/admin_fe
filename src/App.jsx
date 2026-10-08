import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/Auth/ProtectedRoute";

// 로그인 화면에서는 필요 없는 번들이라 인증 후에만 지연 로드한다
const AdminConsoleApp = lazy(() => import("./pages/decs-console/admin/AdminConsoleApp"));
const UserPortalApp = lazy(() => import("./pages/decs-console/user/UserPortalApp"));

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import PasswordResetPage from "./pages/auth/PasswordResetPage";

const AppContent = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, login } = useAuth();
  const homePath = user?.role === "ADMIN" ? "/admin" : "/user";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <LoginPage onLogin={login} />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <SignupPage />
          )
        }
      />
      <Route
        path="/password-reset"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <PasswordResetPage />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AdminConsoleApp />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/*"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <UserPortalApp />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-8">{t("common.notFound")}</p>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium text-white bg-brand-500 hover:bg-brand-600"
              >
                {t("common.backHome")}
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

function RouteLoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">{t("common.loading")}</div>
    </div>
  );
}

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
