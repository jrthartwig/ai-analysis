import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ChatInterface } from './components/ChatInterface';
import { KeyPhraseExtraction } from './components/KeyPhraseExtraction';
import { SentimentAnalysis } from './components/SentimentAnalysis';
import { Tabs, Tab } from './components/Tabs';
import './App.css';

function App() {
  const [documentData, setDocumentData] = useState<{ [sheetName: string]: any[] }>({});
  const [isDataUploaded, setIsDataUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesUploaded = (sheets: { [sheetName: string]: any[] }) => {
    setIsProcessing(true);
    // Process the sheets and set the data
    setDocumentData(sheets);
    setIsDataUploaded(true);
    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <header className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight">AI Data Analysis</h1>
        <p className="text-gray-500 mt-2">Upload your data for analysis and insights</p>
      </header>

      {!isDataUploaded ? (
        <div className="mt-6">
          <FileUpload 
            onFilesUploaded={handleFilesUploaded} 
            isProcessing={isProcessing} 
          />
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-medium">Data Analysis</h2>
              <p className="text-sm text-gray-500">
                {Object.keys(documentData).length} sheet(s) uploaded
              </p>
            </div>
            <button 
              className="btn btn-outline"
              onClick={() => setIsDataUploaded(false)}
            >
              Upload New Data
            </button>
          </div>
          
          <Tabs defaultValue="chat">
            <Tab value="chat" label="Chat on My Data">
              <ChatInterface documentData={documentData} />
            </Tab>
            <Tab value="keyphrases" label="Key Phrase Extraction">
              <KeyPhraseExtraction documentData={documentData} />
            </Tab>
            <Tab value="sentiment" label="Sentiment Analysis">
              <SentimentAnalysis documentData={documentData} />
            </Tab>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default App;
