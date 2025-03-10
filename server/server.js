const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for the client app
app.use(cors());

// Middleware to parse JSON
app.use(express.json({ limit: '50mb' }));

// Azure Search API version
const API_VERSION = '2023-10-01-Preview';

// Helper function to create a unique index name based on timestamp
function generateIndexName() {
  const timestamp = Date.now();
  return `temp-index-${timestamp}`;
}

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Proxy middleware for Azure AI Search
app.use('/api/search', async (req, res) => {
  // Extract the URL after /api/search
  const targetPath = req.url;
  const searchEndpoint = process.env.VITE_AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.VITE_AZURE_SEARCH_API_KEY;
  
  if (!searchEndpoint || !apiKey) {
    return res.status(500).json({ error: 'Search credentials not configured' });
  }
  
  // Build the full Azure Search URL with API version
  const fullUrl = `${searchEndpoint}${targetPath}${targetPath.includes('?') ? '&' : '?'}api-version=${API_VERSION}`;
  
  console.log(`Proxying request to: ${fullUrl}`);
  
  try {
    // Forward the request to Azure Search
    const response = await axios({
      method: req.method,
      url: fullUrl,
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      data: req.method !== 'GET' ? req.body : undefined
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Endpoint to create a new search index (without vector search)
app.post('/api/create-index', async (req, res) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Invalid documents data' });
    }

    // Generate a unique index name
    const indexName = req.body.indexName || generateIndexName();
    const searchEndpoint = process.env.VITE_AZURE_SEARCH_ENDPOINT;
    const apiKey = process.env.VITE_AZURE_SEARCH_API_KEY;
    
    if (!searchEndpoint || !apiKey) {
      return res.status(500).json({ error: 'Search credentials not configured' });
    }

    console.log(`Creating search index ${indexName} with ${documents.length} documents`);

    // Check if index already exists, and delete if it does
    try {
      const checkUrl = `${searchEndpoint}/indexes/${indexName}?api-version=${API_VERSION}`;
      await axios.delete(checkUrl, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Existing index ${indexName} deleted`);
    } catch (error) {
      // Index doesn't exist, which is fine
      if (error.response && error.response.status !== 404) {
        console.error("Error checking/deleting index:", error.message);
      }
    }

    // Create a simple index definition without vector search capabilities
    const createIndexUrl = `${searchEndpoint}/indexes?api-version=${API_VERSION}`;
    const indexDefinition = {
      name: indexName,
      fields: [
        {
          name: "id",
          type: "Edm.String",
          key: true,
          searchable: false,
          filterable: true
        },
        {
          name: "content",
          type: "Edm.String",
          searchable: true,
          filterable: false,
          analyzer: "en.microsoft" // Use English analyzer for better search
        },
        {
          name: "metadata",
          type: "Edm.ComplexType",
          fields: [
            {
              name: "sheetName",
              type: "Edm.String",
              searchable: true,
              filterable: true
            },
            {
              name: "additionalInfo",
              type: "Edm.String", 
              searchable: true,
              filterable: false
            }
          ]
        }
      ],
      // Add semantic configuration for better search results
      semantic: {
        configurations: [
          {
            name: "my-semantic-config",
            prioritizedFields: {
              contentFields: [
                {
                  fieldName: "content"
                }
              ],
              keywordsFields: [
                {
                  fieldName: "metadata/sheetName"
                }
              ]
            }
          }
        ]
      }
    };

    // Create the index
    try {
      const createResponse = await axios.post(createIndexUrl, indexDefinition, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Index created successfully:', createResponse.status);
    } catch (error) {
      console.error('Error creating index:', error.message);
      if (error.response) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      return res.status(500).json({ 
        error: 'Failed to create index', 
        details: error.message,
        responseData: error.response ? error.response.data : null
      });
    }
    
    // Process and upload documents in batches
    const batchSize = 1000; // Azure Search batch limit
    
    for (let i = 0; i < documents.length; i += batchSize) {
      try {
        const batch = documents.slice(i, i + batchSize);
        const preparedBatch = batch.map(doc => {
          // Clean and validate document
          const content = doc.content || '';
          
          // Prepare document for indexing
          return {
            id: doc.id,
            content: content,
            metadata: {
              sheetName: doc.metadata?.sheetName || 'unknown',
              additionalInfo: doc.metadata?.additionalInfo || ''
            }
          };
        });
        
        // Upload the batch to the index
        const uploadUrl = `${searchEndpoint}/indexes/${indexName}/docs/index?api-version=${API_VERSION}`;
        console.log(`Uploading batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(documents.length/batchSize)}`);
        
        const uploadResponse = await axios.post(uploadUrl, {
          value: preparedBatch
        }, {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Batch ${Math.floor(i/batchSize) + 1} uploaded with status:`, uploadResponse.status);
        
        // Add a delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (batchError) {
        console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, batchError.message);
        if (batchError.response && batchError.response.data) {
          console.error('Batch error details:', JSON.stringify(batchError.response.data, null, 2));
        }
        // Continue with next batch
      }
    }

    // Wait for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify the index exists and has documents
    try {
      const countUrl = `${searchEndpoint}/indexes/${indexName}/docs/$count?api-version=${API_VERSION}`;
      const countResponse = await axios.get(countUrl, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Index ${indexName} contains ${countResponse.data} documents`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Search index created successfully', 
        indexName,
        documentCount: countResponse.data
      });
    } catch (countError) {
      console.error('Error getting document count:', countError.message);
      res.status(200).json({ 
        success: true, 
        message: 'Index created, but document count unavailable', 
        indexName,
        documentCount: 'unknown'
      });
    }
  } catch (error) {
    console.error('Error in create-index endpoint:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({ 
      error: 'Failed to create index', 
      details: error.message,
      responseData: error.response ? error.response.data : null
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
