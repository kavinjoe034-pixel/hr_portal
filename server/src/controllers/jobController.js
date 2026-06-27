const Job = require('../models/Job');
const Candidate = require('../models/Candidate');

const listJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();

    const counts = await Candidate.aggregate([
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    counts.forEach((item) => {
      countMap.set(item._id.toString(), item.count);
    });

    const jobsWithCount = jobs.map((job) => ({
      ...job,
      candidateCount: countMap.get(job._id.toString()) || 0,
    }));

    res.status(200).json(jobsWithCount);
  } catch (error) {
    console.error('listJobs error:', error.message);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

const createJob = async (req, res) => {
  try {
    const { title, description, skills } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const parsedSkills = Array.isArray(skills)
      ? skills.filter(Boolean).map((s) => String(s).trim())
      : typeof skills === 'string' && skills.trim() !== ''
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const job = await Job.create({
      title: title.trim(),
      description: description || '',
      skills: parsedSkills,
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('createJob error:', error.message);
    res.status(500).json({ message: 'Failed to create job' });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = job.status === 'Open' ? 'Closed' : 'Open';
    await job.save();

    res.status(200).json(job);
  } catch (error) {
    console.error('updateJobStatus error:', error.message);
    res.status(500).json({ message: 'Failed to update job status' });
  }
};

module.exports = {
  listJobs,
  createJob,
  updateJobStatus,
};
