import { useApplicationForm } from "../../hooks/useApplicationForm";
import Input from "../UI/Input";
import { UserIcon, KeyIcon } from "@heroicons/react/24/outline";

const StepUserInfo = () => {
  const { formData, handleChange, handleBlur, getFieldError, errors } =
    useApplicationForm();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900">계정 정보를 입력하세요</h2>
        <p className="text-gray-500 mt-2">
          서버에서 사용할 우분투 계정을 설정합니다.
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        <Input
          label="우분투 계정명"
          name="ubuntu_username"
          type="text"
          value={formData.ubuntu_username}
          onChange={handleChange}
          onBlur={handleBlur}
          error={getFieldError("ubuntu_username") || errors.ubuntu_username}
          placeholder="예: john_doe123"
          help="소문자, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능"
          required
          icon={UserIcon}
        />

        <Input
          label="우분투 계정 비밀번호"
          name="ubuntu_password"
          type="password"
          value={formData.ubuntu_password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={getFieldError("ubuntu_password") || errors.ubuntu_password}
          placeholder="비밀번호를 입력하세요"
          help="최소 4자 이상 입력해주세요"
          required
          icon={KeyIcon}
        />
      </div>
    </div>
  );
};

export default StepUserInfo;
