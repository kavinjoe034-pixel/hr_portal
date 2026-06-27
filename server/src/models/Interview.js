const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    recommendation: { type: String, enum: ['hire', 'no-hire', 'maybe'] },
    note: { type: String }
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },          // HH:mm format
    type: { type: String, required: true, enum: ['Screening', 'Technical'] },
    interviewer: { type: String, required: true, trim: true },
    notes: { type: String },
    status: { type: String, required: true, enum: ['Scheduled', 'Completed'], default: 'Scheduled' },
    feedback: { type: feedbackSchema }
  },
  { timestamps: true }
);

interviewSchema.index({ candidateId: 1 });
interviewSchema.index({ date: 1 });

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;
