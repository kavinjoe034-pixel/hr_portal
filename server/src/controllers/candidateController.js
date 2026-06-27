const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const TimelineEvent = require('../models/TimelineEvent');
const Job = require('../models/Job');
const { logEvent } = require('../utils/timeline');
const { clientUrl, uploadDir } = require('../config/env');

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

const generatePdf = async (html, outputPath) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
};

const buildOfferLetterHtml = (candidate, jobTitle, payload) => {
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const startDate = payload.startDate
    ? new Date(payload.startDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'TBD';
  const salary = payload.salaryAmount
    ? `${payload.salaryCurrency || 'USD'} ${Number(payload.salaryAmount).toLocaleString()} per year`
    : 'To be discussed';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; padding: 48px; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 32px; }
          .header h1 { margin: 0; font-size: 24px; color: #2563eb; }
          .header p { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
          .section { margin-bottom: 24px; }
          .label { font-weight: bold; color: #374151; }
          .signature { margin-top: 64px; }
          .signature-line { border-top: 1px solid #9ca3af; width: 280px; margin-top: 48px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ROVE Hire</h1>
          <p>Official Offer Letter</p>
        </div>
        <div class="section">
          <p><span class="label">Date:</span> ${today}</p>
          <p><span class="label">To:</span> ${candidate.name}</p>
          <p><span class="label">Position:</span> ${payload.roleTitle || jobTitle}</p>
        </div>
        <div class="section">
          <p>Dear ${candidate.name},</p>
          <p>
            We are pleased to offer you the position of <strong>${payload.roleTitle || jobTitle}</strong>
            at ROVE Hire. We were impressed by your experience and believe you will be a valuable addition to the team.
          </p>
        </div>
        <div class="section">
          <p><span class="label">Start date:</span> ${startDate}</p>
          <p><span class="label">Location:</span> ${payload.location || 'Remote / TBD'}</p>
          <p><span class="label">Reporting manager:</span> ${payload.reportingManager || 'Hiring Manager'}</p>
          <p><span class="label">Annual salary:</span> ${salary}</p>
        </div>
        <div class="section">
          <p>
            This offer is contingent on the successful completion of our onboarding process and the signed
            non-disclosure agreement. Please confirm your acceptance by signing and returning this letter.
          </p>
        </div>
        <div class="signature">
          <p>Sincerely,</p>
          <div class="signature-line">ROVE Hire Talent Team</div>
        </div>
      </body>
    </html>
  `;
};

const buildNdaHtml = (candidate) => {
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; padding: 48px; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 32px; }
          .header h1 { margin: 0; font-size: 24px; color: #2563eb; }
          .header p { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
          .section { margin-bottom: 24px; }
          .label { font-weight: bold; color: #374151; }
          .signature { margin-top: 64px; }
          .signature-line { border-top: 1px solid #9ca3af; width: 280px; margin-top: 48px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ROVE Hire</h1>
          <p>Mutual Non-Disclosure Agreement</p>
        </div>
        <div class="section">
          <p><span class="label">Date:</span> ${today}</p>
          <p><span class="label">Party:</span> ${candidate.name}</p>
        </div>
        <div class="section">
          <p>
            This Non-Disclosure Agreement ("Agreement") is entered into by and between ROVE Hire and
            ${candidate.name} ("Recipient") to protect the confidentiality of proprietary information
            disclosed during the recruitment and onboarding process.
          </p>
          <p>
            Recipient agrees to hold all confidential information in strict confidence and not disclose such
            information to any third parties without prior written consent. Recipient further agrees not to use
            confidential information for any purpose other than evaluating the employment opportunity.
          </p>
          <p>
            This Agreement shall remain in effect for a period of two (2) years from the date of execution.
          </p>
        </div>
        <div class="signature">
          <p>Acknowledged and agreed:</p>
          <p><strong>${candidate.name}</strong></p>
          <div class="signature-line">Signature / Date</div>
          <p style="margin-top: 32px;"><strong>ROVE Hire</strong></p>
          <div class="signature-line">Authorized Representative / Date</div>
        </div>
      </body>
    </html>
  `;
};

const generateOffer = async (req, res) => {
  try {
    const { id } = req.params;
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
    const payload = req.body || {};

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const offerFilename = `offer-${uuidv4()}.pdf`;
    const ndaFilename = `nda-${uuidv4()}.pdf`;
    const offerPath = path.join(uploadDir, offerFilename);
    const ndaPath = path.join(uploadDir, ndaFilename);

    const offerHtml = buildOfferLetterHtml(candidate, jobTitle, payload);
    const ndaHtml = buildNdaHtml(candidate);

    await Promise.all([
      generatePdf(offerHtml, offerPath),
      generatePdf(ndaHtml, ndaPath),
    ]);

    candidate.offer = {
      roleTitle: payload.roleTitle || jobTitle,
      salaryCurrency: payload.salaryCurrency || 'USD',
      salaryAmount: payload.salaryAmount ? Number(payload.salaryAmount) : undefined,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      reportingManager: payload.reportingManager || '',
      location: payload.location || '',
      offerLetterUrl: `/uploads/${offerFilename}`,
      ndaUrl: `/uploads/${ndaFilename}`,
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
        offerLetterUrl: candidate.offer.offerLetterUrl,
        ndaUrl: candidate.offer.ndaUrl,
      }
    );

    const updatedCandidate = await Candidate.findById(candidate._id)
      .populate('jobId', 'title')
      .lean();

    res.status(200).json(updatedCandidate);
  } catch (error) {
    console.error('generateOffer error:', error.message);
    res.status(500).json({ message: 'Failed to generate offer documents' });
  }
};

module.exports = {
  listCandidates,
  createCandidate,
  getProfile,
  updateStatus,
  generateOffer,
};
