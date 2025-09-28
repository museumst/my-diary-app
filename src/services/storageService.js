// src/services/storageService.js (새 파일)

import { storage } from "../firebase"; // 1번에서 export한 storage 가져오기
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * 이미지를 Firebase Storage에 업로드하고 다운로드 URL을 반환합니다.
 * @param {string} userId - 사용자 ID (파일 경로 지정에 사용)
 * @param {File} file - 업로드할 File 객체
 * @returns {string} - 이미지의 공개 다운로드 URL
 */
export const uploadImage = async (userId, file) => {
  // 1. 파일이 저장될 경로 설정 (예: users/사용자ID/images/파일이름)
  const storageRef = ref(storage, `users/${userId}/images/${file.name}_${Date.now()}`);

  // 2. 파일 업로드 실행
  const snapshot = await uploadBytes(storageRef, file);

  // 3. 업로드된 파일의 공개 URL 가져오기
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

// 필요한 경우 파일 삭제 함수 등도 여기에 추가합니다.
