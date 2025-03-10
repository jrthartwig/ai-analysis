import { OpenAIClient, AzureKeyCredential } from "@azure/openai";

// You should use environment variables for these values in production
const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || "";
const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY || "";
const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME || "";

export class AzureOpenAIService {
  private client: OpenAIClient;
  
  constructor() {
    if (!endpoint || !apiKey || !deploymentName) {
      throw new Error("Azure OpenAI credentials not found in environment variables");
    }
    this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  }

  async generateCompletion(prompt: string, context?: string[]): Promise<string> {
    try {
      const systemMessage = "You are a helpful assistant that provides analysis of spreadsheet data. Format your responses using markdown where appropriate. Use tables for tabular data, code blocks for code or structured content, and headings for organization.";
      
      const messages = [
        { role: "system", content: systemMessage },
      ];

      if (context && context.length) {
        const contextStr = context.join("\n\n");
        
        messages.push({ 
          role: "system", 
          content: "Here is the relevant data from the user's spreadsheets:\n\n" + contextStr
        });
        
        messages.push({
          role: "system",
          content: "Use the data provided above to answer the user's question. Format your response with markdown. If the answer isn't in the data, say you don't have that information and provide a general response."
        });
      } else {
        messages.push({
          role: "system", 
          content: "I don't have specific data to reference for this query. I'll respond based on general knowledge. Format your response with markdown where appropriate."
        });
      }

      messages.push({ role: "user", content: prompt });

      const response = await this.client.getChatCompletions(
        deploymentName,
        messages,
        {
          maxTokens: 800,
          temperature: 0.7,
        }
      );

      return response.choices[0].message?.content || "No response generated";
    } catch (error) {
      console.error("Error generating completion:", error);
      throw error;
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();
