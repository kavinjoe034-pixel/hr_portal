const Candidate = require('../models/Candidate');
const { generateOfferLetter, generateNda } = require('../services/pdfService');
const { logEvent } = require('../utils/timeline');

const TERMINAL_STATUSES = ['Hired', 'Rejected'];

const generateDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      roleTitle,
      salaryCurrency,
      salaryAmount,
      startDate,
      reportingManager,
      location,
    } = req.body;

    const candidate = await Candidate.findById(id).populate('jobId', 'title');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (TERMINAL_STATUSES.includes(candidate.status)) {
      return res.status(400).json({ message: 'Cannot generate offer for a terminal candidate' });
    }

    if (!['Interview Scheduled', 'Offer Sent'].includes(candidate.status)) {
      return res.status(400).json({ message: 'Offer can only be generated after an interview is scheduled' });
    }

    const jobTitle = candidate.jobId?.title || 'Role';

    const offerData = {
      candidateName: candidate.name,
      roleTitle: roleTitle || jobTitle,
      salaryCurrency,
      salaryAmount,
      startDate,
      reportingManager,
      location,
    };

    const [offerLetterUrl, ndaUrl] = await Promise.all([
      generateOfferLetter(offerData),
      generateNda({ candidateName: candidate.name }),
    ]);

    candidate.offer = {
      roleTitle: roleTitle || jobTitle,
      salaryCurrency: salaryCurrency || 'USD',
      salaryAmount: salaryAmount ? Number(salaryAmount) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      reportingManager: reportingManager || '',
      location: location || '',
      offerLetterUrl,
      ndaUrl,
      generatedAt: new Date(),
    };
    candidate.status = 'Offer Sent';
    candidate.lastActivityAt = new Date();
    await candidate.save();

    await logEvent(
      candidate._id,
      'Offer Sent',
      'Offer sent',
      `Offer letter and NDA sent to ${candidate.name}.`,
      {
        offerLetterUrl,
        ndaUrl,
      }
    );

    return res.status(200).json({
      offerUrl: offerLetterUrl,
      ndaUrl,
    });
  } catch (error) {
    console.error('generateDocuments error:', error.message);
    return res.status(500).json({ message: 'Failed to generate offer documents' });
  }
};

module.exports = {
  generateDocuments,
};
