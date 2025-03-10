import { TextAnalysisClient, AzureKeyCredential } from "@azure/ai-language-text";

// You should use environment variables for these values in production
const endpoint = import.meta.env.VITE_AZURE_LANGUAGE_ENDPOINT || "";
const apiKey = import.meta.env.VITE_AZURE_LANGUAGE_API_KEY || "";

interface Document {
  id: string;
  text: string;
  language: string;
}

export class AzureLanguageService {
  private client: TextAnalysisClient;
  private hasCredentials: boolean;
  
  constructor() {
    this.hasCredentials = !!(endpoint && apiKey);
    
    if (!this.hasCredentials) {
      console.warn("Azure Language credentials not found in environment variables");
      // Create a dummy client for development
      this.client = {} as TextAnalysisClient;
      return;
    }
    
    try {
      this.client = new TextAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
    } catch (error) {
      console.error("Failed to initialize Azure Language client:", error);
      this.client = {} as TextAnalysisClient;
    }
  }

  async extractKeyPhrases(input: string | Document[]): Promise<string[]> {
    try {
      if (!this.hasCredentials) {
        return this.getMockKeyPhrases(typeof input === 'string' ? input : JSON.stringify(input));
      }
      
      // Handle both string and document array input
      const documents: Document[] = Array.isArray(input) 
        ? input 
        : [{ id: "1", language: "en", text: input }];
      
      // Skip empty documents
      const validDocuments = documents.filter(doc => doc.text && doc.text.trim().length > 0);
      
      if (validDocuments.length === 0) {
        console.warn("No valid documents to process for key phrase extraction");
        return [];
      }
      
      // Using the correct method to analyze key phrases
      const results = await this.client.analyze("KeyPhraseExtraction", validDocuments);
      
      const keyPhrases: string[] = [];
      
      // Filter only successful results and extract key phrases
      for (const result of results) {
        if (!result.error && result.keyPhrases) {
          keyPhrases.push(...result.keyPhrases);
        } else if (result.error) {
          console.warn(`Error in key phrase extraction: ${result.error.message}`);
        }
      }
      
      return keyPhrases;
    } catch (error) {
      console.error("Error extracting key phrases:", error);
      return Array.isArray(input) 
        ? this.getMockKeyPhrases(JSON.stringify(input)) 
        : this.getMockKeyPhrases(input);
    }
  }

  async analyzeSentiment(text: string): Promise<any> {
    try {
      if (!this.hasCredentials) {
        return this.getMockSentimentAnalysis(text);
      }
      
      const documents = [{ id: "1", language: "en", text }];
      
      // Skip if text is empty
      if (!text || text.trim().length === 0) {
        return this.getMockSentimentAnalysis("Sample text for sentiment analysis");
      }
      
      // Using the correct method to analyze sentiment with opinion mining
      const results = await this.client.analyze("SentimentAnalysis", documents, { 
        includeOpinionMining: true 
      });
      
      // Filter only successful results
      const successfulResults = results.filter(result => result.error === undefined);
      if (successfulResults.length > 0) {
        const result = successfulResults[0];
        return {
          sentiment: result.sentiment,
          confidenceScores: result.confidenceScores,
          sentences: result.sentences
        };
      }
      
      return this.getMockSentimentAnalysis(text);
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      return this.getMockSentimentAnalysis(text);
    }
  }
  
  // Mock methods for development without actual Azure services
  private getMockKeyPhrases(text: string): string[] {
    // Simple mock implementation that extracts capitalized words and words after "important" keywords
    const words = text.split(/\s+/);
    const keyPhrases = new Set<string>();
    
    // Identify capitalized words (potential key phrases)
    words.forEach((word, i) => {
      // Remove punctuation
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      
      // Add capitalized words that aren't at the beginning of a sentence
      if (i > 0 && cleanWord.length > 3 && cleanWord[0] === cleanWord[0].toUpperCase() && cleanWord[0] !== cleanWord[0].toLowerCase()) {
        keyPhrases.add(cleanWord);
      }
      
      // Add important-looking words
      if (i > 0 && ["important", "significant", "key", "critical", "major"].includes(words[i-1].toLowerCase())) {
        keyPhrases.add(cleanWord);
      }
    });
    
    // If we didn't get any phrases, extract some longer words
    if (keyPhrases.size === 0) {
      words.forEach(word => {
        const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        if (cleanWord.length > 6) {
          keyPhrases.add(cleanWord);
        }
      });
    }
    
    return Array.from(keyPhrases).slice(0, 10);
  }
  
  private getMockSentimentAnalysis(text: string): any {
    // Simple mock sentiment analysis based on positive/negative word count
    const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "best", "happy", "positive", "success"];
    const negativeWords = ["bad", "terrible", "awful", "horrible", "worst", "sad", "negative", "failure", "poor"];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });
    
    let sentiment = "neutral";
    if (positiveCount > negativeCount * 2) sentiment = "positive";
    else if (negativeCount > positiveCount * 2) sentiment = "negative";
    else if (positiveCount > 0 && negativeCount > 0) sentiment = "mixed";
    
    const positiveScore = Math.min(0.99, positiveCount / words.length * 5);
    const negativeScore = Math.min(0.99, negativeCount / words.length * 5);
    const neutralScore = Math.max(0.01, 1 - positiveScore - negativeScore);
    
    return {
      sentiment,
      confidenceScores: {
        positive: positiveScore,
        negative: negativeScore,
        neutral: neutralScore
      },
      sentences: [{
        sentiment,
        confidenceScores: {
          positive: positiveScore,
          negative: negativeScore,
          neutral: neutralScore
        },
        text
      }]
    };
  }
}

export const azureLanguageService = new AzureLanguageService();
