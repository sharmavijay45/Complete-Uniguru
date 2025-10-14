import express from 'express';
import {
  sendChatMessage,
  getAllUserChats,
  getChat,
  updateChat,
  deleteAllUserChats,
  deleteChat,
  clearChatMessages,
  createNewChat,
  getUserChats,
  getChatById,
  updateChatDetails,
  getAllChatsWithData
} from '../controller/chatController.js';
import { protect } from '../middleware/auth.js';
import { validateChatMessage } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Chat routes
router.post('/new', validateChatMessage, sendChatMessage); // Send new message
router.post('/create', createNewChat); // Create new chat session
router.get('/list', getUserChats); // Get user chats (with filtering)
router.get('/all-chats', getAllUserChats); // Get all user chats (legacy)
router.get('/all-with-data', getAllChatsWithData); // Get all chats with full data for auto-loading
router.get('/:id', getChat); // Get specific chat (legacy)
router.get('/chat/:chatId', getChatById); // Get specific chat by ID
router.put('/:id', updateChat); // Update chat (legacy)
router.put('/chat/:chatId', updateChatDetails); // Update chat details
router.delete('/delete', deleteAllUserChats); // Delete all user chats
router.delete('/:id', deleteChat); // Delete specific chat (legacy)
// router.delete('/chat/:chatId', deleteChatById); // Delete specific chat by ID
router.delete('/:id/messages', clearChatMessages); // Clear chat messages

export default router;
