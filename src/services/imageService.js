import apiClient from './api.js';
import { authService } from './authService.js';

/**
 * 이미지 목록을 조회합니다.
 * @returns {Promise<Array>} 이미지 목록
 */
export const getImages = async () => {
  try {
    const accessToken = authService.getAccessToken();
    if (!accessToken) {
      throw new Error("인증 토큰이 없습니다.");
    }

    const response = await apiClient.request('/api/images', {
      method: 'GET',
      headers: {
        accept: 'application/json;charset=UTF-8',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: '이미지 목록을 불러오는데 실패했습니다.'
      };
    }
  } catch (error) {
    console.error('Error fetching images:', error);
    return {
      success: false,
      error: '서버와의 연결에 문제가 발생했습니다.'
    };
  }
};

/**
 * 새로운 이미지를 생성합니다.
 * @param {Object} imageData - 이미지 생성 데이터
 * @param {string} imageData.imageName - 이미지 이름
 * @param {string} imageData.imageVersion - 이미지 버전
 * @param {string} imageData.cudaVersion - CUDA 버전
 * @param {string} imageData.description - 이미지 설명
 * @returns {Promise<Object>} 생성된 이미지 정보
 */
export const createImage = async (imageData) => {
  try {
    const accessToken = authService.getAccessToken();
    if (!accessToken) {
      throw new Error("인증 토큰이 없습니다.");
    }

    const response = await apiClient.request('/api/images', {
      method: 'POST',
      headers: {
        accept: 'application/json;charset=UTF-8',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(imageData),
    });
    
    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: '이미지 생성에 실패했습니다.'
      };
    }
  } catch (error) {
    console.error('Error creating image:', error);
    return {
      success: false,
      error: '이미지 생성 중 문제가 발생했습니다.'
    };
  }
};