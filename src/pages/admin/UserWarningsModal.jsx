import { useState, useEffect } from "react";
import { warningService, formatWarningTime } from "../../services/warningService";
import { Alert, Badge, Button, FormField, Input, KeyValuePairs, Modal, Table } from "../../design-system";

const REASON_MAX = 500;

const TYPE_LABEL = { GRANT: "부여", DEDUCT: "차감", CANCEL: "취소" };
const TYPE_COLOR = { GRANT: "red", DEDUCT: "green", CANCEL: "grey" };

const ACTIONS = {
  grant: { title: "경고 부여", confirm: "경고 부여", run: (userId, reason) => warningService.grant(userId, reason) },
  deduct: { title: "경고 차감", confirm: "경고 차감", run: (userId, reason) => warningService.deduct(userId, reason) },
  cancel: {
    title: "경고 취소",
    confirm: "경고 취소",
    run: (userId, reason, warning) => warningService.cancel(userId, warning.warningId, reason),
  },
};

/**
 * 사용자의 경고 현황을 보여 주고 경고를 주거나 빼거나 취소한다.
 * 경고가 2회 이상이 되면 그 자리에서 이용 정지(컨테이너 접속 차단)가 시작되므로, 사유를 받고 한 번 더 확인받는다.
 * 차감은 정지 기간을 줄이지 않고, 취소는 그 경고로 시작된 정지를 바로 끝낸다.
 */
const UserWarningsModal = ({ user, onDismiss }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 확인받는 중인 처리: { kind: "grant" | "deduct" | "cancel", warning? }
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const loaded = await warningService.getUserWarnings(user.userId);
        if (alive) setStatus(loaded);
      } catch (e) {
        if (alive) setError(`경고 내역을 불러오지 못했습니다: ${e.message}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user.userId]);

  const begin = (kind, warning) => {
    setPending({ kind, warning });
    setReason("");
    setReasonError(null);
    setError(null);
  };

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("사유를 입력해 주세요.");
      return;
    }
    if (trimmed.length > REASON_MAX) {
      setReasonError(`사유는 ${REASON_MAX}자 이내로 입력해 주세요.`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      // 처리 응답이 바뀐 뒤의 현황이다.
      setStatus(await ACTIONS[pending.kind].run(user.userId, trimmed, pending.warning));
      setPending(null);
    } catch (e) {
      setError(e.message || "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { id: "createdAt", header: "일시", cell: (w) => formatWarningTime(w.createdAt) },
    {
      id: "type",
      header: "구분",
      cell: (w) => (
        <span style={{ display: "inline-flex", gap: "var(--decs-space-xs)", alignItems: "center" }}>
          <Badge color={TYPE_COLOR[w.type] ?? "grey"}>{TYPE_LABEL[w.type] ?? w.type}</Badge>
          {w.canceled ? <Badge color="grey">취소됨</Badge> : null}
        </span>
      ),
    },
    { id: "reason", header: "사유", cell: (w) => w.reason },
    { id: "issuedBy", header: "처리한 관리자", cell: (w) => w.issuedByName ?? "—" },
    {
      id: "actions",
      header: "",
      cell: (w) =>
        w.type === "GRANT" && !w.canceled ? (
          <Button variant="normal" disabled={saving || !!pending} onClick={() => begin("cancel", w)}>
            취소
          </Button>
        ) : null,
    },
  ];

  const confirmNotice = () => {
    if (pending.kind === "grant") {
      return status.nextSuspensionDays > 0 ? (
        <>
          {user.name} 님의 경고가 <b>{status.count + 1}회</b>가 되고, 지금부터 <b>{status.nextSuspensionDays}일</b> 동안
          이용이 정지됩니다. 정지 중에는 모든 컨테이너의 SSH·Jupyter·추가 포트 접속이 막히고, 신청·변경·재시작을
          할 수 없습니다. 컨테이너와 실행 중인 작업, 파일은 그대로 남습니다.
        </>
      ) : (
        <>
          {user.name} 님의 경고가 <b>{status.count + 1}회</b>가 됩니다. 이번에는 이용 정지가 따르지 않습니다.
        </>
      );
    }
    if (pending.kind === "deduct") {
      return (
        <>
          {user.name} 님의 경고가 <b>{status.count - 1}회</b>로 줄어듭니다. 진행 중인 이용 정지 기간은 줄지 않습니다.
        </>
      );
    }
    return (
      <>
        {formatWarningTime(pending.warning.createdAt)}에 준 경고를 취소합니다. 이 경고로 시작된 이용 정지가 아직
        끝나지 않았으면 바로 끝나고 접속이 다시 열립니다.
      </>
    );
  };

  return (
    <Modal
      visible
      size="large"
      onDismiss={saving ? undefined : onDismiss}
      dismissible={!saving}
      header={pending ? `${user.name} ${ACTIONS[pending.kind].title}` : `${user.name} 경고 관리`}
      footer={
        pending ? (
          <>
            <Button variant="normal" disabled={saving} onClick={() => setPending(null)}>
              돌아가기
            </Button>
            <Button variant="primary" loading={saving} onClick={handleConfirm}>
              {ACTIONS[pending.kind].confirm}
            </Button>
          </>
        ) : (
          <>
            <Button variant="normal" onClick={onDismiss}>
              닫기
            </Button>
            <Button variant="normal" disabled={!status?.deductible} onClick={() => begin("deduct")}>
              경고 차감
            </Button>
            <Button variant="primary" disabled={!status} onClick={() => begin("grant")}>
              경고 부여
            </Button>
          </>
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-m)" }}>
        {error && <Alert type="error">{error}</Alert>}
        {status && (
          <KeyValuePairs
            columns={3}
            items={[
              { label: "현재 경고", value: `${status.count}회` },
              {
                label: "이용 정지",
                value: status.suspendedUntil ? `${formatWarningTime(status.suspendedUntil)}까지` : "정지 중 아님",
              },
              {
                label: "다음 경고 시",
                value: status.nextSuspensionDays > 0 ? `${status.nextSuspensionDays}일 정지` : "정지 없음",
              },
            ]}
          />
        )}
        {pending && status ? (
          <>
            <Alert type="warning">{confirmNotice()}</Alert>
            <FormField
              label="사유"
              errorText={reasonError}
              constraintText="사용자에게 보내는 안내에 그대로 실립니다."
              htmlFor="warning-reason"
            >
              <Input
                id="warning-reason"
                value={reason}
                onChange={setReason}
                invalid={!!reasonError}
                disabled={saving}
                autoFocus
              />
            </FormField>
          </>
        ) : (
          <Table
            density="compact"
            trackBy="warningId"
            columns={columns}
            items={status?.history ?? []}
            loading={loading}
            empty="경고 내역이 없습니다."
          />
        )}
      </div>
    </Modal>
  );
};

export default UserWarningsModal;
