const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    skills: [{ type: String, trim: true }],
    status: { type: String, required: true, enum: ['Open', 'Closed'], default: 'Open' }
  },
  { timestamps: true }
);

jobSchema.index({ status: 1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
