import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UserIcon,
  ServerIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  PhotoIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const Sidebar = ({ isCollapsed, userRole = "USER" }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const userMenuItems = [
    { name: "서버 신청", href: "/application", icon: ServerIcon },
    { name: "신청 현황", href: "/requests", icon: ClipboardDocumentListIcon },
    { name: "변경 요청 현황", href: "/my-change-requests", icon: ArrowsRightLeftIcon },
    { name: "리소스 모니터링", href: "/monitoring", icon: ChartBarIcon },
    { name: "계정 설정", href: "/account", icon: UserIcon },
  ];

  const adminMenuItems = [
    {
      name: "신청서 관리",
      href: "/admin/request-management",
      icon: DocumentTextIcon,
    },
    { 
      name: "변경 요청 관리", 
      href: "/admin/change-request-management", 
      icon: ArrowsRightLeftIcon 
    },
    { name: "사용자 관리", href: "/admin/users", icon: UsersIcon },
    { name: "리소스 모니터링", href: "/admin/monitoring", icon: ChartBarIcon },
    { name: "컨테이너 관리", href: "/admin/containers", icon: ServerIcon },
    { name: "이미지 관리", href: "/admin/images", icon: PhotoIcon },
    { name: "양식 관리", href: "/admin/message-templates", icon: EnvelopeIcon },
    { name: "시스템 설정", href: "/admin/settings", icon: CogIcon },
  ];

  return (
    <aside
      className={`bg-gray-900 text-white transition-all duration-300 overflow-hidden ${
        isCollapsed ? "w-16" : "w-64"
      } min-h-screen flex flex-col`}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-700 overflow-hidden">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div
            className={`ml-3 transition-all duration-300 ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            <span className="text-lg font-semibold whitespace-nowrap">
              DGU AI Lab
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 overflow-y-auto overflow-x-hidden">
        {userRole === "USER" ? (
          // 일반 사용자 메뉴
          <ul className="space-y-2 px-3 pb-4">
            {userMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 transition-colors duration-200 overflow-hidden ${
                      isActive(item.href)
                        ? "bg-brand-500 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <div
                      className={`ml-3 transition-all duration-300 ${
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      }`}
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.name}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}

            {/* 구분선 */}
            <li className={`my-4 ${isCollapsed ? "px-2" : "px-3"}`}>
              <div className="border-t border-gray-600"></div>
            </li>

            {/* 관리자 전용 라벨 - 다른 메뉴와 동일한 방식으로 처리 */}
            <li className="px-3 py-2">
              <div
                className={`transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  관리자 전용
                </span>
              </div>
            </li>

            {/* 관리자 전용 메뉴 (비활성화) */}
            {adminMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.name}>
                  <div className="flex items-center px-3 py-2 text-gray-600 cursor-not-allowed opacity-50 overflow-hidden">
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <div
                      className={`ml-3 transition-all duration-300 ${
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      }`}
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.name}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          // 관리자 메뉴
          <ul className="space-y-2 px-3 pb-4">
            {userMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 transition-colors duration-200 overflow-hidden ${
                      isActive(item.href)
                        ? "bg-brand-500 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <div
                      className={`ml-3 transition-all duration-300 ${
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      }`}
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.name}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}

            {/* 구분선 */}
            <li className={`my-4 ${isCollapsed ? "px-2" : "px-3"}`}>
              <div className="border-t border-gray-600"></div>
            </li>

            {/* 관리자 전용 라벨 - 다른 메뉴와 동일한 방식으로 처리 */}
            <li className="px-3 py-2">
              <div
                className={`transition-all duration-300 ${
                  isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  관리자 전용
                </span>
              </div>
            </li>

            {/* 관리자 전용 메뉴 */}
            {adminMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 transition-colors duration-200 overflow-hidden ${
                      isActive(item.href)
                        ? "bg-brand-500 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <div
                      className={`ml-3 transition-all duration-300 ${
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      }`}
                    >
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.name}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* User Role Badge */}
      <div className="p-4 border-t border-gray-700 overflow-hidden">
        <div className="flex items-center">
          <div
            className={`text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              isCollapsed ? "px-1 py-0.5" : "px-2 py-1"
            } ${
              userRole === "ADMIN"
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {userRole === "ADMIN" ? "관리자" : "사용자"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
