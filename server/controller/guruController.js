import Guru from '../models/Guru.js';
import Chat from '../models/Chat.js';
// import { getAvailableModels, validateModelSettings } from '../config/ollama.js';

/**
 * @desc    Get all user's gurus
 * @route   GET /api/v1/guru/g-g
 * @access  Private
 */
export const getUserGurus = async (req, res) => {
  try {
    const gurus = await Guru.find({ user: req.user.id, isActive: true })
      .sort({ 'stats.lastUsed': -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: gurus.length,
      chatbots: gurus.map(guru => ({
        id: guru._id,
        name: guru.name,
        description: guru.description,
        subject: guru.subject,
        userid: guru.user,
        avatar: guru.avatar,
        stats: guru.stats,
        tags: guru.tags,
        createdAt: guru.createdAt
      }))
    });
  } catch (error) {
    console.error('Get user gurus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Create new guru (basic)
 * @route   POST /api/v1/guru/n-g/:userid
 * @access  Private
 */
export const createNewGuru = async (req, res) => {
  try {
    const { userid } = req.params;

    // Verify user owns this request
    if (userid !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create guru for this user'
      });
    }

    // Create a basic guru
    const guru = await Guru.create({
      name: 'New Guru',
      subject: 'General Knowledge',
      description: 'A helpful AI assistant ready to help with various topics.',
      user: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Guru created successfully',
      chatbot: {
        _id: guru._id,
        name: guru.name,
        description: guru.description,
        subject: guru.subject,
        user: guru.user
      }
    });
  } catch (error) {
    console.error('Create new guru error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Create custom guru
 * @route   POST /api/v1/guru/custom-guru/:userid
 * @access  Private
 */
export const createCustomGuru = async (req, res) => {
  try {
    const { userid } = req.params;
    const { name, subject, description } = req.body;

    // Verify user owns this request
    if (userid !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create guru for this user'
      });
    }

    // Create custom guru
    const guru = await Guru.create({
      name: name.trim(),
      subject: subject.trim(),
      description: description ? description.trim() : '',
      user: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Custom guru created successfully',
      chatbot: {
        _id: guru._id,
        name: guru.name,
        description: guru.description,
        subject: guru.subject,
        user: guru.user,
        systemPrompt: guru.systemPrompt
      }
    });
  } catch (error) {
    console.error('Create custom guru error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get guru by ID
 * @route   GET /api/v1/guru/:id
 * @access  Private
 */
export const getGuru = async (req, res) => {
  try {
    const guru = await Guru.findById(req.params.id);

    if (!guru) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found'
      });
    }

    // Check if user owns this guru or if it's public
    if (guru.user.toString() !== req.user.id && !guru.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this guru'
      });
    }

    res.status(200).json({
      success: true,
      guru: {
        id: guru._id,
        name: guru.name,
        description: guru.description,
        subject: guru.subject,
        userid: guru.user,
        avatar: guru.avatar,
        systemPrompt: guru.systemPrompt,
        settings: guru.settings,
        stats: guru.stats,
        tags: guru.tags,
        isPublic: guru.isPublic,
        createdAt: guru.createdAt
      }
    });
  } catch (error) {
    console.error('Get guru error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update guru
 * @route   PUT /api/v1/guru/:id
 * @access  Private
 */
export const updateGuru = async (req, res) => {
  try {
    let guru = await Guru.findById(req.params.id);

    if (!guru) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found'
      });
    }

    // Check if user owns this guru
    if (guru.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this guru'
      });
    }

    // Validate and update fields
    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name.trim();
    if (req.body.subject) updateFields.subject = req.body.subject.trim();
    if (req.body.description !== undefined) updateFields.description = req.body.description.trim();
    if (req.body.avatar) updateFields.avatar = req.body.avatar;
    if (req.body.tags) updateFields.tags = req.body.tags;
    if (req.body.isPublic !== undefined) updateFields.isPublic = req.body.isPublic;

    // Validate and update settings
    if (req.body.settings) {
  // No model settings for RAG-only mode
    }

    guru = await Guru.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Guru updated successfully',
      guru: {
        id: guru._id,
        name: guru.name,
        description: guru.description,
        subject: guru.subject,
        userid: guru.user,
        avatar: guru.avatar,
        systemPrompt: guru.systemPrompt,
        settings: guru.settings,
        stats: guru.stats,
        tags: guru.tags,
        isPublic: guru.isPublic
      }
    });
  } catch (error) {
    console.error('Update guru error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Delete guru
 * @route   DELETE /api/v1/guru/g-d/:id
 * @access  Private
 */
export const deleteGuru = async (req, res) => {
  try {
    const guru = await Guru.findById(req.params.id);

    if (!guru) {
      return res.status(404).json({
        success: false,
        message: 'Guru not found'
      });
    }

    // Check if user owns this guru
    if (guru.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this guru'
      });
    }

    // Soft delete - mark as inactive
    guru.isActive = false;
    await guru.save();

    // Also archive all chats with this guru
    await Chat.updateMany(
      { guru: guru._id, user: req.user.id },
      { isArchived: true }
    );

    res.status(200).json({
      success: true,
      message: 'Guru deleted successfully'
    });
  } catch (error) {
    console.error('Delete guru error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get chat with guru
 * @route   GET /api/v1/guru/g-c/:chatbotid/:userid
 * @access  Private
 */
export const getChatWithGuru = async (req, res) => {
  try {
    const { chatbotid, userid } = req.params;

    // Verify user owns this request
    if (userid !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    // Find or create chat
    let chat = await Chat.findOne({
      user: req.user.id,
      guru: chatbotid,
      isActive: true
    }).populate('guru', 'name subject');

    if (!chat) {
      // Create new chat
      const guru = await Guru.findById(chatbotid);
      if (!guru) {
        return res.status(404).json({
          success: false,
          message: 'Guru not found'
        });
      }

      chat = await Chat.create({
        user: req.user.id,
        guru: chatbotid,
        title: `Chat with ${guru.name}`
      });

      // Increment guru's chat count
      await guru.incrementChatCount();
    }

    res.status(200).json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        guru: chat.guru,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      },
      messages: chat.messages
    });
  } catch (error) {
    console.error('Get chat with guru error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get available AI models
 * @route   GET /api/v1/guru/models
 * @access  Private
 */
export const getAvailableAIModels = async (req, res) => {
  // No models in RAG-only mode
  res.status(200).json({
    success: true,
    models: []
  });
};
