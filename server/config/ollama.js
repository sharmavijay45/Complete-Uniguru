import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_NGROK_URL = process.env.OLLAMA_NGROK_URL || null;
const OLLAMA_MODEL = 'llama3.1';

// Determine which URL to use (prefer ngrok if available)
const ACTIVE_OLLAMA_URL = OLLAMA_NGROK_URL || OLLAMA_BASE_URL;


/**
 * Generate AI response using Ollama
 */
export const generateOllamaResponse = async (messages, guru, options = {}) => {
  try {
    // Check if Ollama is available
    if (!ollamaAvailable) {
      return {
        content: 'AI features are currently unavailable. Please ensure Ollama is running and llama3.1 model is installed.',
        metadata: {
          model: 'unavailable',
          tokens: 0,
          processingTime: 0,
          error: 'Ollama not available or llama3.1 model not found'
        }
      };
    }

    const {
      temperature = guru.settings?.temperature || 0.7,
      maxTokens = guru.settings?.maxTokens || 1024,
    } = options;

    // Prepare messages for Ollama API
    const ollamaMessages = [
      {
        role: 'system',
        content: guru.systemPrompt
      },
      ...messages.map(msg => {
        let content = msg.content;

        // Check if the message contains file content (images or PDFs)
        if (content.includes('[Image:') || content.includes('[PDF:')) {
          // Extract the file content and format it properly for analysis
          const fileContentRegex = /\[(Image|PDF): ([^\]]+)\]\n([\s\S]*?)(?=\n\[(?:Image|PDF):|$)/g;
          let match;
          let processedContent = content;

          while ((match = fileContentRegex.exec(content)) !== null) {
            const [fullMatch, fileType, fileName, fileContent] = match;

            // Replace the file content with a more structured format for Ollama
            const structuredContent = `\n\n=== ANALYZE THIS ${fileType.toUpperCase()} CONTENT ===
File: ${fileName}
Content to analyze:
${fileContent.trim()}
=== END OF ${fileType.toUpperCase()} CONTENT ===\n\n`;

            processedContent = processedContent.replace(fullMatch, structuredContent);
          }

          // If we found file content, add explicit instructions
          if (processedContent !== content) {
            const userMessage = content.split(/\[(Image|PDF):/)[0].trim();
            processedContent = `${userMessage}

Please analyze the file content provided above and answer my question based on that content. Focus specifically on the information extracted from the uploaded file(s).

${processedContent}`;
          }

          content = processedContent;
        }

        return {
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: content
        };
      })
    ];

    const startTime = Date.now();

    // Make request to Ollama API (use ngrok URL if available, otherwise local)
    let response;

    if (OLLAMA_NGROK_URL) {
      // Use ngrok endpoint with /api/generate format
      const prompt = ollamaMessages.map(msg => {
        if (msg.role === 'system') return `System: ${msg.content}`;
        if (msg.role === 'user') return `User: ${msg.content}`;
        return `Assistant: ${msg.content}`;
      }).join('\n\n');

      // Add additional instruction for file content analysis if present
      const hasFileContent = prompt.includes('=== ANALYZE THIS');
      const finalPrompt = hasFileContent ?
        `${prompt}\n\nIMPORTANT: The user has uploaded file(s) with content marked between === markers. Please analyze this content carefully and provide a detailed response based on the uploaded file content.` :
        prompt;

      response = await fetch(OLLAMA_NGROK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: finalPrompt,
          stream: false,
          options: {
            temperature: temperature,
            num_predict: maxTokens,
          }
        })
      });
    } else {
      // Use local endpoint with /api/chat format
      response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: temperature,
            num_predict: maxTokens,
          }
        })
      });
    }

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const completion = await response.json();
    const processingTime = Date.now() - startTime;

    // Handle different response formats (ngrok vs local)
    let content, tokens, promptTokens, completionTokens;

    if (OLLAMA_NGROK_URL) {
      // Ngrok endpoint returns response in 'response' field
      content = completion.response || 'I apologize, but I could not generate a response.';
      tokens = completion.eval_count || 0;
      promptTokens = completion.prompt_eval_count || 0;
      completionTokens = completion.eval_count || 0;
    } else {
      // Local endpoint returns response in 'message.content' field
      content = completion.message?.content || 'I apologize, but I could not generate a response.';
      tokens = completion.eval_count || 0;
      promptTokens = completion.prompt_eval_count || 0;
      completionTokens = completion.eval_count || 0;
    }

    return {
      content: content,
      metadata: {
        model: OLLAMA_MODEL,
        tokens: tokens,
        processingTime: processingTime,
        promptTokens: promptTokens,
        completionTokens: completionTokens,
        endpoint: OLLAMA_NGROK_URL ? 'ngrok' : 'local'
      }
    };
  } catch (error) {
    console.error('Ollama API error:', error);

    // Return a fallback response
    return {
      content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
      metadata: {
        model: 'fallback',
        tokens: 0,
        processingTime: 0,
        error: error.message
      }
    };
  }
};

