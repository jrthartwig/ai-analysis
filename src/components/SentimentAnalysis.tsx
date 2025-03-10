import { useState } from 'react';
import { azureLanguageService } from '../lib/azure-language';

interface SentimentAnalysisProps {
  documentData: { [sheetName: string]: any[] };
}

interface SheetSentiment {
  sheetName: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | null;
  confidenceScores: {
    positive: number;
    negative: number;
    neutral: number;
  } | null;
  sentences: any[];
  isProcessing: boolean;
  error?: string;
}

export const SentimentAnalysis = ({ documentData }: SentimentAnalysisProps) => {
  const [results, setResults] = useState<SheetSentiment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processSheets = async () => {
    if (Object.keys(documentData).length === 0) return;
    
    setIsProcessing(true);
    
    // Initialize results for all sheets
    const initialResults = Object.keys(documentData).map(sheetName => ({
      sheetName,
      sentiment: null as 'positive' | 'negative' | 'neutral' | 'mixed' | null,
      confidenceScores: null,
      sentences: [],
      isProcessing: true
    }));
    
    setResults(initialResults);
    
    // Process each sheet
    for (const sheetName of Object.keys(documentData)) {
      try {
        const sheetData = documentData[sheetName];
        // Convert the sheet data to a text representation
        const text = sheetData
          .map(row => Object.values(row).join(' '))
          .join('\n');
        
        // Analyze sentiment
        const analysis = await azureLanguageService.analyzeSentiment(text);
        
        // Update results for this sheet
        setResults(prev => 
          prev.map(sheet => 
            sheet.sheetName === sheetName 
              ? { 
                  ...sheet, 
                  sentiment: analysis.sentiment, 
                  confidenceScores: analysis.confidenceScores,
                  sentences: analysis.sentences,
                  isProcessing: false 
                }
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
  
  // Helper function to get CSS classes for sentiment display
  const getSentimentColorClass = (sentiment: string | null) => {
    switch(sentiment) {
      case 'positive': return 'bg-green-50 text-green-700';
      case 'negative': return 'bg-red-50 text-red-700';
      case 'mixed': return 'bg-yellow-50 text-yellow-700';
      case 'neutral': return 'bg-gray-50 text-gray-700';
      default: return 'bg-gray-50 text-gray-500';
    }
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
            {isProcessing ? 'Processing...' : 'Analyze Sentiment'}
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
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium">Overall Sentiment:</div>
                      <div className={`px-3 py-1 rounded-full text-sm ${getSentimentColorClass(result.sentiment)}`}>
                        {result.sentiment ? result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1) : 'Unknown'}
                      </div>
                    </div>
                    
                    {result.confidenceScores && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-green-50 rounded text-center">
                          <div className="text-green-700 font-medium">Positive</div>
                          <div className="text-sm">{(result.confidenceScores.positive * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-2 bg-red-50 rounded text-center">
                          <div className="text-red-700 font-medium">Negative</div>
                          <div className="text-sm">{(result.confidenceScores.negative * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <div className="text-gray-700 font-medium">Neutral</div>
                          <div className="text-sm">{(result.confidenceScores.neutral * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                    
                    {result.sentences && result.sentences.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Sentence Analysis:</div>
                        <div className="max-h-60 overflow-y-auto border rounded">
                          {result.sentences.slice(0, 5).map((sentence, idx) => (
                            <div key={idx} className="p-2 border-b last:border-b-0">
                              <div className="text-sm">{sentence.text}</div>
                              <div className="flex gap-2 mt-1">
                                <div className={`text-xs px-2 py-0.5 rounded ${getSentimentColorClass(sentence.sentiment)}`}>
                                  {sentence.sentiment}
                                </div>
                              </div>
                            </div>
                          ))}
                          {result.sentences.length > 5 && (
                            <div className="p-2 text-gray-500 text-sm text-center">
                              + {result.sentences.length - 5} more sentences
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
