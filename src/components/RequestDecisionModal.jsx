// 승인·거절 사유를 받는 모달. 브라우저 prompt()/confirm()을 대체한다 — 네이티브 대화상자는
// 콘솔 스타일과 따로 놀고, 사유를 여러 줄로 적을 수도 없다.
import { useEffect, useState } from "react";
import { Modal, Button, FormField, Alert } from "../design-system";

const DECISION_COPY = {
  approve: { header: "승인 처리", label: "승인 사유", confirm: "승인" },
  deny: { header: "거절 처리", label: "거절 사유", confirm: "거절" },
};

function RequestDecisionModal({ decision, submitting = false, onCancel, onConfirm }) {
  const [comment, setComment] = useState("");

  // 모달이 새로 열릴 때마다 기본 사유로 되돌린다
  useEffect(() => {
    setComment(decision?.defaultComment ?? "");
  }, [decision]);

  if (!decision) return null;

  const copy = DECISION_COPY[decision.kind];

  return (
    <Modal
      visible
      onDismiss={() => !submitting && onCancel()}
      header={`${copy.header}${decision.title ? ` — ${decision.title}` : ""}`}
      footer={<>
        <Button variant="normal" disabled={submitting} onClick={onCancel}>취소</Button>
        <Button
          variant={decision.kind === "approve" ? "primary" : "normal"}
          loading={submitting}
          style={decision.kind === "deny" ? { color: "var(--decs-status-error)", borderColor: "var(--decs-status-error)" } : undefined}
          onClick={() => onConfirm(comment.trim() || decision.defaultComment)}
        >
          {copy.confirm}
        </Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
        {decision.warning ? <Alert type="warning">{decision.warning}</Alert> : null}
        <FormField label={copy.label} constraintText="입력한 내용이 신청자에게 그대로 전달됩니다. 비우면 기본 문구로 보냅니다.">
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder={decision.defaultComment}
            style={{
              width: "100%", boxSizing: "border-box", resize: "vertical",
              padding: "var(--decs-space-s) var(--decs-space-m)",
              font: "inherit", color: "var(--decs-text-body)",
              background: "var(--decs-surface-input)",
              border: "thin solid var(--decs-border-input)",
              borderRadius: "var(--decs-radius-input)",
            }}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default RequestDecisionModal;
