const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const { uploadDir } = require('../src/config/env');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Candidate = require('../src/models/Candidate');
const TimelineEvent = require('../src/models/TimelineEvent');

let mongoServer;
let authToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash('RoveHire2025!', 10);
  await User.create({
    email: 'hr@rove.com',
    passwordHash,
    name: 'ROVE HR',
    role: 'hr',
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@rove.com', password: 'RoveHire2025!' });

  authToken = loginResponse.body.token;
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  await Job.deleteMany({});
  await Candidate.deleteMany({});
  await TimelineEvent.deleteMany({});

  // Clean up any PDFs created during tests
  const files = fs.readdirSync(uploadDir);
  for (const file of files) {
    if (file.endsWith('.pdf')) {
      fs.unlinkSync(path.join(uploadDir, file));
    }
  }
});

const createJob = async (overrides = {}) =>
  Job.create({
    title: 'Backend Engineer',
    description: 'Build APIs',
    skills: ['Node.js'],
    status: 'Open',
    ...overrides,
  });

const createCandidate = async (job, overrides = {}) =>
  Candidate.create({
    name: 'Alice Smith',
    email: 'alice@example.com',
    jobId: job._id,
    status: 'Applied',
    lastActivityAt: new Date(),
    ...overrides,
  });

describe('POST /api/documents/candidates/:id', () => {
  it('generates offer letter and NDA and updates status to Offer Sent', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Interview Scheduled' });

    const response = await request(app)
      .post(`/api/documents/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        roleTitle: 'Senior Backend Engineer',
        salaryCurrency: 'USD',
        salaryAmount: 150000,
        startDate: '2025-09-01',
        reportingManager: 'Jane Doe',
        location: 'Remote',
      })
      .expect(200);

    expect(response.body.offerUrl).toMatch(/\/uploads\/offer-letter-[\w-]+\.pdf$/);
    expect(response.body.ndaUrl).toMatch(/\/uploads\/nda-[\w-]+\.pdf$/);

    const updated = await Candidate.findById(candidate._id);
    expect(updated.status).toBe('Offer Sent');
    expect(updated.offer.roleTitle).toBe('Senior Backend Engineer');
    expect(updated.offer.salaryCurrency).toBe('USD');
    expect(updated.offer.salaryAmount).toBe(150000);
    expect(updated.offer.reportingManager).toBe('Jane Doe');
    expect(updated.offer.location).toBe('Remote');

    const timeline = await TimelineEvent.find({ candidateId: candidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Offer Sent');

    expect(fs.existsSync(path.join(uploadDir, path.basename(response.body.offerUrl)))).toBe(true);
    expect(fs.existsSync(path.join(uploadDir, path.basename(response.body.ndaUrl)))).toBe(true);
  }, 60000);

  it('rejects generation for candidate in Applied status', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Applied' });

    const response = await request(app)
      .post(`/api/documents/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        roleTitle: 'Backend Engineer',
        salaryCurrency: 'USD',
        salaryAmount: 120000,
        startDate: '2025-09-01',
        reportingManager: 'Jane Doe',
        location: 'Remote',
      })
      .expect(400);

    expect(response.body.message).toBe('Offer can only be generated after an interview is scheduled');

    const updated = await Candidate.findById(candidate._id);
    expect(updated.status).toBe('Applied');
    expect(updated.offer).toBeUndefined();
  }, 30000);

  it('returns offer and NDA URLs', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Interview Scheduled' });

    const response = await request(app)
      .post(`/api/documents/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        roleTitle: 'Full-Stack Engineer',
        salaryCurrency: 'EUR',
        salaryAmount: 95000,
        startDate: '2025-10-15',
        reportingManager: 'John Smith',
        location: 'Berlin',
      })
      .expect(200);

    expect(response.body).toHaveProperty('offerUrl');
    expect(response.body).toHaveProperty('ndaUrl');
    expect(response.body.offerUrl).toContain('/uploads/');
    expect(response.body.ndaUrl).toContain('/uploads/');
  }, 60000);
});
