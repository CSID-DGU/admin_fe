import { useNavigate } from "react-router-dom";
import { useApplication } from "../../contexts/ApplicationContext";
import Button from "../UI/Button";
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const StepComplete = () => {
  const navigate = useNavigate();
  const { resetForm } = useApplication();

  const handleNewApplication = () => {
    resetForm();
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-[bounce_1s_ease-in-out]">
        <CheckCircleIcon className="w-12 h-12 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        서버 신청이 완료되었습니다!
      </h2>
      <p className="text-gray-500 max-w-md mb-8">
        관리자가 신청 내용을 검토한 후 승인 여부를 결정합니다.
        승인 후 서버 접속 정보가 이메일로 전송됩니다.
        <br />
        <span className="text-sm text-gray-400 mt-2 inline-block">
          승인까지 1-3일이 소요될 수 있습니다.
        </span>
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleNewApplication}
          icon={ArrowPathIcon}
        >
          새 신청하기
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate("/requests")}
          icon={ClipboardDocumentListIcon}
          className="bg-[#F68313] hover:bg-[#E6750F] border-[#F68313]"
        >
          신청 현황 보기
        </Button>
      </div>
    </div>
  );
};

export default StepComplete;
