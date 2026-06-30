import React, { useState, useEffect } from 'react';
import { getMessages, updateMessage, resetMessage } from '../../services/messageService';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import Badge from '../../components/UI/Badge';

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

  const handleReset = async (key) => {
    if (saving || !window.confirm('기본값으로 초기화하시겠습니까?')) return;
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

  return (
    <div className="p-6">
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">양식 관리</h1>
        <p className="text-gray-600 mt-1">알림 메시지 템플릿을 관리합니다.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">등록된 메시지 템플릿이 없습니다.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <Card key={group.label}>
              <h2 className="text-lg font-medium text-gray-900 mb-4">{group.label}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">키</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재 값</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.items.map(t => (
                      <tr key={t.key} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono whitespace-nowrap">{t.key}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                          <p className="truncate">{t.currentValue}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={t.overridden ? 'warning' : 'default'}>
                            {t.overridden ? '수정됨' : '기본값'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                          <Button
                            size="small"
                            variant="outline"
                            onClick={() => setEditing({ key: t.key, value: t.currentValue, defaultValue: t.defaultValue })}
                          >
                            편집
                          </Button>
                          {t.overridden && (
                            <Button size="small" variant="secondary" disabled={saving} onClick={() => handleReset(t.key)}>
                              초기화
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">메시지 편집</h3>
            <p className="text-sm text-gray-500 font-mono mb-4">{editing.key}</p>

            {editing.defaultValue && editing.defaultValue !== editing.value && (
              <div className="bg-gray-50 border-l-4 border-gray-300 p-3 mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">기본값</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{editing.defaultValue}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">메시지 내용</label>
              <textarea
                className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                rows={5}
                value={editing.value}
                onChange={e => setEditing({ ...editing, value: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                플레이스홀더: {'{0}'} = 사용자명, {'{1}'} = 서버명 등 (위치에 따라 다름)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal} disabled={saving}>취소</Button>
              <Button variant="primary" onClick={handleUpdate} disabled={saving || !editing.value.trim()}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTemplatePage;
