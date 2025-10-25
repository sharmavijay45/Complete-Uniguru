import dotenv from 'dotenv';
dotenv.config();

const RAG_URL = process.env.RAG_URL;
const LM_URL = process.env.LM_URL;

if (!RAG_URL) {
  throw new Error('RAG_URL is not defined in environment variables');
}

// Log RAG connection status on startup
(async () => {
  try {
    const testRes = await fetch(RAG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ query: 'health check', top_k: 1 })
    });
    if (testRes.ok) {
      console.log(`🤖 RAG URL configured: ${RAG_URL}`);
      console.log('✅ RAG connection successful.');
    } else {
      console.warn(`⚠️  RAG URL configured: ${RAG_URL} but connection failed with status ${testRes.status}`);
    }
  } catch (err) {
    console.warn(`⚠️  Could not connect to RAG at ${RAG_URL}:`, err.message);
  }

  // Test LM service connection if configured
  if (LM_URL) {
    try {
      const lmTestRes = await fetch(`${LM_URL}/health`, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
      if (lmTestRes.ok) {
        console.log(`🎵 LM service configured: ${LM_URL}`);
        console.log('✅ LM service connection successful.');
      } else {
        console.warn(`⚠️  LM service configured: ${LM_URL} but connection failed with status ${lmTestRes.status}`);
      }
    } catch (err) {
      console.warn(`⚠️  Could not connect to LM service at ${LM_URL}:`, err.message);
    }
  }
})();

/**
 * Send a query to the RAG endpoint and return the response
 * @param {string} query - The user's question
 * @param {number} [top_k=5] - Number of top results to retrieve
 * @param {Array} [context=[]] - Optional context array
 * @param {boolean} [generateAudio=false] - Whether to generate audio for the response
 * @returns {Promise<object>} - RAG response (groq_answer, retrieved_chunks, vaani_audio, etc)
 */
export const getRagAnswer = async (query, top_k = 5, context = [], generateAudio = false) => {
  try {
    const body = { query, top_k };
    if (Array.isArray(context) && context.length > 0) {
      body.context = context;
    }
    const response = await fetch(RAG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status} ${response.statusText}`);
    }
    const ragResult = await response.json();

    // If audio generation is requested and LM service is configured, generate audio
    if (generateAudio && LM_URL && ragResult.groq_answer) {
      try {
        console.log('🎵 Starting audio generation for RAG response...');

        // First, get authentication token from LM service
        const loginResponse = await fetch(`${LM_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: process.env.LM_USERNAME || 'admin',
            password: process.env.LM_PASSWORD || 'secret'
          }),
        });

        if (!loginResponse.ok) {
          throw new Error(`LM login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const token = loginData.access_token || loginData.token;

        if (!token) {
          throw new Error('No token received from LM service login');
        }

        console.log('✅ LM service authentication successful');

        // Now generate audio using the authenticated endpoint
        // Use the RAG answer as the text to convert to speech
        const textToSpeak = ragResult.groq_answer.substring(0, 1000); // Limit text length

        // Try the TTS generation endpoint with text input
        const audioResponse = await fetch(`${LM_URL}/api/v1/agents/tts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToSpeak,
            voice: 'en_us_female_conversational',
            language: 'en'
          }),
        });

        if (audioResponse.ok) {
          const audioResult = await audioResponse.json();
          if (audioResult.audio_url) {
            ragResult.vaani_audio = {
              audio_url: audioResult.audio_url,
              content_type: 'audio/wav'
            };
            console.log('🎵 Audio generated successfully for RAG response');
          } else {
            console.warn('⚠️ TTS endpoint returned success but no audio_url');
            ragResult.vaani_audio = { error: 'No audio URL in TTS response' };
          }
        } else {
          const errorText = await audioResponse.text();
          console.warn('⚠️ TTS endpoint failed:', errorText);
          ragResult.vaani_audio = { error: `TTS generation failed: ${audioResponse.status}` };
        }
      } catch (audioError) {
        console.error('Audio generation error:', audioError);
        ragResult.vaani_audio = { error: `Audio generation service error: ${audioError.message}` };
      }
    }

    return ragResult;
  } catch (error) {
    console.error('RAG API error:', error);
    throw error;
  }
};

export default { getRagAnswer };
