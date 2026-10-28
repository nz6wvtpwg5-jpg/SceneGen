import { useState } from 'react';
import { uploadAsset } from '../../services/api/assets';
import { useProfileStore } from '@/store/useProfileStore';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface HeaderImageUploadProps {
  onUploaded?: (filePath: string) => void;
}

export const HeaderImageUpload = ({ onUploaded }: HeaderImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { activeProfile } = useProfileStore();
  const { data: session } = useSession();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];

    if (!file || !activeProfile || !session?.user?.id) {
      setError(
        !file ? 'Please select a file' :
        !activeProfile ? 'Please select a workspace first' :
        'Please sign in to upload files'
      );
      return;
    }

    setUploading(true);
    try {
      const { filePath } = await uploadAsset(
        file,
        activeProfile.id,
        'headerImage'
      );
      setHeaderImage(filePath);
      onUploaded?.(filePath);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full p-4 border border-gray-200 rounded-lg">
      <div className="flex flex-col items-start gap-4">
        {error && (
          <div className="w-full p-3 text-sm text-semantic-error bg-semantic-error/10 border border-semantic-error/30 rounded-md">
            {error}
          </div>
        )}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Header Image
          </label>
          <div className="flex items-center gap-4">
            <label
              className={`inline-flex items-center px-4 py-2 rounded-md
                ${!activeProfile
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'}
              `}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploading || !activeProfile}
                className="hidden"
              />
              {uploading ? 'Uploading...' : 'Choose Image'}
            </label>
            {!activeProfile && (
              <span className="text-sm text-gray-500">
                Please select a workspace first
              </span>
            )}
          </div>
        </div>

        {headerImage && (
          <div className="w-full mt-4">
            <Image
              src={headerImage}
              alt="Header"
              width={1200}
              height={384}
              unoptimized
              className="h-48 w-full rounded-lg border border-gray-200 object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
};
