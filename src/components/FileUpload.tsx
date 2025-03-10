import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractSheetsFromExcel } from '../lib/utils';
import { ParseResult, ParseError } from 'papaparse';

interface FileUploadProps {
  onFilesUploaded: (sheets: { [sheetName: string]: any[] }) => void;
  isProcessing?: boolean;
}

export const FileUpload = ({ onFilesUploaded, isProcessing = false }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setFiles(acceptedFiles);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsLoading(true);
      const file = files[0];
      
      if (file.name.endsWith('.csv')) {
        // For simple CSV, we'll treat it as a single sheet
        try {
          const Papa = await import('papaparse');
          
          // Use Promise to handle Papa.parse callback pattern
          const parseCSV = () => {
            return new Promise<{ [key: string]: any[] }>((resolve, reject) => {
              Papa.default.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (result: ParseResult<any>) => {
                  resolve({ "Sheet1": result.data });
                },
                error: (err: ParseError) => {
                  reject(err);
                }
              });
            });
          };
          
          const sheets = await parseCSV();
          onFilesUploaded(sheets);
        } catch (err) {
          setError(`Error parsing CSV: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        // For Excel files with multiple sheets
        try {
          const sheets = await extractSheetsFromExcel(file);
          onFilesUploaded(sheets);
        } catch (err) {
          setError(`Error processing Excel file: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      setError(`Error processing file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        {...getRootProps()} 
        className={`p-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary-50' : 'border-gray-300 hover:border-primary-300'}
        `}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-sm text-gray-600">Drop the files here...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Drag & drop an Excel or CSV file here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              (Supports .xlsx, .xls, and .csv files)
            </p>
          </div>
        )}
      </div>
      
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm mb-2">Selected file:</p>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <span className="text-sm truncate">{files[0].name}</span>
            <span className="text-xs text-gray-500">
              {(files[0].size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-2 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      <div className="mt-6">
        <button 
          onClick={handleUpload} 
          className="btn btn-primary w-full"
          disabled={isLoading || isProcessing || files.length === 0}
        >
          {isLoading ? 'Processing...' : 'Upload & Process'}
        </button>
      </div>
    </div>
  );
};
