import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminConsoleApp from "./pages/decs-console/admin/AdminConsoleApp";
import UserPortalApp from "./pages/decs-console/user/UserPortalApp";

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

const AppContent = () => {
  const { isAuthenticated, user, login } = useAuth();
  const homePath = user?.role === "ADMIN" ? "/decs/admin" : "/decs/user";

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
        path="/decs/admin/*"
        element={
          <ProtectedRoute requireAdmin>
            <AdminConsoleApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/decs/user/*"
        element={
          <ProtectedRoute>
            <UserPortalApp />
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
