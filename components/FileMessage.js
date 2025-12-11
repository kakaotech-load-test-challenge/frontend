import React, { useState, useEffect, useRef } from 'react';
import {
  PdfIcon as FileText,
  ImageIcon as Image,
  MovieIcon as Film,
  MusicIcon as Music,
  ErrorCircleIcon as AlertCircle
} from '@vapor-ui/icons';
import { Button, Callout, VStack, HStack } from '@vapor-ui/core';
import CustomAvatar from './CustomAvatar';
import MessageContent from './MessageContent';
import MessageActions from './MessageActions';
import FileActions from './FileActions';
import ReadStatus from './ReadStatus';
import fileService from '@/services/fileService';
import { useAuth } from '@/contexts/AuthContext';

const FileMessage = ({
  msg = {},
  isMine = false,
  currentUser = null,
  onReactionAdd,
  onReactionRemove,
  room = null,
  socketRef
}) => {

  console.log("🐛 FileMessage 렌더링됨");
  console.log("🐛 msg:", msg);
  console.log("🐛 msg.file:", msg.file);
  console.log("🐛 msg.fileUrl:", msg.fileUrl);

  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const messageDomRef = useRef(null);
  console.log("🎯 useEffect 진입 직전 msg.file =", msg.file);
  console.log("🎯 msg.fileUrl =", msg.fileUrl);

  useEffect(() => {
  console.log("🔄 useEffect 실행됨");

  if (msg?.fileUrl) {
    console.log("➡️ S3 직접 업로드 URL 감지됨:", msg.fileUrl);
    setPreviewUrl(msg.fileUrl);
    return;
  }

  if (msg?.file) {
    console.log("➡️ 백엔드 기반 파일 구조 감지됨:", msg.file);
    const url = fileService.getPreviewUrl(msg.file, user?.token, user?.sessionId, true);
    console.log("📸 previewUrl 계산됨:", url);
    setPreviewUrl(url);
  }
}, [msg?.file, msg?.fileUrl, user?.token, user?.sessionId]);


  if (!msg?.file) {
     console.error("❌ [FileMessage] ERROR — msg.file 없음:", msg);
    return null;
  }

  const formattedTime = new Date(msg.timestamp).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\./g, '년').replace(/\s/g, ' ').replace('일 ', '일 ');

  const getFileIcon = () => {
    const mimetype = msg.file?.mimetype || '';
    const iconProps = { className: "w-5 h-5 flex-shrink-0" };

    if (mimetype.startsWith('image/')) return <Image {...iconProps} color="#00C853" />;
    if (mimetype.startsWith('video/')) return <Film {...iconProps} color="#2196F3" />;
    if (mimetype.startsWith('audio/')) return <Music {...iconProps} color="#9C27B0" />;
    return <FileText {...iconProps} color="#ffffff" />;
  };

  const getDecodedFilename = (encodedFilename) => {
    try {
      if (!encodedFilename) return 'Unknown File';
      
      const base64 = encodedFilename
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const pad = base64.length % 4;
      const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
      
      if (paddedBase64.match(/^[A-Za-z0-9+/=]+$/)) {
        return Buffer.from(paddedBase64, 'base64').toString('utf8');
      }

      return decodeURIComponent(encodedFilename);
    } catch (error) {
      console.error('Filename decoding error:', error);
      return encodedFilename;
    }
  };

  const renderAvatar = () => (
    <CustomAvatar
      user={isMine ? currentUser : msg.sender}
      size="md"
      persistent={true}
      className="shrink-0"
      showInitials={true}
    />
  );

  const handleFileDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    try {
      if (!msg.file?.filename) {
        throw new Error('파일 정보가 없습니다.');
      }

      if (!user?.token || !user?.sessionId) {
        throw new Error('인증 정보가 없습니다.');
      }

      const baseUrl = fileService.getFileUrl(msg.file.filename, false);
      const authenticatedUrl = `${baseUrl}?token=${encodeURIComponent(user?.token)}&sessionId=${encodeURIComponent(user?.sessionId)}&download=true`;
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = authenticatedUrl;
      document.body.appendChild(iframe);

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);

    } catch (error) {
      console.error('File download error:', error);
      setError(error.message || '파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleViewInNewTab = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    try {
      if (!msg.file?.filename) {
        throw new Error('파일 정보가 없습니다.');
      }

      if (!user?.token || !user?.sessionId) {
        throw new Error('인증 정보가 없습니다.');
      }

      const baseUrl = fileService.getFileUrl(msg.file.filename, true);
      const authenticatedUrl = `${baseUrl}?token=${encodeURIComponent(user?.token)}&sessionId=${encodeURIComponent(user?.sessionId)}`;

      const newWindow = window.open(authenticatedUrl, '_blank');
      if (!newWindow) {
        throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      }
      newWindow.opener = null;
    } catch (error) {
      console.error('File view error:', error);
      setError(error.message || '파일 보기 중 오류가 발생했습니다.');
    }
  };

  const renderImagePreview = (originalname) => {
    console.log("🖼 renderImagePreview 호출됨");
    console.log("🖼 previewUrl =", previewUrl);
    console.log("🖼 msg.file =", msg.file);
    console.log("🖼 msg.fileUrl =", msg.fileUrl);

    try {
      if (!msg?.file?.filename) {
        return (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
        );
      }

      if (!user?.token || !user?.sessionId) {
        throw new Error('인증 정보가 없습니다.');
      }

      const previewUrl = fileService.getPreviewUrl(msg.file, user?.token, user?.sessionId, true);

      return (
        <div className="bg-transparent-pattern">
          <img
            src={previewUrl}
            alt={originalname}
            className="max-w-[400px] max-h-[400px] object-cover object-center rounded-md"
            onLoad={() => {
              console.debug('Image loaded successfully:', originalname);
            }}
            onError={(e) => {
              console.error('Image load error:', {
                error: e.error,
                originalname
              });
              e.target.onerror = null;
              e.target.src = '/images/placeholder-image.png';
              setError('이미지를 불러올 수 없습니다.');
            }}
            loading="lazy"
            data-testid="file-image-preview"
          />
        </div>
      );
    } catch (error) {
      console.error('Image preview error:', error);
      setError(error.message || '이미지 미리보기를 불러올 수 없습니다.');
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <Image className="w-8 h-8 text-gray-400" />
        </div>
      );
    }
  };

  const renderFilePreview = () => {
     console.log("🎨 [FileMessage] renderFilePreview()", {
    mimetype: msg.file?.mimetype,
    filename: msg.file?.filename,
    originalname: msg.file?.originalname,
  });
    const mimetype = msg.file?.mimetype || '';
    const originalname = getDecodedFilename(msg.file?.originalname || 'Unknown File');
    const size = fileService.formatFileSize(msg.file?.size || 0);

    const previewWrapperClass = "overflow-hidden";

    if (mimetype.startsWith('image/')) {
      return (
        <div className={previewWrapperClass}>
          {renderImagePreview(originalname)}
          <div className="flex items-center gap-2 mt-2">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-200">{originalname}</div>
              <div className="text-xs text-gray-400">{size}</div>
            </div>
          </div>
          <FileActions onViewInNewTab={handleViewInNewTab} onDownload={handleFileDownload} />
        </div>
      );
    }

    if (mimetype.startsWith('video/')) {
      return (
        <div className={previewWrapperClass}>
          <div>
            {previewUrl ? (
              <video
                className="max-w-[400px] max-h-[400px] object-cover rounded-md"
                controls
                preload="metadata"
                aria-label={`${originalname} 비디오`}
                crossOrigin="use-credentials"
              >
                <source src={previewUrl} type={mimetype} />
                <track kind="captions" />
                비디오를 재생할 수 없습니다.
              </video>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Film className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-200">{originalname}</div>
              <div className="text-xs text-gray-400">{size}</div>
            </div>
          </div>
          <FileActions onViewInNewTab={handleViewInNewTab} onDownload={handleFileDownload} />
        </div>
      );
    }

    if (mimetype.startsWith('audio/')) {
      return (
        <div className={previewWrapperClass}>
          <div className="flex items-center gap-2 mt-2">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-200">{originalname}</div>
              <div className="text-xs text-gray-400">{size}</div>
            </div>
          </div>
          <div className="mt-3">
            {previewUrl && (
              <audio
                className="w-full"
                controls
                preload="metadata"
                aria-label={`${originalname} 오디오`}
                crossOrigin="use-credentials"
              >
                <source src={previewUrl} type={mimetype} />
                오디오를 재생할 수 없습니다.
              </audio>
            )}
          </div>
          <FileActions onViewInNewTab={handleViewInNewTab} onDownload={handleFileDownload} />
        </div>
      );
    }

    return (
      <div className={previewWrapperClass}>
        <div className="flex items-center gap-2 mt-2">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-gray-200">{originalname}</div>
            <div className="text-xs text-gray-400">{size}</div>
          </div>
        </div>
        <FileActions onViewInNewTab={handleViewInNewTab} onDownload={handleFileDownload} />
      </div>
    );
  };

  return (
    <div className="my-4" ref={messageDomRef} data-testid="file-message-container">
      <VStack
        className={`max-w-[65%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}
        gap="$100"
        align={isMine ? 'flex-end' : 'flex-start'}
      >
        {/* Sender Info */}
        <HStack gap="$100" alignItems="center" className="px-1">
          {renderAvatar()}
          <span className="text-sm font-medium text-gray-300">
            {isMine ? '나' : msg.sender?.name}
          </span>
        </HStack>

        {/* Message Bubble - Outline Based */}
        <div className={`
          relative group
          rounded-2xl px-4 py-3
          border transition-all duration-200
          ${isMine
            ? 'bg-gray-800 border-blue-500 hover:border-blue-400 hover:shadow-md'
            : 'bg-transparent border-gray-400 hover:border-gray-300 hover:shadow-md'
          }
        `}>
          {/* Message Content */}
          <div className={`
            ${isMine ? 'text-blue-100' : 'text-white'}
          `}>
            {error && (
              <div>{error}</div>
            )}
            {!error && renderFilePreview()}
            {!error && msg.content && (
              <div className="mt-3 text-base leading-relaxed">
                <MessageContent content={msg.content} />
              </div>
            )}
          </div>

          {/* Message Footer */}
          <HStack
            gap="$150"
            justifyContent="flex-end"
            alignItems="center"
            className={`mt-2 pt-2 border-t ${isMine ? 'border-gray-700' : 'border-gray-600'}`}
          >
            <div
              className={`text-xs ${isMine ? 'text-blue-400' : 'text-gray-300'}`}
              title={new Date(msg.timestamp).toLocaleString('ko-KR')}
            >
              {formattedTime}
            </div>
            <ReadStatus
              messageType={msg.type}
              participants={room?.participants || []}
              readers={msg.readers || []}
              messageId={msg._id}
              messageRef={messageDomRef}
              currentUserId={currentUser?._id || currentUser?.id}
              socketRef={socketRef}
            />
          </HStack>
        </div>

        {/* Message Actions */}
        <MessageActions
          messageId={msg._id}
          messageContent={msg.content}
          reactions={msg.reactions}
          currentUserId={currentUser?._id || currentUser?.id}
          onReactionAdd={onReactionAdd}
          onReactionRemove={onReactionRemove}
          isMine={isMine}
          room={room}
        />
      </VStack>
    </div>
  );
};

FileMessage.defaultProps = {
  msg: {
    file: {
      mimetype: '',
      filename: '',
      originalname: '',
      size: 0
    }
  },
  isMine: false,
  currentUser: null
};

export default React.memo(FileMessage);
