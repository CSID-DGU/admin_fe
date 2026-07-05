import { useApplicationForm } from "../../hooks/useApplicationForm";
import { FormField, Input } from "../../design-system";

const StepUserInfo = () => {
  const { formData, updateField, getFieldError, errors } = useApplicationForm();

  const err = (name) => getFieldError(name) || errors[name];

  return (
    <div className="max-w-lg space-y-6">
      <FormField
        label="우분투 계정명"
        description="서버에 로그인할 때 쓸 이름이에요."
        errorText={err("ubuntu_username")}
        constraintText="소문자, 숫자, 언더스코어(_), 하이픈(-)만 사용할 수 있어요."
        htmlFor="ubuntu_username"
      >
        <Input
          id="ubuntu_username"
          value={formData.ubuntu_username}
          onChange={(value) => updateField("ubuntu_username", value)}
          placeholder="예: john_doe123"
          iconName="user-circle"
          invalid={!!err("ubuntu_username")}
        />
      </FormField>

      <FormField
        label="우분투 계정 비밀번호"
        errorText={err("ubuntu_password")}
        constraintText="4자 이상 입력해주세요."
        htmlFor="ubuntu_password"
      >
        <Input
          id="ubuntu_password"
          type="password"
          value={formData.ubuntu_password}
          onChange={(value) => updateField("ubuntu_password", value)}
          placeholder="비밀번호를 입력하세요"
          iconName="key"
          invalid={!!err("ubuntu_password")}
        />
      </FormField>
    </div>
  );
};

export default StepUserInfo;
