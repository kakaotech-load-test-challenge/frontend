import { useState, useCallback } from 'react';
import { Toast } from '../components/Toast';

export const useMessageHandling = (socketRef, currentUser, router, handleSessionError) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const handleMessageChange = useCallback((e) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const cursor = e.target.selectionStart;
    const before = newValue.slice(0, cursor);
    const at = before.lastIndexOf('@');

    if (at !== -1) {
      const mentionText = before.slice(at + 1);
      if (!mentionText.includes(' ')) {
        setMentionFilter(mentionText.toLowerCase());
        setShowMentionList(true);
        return;
      }
    }

    setShowMentionList(false);
  }, []);

  const handleMessageSubmit = useCallback(async () => {
    if (!socketRef.current?.connected || !currentUser) {
      Toast.error('서버와 연결이 끊어졌습니다.');
      return;
    }

    const roomId = router?.query?.room;
    if (!roomId) {
      Toast.error('채팅방 정보를 찾을 수 없습니다.');
      return;
    }

    if (!message.trim()) return;

    try {
      socketRef.current.emit('chatMessage', {
        room: roomId,
        type: 'text',
        content: message.trim()
      });

      setMessage('');
      setShowEmojiPicker(false);
      setShowMentionList(false);

    } catch (err) {
      Toast.error('메시지 전송 오류');
      console.error(err);
    }
  }, [message, socketRef, currentUser, router]);

  return {
    message,
    setMessage,
    handleMessageChange,
    handleMessageSubmit,
    showEmojiPicker,
    setShowEmojiPicker,
    showMentionList,
    setShowMentionList,
    mentionFilter,
    mentionIndex,
    setMentionIndex
  };
};

export default useMessageHandling;
