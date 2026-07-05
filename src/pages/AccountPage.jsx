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
            htmlFor="account-phone"
          >
            <Input
              id="account-phone"
              type="tel"
              value={formData.phone}
              onChange={(value) =>
                handleProfileChange({ target: { name: "phone", value } })
              }
              invalid={!!errors.phone}
              placeholder="010-1234-5678"
            />
          </FormField>
        </div>

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
          <Button variant="primary" loading={isLoading} disabled={isLoading}>
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
        description="비밀번호를 정기적으로 바꾸면 계정을 더 안전하게 지킬 수 있어요."
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
            placeholder="현재 비밀번호를 입력해 주세요"
          />
        </FormField>

        <FormField
          label="새 비밀번호"
          errorText={errors.newPassword}
          constraintText="8자 이상, 영문자·숫자·특수문자 조합을 권장해요."
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
            placeholder="새 비밀번호를 입력해 주세요 (8자 이상)"
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
            placeholder="새 비밀번호를 다시 입력해 주세요"
          />
        </FormField>

        <Alert type="info" header="비밀번호 요구사항">
          <ul className="list-disc list-inside space-y-1">
            <li>최소 8자 이상이어야 해요</li>
            <li>현재 비밀번호와 달라야 해요</li>
            <li>영문자, 숫자, 특수문자 조합을 권장해요</li>
            <li>개인정보와 관련없는 비밀번호를 사용해 주세요</li>
          </ul>
        </Alert>

        <div className="flex justify-end gap-3 pt-6 border-t border-(--decs-border-divider)">
          <Button
            variant="normal"
            onClick={(e) => {
              e.preventDefault();
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
          <Button variant="primary" loading={isLoading} disabled={isLoading}>
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

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          header={alert.type === "success" ? "성공" : "오류"}
          dismissible
          onDismiss={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Tabs */}
      <Container>
        <Tabs
          activeTabId={activeTab}
          onChange={setActiveTab}
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
