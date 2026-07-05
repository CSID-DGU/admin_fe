import { useNavigate } from "react-router-dom";
import { useApplication } from "../../contexts/ApplicationContext";
import { Container, Button, Icon, StatusIndicator } from "../../design-system";

const StepComplete = () => {
  const navigate = useNavigate();
  const { resetForm } = useApplication();

  const handleNewApplication = () => {
    resetForm();
  };

  return (
    <Container>
      <div className="flex flex-col items-center py-12 text-center">
        <Icon
          name="check-circle"
          size={48}
          color="var(--decs-status-success)"
        />
        <h2 className="mt-4 text-xl font-bold text-(--decs-text-heading)">
          서버 신청이 완료되었어요
        </h2>
        <p className="mt-2 max-w-md text-(--decs-text-secondary)">
          관리자가 신청 내용을 검토한 후 승인 여부를 결정해요. 승인되면 서버
          접속 정보를 이메일로 보내드려요.
        </p>
        <div className="mt-3">
          <StatusIndicator type="pending">
            승인까지 1~3일 정도 걸릴 수 있어요
          </StatusIndicator>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            variant="normal"
            iconName="arrow-path"
            onClick={handleNewApplication}
          >
            새로 신청하기
          </Button>
          <Button
            variant="primary"
            iconName="arrow-right"
            onClick={() => navigate("/requests")}
          >
            신청 현황 보기
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default StepComplete;
