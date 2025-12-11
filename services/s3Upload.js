export const uploadToS3 = async (file, token, sessionId) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const presignRes = await fetch(
    `${API_URL}/api/s3/presign?fileName=${encodeURIComponent(file.name)}&contentType=${file.type}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Session-Id': sessionId
      }
    }
  );

  if (!presignRes.ok) {
    throw new Error('Presigned URL 발급 실패');
  }

  const { url, key } = await presignRes.json();

  const uploadRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });

  if (!uploadRes.ok) {
    throw new Error('S3 업로드 실패');
  }

  return {
    url: url.split('?')[0],
    key
  };
};
