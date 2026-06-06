import { useApplication } from "../../contexts/ApplicationContext";
import { CheckIcon } from "@heroicons/react/24/solid";

const STEPS = [
  { number: 1, label: "서버 유형" },
  { number: 2, label: "서버 사양" },
  { number: 3, label: "계정 정보" },
  { number: 4, label: "추가 옵션" },
  { number: 5, label: "신청 검토" },
  { number: 6, label: "신청 완료" },
];

const ApplicationStepper = () => {
  const { currentStep, goToStep, isStepValid } = useApplication();

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((step, idx) => {
          const isCompleted = step.number < currentStep && (step.number === 6 || isStepValid(step.number));
          const isCurrent = step.number === currentStep;
          const isClickable = step.number < currentStep;

          return (
            <li
              key={step.number}
              className={`relative ${idx < STEPS.length - 1 ? "flex-1" : ""}`}
            >
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(step.number)}
                  disabled={!isClickable}
                  className={`
                    relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200
                    ${isCompleted
                      ? "border-[#F68313] bg-[#F68313] text-white cursor-pointer hover:bg-[#E6750F]"
                      : isCurrent
                        ? "border-[#F68313] bg-white text-[#F68313]"
                        : "border-gray-300 bg-white text-gray-400"
                    }
                    ${isClickable ? "cursor-pointer" : "cursor-default"}
                  `}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors duration-200 ${
                      isCompleted ? "bg-[#F68313]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              <span
                className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium transition-colors duration-200 ${
                  isCurrent
                    ? "text-[#F68313]"
                    : isCompleted
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default ApplicationStepper;
