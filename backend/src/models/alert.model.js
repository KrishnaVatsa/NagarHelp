import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['high_priority_issue', 'disaster', 'resource_shortage', 'unsafe_route', 'sensor_threshold', 'sos'],
      required: true
    },
    severity: {
      type: String,
      enum: ['Medium', 'High', 'Critical'],
      default: 'High'
    },
    message: {
      type: String,
      required: true
    },
    relatedIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CivicIssue',
      default: null
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'email', 'both'],
      default: 'both'
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    retryCount: {
      type: Number,
      default: 0
    },
    lastError: {
      type: String,
      default: null
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

alertSchema.index({ read: 1, createdAt: -1 });
alertSchema.index({ severity: 1, status: 1 });

export default mongoose.model('Alert', alertSchema);