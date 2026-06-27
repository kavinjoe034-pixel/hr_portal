const path = require('path');
require('dotenv').config({ path: path.resolve('/mnt/c/Users/ayush/Desktop/ayush_learnings/hr_portal/.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const { connectDB } = require('../config/db');

const User = require('../models/User');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const TimelineEvent = require('../models/TimelineEvent');
const { logEvent } = require('../utils/timeline');
const { generateOfferLetter, generateNda } = require('../services/pdfService');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

const createResumePdf = async (name, role) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = height - 60;
  page.drawText(name, { x: 60, y, size: 24, font: bold });
  y -= 30;
  page.drawText(role, { x: 60, y, size: 14, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 40;
  page.drawText('Experience', { x: 60, y, size: 16, font: bold });
  y -= 25;
  page.drawText('Senior Engineer at Example Co — 2020 to Present', { x: 60, y, size: 11, font });
  y -= 20;
  page.drawText('Engineer at Previous Inc — 2017 to 2020', { x: 60, y, size: 11, font });
  y -= 40;
  page.drawText('Education', { x: 60, y, size: 16, font: bold });
  y -= 25;
  page.drawText('B.S. Computer Science, Example University', { x: 60, y, size: 11, font });
  const bytes = await pdfDoc.save();
  const filename = `resume-${uuidv4()}.pdf`;
  const uploadDirPath = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));
  if (!fs.existsSync(uploadDirPath)) fs.mkdirSync(uploadDirPath, { recursive: true });
  const outputPath = path.join(uploadDirPath, filename);
  fs.writeFileSync(outputPath, bytes);
  return `/uploads/${filename}`;
};

const main = async () => {
  await connectDB();

  // Clear collections
  await TimelineEvent.deleteMany({});
  await Interview.deleteMany({});
  await Candidate.deleteMany({});
  await Job.deleteMany({});
  await User.deleteMany({});
  console.log('Cleared existing collections');

  // HR user
  const passwordHash = await bcrypt.hash('RoveHire2025!', 10);
  const hrUser = await User.create({
    email: 'hr@rove.com',
    passwordHash,
    name: 'ROVE HR',
    role: 'hr'
  });
  console.log(`Created HR user: ${hrUser.email}`);

  // Jobs
  const [seniorFSE, productDesigner, customerSuccess] = await Job.insertMany([
    {
      title: 'Senior Full-Stack Engineer',
      description: 'Lead full-stack product development across React and Node.js services.',
      skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'System Design'],
      status: 'Open'
    },
    {
      title: 'Product Designer',
      description: 'Design intuitive user experiences and maintain the design system.',
      skills: ['Figma', 'UX Research', 'Prototyping', 'Design Systems'],
      status: 'Open'
    },
    {
      title: 'Customer Success Manager',
      description: 'Manage enterprise customer relationships and drive retention.',
      skills: ['Customer Relations', 'SaaS', 'Account Management'],
      status: 'Closed'
    }
  ]);
  console.log(`Created jobs: ${seniorFSE.title}, ${productDesigner.title}, ${customerSuccess.title}`);

  // Helper to build form fields
  const candidateForm = (overrides = {}) => ({
    phone: '+1 555 0100',
    location: 'Remote',
    currentRole: 'Senior Specialist',
    noticePeriod: '2 weeks',
    salaryExpectation: 'Negotiable',
    linkedInUrl: 'https://linkedin.com/in/example',
    ...overrides
  });

  const now = new Date();

  // Alice Johnson — Applied, unused magic token
  const alice = await Candidate.create({
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    jobId: seniorFSE._id,
    status: 'Applied',
    resumeUrl: await createResumePdf('Alice Johnson', 'Senior Full-Stack Engineer'),
    resumeOriginalName: 'alice-johnson-resume.pdf',
    magicToken: uuidv4(),
    magicTokenExpiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    magicTokenUsed: false
  });
  await logEvent(alice._id, 'Applied', 'Application received', 'Alice Johnson applied for Senior Full-Stack Engineer.');

  // Bob Smith — Form Submitted
  const bob = await Candidate.create({
    name: 'Bob Smith',
    email: 'bob.smith@example.com',
    jobId: productDesigner._id,
    status: 'Form Submitted',
    resumeUrl: await createResumePdf('Bob Smith', 'Product Designer'),
    resumeOriginalName: 'bob-smith-resume.pdf',
    magicTokenUsed: true,
    ...candidateForm({
      phone: '+1 555 0101',
      location: 'New York, NY',
      currentRole: 'Product Designer',
      noticePeriod: '1 month',
      salaryExpectation: '$110,000 - $130,000',
      linkedInUrl: 'https://linkedin.com/in/bobsmith'
    })
  });
  await logEvent(bob._id, 'Applied', 'Application received', 'Bob Smith applied for Product Designer.');
  await logEvent(bob._id, 'Form Submitted', 'Candidate form submitted', 'Bob Smith completed the magic-link form.');

  // Carol White — Interview Scheduled (completed technical interview)
  const carol = await Candidate.create({
    name: 'Carol White',
    email: 'carol.white@example.com',
    jobId: seniorFSE._id,
    status: 'Interview Scheduled',
    resumeUrl: await createResumePdf('Carol White', 'Software Engineer'),
    resumeOriginalName: 'carol-white-resume.pdf',
    magicTokenUsed: true,
    ...candidateForm({
      phone: '+1 555 0102',
      location: 'Austin, TX',
      currentRole: 'Software Engineer',
      noticePeriod: '2 weeks',
      salaryExpectation: '$140,000 - $160,000',
      linkedInUrl: 'https://linkedin.com/in/carolwhite'
    })
  });
  const carolInterview = await Interview.create({
    candidateId: carol._id,
    date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    time: '10:00',
    type: 'Technical',
    interviewer: 'Jane Smith',
    notes: 'System design deep dive.',
    status: 'Completed',
    feedback: {
      recommendation: 'hire',
      note: 'Strong system design skills'
    }
  });
  await logEvent(carol._id, 'Applied', 'Application received', 'Carol White applied for Senior Full-Stack Engineer.');
  await logEvent(carol._id, 'Interview Scheduled', 'Interview scheduled', `Technical interview scheduled for ${carolInterview.date.toDateString()} at ${carolInterview.time}.`, { interviewId: carolInterview._id });
  await logEvent(carol._id, 'Interview Completed', 'Interview completed', 'Technical interview completed. Recommendation: hire.', { interviewId: carolInterview._id, recommendation: 'hire' });

  // David Lee — Offer Sent
  const davidStartDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [davidOfferUrl, davidNdaUrl] = await Promise.all([
    generateOfferLetter({
      candidateName: 'David Lee',
      roleTitle: 'Senior Full-Stack Engineer',
      salaryCurrency: 'USD',
      salaryAmount: 160000,
      startDate: davidStartDate,
      reportingManager: 'Alex Thompson',
      location: 'San Francisco, CA'
    }),
    generateNda({ candidateName: 'David Lee' })
  ]);
  const david = await Candidate.create({
    name: 'David Lee',
    email: 'david.lee@example.com',
    jobId: seniorFSE._id,
    status: 'Offer Sent',
    resumeUrl: await createResumePdf('David Lee', 'Senior Software Engineer'),
    resumeOriginalName: 'david-lee-resume.pdf',
    magicTokenUsed: true,
    ...candidateForm({
      phone: '+1 555 0103',
      location: 'San Francisco, CA',
      currentRole: 'Senior Software Engineer',
      noticePeriod: '1 month',
      salaryExpectation: '$160,000 - $180,000',
      linkedInUrl: 'https://linkedin.com/in/davidlee'
    }),
    offer: {
      roleTitle: 'Senior Full-Stack Engineer',
      salaryCurrency: 'USD',
      salaryAmount: 160000,
      startDate: davidStartDate,
      reportingManager: 'Alex Thompson',
      location: 'San Francisco, CA',
      offerLetterUrl: davidOfferUrl,
      ndaUrl: davidNdaUrl,
      generatedAt: now
    }
  });
  await logEvent(david._id, 'Applied', 'Application received', 'David Lee applied for Senior Full-Stack Engineer.');
  await logEvent(david._id, 'Form Submitted', 'Candidate form submitted', 'David Lee completed the magic-link form.');
  await logEvent(david._id, 'Offer Sent', 'Offer sent', 'Offer letter and NDA sent to David Lee.', { offerLetterUrl: davidOfferUrl, ndaUrl: davidNdaUrl });

  // Eve Brown — Rejected
  const eve = await Candidate.create({
    name: 'Eve Brown',
    email: 'eve.brown@example.com',
    jobId: productDesigner._id,
    status: 'Rejected',
    resumeUrl: await createResumePdf('Eve Brown', 'UX Designer'),
    resumeOriginalName: 'eve-brown-resume.pdf',
    magicTokenUsed: true,
    rejectionReason: 'Role filled internally',
    ...candidateForm({
      phone: '+1 555 0104',
      location: 'Chicago, IL',
      currentRole: 'UX Designer',
      noticePeriod: '2 weeks',
      salaryExpectation: '$100,000 - $120,000',
      linkedInUrl: 'https://linkedin.com/in/evebrown'
    })
  });
  await logEvent(eve._id, 'Applied', 'Application received', 'Eve Brown applied for Product Designer.');
  await logEvent(eve._id, 'Form Submitted', 'Candidate form submitted', 'Eve Brown completed the magic-link form.');
  await logEvent(eve._id, 'Rejected', 'Candidate rejected', 'Eve Brown was rejected: Role filled internally.', { rejectionReason: eve.rejectionReason });

  const counts = {
    users: await User.countDocuments(),
    jobs: await Job.countDocuments(),
    candidates: await Candidate.countDocuments(),
    interviews: await Interview.countDocuments(),
    timelineEvents: await TimelineEvent.countDocuments()
  };

  console.log('Seed complete: done');
  console.log(counts);
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
