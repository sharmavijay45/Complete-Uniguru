import express from 'express';
import { getRagAnswer } from '../config/rag.js';

const router = express.Router();

// POST /rag - Query the RAG endpoint
router.post('/', async (req, res) => {
  const { query, top_k } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, message: 'Query is required.' });
  }
  try {
    const ragResponse = await getRagAnswer(query, top_k);
    res.status(200).json(ragResponse);
  } catch (error) {
    res.status(500).json({ success: false, message: 'RAG service error', error: error.message });
  }
});

export default router;
