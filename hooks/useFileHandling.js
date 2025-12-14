import { useState, useEffect, useRef, useCallback } from 'react';
import { Toast } from '../components/Toast';
import fileService from '../services/fileService';
import imageCompression from 'browser-image-compression';

export const useFileHandling = (socketRef, currentUser, router, handleSessionError) => {
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  /** 🔹 실제 파일 업로드 + 소켓 메시지 전송 */
  const handleFileUpload = useCallback(async (file, content = '') => {
    if (!socketRef.current?.connected || !currentUser) {
      Toast.error('채팅 서버와 연결이 끊어졌습니다.');
      return;
    }

    const roomId = router?.query?.room;
    if (!roomId) {
      Toast.error('채팅방 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      let fileToUpload = file;

      /** 🔹 이미지 압축 */
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          });

          fileToUpload = new File([compressed], file.name, {
            type: compressed.type
          });

        } catch (err) {
          console.warn('이미지 압축 실패 → 원본 사용', err);
        }
      }

      /** 🔹 파일 업로드 (S3 or Backend — FileService 가 자동 분기) */
      const uploadResponse = await fileService.uploadFile(
        fileToUpload,
        (progress) => setUploadProgress(progress),
        currentUser.token,
        currentUser.sessionId
      );

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || '파일 업로드 실패');
      }

      /** 🔹 메시지 소켓 전송 */
      const fileData = uploadResponse.data.file;

      socketRef.current.emit('chatMessage', {
        room: roomId,
        type: file.type.startsWith("image/") ? "image" : "file",
        content: content || '',
        fileData: {
          url: fileData.url, // 원래 코드: url
          fileUrl: fileData.url, // fileUrl도 함께 전송 (백엔드 호환성)
          filename: fileData.filename,
          originalname: fileData.originalName, // 원래 코드: originalname
          originalName: fileData.originalName, // originalName도 함께 전송 (백엔드 호환성)
          mimetype: fileData.mimeType, // 원래 코드: mimetype
          mimeType: fileData.mimeType, // mimeType도 함께 전송 (백엔드 호환성)
          size: fileData.size
        }
      });

      /** 🔹 상태 초기화 */
      setFilePreview(null);
      setUploading(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('File upload error:', error);

      if (error.message?.includes('세션') || error.message?.includes('인증')) {
        await handleSessionError();
        return;
      }

      setUploadError(error.message || '파일 업로드 실패');
      Toast.error(error.message || '파일 업로드 실패');

    } finally {
      setUploading(false);
    }
  }, [socketRef, currentUser, router, handleSessionError]);


  /** 🔹 파일 선택 */
  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;

    try {
      const validation = await fileService.validateFile(file);
      if (!validation.success) {
        throw new Error(validation.message);
      }

      setFilePreview({
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size
      });

    } catch (err) {
      Toast.error(err.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);


  /** 🔹 파일 드롭 */
  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  /** 🔹 붙여넣기(이미지 캡처) */
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const item = Array.from(items).find(i => i.kind === 'file');
    if (!item) return;

    handleFileSelect(item.getAsFile());
    e.preventDefault();

  }, [handleFileSelect]);

  /** 🔹 파일 취소 */
  const removeFilePreview = useCallback(() => {
    if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
    setFilePreview(null);
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filePreview]);

  useEffect(() => {
    return () => {
      if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
    };
  }, [filePreview]);

  return {
    filePreview,
    uploading,
    uploadProgress,
    uploadError,
    fileInputRef,
    handleFileUpload,
    handleFileSelect,
    handleFileDrop,
    handlePaste,
    removeFilePreview
  };
};

export default useFileHandling;
