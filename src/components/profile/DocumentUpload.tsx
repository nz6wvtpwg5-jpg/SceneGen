'use client';

import { useEffect, useState } from 'react';
import { uploadAsset } from '@/services/api/assets';
import { useSession } from 'next-auth/react';
import { FileUp, Check, Download, Loader2, RefreshCw } from 'lucide-react';

interface DocumentUploadProps {
  entityId: string;
  fileId: string;
  title: string;
  description?: string;
  existingFile?: string | null;
  existingFileName?: string | null;
  onUploaded?: (filePath: string, fileName: string) => void;
}

export const DocumentUpload = ({ entityId, fileId, title, description, existingFile, existingFileName, onUploaded }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(existingFile || null);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    setFilePath(existingFile || null);
  }, [existingFile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];

    if (!file || !session?.user?.id) {
      setError(!file ? 'Please select a file' : 'Please sign in to upload files');
      return;
    }

    // Validate file type (PDF or common document formats)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, Word document, or text file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const { filePath: uploadedPath } = await uploadAsset(
        file,
        entityId,
        fileId
      );
      setFilePath(uploadedPath);
      onUploaded?.(uploadedPath, file.name);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="group relative flex min-h-44 w-full flex-col justify-between overflow-hidden rounded-lg border border-black/10 bg-white p-5 transition hover:border-[#ff5a36]/55 hover:shadow-sm">
      <input
        type="file"
        aria-label={`${filePath ? 'Replace' : 'Upload'} ${title}`}
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        disabled={uploading}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        id={`upload-${fileId}`}
      />

      {uploading ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-[#686258]">
          <Loader2 className="h-7 w-7 animate-spin text-[#ff5a36]" />
          <span className="text-sm font-bold">Uploading...</span>
        </div>
      ) : filePath ? (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3cd] text-[#627f1f]"><Check className="h-5 w-5" /></div><span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#686258]">Current</span></div>
          <span className="mt-4 text-base font-black text-[#171713]">{title}</span>
          {description && <span className="mt-1 text-xs leading-5 text-[#777168]">{description}</span>}
          <span className="mt-3 truncate text-xs text-[#686258]">{existingFileName || 'Workspace document'}</span>
          <div className="relative z-20 mt-auto flex items-center gap-4 pt-4">
          <a
            href={filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-black text-[#171713] hover:text-[#ff5a36]"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3" />
            Open
          </a>
          <span className="flex items-center gap-1 text-xs font-black text-[#ff5a36]"><RefreshCw className="h-3 w-3" />Replace</span>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e9dd] text-[#686258] transition group-hover:bg-[#ffe1d9] group-hover:text-[#ff5a36]"><FileUp className="h-5 w-5" /></div>
          <span className="mt-4 text-base font-black text-[#171713]">{title}</span>
          {description && <span className="mt-1 text-xs leading-5 text-[#777168]">{description}</span>}
          <span className="mt-auto pt-4 text-xs font-black text-[#ff5a36]">Upload document</span>
        </div>
      )}

      {error && (
        <div className="absolute bottom-2 left-2 right-2 z-20 rounded bg-semantic-error/10 p-2 text-xs text-semantic-error">
          {error}
        </div>
      )}
    </div>
  );
};
