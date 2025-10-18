import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'guru'],
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [10000, 'Message cannot be more than 10000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    model: { type: String },
    tokens: { type: Number },
    processingTime: { type: Number },
    error: { type: String },
    retrieved_chunks: [{
      index: { type: Number },
      file: { type: String },
      score: { type: Number },
      content: { type: String }
    }]
  }
}, {
  _id: true
});

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Chat must belong to a user']
  },
  guru: {
    type: mongoose.Schema.ObjectId,
    ref: 'Guru',
    required: [true, 'Chat must have a guru']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
    default: function() {
      return `Chat with ${this.guru?.name || 'Guru'}`;
    }
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    autoTitle: {
      type: Boolean,
      default: true
    },
    saveHistory: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    messageCount: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    lastRename: {
      type: Date
    },
    renameCount: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual for last message
chatSchema.virtual('lastMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// Update stats before saving
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.stats.messageCount = this.messages.length;
    this.stats.lastActivity = Date.now();
    
    // Calculate total tokens
    this.stats.totalTokens = this.messages.reduce((total, message) => {
      return total + (message.metadata?.tokens || 0);
    }, 0);

    // Auto-generate title from first user message if not set and autoTitle is enabled
    if (this.settings.autoTitle && (!this.title || this.title.startsWith('Chat with'))) {
      const firstUserMessage = this.messages.find(msg => msg.sender === 'user');
      if (firstUserMessage) {
        // Take first 50 characters of the first user message as title
        this.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }
  }
  next();
});

// Method to add message
chatSchema.methods.addMessage = function(sender, content, metadata = {}) {
  const message = {
    sender,
    content,
    timestamp: new Date(),
    metadata
  };
  
  this.messages.push(message);
  this.stats.lastActivity = Date.now();
  
  return this.save();
};

// Method to get recent messages (for context)
chatSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

// Method to clear messages
chatSchema.methods.clearMessages = function() {
  this.messages = [];
  this.stats.messageCount = 0;
  this.stats.totalTokens = 0;
  this.stats.lastActivity = Date.now();
  return this.save();
};

// Method to archive chat
chatSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Method to unarchive chat
chatSchema.methods.unarchive = function() {
  this.isArchived = false;
  return this.save();
};

// Create indexes
chatSchema.index({ user: 1, guru: 1 });
chatSchema.index({ user: 1, createdAt: -1 });
chatSchema.index({ guru: 1, createdAt: -1 });
chatSchema.index({ 'stats.lastActivity': -1 });
chatSchema.index({ isArchived: 1 });
chatSchema.index({ isPublic: 1 });

export default mongoose.model('Chat', chatSchema);
