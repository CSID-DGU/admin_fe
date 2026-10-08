import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { PHONE_PATTERN, phoneFormatError, phoneHelp, formatPhoneInput } from "../utils/validators";

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
  const { t, i18n } = useTranslation();
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
      newErrors.phone = t("account.phoneRequired");
    } else if (!PHONE_PATTERN.test(formData.phone)) {
      newErrors.phone = phoneFormatError();
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
      setProfileAlert({ type: "success", message: t("account.phoneSaved") });
      await updateUser();
    } catch (error) {
      setProfileAlert({
        type: "error",
        message: serverMessageOr(error, t("account.phoneSaveFailed")),
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const profileTabContent = (
    <div className="space-y-6">
      <Header
        variant="h3"
        description={t("account.basicDesc")}
      >
        {t("account.basicTitle")}
      </Header>

      {/* Read-only fields */}
      <KeyValuePairs
        columns={2}
        items={[
          { label: t("auth.email"), value: user?.email || t("account.emailMissing") },
          { label: t("auth.studentId"), value: user?.studentId || t("account.studentIdMissing") },
          { label: t("auth.name"), value: user?.name || t("account.nameMissing") },
          { label: t("auth.department"), value: user?.department || t("account.departmentMissing") },
          ...(user?.ubuntuUsername
            ? [{ label: t("account.ubuntuUsername"), value: user.ubuntuUsername }]
            : []),
        ]}
      />
      <p className="text-sm text-(--decs-text-secondary)">
        {t("account.immutableNote")}
      </p>
      <p className="text-sm text-(--decs-text-secondary)">
        {t("account.passwordNote")}
      </p>

      {/* Editable form */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label={t("auth.phone")}
            errorText={errors.phone}
            constraintText={phoneHelp()}
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
            {t("common.cancel")}
          </Button>
          <Button variant="primary" loading={profileLoading} disabled={profileLoading}>
            {t("common.save")}
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
        description={t("account.description")}
      >
        {t("shell.account")}
      </Header>

      <Container>{profileTabContent}</Container>

      {/* Account Status */}
      <Container header={<Header variant="h2">{t("account.statusTitle")}</Header>}>
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: t("account.accountType"),
              value: (
                <Badge color={user?.role === "ADMIN" ? "blue" : "grey"}>
                  {user?.role === "ADMIN" ? t("common.admin") : t("account.roleUser")}
                </Badge>
              ),
            },
            {
              label: t("account.statusTitle"),
              value: user?.isActive ? (
                <StatusIndicator type="success">{t("common.active")}</StatusIndicator>
              ) : (
                <StatusIndicator type="stopped">{t("common.inactive")}</StatusIndicator>
              ),
            },
            {
              label: t("account.joinedAt"),
              value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString(i18n.resolvedLanguage)
                : t("account.noInfo"),
            },
            {
              label: t("account.updatedAt"),
              value: user?.updatedAt
                ? new Date(user.updatedAt).toLocaleDateString(i18n.resolvedLanguage)
                : t("account.noInfo"),
            },
          ]}
        />
      </Container>
    </div>
  );
};

export default AccountPage;
