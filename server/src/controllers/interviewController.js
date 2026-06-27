const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const { logEvent } = require('../utils/timeline');

const TERMINAL_STATUSES = ['Hired', 'Rejected'];

const isValidDate = (value) => {
  if (!value || typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isValidTime = (value) => {
  if (!value || typeof value !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
};

const scheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, type, interviewer, notes } = req.body;

    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Valid date is required' });
    }

    if (!isValidTime(time)) {
      return res.status(400).json({ message: 'Valid time in HH:mm format is required' });
    }

    if (!type || (type !== 'Screening' && type !== 'Technical')) {
      return res.status(400).json({ message: "Type must be 'Screening' or 'Technical'" });
    }

    if (!interviewer || typeof interviewer !== 'string' || interviewer.trim() === '') {
      return res.status(400).json({ message: 'Interviewer is required' });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (TERMINAL_STATUSES.includes(candidate.status)) {
      return res.status(400).json({ message: 'Cannot schedule interviews for a terminal candidate' });
    }

    const interview = await Interview.create({
      candidateId: candidate._id,
      date: new Date(date),
      time: time.trim(),
      type,
      interviewer: interviewer.trim(),
      notes: notes && typeof notes === 'string' ? notes.trim() : '',
      status: 'Scheduled',
    });

    candidate.status = 'Interview Scheduled';
    candidate.lastActivityAt = new Date();
    await candidate.save();

    await logEvent(
      candidate._id,
      'Interview Scheduled',
      `${type} interview scheduled`,
      `Interview with ${interview.interviewer} scheduled for ${date} at ${time}.`,
      { interviewId: interview._id, type, date, time, interviewer: interview.interviewer }
    );

    const populatedInterview = await Interview.findById(interview._id)
      .populate('candidateId', 'name')
      .lean();

    res.status(201).json(populatedInterview);
  } catch (error) {
    console.error('scheduleInterview error:', error.message);
    res.status(500).json({ message: 'Failed to schedule interview' });
  }
};

const addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { recommendation, note } = req.body;

    if (!recommendation || !['hire', 'no-hire', 'maybe'].includes(recommendation)) {
      return res.status(400).json({ message: "Recommendation must be 'hire', 'no-hire', or 'maybe'" });
    }

    const interview = await Interview.findById(id).populate('candidateId', 'name');
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.status !== 'Scheduled') {
      return res.status(400).json({ message: 'Feedback can only be added to scheduled interviews' });
    }

    interview.status = 'Completed';
    interview.feedback = {
      recommendation,
      note: note && typeof note === 'string' ? note.trim() : '',
    };
    await interview.save();

    await logEvent(
      interview.candidateId._id,
      'Interview Completed',
      'Interview completed',
      `Interview feedback recorded: ${recommendation}${note ? ` - ${note.trim()}` : ''}.`,
      { interviewId: interview._id, recommendation, note: interview.feedback.note }
    );

    res.status(200).json(interview);
  } catch (error) {
    console.error('addFeedback error:', error.message);
    res.status(500).json({ message: 'Failed to add feedback' });
  }
};

const listInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate('candidateId', 'name')
      .sort({ date: 1, createdAt: 1 })
      .lean();

    res.status(200).json(interviews);
  } catch (error) {
    console.error('listInterviews error:', error.message);
    res.status(500).json({ message: 'Failed to fetch interviews' });
  }
};

module.exports = {
  scheduleInterview,
  addFeedback,
  listInterviews,
};
