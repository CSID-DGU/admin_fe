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
} from "../design-system";
import { useAuth } from "../hooks/useAuth";
import { PHONE_PATTERN, PHONE_FORMAT_ERROR, PHONE_HELP, formatPhoneInput } from "../utils/validators";

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
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState({
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);

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

  const profileTabContent = (
    <div className="space-y-6">
      <Header
        variant="h3"
        description="휴대폰 번호만 바꿀 수 있어요."
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
      <p className="text-sm text-(--decs-text-secondary)">
        비밀번호는 웹 로그인과 SSH(Ubuntu 계정)에 함께 쓰여요. 바꾸거나 잊었을 때는
        로그아웃한 뒤 로그인 화면의 &quot;비밀번호 재설정&quot;으로 신청해 주세요. 관리자가 승인하면 적용돼요.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        variant="h1"
        description="내 정보와 비밀번호"
      >
        계정 설정
      </Header>

      <Container>{profileTabContent}</Container>

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
