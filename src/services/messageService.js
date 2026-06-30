import apiClient from './api.js';
import { authService } from './authService.js';

const authHeaders = () => {
  const token = authService.getAccessToken();
  if (!token) throw new Error("인증 토큰이 없습니다.");
  return { accept: 'application/json;charset=UTF-8', Authorization: `Bearer ${token}` };
};

export const getMessages = async () => {
  try {
    const response = await apiClient.request('/api/admin/messages', {
      method: 'GET',
      headers: authHeaders(),
    });
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
    await apiClient.request(`/api/admin/messages/${key}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ value }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating message:', error);
    return { success: false, error: '메시지 수정에 실패했습니다.' };
  }
};

export const resetMessage = async (key) => {
  try {
    await apiClient.request(`/api/admin/messages/${key}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error resetting message:', error);
    return { success: false, error: '메시지 초기화에 실패했습니다.' };
  }
};
