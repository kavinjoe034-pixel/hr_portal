const crypto = require('crypto');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const TimelineEvent = require('../models/TimelineEvent');
const Job = require('../models/Job');
const { logEvent } = require('../utils/timeline');
const { clientUrl } = require('../config/env');

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
      return res.status(400).json({ message: 'Job is closed and cannot accept new candidates' });
    }

    const resumeUrl = `/uploads/${req.file.filename}`;

    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExpiresAt = new Date(Date.now() + FOURTEEN_DAYS_MS);

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

    res.status(201).json({
      candidate: await Candidate.findById(candidate._id).populate('jobId', 'title').lean(),
      magicLink,
    });
  } catch (error) {
    console.error('createCandidate error:', error.message);
    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }
    res.status(500).json({ message: 'Failed to create candidate' });
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

module.exports = {
  listCandidates,
  createCandidate,
  getProfile,
};
