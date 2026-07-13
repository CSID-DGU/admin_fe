import apiClient from './api.js';

export const getMessages = async () => {
  try {
    const response = await apiClient.get('/api/admin/messages');
    // ponytail: backend ApiResponse wraps in {status, message, data}
    const data = response.data?.data ?? response.data;
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error: '메시지 템플릿 목록을 불러오는데 실패했습니다.' };
  }
};

export const updateMessage = async (key, value) => {
  try {
    await apiClient.patch(`/api/admin/messages/${encodeURIComponent(key)}`, { value });
    return { success: true };
  } catch (error) {
    console.error('Error updating message:', error);
    return { success: false, error: '메시지 수정에 실패했습니다.' };
  }
};

export const resetMessage = async (key) => {
  try {
    await apiClient.delete(`/api/admin/messages/${encodeURIComponent(key)}`);
    return { success: true };
  } catch (error) {
    console.error('Error resetting message:', error);
    return { success: false, error: '메시지 초기화에 실패했습니다.' };
  }
};
