import React, { useState, useEffect } from 'react';
import { getMessages, updateMessage, resetMessage } from '../../services/messageService';
import {
  Alert,
  Badge,
  Button,
  Container,
  FormField,
  Header,
  Modal,
  StatusIndicator,
  Table,
} from '../../design-system';

const CATEGORIES = [
  { label: '만료 알림', prefixes: ['notification.expired', 'notification.pre-expiry'] },
  { label: '관리자 알림', prefixes: ['notification.admin'] },
  { label: '승인 알림', prefixes: ['notification.approval'] },
  { label: 'Pod 정리', prefixes: ['notification.pod'] },
  { label: '사용자 관리', prefixes: ['notification.user'] },
  { label: '시스템', prefixes: ['notification.monitor', 'notification.error'] },
];

const MessageTemplatePage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetTarget, setResetTarget] = useState(null); // 초기화 확인 Modal 대상 key

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await getMessages();
      if (result.success) {
        setTemplates(result.data);
      } else {
        setAlert({ type: 'error', message: result.error });
      }
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setEditing(null);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const handleUpdate = async () => {
    if (!editing || saving) return;
    if (!editing.value.trim()) {
      setAlert({ type: 'error', message: '메시지 내용을 입력해주세요.' });
      return;
    }
    setSaving(true);
    try {
      const result = await updateMessage(editing.key, editing.value);
      if (result.success) {
        setAlert({ type: 'success', message: '메시지가 수정되었습니다.' });
        closeModal();
        fetchTemplates();
      } else {
        setAlert({ type: 'error', message: result.error });
      }
    } finally {
      setSaving(false);
    }
  };

  // 확인은 Modal에서 처리
  const handleReset = async (key) => {
    if (saving) return;
    setResetTarget(null);
    setSaving(true);
    try {
      const result = await resetMessage(key);
      if (result.success) {
        setAlert({ type: 'success', message: '기본값으로 복원되었습니다.' });
        fetchTemplates();
      } else {
        setAlert({ type: 'error', message: result.error });
      }
    } finally {
      setSaving(false);
    }
  };

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: templates.filter(t => cat.prefixes.some(p => t.key.startsWith(p))),
  })).filter(g => g.items.length > 0);

  // ponytail: catch uncategorized keys if backend adds new ones
  const categorized = new Set(grouped.flatMap(g => g.items.map(i => i.key)));
  const uncategorized = templates.filter(t => !categorized.has(t.key));
  if (uncategorized.length) grouped.push({ label: '기타', items: uncategorized });

  const columns = [
    {
      id: 'key',
      header: '키',
      cell: (t) => (
        <code style={{ fontFamily: 'var(--decs-font-mono)', color: 'var(--decs-text-body)' }}>{t.key}</code>
      ),
    },
    {
      id: 'currentValue',
      header: '현재 값',
      minWidth: '280px',
      cell: (t) => (
        <p title={t.currentValue} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '28rem', margin: 0 }}>
          {t.currentValue}
        </p>
      ),
    },
    {
      id: 'status',
      header: '상태',
      width: '100px',
      cell: (t) => (
        <Badge color={t.overridden ? 'amber' : 'grey'}>
          {t.overridden ? '수정됨' : '기본값'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '작업',
      width: '180px',
      cell: (t) => (
        <div style={{ display: 'flex', gap: 'var(--decs-space-xs)' }}>
          <Button
            iconName="pencil-square"
            onClick={() => setEditing({ key: t.key, value: t.currentValue, defaultValue: t.defaultValue })}
          >
            편집
          </Button>
          {t.overridden && (
            <Button disabled={saving} onClick={() => setResetTarget(t.key)}>
              초기화
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--decs-space-l)' }}>
      <Header variant="h1" description="알림 메시지 템플릿 목록입니다.">
        양식 관리
      </Header>

      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <Container>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--decs-space-xl) 0' }}>
            <StatusIndicator type="in-progress">불러오는 중</StatusIndicator>
          </div>
        </Container>
      ) : templates.length === 0 ? (
        <Container>
          <div style={{ textAlign: 'center', padding: 'var(--decs-space-xl) 0', color: 'var(--decs-text-secondary)' }}>
            등록된 메시지 템플릿이 없습니다.
          </div>
        </Container>
      ) : (
        grouped.map(group => (
          <Container key={group.label} disablePadding>
            <Table
              density="compact"
              trackBy="key"
              columns={columns}
              items={group.items}
              header={
                <Header variant="h2" counter={`(${group.items.length})`}>
                  {group.label}
                </Header>
              }
            />
          </Container>
        ))
      )}

      {/* 편집 Modal */}
      <Modal
        visible={!!editing}
        onDismiss={closeModal}
        header="메시지 편집"
        size="large"
        footer={
          <>
            <Button onClick={closeModal} disabled={saving}>취소</Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={!editing?.value.trim()}
              onClick={handleUpdate}
            >
              저장
            </Button>
          </>
        }
      >
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--decs-space-m)' }}>
            <code style={{ display: 'block', fontFamily: 'var(--decs-font-mono)', color: 'var(--decs-text-secondary)' }}>
              {editing.key}
            </code>

            {editing.defaultValue && editing.defaultValue !== editing.value && (
              <div style={{ background: 'var(--decs-surface-sunken)', border: '1px solid var(--decs-border-divider)', padding: 'var(--decs-space-s)' }}>
                <p style={{ color: 'var(--decs-text-inactive)', marginBottom: 'var(--decs-space-xxs)', marginTop: 0 }}>기본값</p>
                <p style={{ color: 'var(--decs-text-body)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {editing.defaultValue}
                </p>
              </div>
            )}

            <FormField
              label="메시지 내용"
              constraintText={`플레이스홀더: {0} = 사용자명, {1} = 서버명 등 (위치에 따라 다름)`}
              htmlFor="template-value"
            >
              <textarea
                id="template-value"
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  border: '1px solid var(--decs-border-input)',
                  background: 'var(--decs-surface-input)',
                  color: 'var(--decs-text-body)',
                  padding: 'var(--decs-space-s)',
                  borderRadius: 'var(--decs-radius-input)',
                  fontFamily: 'var(--decs-font-base)',
                  fontSize: 'var(--decs-fs-body-m)',
                }}
                rows={5}
                value={editing.value}
                onChange={e => setEditing({ ...editing, value: e.target.value })}
              />
            </FormField>
          </div>
        )}
      </Modal>

      {/* 초기화 확인 Modal */}
      <Modal
        visible={!!resetTarget}
        onDismiss={() => setResetTarget(null)}
        header="기본값으로 초기화"
        size="small"
        footer={
          <>
            <Button onClick={() => setResetTarget(null)} disabled={saving}>취소</Button>
            <Button
              variant="primary"
              style={{ background: 'var(--decs-status-error)', color: '#fff' }}
              loading={saving}
              onClick={() => handleReset(resetTarget)}
            >
              초기화
            </Button>
          </>
        }
      >
        {resetTarget && (
          <p style={{ margin: 0 }}>
            <code style={{ fontFamily: 'var(--decs-font-mono)' }}>{resetTarget}</code>
            의 수정된 값이 삭제되고 기본값으로 복원됩니다.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default MessageTemplatePage;
