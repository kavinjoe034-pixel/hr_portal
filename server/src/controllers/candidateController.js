const crypto = require('crypto');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const TimelineEvent = require('../models/TimelineEvent');
const Job = require('../models/Job');
const { logEvent } = require('../utils/timeline');
const { clientUrl } = require('../config/env');
const { uploadResumeToCloudinary } = require('../services/cloudinaryService');
const path = require('path');

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const listCandidates = async (req, res) => {
  try {
    const { status, q } = req.query;

    const query = {};

    if (status && status.trim() !== '') {
      query.status = status.trim();
    }

    if (q && q.trim() !== '') {
      const search = q.trim();
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const candidates = await Candidate.find(query)
      .populate('jobId', 'title')
      .sort({ lastActivityAt: -1 })
      .lean();

    res.status(200).json(candidates);
  } catch (error) {
    console.error('listCandidates error:', error.message);
    res.status(500).json({ message: 'Failed to fetch candidates' });
  }
};

const createCandidate = async (req, res) => {
  try {
    const { name, email, jobId } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      return res.status(400).json({ message: 'Job is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Resume PDF is required' });
    }

    const job = await Job.findById(jobId.trim());

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status === 'Closed') {
      return res.status(400).json({
        message: 'Job is closed and cannot accept new candidates',
      });
    }

    // Upload resume to Cloudinary
    const resumeUrl = await uploadResumeToCloudinary(
      req.file.path,
      `${Date.now()}-${path.parse(req.file.originalname).name}`,
      'rove-hire/resumes'
    );

    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpiresAt = new Date(Date.now() + FOURTEEN_DAYS_MS);

    console.log("resumeurl",resumeUrl);

    const candidate = await Candidate.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      jobId: job._id,
      status: 'Applied',
      resumeUrl,
      resumeOriginalName: req.file.originalname,
      magicToken,
      magicTokenExpiresAt,
      magicTokenUsed: false,
      lastActivityAt: new Date(),
    });

    await logEvent(
      candidate._id,
      'Applied',
      'Application received',
      `${candidate.name} applied for ${job.title}.`,
      { source: 'manual' }
    );

    const magicLink = `${clientUrl}/apply/${magicToken}`;

    return res.status(201).json({
      candidate: await Candidate.findById(candidate._id)
        .populate('jobId', 'title')
        .lean(),
      magicLink,
    });
  } catch (error) {
    console.error('createCandidate error:', error);

    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({
        message: 'Only PDF files are allowed',
      });
    }

    return res.status(500).json({
      message: 'Failed to create candidate',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id).populate('jobId', 'title').lean();
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const [interviews, timeline] = await Promise.all([
      Interview.find({ candidateId: id }).sort({ createdAt: -1 }).lean(),
      TimelineEvent.find({ candidateId: id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.status(200).json({
      candidate,
      interviews,
      timeline,
    });
  } catch (error) {
    console.error('getProfile error:', error.message);
    res.status(500).json({ message: 'Failed to fetch candidate profile' });
  }
};

const TERMINAL_STATUSES = ['Hired', 'Rejected'];

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || (status !== 'Hired' && status !== 'Rejected')) {
      return res.status(400).json({ message: "Status must be 'Hired' or 'Rejected'" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (TERMINAL_STATUSES.includes(candidate.status)) {
      return res.status(400).json({ message: 'Candidate is already in a terminal status' });
    }

    if (status === 'Hired') {
      if (!candidate.offer || !candidate.offer.offerLetterUrl) {
        return res.status(400).json({ message: 'Offer letter is required before hiring' });
      }
    }

    if (status === 'Rejected') {
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }
      candidate.rejectionReason = reason.trim();
    }

    candidate.status = status;
    candidate.lastActivityAt = new Date();
    await candidate.save();

    const eventDescription = status === 'Hired'
      ? `${candidate.name} was hired.`
      : `${candidate.name} was rejected${reason ? `: ${reason.trim()}` : ''}.`;

    await logEvent(
      candidate._id,
      status,
      status === 'Hired' ? 'Candidate hired' : 'Candidate rejected',
      eventDescription,
      status === 'Rejected' ? { rejectionReason: candidate.rejectionReason } : {}
    );

    const updatedCandidate = await Candidate.findById(candidate._id)
      .populate('jobId', 'title')
      .lean();

    res.status(200).json(updatedCandidate);
  } catch (error) {
    console.error('updateStatus error:', error.message);
    res.status(500).json({ message: 'Failed to update candidate status' });
  }
};

module.exports = {
  listCandidates,
  createCandidate,
  getProfile,
  updateStatus,
};
