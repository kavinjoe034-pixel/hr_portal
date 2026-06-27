const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    type: {
      type: String,
      required: true,
      enum: ['Applied', 'Form Submitted', 'Interview Scheduled', 'Interview Completed', 'Offer Sent', 'Hired', 'Rejected', 'Status Changed']
    },
    title: { type: String, required: true },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed } // interviewId, offerUrl, rejectionReason, etc.
  },
  { timestamps: true }
);

timelineEventSchema.index({ candidateId: 1 });
timelineEventSchema.index({ createdAt: -1 });

const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema);

module.exports = TimelineEvent;
