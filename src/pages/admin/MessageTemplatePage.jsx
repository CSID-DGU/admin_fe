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
        <code className="font-(family-name:--decs-font-mono) text-(--decs-text-body)">{t.key}</code>
      ),
    },
    {
      id: 'currentValue',
      header: '현재 값',
      minWidth: '280px',
      cell: (t) => <p title={t.currentValue} className="truncate max-w-md m-0">{t.currentValue}</p>,
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
        <div className="flex gap-2">
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
    <div className="space-y-6">
      <Header variant="h1" description="알림 메시지 템플릿을 관리합니다.">
        양식 관리
      </Header>

      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <Container>
          <div className="flex justify-center py-12">
            <StatusIndicator type="in-progress">불러오는 중</StatusIndicator>
          </div>
        </Container>
      ) : templates.length === 0 ? (
        <Container>
          <div className="text-center py-12 text-(--decs-text-secondary)">
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
          <div className="space-y-4">
            <code className="block font-(family-name:--decs-font-mono) text-(--decs-text-secondary)">
              {editing.key}
            </code>

            {editing.defaultValue && editing.defaultValue !== editing.value && (
              <div className="bg-(--decs-surface-sunken) border border-(--decs-border-divider) p-3">
                <p className="text-(--decs-text-inactive) mb-1 m-0">기본값</p>
                <p className="text-(--decs-text-body) whitespace-pre-wrap m-0">
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
                className="w-full border border-(--decs-border-input) bg-(--decs-surface-input) text-(--decs-text-body) p-3 focus:outline-none focus:border-(--decs-border-focus) focus:ring-1 focus:ring-(--decs-border-focus)"
                style={{ borderRadius: 'var(--decs-radius-input)', fontFamily: 'var(--decs-font-base)', fontSize: 'var(--decs-fs-body-m)' }}
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
          <p className="m-0">
            <code className="font-(family-name:--decs-font-mono)">{resetTarget}</code>
            의 수정된 값이 삭제되고 기본값으로 복원됩니다.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default MessageTemplatePage;
