export interface AssetUploadResponse {
  filePath: string;
}

export const uploadAsset = async (
  file: File,
  entityId: string,
  fileId: string
): Promise<AssetUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityId', entityId);
  formData.append('fileId', fileId);

  const response = await fetch('/api/assets', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Asset upload failed:', {
      status: response.status,
      statusText: response.statusText,
      error
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    }

    throw new Error(error.error || 'Failed to upload asset');
  }

  const result = await response.json();
  return { filePath: result.filePath };
};
