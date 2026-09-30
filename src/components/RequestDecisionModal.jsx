// 승인·거절 사유를 받는 모달. 브라우저 prompt()/confirm()을 대체한다 — 네이티브 대화상자는
// 콘솔 스타일과 따로 놀고, 사유를 여러 줄로 적을 수도 없다.
import { useEffect, useState } from "react";
import { Modal, Button, FormField, Alert, Select } from "../design-system";

const DECISION_COPY = {
  approve: { header: "승인 처리", label: "승인 사유", confirm: "승인" },
  deny: { header: "거절 처리", label: "거절 사유", confirm: "거절" },
};

function RequestDecisionModal({ decision, submitting = false, onCancel, onConfirm }) {
  const [comment, setComment] = useState("");
  const [clusterId, setClusterId] = useState("");

  // 모달이 새로 열릴 때마다 기본 사유로 되돌린다
  useEffect(() => {
    setComment(decision?.defaultComment ?? "");
    setClusterId(decision?.defaultClusterId ?? "");
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
          onClick={() => onConfirm(comment.trim() || decision.defaultComment, clusterId)}
        >
          {copy.confirm}
        </Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
        {decision.warning ? <Alert type="warning">{decision.warning}</Alert> : null}
        {decision.clusterOptions ? (
          <FormField label="배정할 클러스터" constraintText="기본값은 신청자가 고른 클러스터입니다. 노드는 고른 클러스터 안에서 자동으로 정해집니다.">
            <Select
              selectedValue={clusterId}
              onChange={setClusterId}
              options={decision.clusterOptions}
              placeholder={decision.clusterOptions.length > 0 ? "클러스터를 선택하세요" : "선택할 클러스터 없음"}
              disabled={submitting || decision.clusterOptions.length === 0}
              ariaLabel="배정할 클러스터"
            />
          </FormField>
        ) : null}
        {/* 이미지·클러스터 짝은 서버가 검사하지 않는다(resource_group_images 미사용) */}
        {decision.clusterOptions && clusterId !== decision.defaultClusterId ? (
          <Alert type="warning">신청자가 고른 클러스터와 다릅니다. 신청한 이미지가 이 클러스터의 GPU에서 도는지 확인해 주세요. 시스템은 이미지와 클러스터의 짝을 검사하지 않습니다.</Alert>
        ) : null}
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
