import mongoose from 'mongoose';

const whatsappLogSchema = new mongoose.Schema(
  {
    messageId: String,
    phoneNumber: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document'],
      default: 'text'
    },
    content: mongoose.Schema.Types.Mixed, // Flexible content structure
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'pending'
    },
    linkedCivicIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CivicIssue'
    },
    linkedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    aiResponse: {
      processed: Boolean,
      category: String,
      intent: String,
      confidence: Number,
      generatedResponse: String
    },
    errorDetails: String
  },
  {
    timestamps: true
  }
);

whatsappLogSchema.index({ phoneNumber: 1, createdAt: -1 });
whatsappLogSchema.index({ linkedCivicIssue: 1 });
whatsappLogSchema.index({ linkedUser: 1 });
whatsappLogSchema.index({ status: 1 });

export default mongoose.model('WhatsappLog', whatsappLogSchema);
