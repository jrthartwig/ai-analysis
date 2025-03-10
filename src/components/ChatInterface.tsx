import { useState, useRef, useEffect } from 'react';
import { azureOpenAIService } from '../lib/azure-openai';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatInterfaceProps {
  documentData: { [sheetName: string]: any[] };
}

export const ChatInterface = ({ documentData }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataProcessed, setIsDataProcessed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Process document data when component mounts
  useEffect(() => {
    if (Object.keys(documentData).length > 0 && !isDataProcessed) {
      // Add initial system message when data is loaded
      setMessages([{
        role: 'system',
        content: `Data loaded successfully from ${Object.keys(documentData).length} sheets. You can now ask questions about your data.`
      }]);
      setIsDataProcessed(true);
    }
  }, [documentData, isDataProcessed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to match query keywords with document data to find relevant content
  const findRelevantContent = (query: string): string[] => {
    // Extract keywords from query (remove common stop words)
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                      'of', 'in', 'to', 'for', 'with', 'about', 'by', 'at', 'on'];
    
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    console.log("Searching for keywords:", keywords);
    
    const relevantContent: string[] = [];

    // Iterate through all data to find matches
    Object.entries(documentData).forEach(([sheetName, rows]) => {
      // Convert rows to string for easier searching
      rows.forEach((row, rowIndex) => {
        const rowStr = JSON.stringify(row).toLowerCase();
        
        // Check if any keyword is in this row
        const matches = keywords.filter(keyword => rowStr.includes(keyword));
        
        if (matches.length > 0) {
          // Format relevant content for context
          const formattedRow = Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          
          relevantContent.push(`[From sheet "${sheetName}", row ${rowIndex+1}]: ${formattedRow}`);
        }
      });
    });

    // If we found too many matches, limit the number to avoid token limits
    if (relevantContent.length > 20) {
      console.log(`Found ${relevantContent.length} matching items, truncating to 20 most relevant`);
      return relevantContent.slice(0, 20);
    }
    
    // If we found no direct matches, include some sample data
    if (relevantContent.length === 0) {
      console.log("No exact matches found, including sample data");
      
      // Include at least one row from each sheet as context
      Object.entries(documentData).forEach(([sheetName, rows]) => {
        if (rows.length > 0) {
          const sampleRow = rows[0];
          const formattedRow = Object.entries(sampleRow)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          
          relevantContent.push(`[Sample from sheet "${sheetName}"]: ${formattedRow}`);
        }
      });
    }
    
    return relevantContent;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    try {
      setIsLoading(true);
      const userMessage = inputValue.trim();
      setInputValue('');
      
      // Add user message to chat
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      
      // Get relevant context from the document data
      const context = findRelevantContent(userMessage);
      
      // For debugging
      console.log(`Found ${context.length} relevant items in the data`);
      
      // Generate response using Azure OpenAI with retrieved context
      const response = await azureOpenAIService.generateCompletion(userMessage, context);
      
      // Add assistant reply to chat
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error processing your request." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <p>Ask a question about your data to get started.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-primary-50 ml-auto' 
                  : message.role === 'system'
                  ? 'bg-blue-50 text-blue-800 mx-auto text-center'
                  : 'bg-gray-100 mr-auto text-left'
              }`}
            >
              {message.role === 'assistant' ? (
                <MarkdownRenderer content={message.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-gray-100 max-w-[80%] p-3 rounded-lg mr-auto text-left">
            <p className="text-sm text-gray-500">Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your data..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading || !isDataProcessed || Object.keys(documentData).length === 0}
            className="input flex-1"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isDataProcessed}
            className="btn btn-primary"
          >
            Send
          </button>
        </div>
        {Object.keys(documentData).length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {Object.keys(documentData).length} sheets loaded with{' '}
            {Object.values(documentData).reduce((sum, rows) => sum + rows.length, 0)} total rows
          </p>
        )}
      </div>
    </div>
  );
};