/**
 * Get available Ollama models
 */
export const getAvailableModels = () => {
  return [
    {
      id: 'llama3.1',
      name: 'Llama 3.1 (Local)',
      description: 'Local Llama 3.1 model running on Ollama',
      maxTokens: 4096,
      recommended: true,
      local: true
    }
  ];
};

/**
 * Validate model settings
 */
export const validateModelSettings = (settings) => {
  const availableModels = getAvailableModels().map(m => m.id);
  
  return {
    model: availableModels.includes(settings.model) ? settings.model : 'llama3.1',
    temperature: Math.max(0, Math.min(2, settings.temperature || 0.7)),
    maxTokens: Math.max(1, Math.min(4096, settings.maxTokens || 1024)),
    topP: Math.max(0, Math.min(1, settings.topP || 1))
  };
};

/**
 * Test Ollama connection and model availability
 */
export const testOllamaConnectionStatus = async () => {
  try {
    if (OLLAMA_NGROK_URL) {
      // Test ngrok endpoint with a simple generation
      const response = await fetch(OLLAMA_NGROK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: 'Test',
          stream: false
        })
      });

      if (response.ok) {
        return {
          connected: true,
          endpoint: 'ngrok',
          url: OLLAMA_NGROK_URL,
          model: OLLAMA_MODEL
        };
      }
      return { connected: false, error: `HTTP ${response.status}`, endpoint: 'ngrok' };
    } else {
      // Test local endpoint
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        return {
          connected: true,
          endpoint: 'local',
          url: OLLAMA_BASE_URL,
          models: models.map(m => m.name),
          hasLlama31: models.some(model => model.name.includes('llama3.1'))
        };
      }
      return { connected: false, error: `HTTP ${response.status}`, endpoint: 'local' };
    }
  } catch (error) {
    return { connected: false, error: error.message, endpoint: OLLAMA_NGROK_URL ? 'ngrok' : 'local' };
  }
};

/**
 * Simple test function to verify Ollama integration
 */
export const testOllamaIntegration = async () => {
  try {
    const testGuru = {
      systemPrompt: "You are a helpful AI assistant. Respond briefly and clearly.",
      settings: {
        temperature: 0.7,
        maxTokens: 100
      }
    };

    const testMessages = [{
      sender: 'user',
      content: 'Hello! Please respond with "Ollama integration working!" to confirm the connection.'
    }];

    const response = await generateOllamaResponse(testMessages, testGuru);
    return {
      success: true,
      response: response.content,
      metadata: response.metadata
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// For backward compatibility, export generateOllamaResponse as generateGroqResponse
export const generateGroqResponse = generateOllamaResponse;

export default {
  generateOllamaResponse,
  generateGroqResponse,
  getAvailableModels,
  validateModelSettings,
  testOllamaConnectionStatus,
  testOllamaIntegration
};
