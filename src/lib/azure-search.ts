import axios from "axios";

// Use proxy server to avoid CORS issues
const proxyUrl = "http://localhost:3001";

export class AzureSearchService {
  // Remove unused private hasCredentials property
  private currentIndexName: string = "";
  
  constructor() {
    // Remove the hasCredentials initialization
  }

  async searchDocuments(query: string, top = 10): Promise<any[]> {
    try {
      if (!this.currentIndexName) {
        console.log("No index available for search");
        return this.getMockSearchResults(query);
      }

      // Extract keywords from the query
      const keywords = this.extractKeywords(query);
      
      console.log(`Searching index ${this.currentIndexName} for: "${query}"`);
      console.log(`Keywords: ${keywords.join(', ')}`);

      // Use enhanced keyword search configuration
      const response = await axios.post(
        `${proxyUrl}/api/search/indexes/${this.currentIndexName}/docs/search`, 
        {
          search: query,
          queryType: "full",        // Enable Lucene query syntax for better matching
          searchMode: "any",        // Match any term for better recall
          searchFields: ["content", "metadata/sheetName", "metadata/additionalInfo"],
          queryLanguage: "en-US",   // Specify language for better tokenization
          top: top,
          select: "id,content,metadata",
          highlight: "content",     // Return highlighted snippets
          semanticSearch: true      // Use semantic search if available
        }
      );

      if (response.data && response.data.value) {
        console.log(`Search returned ${response.data.value.length} results`);
        
        // Log a sample result for debugging
        if (response.data.value.length > 0) {
          console.log('Sample result:', JSON.stringify(response.data.value[0], null, 2));
        } else {
          // Fallback to a more permissive search if no results found
          console.log('No results found for query, trying fallback search...');
          return this.fallbackSearch(query, top);
        }
        
        return response.data.value;
      }

      return this.getMockSearchResults(query);
    } catch (error) {
      console.error("Error searching documents:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API response:", error.response.data);
      }
      
      // Try fallback search if we got an error
      try {
        console.log("Trying fallback keyword-only search due to error");
        return this.fallbackSearch(query, top);
      } catch (fallbackErr) {
        console.error("Fallback search also failed:", fallbackErr);
        return this.getMockSearchResults(query);
      }
    }
  }
  
  // Extract keywords from natural language query
  private extractKeywords(query: string): string[] {
    // Remove common stop words
    const stopWords = [
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 
      'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 
      'between', 'both', 'but', 'by', 'can', 'did', 'do', 'does', 'doing', 'don', 
      'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 
      'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 
      'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 
      'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 
      'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 
      'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 
      'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 
      'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 
      'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 
      'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'tell', 'me', 'give',
      'information', 'explain', 'show', 'find', 'search', 'look'
    ];
    
    // Clean and tokenize the query
    const tokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));
    
    // Extract potential keyword phrases (up to 3 words)
    let phrases: string[] = [];
    
    // Add single words
    phrases = phrases.concat(tokens);
    
    // Add 2-word phrases
    for (let i = 0; i < tokens.length - 1; i++) {
      phrases.push(`${tokens[i]} ${tokens[i+1]}`);
    }
    
    // Add 3-word phrases
    for (let i = 0; i < tokens.length - 2; i++) {
      phrases.push(`${tokens[i]} ${tokens[i+1]} ${tokens[i+2]}`);
    }
    
    // Make keywords unique
    return Array.from(new Set(phrases));
  }
  
  // Fallback search when initial search returns no results or errors
  private async fallbackSearch(query: string, top: number): Promise<any[]> {
    try {
      console.log(`Trying basic keyword search for: "${query}"`);
      
      // Extract words for more flexible search
      const words = query.split(/\s+/)
        .filter(word => word.length > 2)
        .map(word => word.replace(/[^\w]/g, ''));
      
      if (words.length === 0) {
        return this.getMockSearchResults(query);
      }
      
      // Join words with OR for more permissive search
      const searchQuery = words.join(' OR ');
      
      // Use simple query syntax for fallback
      const response = await axios.post(
        `${proxyUrl}/api/search/indexes/${this.currentIndexName}/docs/search`, 
        {
          search: searchQuery,
          queryType: "simple",
          searchMode: "any",
          top: top * 2, // Get more results for better coverage
          select: "id,content,metadata"
        }
      );

      if (response.data && response.data.value && response.data.value.length > 0) {
        console.log(`Basic keyword search returned ${response.data.value.length} results`);
        return response.data.value;
      }
      
      // Last resort: try with individual words
      if (words.length > 0) {
        // Use the most distinctive word (usually the longest)
        const longestWord = words.sort((a, b) => b.length - a.length)[0];
        
        console.log(`Trying last-resort search with keyword: ${longestWord}`);
        
        const lastResponse = await axios.post(
          `${proxyUrl}/api/search/indexes/${this.currentIndexName}/docs/search`, 
          {
            search: longestWord,
            queryType: "simple",
            searchMode: "any",
            top: top,
            select: "id,content,metadata"
          }
        );
        
        if (lastResponse.data && lastResponse.data.value && lastResponse.data.value.length > 0) {
          return lastResponse.data.value;
        }
      }
      
      return this.getMockSearchResults(query);
    } catch (error) {
      console.error("Error in fallback search:", error);
      return this.getMockSearchResults(query);
    }
  }

  // For development without actual Azure services
  private getMockSearchResults(query: string): any[] {
    return [
      {
        id: "mock-1",
        content: `This is mock content related to "${query}"`,
        metadata: { sheetName: "MockSheet" }
      },
      {
        id: "mock-2",
        content: `Additional information about "${query}" and related topics`,
        metadata: { sheetName: "MockSheet" }
      }
    ];
  }

  /**
   * Create a temporary search index with the provided data
   */
  async createTempIndex(data: any[]): Promise<boolean> {
    try {
      console.log(`Creating search index with ${data.length} documents`);
      
      // Format documents for indexing with optimized content
      const documents = data.map((item, index) => {
        // Create a standard format for all documents
        let content = '';
        
        // If it's already a string, use it
        if (typeof item.content === 'string') {
          content = item.content;
        } 
        // If it has metadata with additionalInfo, extract it
        else if (item.metadata?.additionalInfo) {
          try {
            // Try to parse the additionalInfo if it's a JSON string
            const additionalData = JSON.parse(item.metadata.additionalInfo);
            content = Object.entries(additionalData)
              .map(([key, value]) => `${key}: ${value}`)
              .join('. ');
          } catch (e) {
            // If parsing fails, use as is
            content = item.metadata.additionalInfo;
          }
        } 
        // Otherwise, create content from the item directly
        else if (typeof item === 'object') {
          content = Object.entries(item)
            .filter(([key]) => key !== 'id' && key !== 'metadata')
            .map(([key, value]) => `${key}: ${value}`)
            .join('. ');
        }

        // Ensure we have valid metadata
        const metadata = {
          sheetName: item.metadata?.sheetName || 'unknown',
          additionalInfo: item.metadata?.additionalInfo || ''
        };

        // Create a valid document with unique ID
        return {
          id: item.id || `doc-${index}`,
          content: content || JSON.stringify(item),
          metadata: metadata
        };
      });

      console.log("Sample document:", documents[0]);

      // Create search index through our proxy server
      const response = await axios.post(`${proxyUrl}/api/create-index`, {
        documents: documents
      });

      if (response.data && response.data.indexName) {
        // Store the index name for future searches
        this.currentIndexName = response.data.indexName;
        console.log(`Search index created successfully: ${this.currentIndexName}`);
        console.log(`Document count: ${response.data.documentCount || 'unknown'}`);
        return true;
      } else {
        console.error("Failed to create index:", response.data);
        return false;
      }
    } catch (error) {
      console.error("Error creating index:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API response:", error.response.data);
      }
      return false;
    }
  }

  // Get the current index name
  getCurrentIndexName(): string {
    return this.currentIndexName;
  }
}

export const azureSearchService = new AzureSearchService();
