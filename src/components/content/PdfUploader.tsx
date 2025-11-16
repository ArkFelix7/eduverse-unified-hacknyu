import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { databaseService } from '../../services/databaseService';
import toast from 'react-hot-toast';

// Set worker source for pdf.js - using the exact same configuration as the working version
// @ts-ignore - The property exists but might not be in all type definitions.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^4.4.168/build/pdf.worker.mjs`;

interface PdfUploaderProps {
  projectId: string;
  onUploadComplete: (contentSource: any) => void;
  onClose: () => void;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ projectId, onUploadComplete, onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target?.result) {
          reject(new Error('Failed to read file.'));
          return;
        }
        try {
          const pdf = await pdfjsLib.getDocument({ data: e.target.result as ArrayBuffer }).promise;
          const pagePromises = Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1));
          
          const pages = await Promise.all(pagePromises);
          const textPromises = pages.map(page => page.getTextContent());
          const textContents = await Promise.all(textPromises);
          
          const fullText = textContents.map(content => 
            content.items.map(item => ('str' in item ? item.str : '')).join(' ')
          ).join('\\n\\n');

          resolve(fullText.trim());
        } catch (pdfError) {
          reject(pdfError instanceof Error ? new Error(`Error parsing PDF: ${pdfError.message}`) : new Error('An unknown error occurred while parsing the PDF.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(25);
      
      // Extract text content from PDF using the working method
      const textContent = await extractTextFromPdf(file);
      
      if (!textContent.trim()) {
        throw new Error('No text content found in the PDF');
      }

      setProgress(75);

      // Save to database
      const contentSource = await databaseService.createContentSource({
        project_id: projectId,
        title: file.name,
        type: 'pdf',
        content: textContent,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          pages: textContent.split('\n\n').length
        }
      });

      setProgress(100);
      toast.success('PDF uploaded successfully!');
      onUploadComplete(contentSource);
      onClose();
      
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF. Please try a different file.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Upload PDF Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Processing...
                </>
              ) : (
                <>
                  📄 Select PDF File
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {progress < 25 && 'Reading file...'}
                {progress >= 25 && progress < 75 && 'Extracting text...'}
                {progress >= 75 && 'Saving to database...'}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-800 text-sm">
              📌 Upload a PDF document to extract its content and create learning materials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfUploader;