import mongoose from 'mongoose';


const civicIssueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an issue title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
      type: String,
      required: [true, 'Please specify the issue category'],
      enum: ['Pothole', 'Garbage', 'Safety', 'Waterlogging', 'Streetlight', 'Drainage', 'Other'],
      default: 'Other'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'In-Progress', 'Resolved', 'Rejected'],
      default: 'Pending'
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      },
      address: String
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    images: {
      type: [String], // Firebase Storage URLs
      default: []
    },
    source: {
      type: String,
      enum: ['app', 'whatsapp'],
      default: 'app'
    },
    reporterPhone: {
      type: String,
      default: null
    },
    adminNote: {
      type: String,
      default: null
    },
    videos: {
      type: [String],
      default: []
    },
    attachments: {
      type: [{
        url: String,
        label: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      default: []
    },
    audio: String,
    verified: {
      type: Boolean,
      default: false
    },
    aiAnalysis: {
      isReal: Boolean,
      confidence: Number,
      category: String,
      summary: String,
      analyzedAt: Date
    },
    upvotes: {
      type: Number,
      default: 0
    },
    upvoters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    assignedDepartment: {
      type: String,
      enum: ['Sanitation', 'Roads', 'Electricity', 'Water', 'Other'],
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    comments: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    estimatedCompletionDate: Date,
    sourceChannel: {
      type: String,
      enum: ['WhatsApp', 'Web', 'Mobile', 'Other'],
      default: 'Web'
    },
    whatsappMessageId: String,

    // ── Added for Structured API Validation Layer (hackathon Core 1) ──
    isDuplicate: {
      type: Boolean,
      default: false
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CivicIssue',
      default: null
    },
    flags: {
      type: [String], // e.g. ['suspicious_image', 'no_description', 'possible_duplicate']
      default: []
    },

    // ── Added for Status Workflow + Accountability Log (hackathon Core 2) ──
    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: ['Draft', 'Pending', 'In-Progress', 'Resolved', 'Rejected']
          },
          actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          note: String,
          timestamp: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Create geospatial index for location-based queries
civicIssueSchema.index({ 'location': '2dsphere' });
civicIssueSchema.index({ category: 1, status: 1 });
civicIssueSchema.index({ reportedBy: 1, createdAt: -1 });
civicIssueSchema.index({ priority: 1, status: 1 });

export default mongoose.model('CivicIssue', civicIssueSchema);