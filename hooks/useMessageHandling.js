import { useState, useCallback } from 'react';
import { Toast } from '../components/Toast';
import imageCompression from 'browser-image-compression';
import { uploadToS3 } from '@/services/s3Upload';

export const useMessageHandling = (socketRef, currentUser, router, handleSessionError, messages = [], loadingMessages = false, setLoadingMessages) => {
 const [message, setMessage] = useState('');
 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 const [showMentionList, setShowMentionList] = useState(false);
 const [mentionFilter, setMentionFilter] = useState('');
 const [mentionIndex, setMentionIndex] = useState(0);
 const [filePreview, setFilePreview] = useState(null);
 const [uploading, setUploading] = useState(false);
 const [uploadProgress, setUploadProgress] = useState(0);
 const [uploadError, setUploadError] = useState(null);

 const handleMessageChange = useCallback((e) => {
   const newValue = e.target.value;
   setMessage(newValue);

   const cursorPosition = e.target.selectionStart;
   const textBeforeCursor = newValue.slice(0, cursorPosition);
   const atSymbolIndex = textBeforeCursor.lastIndexOf('@');

   if (atSymbolIndex !== -1) {
     const mentionText = textBeforeCursor.slice(atSymbolIndex + 1);
     if (!mentionText.includes(' ')) {
       setMentionFilter(mentionText.toLowerCase());
       setShowMentionList(true);
       setMentionIndex(0);
       return;
     }
   }
   
   setShowMentionList(false);
 }, []);

  const handleLoadMore = useCallback(() => {
    if (!socketRef.current?.connected) {
      return;
    }

    if (loadingMessages) {
      return;
    }

    // 가장 오래된 메시지의 타임스탬프 찾기
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    const oldestMessage = sortedMessages[0];
    const beforeTimestamp = oldestMessage?.timestamp;

    if (!beforeTimestamp) {
      return;
    }

    setLoadingMessages(true);

    // Socket.IO 이벤트만 발행 - 응답은 useChatRoom의 previousMessages 이벤트 핸들러에서 처리
    socketRef.current.emit('fetchPreviousMessages', {
      roomId: router?.query?.room,
      before: beforeTimestamp,
      limit: 30
    });
  }, [socketRef, router?.query?.room, loadingMessages, messages, setLoadingMessages]);

  const handleMessageSubmit = useCallback(async (messageData) => {
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

    if (messageData.type === 'file') {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const originalFile = messageData.fileData.file;
      let fileToUpload = originalFile;

      // 이미지 파일 압축 
      if (originalFile.type.startsWith('image/')) {
        try {
          const compressed = await imageCompression(originalFile, {
            maxSizeMB: 0.5,          // 500KB
            maxWidthOrHeight: 1920,  // 최대 해상도 제한
            useWebWorker: true
          });

          fileToUpload = new File([compressed], originalFile.name, {
            type: compressed.type
          });

          console.log(
            '이미지 압축:',
            Math.round(originalFile.size / 1024),
            'KB →',
            Math.round(fileToUpload.size / 1024),
            'KB'
          );
        } catch (compressionError) {
          console.warn('이미지 압축 실패 → 원본 사용', compressionError);
        }
      }

      // S3로 업로드
      const { url, key } = await uploadToS3(
        fileToUpload,
        currentUser.token,
        currentUser.sessionId
      );

      socketRef.current.emit('chatMessage', {
        room: roomId,
        type: 'file',
        content: messageData.content || '',
        fileData: {
          url,
          key,
          filename: originalFile.name,
          mimetype: fileToUpload.type,
          size: fileToUpload.size
        }
      });


      setFilePreview(null);
      setMessage('');
      setUploading(false);
      setUploadProgress(0);
      setShowEmojiPicker(false);
      setShowMentionList(false);

      return;
    }

    if (messageData.content?.trim()) {
      socketRef.current.emit('chatMessage', {
        room: roomId,
        type: 'text',
        content: messageData.content.trim()
      });

      setMessage('');
      setShowEmojiPicker(false);
      setShowMentionList(false);
    }

  } catch (error) {
    if (
      error.message?.includes('세션') ||
      error.message?.includes('인증') ||
      error.message?.includes('토큰')
    ) {
      await handleSessionError();
      return;
    }

    Toast.error(error.message || '메시지 전송 중 오류가 발생했습니다.');

    if (messageData.type === 'file') {
      setUploadError(error.message);
      setUploading(false);
    }
  }
  }, [currentUser, router, handleSessionError, socketRef]);

  // 메시지 전송 쓰로틀 (300ms)
  const throttledHandleMessageSubmit = useCallback(
    (messageData) => {
      const now = Date.now();

      // 300ms 안에 또 호출되면 무시
      if (
        throttledHandleMessageSubmit.lastCall &&
        now - throttledHandleMessageSubmit.lastCall < 300
      ) {
        return;
      }

      throttledHandleMessageSubmit.lastCall = now;

      handleMessageSubmit(messageData); 
    },
    [handleMessageSubmit]
  );


 const handleEmojiToggle = useCallback(() => {
   setShowEmojiPicker(prev => !prev);
 }, []);

 const getFilteredParticipants = useCallback((room) => {
   if (!room?.participants) return [];

   return room.participants.filter(user => 
     user.name.toLowerCase().includes(mentionFilter) ||
     user.email.toLowerCase().includes(mentionFilter)
   );
 }, [mentionFilter]);

 const insertMention = useCallback((messageInputRef, user) => {
   if (!messageInputRef?.current) return;

   const cursorPosition = messageInputRef.current.selectionStart;
   const textBeforeCursor = message.slice(0, cursorPosition);
   const atSymbolIndex = textBeforeCursor.lastIndexOf('@');

   if (atSymbolIndex !== -1) {
     const textBeforeAt = message.slice(0, atSymbolIndex);
     const newMessage = 
       textBeforeAt +
       `@${user.name} ` +
       message.slice(cursorPosition);

     setMessage(newMessage);
     setShowMentionList(false);

     setTimeout(() => {
       const newPosition = atSymbolIndex + user.name.length + 2;
       messageInputRef.current.focus();
       messageInputRef.current.setSelectionRange(newPosition, newPosition);
     }, 0);
   }
 }, [message]);

 const removeFilePreview = useCallback(() => {
   setFilePreview(null);
   setUploadError(null);
   setUploadProgress(0);
 }, []);

 return {
   message,
   showEmojiPicker,
   showMentionList,
   mentionFilter,
   mentionIndex,
   filePreview,
   uploading,
   uploadProgress,
   uploadError,
   setMessage,
   setShowEmojiPicker,
   setShowMentionList,
   setMentionFilter,
   setMentionIndex,
   setFilePreview,
   handleMessageChange,
   handleMessageSubmit: throttledHandleMessageSubmit,
   handleEmojiToggle,
   handleLoadMore,
   getFilteredParticipants,
   insertMention,
   removeFilePreview
 };
};

export default useMessageHandling;