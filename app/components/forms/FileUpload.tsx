import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../../ui';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  acceptedFileTypes?: string; // e.g., "image/*", "video/*", "audio/*"
  className?: string;
  maxFileSizeMB?: number; // Maximum file size in MB
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onFileSelect,
  selectedFile,
  acceptedFileTypes = '*/*',
  className,
  maxFileSizeMB = 50, // Default to 50MB
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];

    if (file) {
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File size exceeds ${maxFileSizeMB}MB limit.`);
        onFileSelect(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Basic type checking (can be more robust if needed)
      if (acceptedFileTypes !== '*/*' && !file.type.match(new RegExp(acceptedFileTypes.replace('*', '.*')))) {
        setError(`Invalid file type. Accepted: ${acceptedFileTypes}`);
        onFileSelect(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      onFileSelect(file);
    } else {
      onFileSelect(null);
    }
  };

  const handleClearFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the input field
    }
    setError(null);
  };

  return (
    <div className={className}>
      <label htmlFor="file-upload" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </label>
      <div className="flex items-center space-x-3">
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          className="hidden" // Hide default file input
          aria-label={label}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          className="whitespace-nowrap"
          aria-controls="file-preview"
        >
          {selectedFile ? 'Change File' : 'Choose File'}
        </Button>
        {selectedFile && (
          <span className="text-sm text-[var(--color-text-primary)] truncate flex-1" aria-live="polite">
            {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
          </span>
        )}
        {selectedFile && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleClearFile}
            size="sm"
            title="Clear selected file"
            aria-label="Clear selected file"
          >
            🗑️
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}

      {previewUrl && selectedFile && selectedFile.type.startsWith('image/') && (
        <div id="file-preview" className="mt-4 border border-[var(--color-border-primary)] rounded-md p-2 bg-[var(--color-bg-stage)] flex justify-center">
          <img src={previewUrl} alt="File Preview" className="max-h-48 w-auto object-contain" />
        </div>
      )}
      {previewUrl && selectedFile && selectedFile.type.startsWith('video/') && (
        <div id="file-preview" className="mt-4 border border-[var(--color-border-primary)] rounded-md p-2 bg-[var(--color-bg-stage)] flex justify-center">
          <video controls src={previewUrl} className="max-h-48 w-auto object-contain" />
        </div>
      )}
    </div>
  );
};

export default FileUpload;