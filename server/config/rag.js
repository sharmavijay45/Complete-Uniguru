import dotenv from 'dotenv';
dotenv.config();

const RAG_URL = process.env.RAG_URL;

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
})();

/**
 * Send a query to the RAG endpoint and return the response
 * @param {string} query - The user's question
 * @param {number} [top_k=5] - Number of top results to retrieve

 * @param {string} query - The user's question
 * @param {number} [top_k=5] - Number of top results to retrieve
 * @param {Array} [context=[]] - Optional context array
 * @returns {Promise<object>} - RAG response (groq_answer, retrieved_chunks, etc)
 */
export const getRagAnswer = async (query, top_k = 5, context = []) => {
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
    return await response.json();
  } catch (error) {
    console.error('RAG API error:', error);
    throw error;
  }
};

export default { getRagAnswer };
