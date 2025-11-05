import React, { useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface JsonInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const JsonInput: React.FC<JsonInputProps> = ({ value, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onChange(text);
      }
    };
    reader.onerror = (e) => {
        console.error("Error reading file:", e);
    }
    reader.readAsText(file);

    // Reset file input value to allow re-uploading the same file
    event.target.value = '';
  };

  return (
    <div className="flex flex-col flex-grow h-full">
       <div className="flex justify-between items-center mb-2">
        <label htmlFor="json-input" className="block text-sm font-medium text-brand-text">
          JSON Payload
        </label>
        <button
          onClick={handleUploadClick}
          className="flex items-center space-x-2 px-3 py-1 text-xs font-medium text-brand-subtle border border-brand-border rounded-md hover:text-brand-text hover:border-brand-subtle transition-colors duration-200"
          aria-label="Upload a JSON file"
        >
          <UploadIcon className="h-4 w-4" />
          <span>Upload File</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
          id="file-upload"
        />
      </div>
      <textarea
        id="json-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Paste your JSON here, or upload a file...'
        className="w-full flex-grow bg-brand-primary border border-brand-border rounded-md shadow-sm p-3 font-mono text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange resize-y"
        spellCheck="false"
      />
    </div>
  );
};
