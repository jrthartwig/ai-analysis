import { useState } from 'react';
import { azureLanguageService } from '../lib/azure-language';

interface KeyPhraseExtractionProps {
  documentData: { [sheetName: string]: any[] };
}

interface SheetKeyPhrases {
  sheetName: string;
  keyPhrases: string[];
  isProcessing: boolean;
  error?: string;
}

export const KeyPhraseExtraction = ({ documentData }: KeyPhraseExtractionProps) => {
  const [results, setResults] = useState<SheetKeyPhrases[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processSheets = async () => {
    if (Object.keys(documentData).length === 0) return;
    
    setIsProcessing(true);
    
    // Initialize results for all sheets
    const initialResults = Object.keys(documentData).map(sheetName => ({
      sheetName,
      keyPhrases: [],
      isProcessing: true
    }));
    
    setResults(initialResults);
    
    // Process each sheet
    for (const sheetName of Object.keys(documentData)) {
      try {
        const sheetData = documentData[sheetName];
        
        // Skip if there's no data
        if (!sheetData || sheetData.length === 0) {
          setResults(prev => 
            prev.map(sheet => 
              sheet.sheetName === sheetName 
                ? { ...sheet, isProcessing: false, error: 'No data in sheet' }
                : sheet
            )
          );
          continue;
        }
        
        // Check what columns we have available
        const firstRow = sheetData[0];
        const columns = Object.keys(firstRow);
        
        // Choose text columns to analyze
        // Prefer columns that likely contain descriptive text
        const textColumns = columns.filter(col => {
          const colLower = col.toLowerCase();
          return colLower.includes('description') || 
                 colLower.includes('comment') || 
                 colLower.includes('text') ||
                 colLower.includes('note') ||
                 colLower.includes('detail');
        });
        
        // If no obvious text columns, use all columns
        const columnsToUse = textColumns.length > 0 ? textColumns : columns;
        
        // Prepare batches of documents to avoid exceeding API limits
        // Each batch will contain up to 10 rows
        const batchSize = 10;
        const allKeyPhrases: string[] = [];
        
        for (let i = 0; i < sheetData.length; i += batchSize) {
          const batch = sheetData.slice(i, i + batchSize);
          
          // Create documents from batch
          const documents = batch.map((row, index) => {
            // Extract text from selected columns
            const text = columnsToUse
              .map(col => {
                const value = row[col];
                return value !== undefined && value !== null ? String(value) : '';
              })
              .filter(text => text.trim() !== '')
              .join('. ');
              
            return {
              id: `${i + index}`,
              language: 'en',
              text: text.trim()
            };
          }).filter(doc => doc.text.length > 0); // Skip empty documents
          
          // Skip if all documents are empty
          if (documents.length === 0) continue;
          
          // Extract key phrases from this batch
          const batchKeyPhrases = await azureLanguageService.extractKeyPhrases(documents);
          allKeyPhrases.push(...batchKeyPhrases);
        }
        
        // Remove duplicates and sort by length (shorter phrases first)
        const uniqueKeyPhrases = Array.from(new Set(allKeyPhrases))
          .sort((a, b) => a.length - b.length);
        
        // Update results for this sheet
        setResults(prev => 
          prev.map(sheet => 
            sheet.sheetName === sheetName 
              ? { ...sheet, keyPhrases: uniqueKeyPhrases, isProcessing: false }
              : sheet
          )
        );
      } catch (error) {
        console.error(`Error processing sheet ${sheetName}:`, error);
        setResults(prev => 
          prev.map(sheet => 
            sheet.sheetName === sheetName 
              ? { 
                  ...sheet, 
                  isProcessing: false, 
                  error: error instanceof Error ? error.message : 'An error occurred' 
                }
              : sheet
          )
        );
      }
    }
    
    setIsProcessing(false);
  };
  
  return (
    <div className="space-y-6">
      {results.length === 0 ? (
        <div className="text-center py-8">
          <button 
            onClick={processSheets} 
            className="btn btn-primary"
            disabled={isProcessing || Object.keys(documentData).length === 0}
          >
            {isProcessing ? 'Processing...' : 'Extract Key Phrases'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {results.map((result) => (
            <div key={result.sheetName} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 py-2 px-4 border-b">
                <h3 className="text-lg font-medium">{result.sheetName}</h3>
              </div>
              <div className="p-4">
                {result.isProcessing ? (
                  <div className="text-gray-500">Processing...</div>
                ) : result.error ? (
                  <div className="text-red-500">{result.error}</div>
                ) : result.keyPhrases.length === 0 ? (
                  <div className="text-gray-500">No key phrases found</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.keyPhrases.map((phrase, index) => (
                      <div 
                        key={index} 
                        className="bg-primary-50 text-primary-700 rounded-full px-3 py-1 text-sm"
                      >
                        {phrase}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
