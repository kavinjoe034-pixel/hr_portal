const Candidate = require('../models/Candidate');
const { logEvent } = require('../utils/timeline');

const findCandidateByToken = async (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }
  return Candidate.findOne({ magicToken: token.trim() });
};

const isTokenValid = (candidate) => {
  if (!candidate) {
    return false;
  }
  if (candidate.magicTokenUsed) {
    return false;
  }
  if (!candidate.magicTokenExpiresAt) {
    return false;
  }
  return new Date(candidate.magicTokenExpiresAt).getTime() > Date.now();
};

const validateToken = async (req, res) => {
  try {
    const { token } = req.params;
    const candidate = await findCandidateByToken(token);

    if (!isTokenValid(candidate)) {
      return res.status(404).json({ valid: false, message: 'Link is invalid or expired' });
    }

    return res.status(200).json({ valid: true, candidate: { name: candidate.name } });
  } catch (error) {
    console.error('validateToken error:', error.message);
    return res.status(500).json({ valid: false, message: 'Failed to validate link' });
  }
};

const submitForm = async (req, res) => {
  try {
    const { token } = req.params;
    const candidate = await findCandidateByToken(token);

    if (!isTokenValid(candidate)) {
      return res.status(404).json({ valid: false, message: 'Link is invalid or expired' });
    }

    const {
      phone,
      location,
      currentRole,
      noticePeriod,
      salaryExpectation,
      linkedInUrl,
    } = req.body;

    const requiredFields = {
      phone: 'Phone number is required',
      location: 'Location is required',
      currentRole: 'Current role is required',
      noticePeriod: 'Notice period is required',
      salaryExpectation: 'Salary expectation is required',
    };

    for (const [field, message] of Object.entries(requiredFields)) {
      if (!req.body[field] || typeof req.body[field] !== 'string' || req.body[field].trim() === '') {
        return res.status(400).json({ message });
      }
    }

    candidate.phone = phone.trim();
    candidate.location = location.trim();
    candidate.currentRole = currentRole.trim();
    candidate.noticePeriod = noticePeriod.trim();
    candidate.salaryExpectation = salaryExpectation.trim();
    candidate.linkedInUrl = linkedInUrl && typeof linkedInUrl === 'string' ? linkedInUrl.trim() : '';
    candidate.magicTokenUsed = true;
    candidate.status = 'Form Submitted';
    candidate.lastActivityAt = new Date();

    await candidate.save();

    await logEvent(
      candidate._id,
      'Form Submitted',
      'Candidate form submitted',
      `${candidate.name} submitted the application form.`,
      { source: 'magic-link' }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('submitForm error:', error.message);
    return res.status(500).json({ message: 'Failed to submit form' });
  }
};

module.exports = {
  validateToken,
  submitForm,
};
