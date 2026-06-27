const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    roleTitle: { type: String, trim: true },
    salaryCurrency: { type: String, trim: true, default: 'USD' },
    salaryAmount: { type: Number, min: 0 },
    startDate: { type: Date },
    reportingManager: { type: String, trim: true },
    location: { type: String, trim: true },
    offerLetterUrl: { type: String },     // /uploads/<uuid>.pdf
    ndaUrl: { type: String },             // /uploads/<uuid>.pdf
    generatedAt: { type: Date }
  },
  { _id: false }
);

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    status: {
      type: String,
      required: true,
      enum: ['Applied', 'Form Submitted', 'Interview Scheduled', 'Offer Sent', 'Hired', 'Rejected'],
      default: 'Applied'
    },

    // filled by HR on creation
    resumeUrl: { type: String },          // /uploads/<uuid>.pdf
    resumeOriginalName: { type: String },

    // filled by candidate via magic link
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    noticePeriod: { type: String, trim: true },
    salaryExpectation: { type: String, trim: true },
    linkedInUrl: { type: String, trim: true },

    // magic link
    magicToken: { type: String },
    magicTokenExpiresAt: { type: Date },
    magicTokenUsed: { type: Boolean, default: false },

    // offer details
    offer: { type: offerSchema },

    // rejection
    rejectionReason: { type: String, trim: true },

    lastActivityAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

candidateSchema.index({ magicToken: 1 }, { unique: true, sparse: true });
candidateSchema.index({ status: 1 });
candidateSchema.index({ jobId: 1 });
candidateSchema.index({ lastActivityAt: -1 });
candidateSchema.index({ name: 'text', email: 'text' });

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
