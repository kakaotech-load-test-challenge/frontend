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

  const handleFileUpload = useCallback(async (file, content = '') => {
    if (!socketRef.current?.connected || !currentUser) {
      Toast.error('채팅 서버와 연결이 끊어졌습니다.');
      return;
    }

    // router.query가 초기화되지 않았을 때 처리
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

      // 이미지 파일 압축 
      if (file.type.startsWith('image/')) {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.5,          // 500KB 
            maxWidthOrHeight: 1920, 
            useWebWorker: true
          });

          fileToUpload = new File(
            [compressedFile],
            file.name,
            { type: compressedFile.type }
          );
        } catch (compressionError) {
          console.warn('이미지 압축 실패 → 원본 사용', compressionError);
        }
      }

      console.log(
        '업로드 파일 크기:',
        Math.round(file.size / 1024),
        'KB →',
        Math.round(fileToUpload.size / 1024),
        'KB'
      );

      const uploadResponse = await fileService.uploadFile(
        fileToUpload,   
        (progress) => setUploadProgress(progress),
        currentUser.token,
        currentUser.sessionId
      );


      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || '파일 업로드에 실패했습니다.');
      }

      await socketRef.current.emit('chatMessage', {
        room: roomId,
        type: 'file',
        content: content,
        fileData: {
          _id: uploadResponse.data.file._id,
          filename: uploadResponse.data.file.filename,
          originalname: uploadResponse.data.file.originalname,
          mimetype: uploadResponse.data.file.mimetype,
          size: uploadResponse.data.file.size
        }
      });

      setFilePreview(null);
      setUploading(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('File upload error:', error);
      
      if (error.message?.includes('세션') || 
          error.message?.includes('인증') || 
          error.message?.includes('토큰')) {
        await handleSessionError();
        return;
      }

      setUploadError(error.message || '파일 업로드에 실패했습니다.');
      Toast.error(error.message || '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }, [socketRef, currentUser, router, handleSessionError]);

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;

    const MAX_ORIGINAL_SIZE_MB = 10;

    if (file.size > MAX_ORIGINAL_SIZE_MB * 1024 * 1024) {
      throw new Error(`파일은 최대 ${MAX_ORIGINAL_SIZE_MB}MB까지만 업로드할 수 있어요.`);
    }
    try {
      // 파일 유효성 검사
      const validationResult = await fileService.validateFile(file);
      if (!validationResult.success) {
        throw new Error(validationResult.message);
      }

      // 미리보기 생성
      const preview = {
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size
      };

      setFilePreview(preview);
      setUploadError(null);

    } catch (error) {
      console.error('File selection error:', error);
      Toast.error(error.message || '파일 선택 중 오류가 발생했습니다.');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      await handleFileSelect(files[0]);
    } catch (error) {
      console.error('File drop error:', error);
      Toast.error(error.message || '파일 드롭 중 오류가 발생했습니다.');
    }
  }, [handleFileSelect]);

  const removeFilePreview = useCallback(() => {
    if (filePreview?.url) {
      URL.revokeObjectURL(filePreview.url);
    }
    setFilePreview(null);
    setUploadError(null);
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [filePreview]);

  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const fileItem = Array.from(items).find(
      item => item.kind === 'file' && (
        item.type.startsWith('image/') ||
        item.type.startsWith('video/') ||
        item.type.startsWith('audio/') ||
        item.type === 'application/pdf'
      )
    );

    if (!fileItem) return;

    const file = fileItem.getAsFile();
    if (!file) return;

    try {
      await handleFileSelect(file);
      e.preventDefault();
    } catch (error) {
      console.error('File paste error:', error);
      Toast.error(error.message || '파일 붙여넣기 중 오류가 발생했습니다.');
    }
  }, [handleFileSelect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (filePreview?.url) {
        URL.revokeObjectURL(filePreview.url);
      }
    };
  }, [filePreview]);

  return {
    filePreview,
    uploading,
    uploadProgress,
    uploadError,
    fileInputRef,
    setFilePreview,
    setUploading,
    setUploadProgress,
    setUploadError,
    handleFileUpload,
    handleFileSelect,
    handleFileDrop,
    handlePaste,
    removeFilePreview
  };
};

export default useFileHandling;