import { useState, useEffect } from "react";
import { authService } from "../services/authService";
import {
  Alert,
  Badge,
  Button,
  Container,
  FormField,
  Header,
  Input,
  KeyValuePairs,
  StatusIndicator,
  Tabs,
} from "../design-system";
import { useAuth } from "../hooks/useAuth";
import { PHONE_PATTERN, PHONE_FORMAT_ERROR, PHONE_HELP, formatPhoneInput } from "../utils/validators";
import { setLoginNotice } from "../utils/loginNotice";

const EMPTY_PASSWORD_DATA = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

// 서버가 답한 오류(status 있음)는 원인별 문구를 그대로 쓰고, 연결 실패 등은 기본 문구를 쓴다.
const serverMessageOr = (error, fallback) =>
  error?.status && error.message ? error.message : fallback;

const ResultAlert = ({ alert, onDismiss }) =>
  alert ? (
    <Alert type={alert.type} dismissible onDismiss={onDismiss}>
      {alert.message}
    </Alert>
  ) : null;

const AccountPage = ({ user }) => {
  const { updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    phone: "",
  });
  const [passwordData, setPasswordData] = useState(EMPTY_PASSWORD_DATA);
  const [errors, setErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);
  const [passwordAlert, setPasswordAlert] = useState(null);

  useEffect(() => {
    // 사용자 정보 로드
    if (user) {
      setFormData({
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setErrors({});
    setProfileAlert(null);
    setPasswordAlert(null);
  };

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
      newErrors.phone = "전화번호를 입력해 주세요.";
    } else if (!PHONE_PATTERN.test(formData.phone)) {
      newErrors.phone = PHONE_FORMAT_ERROR;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "현재 비밀번호를 입력해 주세요.";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "새 비밀번호를 입력해 주세요.";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "8자 이상으로 정해 주세요.";
    } else if (passwordData.newPassword.length > 72) {
      newErrors.newPassword = "72자 이하로 정해 주세요.";
    } else if (
      passwordData.currentPassword &&
      passwordData.currentPassword === passwordData.newPassword
    ) {
      newErrors.newPassword = "현재 비밀번호와 다르게 정해 주세요.";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "새 비밀번호를 한 번 더 입력해 주세요.";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "새 비밀번호와 달라요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    setProfileLoading(true);
    setProfileAlert(null);

    try {
      await authService.updatePhone(formData.phone);
      setProfileAlert({ type: "success", message: "전화번호를 바꿨어요." });
      await updateUser();
    } catch (error) {
      setProfileAlert({
        type: "error",
        message: serverMessageOr(error, "전화번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요."),
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setPasswordLoading(true);
    setPasswordAlert(null);

    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      // 비밀번호를 바꾸면 서버가 그 전에 발급된 로그인을 모두 끊는다(이 창 포함).
      setLoginNotice("비밀번호를 바꿨어요. 새 비밀번호로 다시 로그인해 주세요. SSH 접속에도 새 비밀번호를 쓰세요.");
      logout();
      return;
    } catch (error) {
      setPasswordAlert({
        type: "error",
        message: serverMessageOr(error, "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요."),
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const profileTabContent = (
    <div className="space-y-6">
      <Header
        variant="h3"
        description="개인정보를 확인할 수 있어요. 휴대폰 번호만 변경할 수 있어요."
      >
        기본 정보
      </Header>

      {/* Read-only fields */}
      <KeyValuePairs
        columns={2}
        items={[
          { label: "이메일", value: user?.email || "이메일 정보 없음" },
          { label: "학번", value: user?.studentId || "학번 정보 없음" },
          { label: "이름", value: user?.name || "이름 정보 없음" },
          { label: "학과", value: user?.department || "학과 정보 없음" },
          ...(user?.ubuntuUsername
            ? [{ label: "Ubuntu 유저네임", value: user.ubuntuUsername }]
            : []),
        ]}
      />
      <p className="text-sm text-(--decs-text-secondary)">
        이메일·학번·이름·학과는 변경할 수 없어요. 변경이 필요하면 관리자에게
        문의해 주세요.
      </p>

      {/* Editable form */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="전화번호"
            errorText={errors.phone}
            constraintText={PHONE_HELP}
            htmlFor="account-phone"
          >
            <Input
              id="account-phone"
              type="tel"
              value={formData.phone}
              onChange={(value) =>
                handleProfileChange({ target: { name: "phone", value: formatPhoneInput(value) } })
              }
              invalid={!!errors.phone}
              placeholder="010-1234-5678"
            />
          </FormField>
        </div>

        <ResultAlert alert={profileAlert} onDismiss={() => setProfileAlert(null)} />

        <div className="flex justify-end gap-3 pt-6 border-t border-(--decs-border-divider)">
          <Button
            variant="normal"
            onClick={(e) => {
              e.preventDefault();
              setFormData({
                phone: user?.phone || "",
              });
              setErrors({});
            }}
          >
            취소
          </Button>
          <Button variant="primary" loading={profileLoading} disabled={profileLoading}>
            저장
          </Button>
        </div>
      </form>
    </div>
  );

  const passwordTabContent = (
    <div className="space-y-6">
      <Header
        variant="h3"
        description="웹 로그인과 SSH(Ubuntu 계정)에 같은 비밀번호를 써요. 바꾸면 실행 중인 컨테이너에도 바로 적용되고, 새 비밀번호로 다시 로그인해야 해요."
      >
        비밀번호 변경
      </Header>

      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <FormField
          label="현재 비밀번호"
          errorText={errors.currentPassword}
          htmlFor="account-current-password"
        >
          <Input
            id="account-current-password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(value) =>
              handlePasswordChange({
                target: { name: "currentPassword", value },
              })
            }
            invalid={!!errors.currentPassword}
          />
        </FormField>

        <FormField
          label="새 비밀번호"
          errorText={errors.newPassword}
          constraintText="8~72자, 현재 비밀번호와 다르게 정해 주세요."
          htmlFor="account-new-password"
        >
          <Input
            id="account-new-password"
            type="password"
            value={passwordData.newPassword}
            onChange={(value) =>
              handlePasswordChange({ target: { name: "newPassword", value } })
            }
            invalid={!!errors.newPassword}
          />
        </FormField>

        <FormField
          label="새 비밀번호 확인"
          errorText={errors.confirmPassword}
          htmlFor="account-confirm-password"
        >
          <Input
            id="account-confirm-password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(value) =>
              handlePasswordChange({
                target: { name: "confirmPassword", value },
              })
            }
            invalid={!!errors.confirmPassword}
          />
        </FormField>

        <ResultAlert alert={passwordAlert} onDismiss={() => setPasswordAlert(null)} />

        <div className="flex justify-end pt-6 border-t border-(--decs-border-divider)">
          <Button variant="primary" loading={passwordLoading} disabled={passwordLoading}>
            비밀번호 변경
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        variant="h1"
        description="개인정보와 보안 설정을 관리할 수 있어요."
      >
        계정 설정
      </Header>

      {/* Tabs */}
      <Container>
        <Tabs
          activeTabId={activeTab}
          onChange={handleTabChange}
          tabs={[
            { id: "profile", label: "개인정보", content: profileTabContent },
            {
              id: "password",
              label: "비밀번호 변경",
              content: passwordTabContent,
            },
          ]}
        />
      </Container>

      {/* Account Status */}
      <Container header={<Header variant="h2">계정 상태</Header>}>
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "계정 유형",
              value: (
                <Badge color={user?.role === "ADMIN" ? "blue" : "grey"}>
                  {user?.role === "ADMIN" ? "관리자" : "일반 사용자"}
                </Badge>
              ),
            },
            {
              label: "계정 상태",
              value: user?.isActive ? (
                <StatusIndicator type="success">활성</StatusIndicator>
              ) : (
                <StatusIndicator type="stopped">비활성</StatusIndicator>
              ),
            },
            {
              label: "가입일",
              value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "정보 없음",
            },
            {
              label: "최종 수정일",
              value: user?.updatedAt
                ? new Date(user.updatedAt).toLocaleDateString()
                : "정보 없음",
            },
          ]}
        />
      </Container>
    </div>
  );
};

export default AccountPage;
