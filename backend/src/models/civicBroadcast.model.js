import mongoose from 'mongoose';


const civicBroadcastSchema = new mongoose.Schema(
  {
    civicIssueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CivicIssue',
      required: true
    },
    title: String,
    message: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude]
    },
    radiusKm: {
      type: Number,
      default: 5
    },
    broadcastChannels: {
      whatsapp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    sentTo: {
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      totalCount: Number
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Sending', 'Sent', 'Failed'],
      default: 'Sending'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: Date,
    failureReason: String
  },
  {
    timestamps: true
  }
);

civicBroadcastSchema.index({ civicIssueId: 1 });
civicBroadcastSchema.index({ status: 1, sentAt: -1 });
civicBroadcastSchema.index({ 'location': '2dsphere' });

export default mongoose.model('CivicBroadcast', civicBroadcastSchema);
