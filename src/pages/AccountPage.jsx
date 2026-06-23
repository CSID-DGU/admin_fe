import { useState, useEffect } from "react";
import { authService } from "../services/authService";
import Card from "../components/UI/Card";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Alert from "../components/UI/Alert";
import {
  UserIcon,
  LockClosedIcon,
  PhoneIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";

const AccountPage = ({ user }) => {
  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // 사용자 정보 로드
    if (user) {
      setFormData({
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};

    if (!formData.phone.trim()) {
      newErrors.phone = "전화번호를 입력해주세요.";
    } else if (!/^[0-9-]+$/.test(formData.phone)) {
      newErrors.phone = "올바른 전화번호 형식을 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "현재 비밀번호를 입력해주세요.";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "새 비밀번호를 입력해주세요.";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "비밀번호는 8자 이상이어야 합니다.";
    } else if (
      passwordData.currentPassword &&
      passwordData.currentPassword === passwordData.newPassword
    ) {
      newErrors.newPassword = "새 비밀번호는 현재 비밀번호와 달라야 합니다.";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const response = await authService.updatePhone(formData.phone);

      if (response.status === 200) {
        setAlert({
          type: "success",
          message: "휴대폰 번호가 성공적으로 업데이트되었습니다.",
        });

        await updateUser();
      } else {
        throw new Error("휴대폰 번호 업데이트에 실패했습니다.");
      }
    } catch {
      setAlert({
        type: "error",
        message: "휴대폰 번호 업데이트에 실패했습니다. 휴대폰 번호 입력 형식에 맞지 않습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const response = await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.status === 200) {
        setAlert({
          type: "success",
          message: "비밀번호가 성공적으로 변경되었습니다.",
        });

        // 폼 초기화
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error("비밀번호 변경에 실패했습니다.");
      }
    } catch {
      setAlert({
        type: "error",
        message: "비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "profile", name: "개인정보", icon: UserIcon },
    { id: "password", name: "비밀번호 변경", icon: LockClosedIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계정 설정</h1>
        <p className="text-gray-600 mt-1">개인정보와 보안 설정을 관리하세요.</p>
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          onClose={() => setAlert(null)}
          title={alert.type === "success" ? "성공" : "오류"}
        >
          {alert.message}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-300">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-brand-500 text-brand-500"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <IconComponent
                    className={`mr-2 h-5 w-5 ${
                      activeTab === tab.id
                        ? "text-brand-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  기본 정보
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  개인정보를 확인하세요. 휴대폰 번호만 변경할 수 있습니다.
                </p>
              </div>

              {/* Read-only fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                    이메일
                  </label>
                  <div className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-md">
                    {user?.email || "이메일 정보 없음"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    이메일은 변경할 수 없습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IdentificationIcon className="w-4 h-4 inline mr-1" />
                    학번
                  </label>
                  <div className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-md">
                    {user?.studentId || "학번 정보 없음"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    학번은 변경할 수 없습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <UserIcon className="w-4 h-4 inline mr-1" />
                    이름
                  </label>
                  <div className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-md">
                    {user?.name || "이름 정보 없음"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    이름은 변경할 수 없습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AcademicCapIcon className="w-4 h-4 inline mr-1" />
                    학과
                  </label>
                  <div className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-md">
                    {user?.department || "학과 정보 없음"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    학과는 변경할 수 없습니다.
                  </p>
                </div>
              </div>

              {/* Editable form */}
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="전화번호"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    error={errors.phone}
                    placeholder="010-1234-5678"
                    required
                    icon={PhoneIcon}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-300">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        phone: user?.phone || "",
                      });
                      setErrors({});
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                    disabled={isLoading}
                    className="bg-brand-500 hover:bg-brand-600 border-brand-500 hover:border-brand-600"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    저장
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  비밀번호 변경
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  보안을 위해 정기적으로 비밀번호를 변경하는 것을 권장합니다.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <Input
                  label="현재 비밀번호"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  error={errors.currentPassword}
                  placeholder="현재 비밀번호를 입력하세요"
                  required
                  icon={LockClosedIcon}
                />

                <Input
                  label="새 비밀번호"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  error={errors.newPassword}
                  placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                  required
                  icon={LockClosedIcon}
                />

                <Input
                  label="새 비밀번호 확인"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  error={errors.confirmPassword}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                  icon={LockClosedIcon}
                />

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="text-sm text-blue-700">
                    <h4 className="font-medium mb-2">비밀번호 요구사항:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>최소 8자 이상</li>
                      <li>현재 비밀번호와 달라야 함</li>
                      <li>영문자, 숫자, 특수문자 조합 권장</li>
                      <li>개인정보와 관련없는 비밀번호 사용</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-300">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setErrors({});
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isLoading}
                    disabled={isLoading}
                    className="bg-brand-500 hover:bg-brand-600 border-brand-500 hover:border-brand-600"
                  >
                    <LockClosedIcon className="w-4 h-4 mr-1" />
                    비밀번호 변경
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Card>

      {/* Account Status */}
      <Card title="계정 상태">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              계정 유형
            </h4>
            <div
              className={`inline-flex px-2 py-1 text-xs font-medium ${
                user?.role === "ADMIN"
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {user?.role === "ADMIN" ? "관리자" : "일반 사용자"}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              계정 상태
            </h4>
            <div
              className={`inline-flex px-2 py-1 text-xs font-medium ${
                user?.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {user?.isActive ? "활성" : "비활성"}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">가입일</h4>
            <p className="text-sm text-gray-600">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "정보 없음"}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              최종 수정일
            </h4>
            <p className="text-sm text-gray-600">
              {user?.updatedAt
                ? new Date(user.updatedAt).toLocaleDateString()
                : "정보 없음"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccountPage;
