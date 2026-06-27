const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const Job = require('../src/models/Job');
const Candidate = require('../src/models/Candidate');
const TimelineEvent = require('../src/models/TimelineEvent');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

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
});

const createCandidate = async (overrides = {}) => {
  const job = await Job.create({
    title: 'Backend Engineer',
    description: 'Build APIs',
    skills: ['Node.js'],
    status: 'Open',
  });

  const magicToken = overrides.magicToken || 'valid-token-123';

  return Candidate.create({
    name: 'Alice Smith',
    email: 'alice@example.com',
    jobId: job._id,
    status: 'Applied',
    magicToken,
    magicTokenExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    magicTokenUsed: false,
    lastActivityAt: new Date(),
    ...overrides,
  });
};

describe('GET /api/apply/:token', () => {
  it('returns candidate name for a valid token', async () => {
    await createCandidate({ magicToken: 'valid-token-123' });

    const response = await request(app)
      .get('/api/apply/valid-token-123')
      .expect(200);

    expect(response.body.valid).toBe(true);
    expect(response.body.candidate.name).toBe('Alice Smith');
  });

  it('returns 404 for an expired token', async () => {
    await createCandidate({
      magicToken: 'expired-token-123',
      magicTokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const response = await request(app)
      .get('/api/apply/expired-token-123')
      .expect(404);

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe('Link is invalid or expired');
  });

  it('returns 404 for a used token', async () => {
    await createCandidate({
      magicToken: 'used-token-123',
      magicTokenUsed: true,
    });

    const response = await request(app)
      .get('/api/apply/used-token-123')
      .expect(404);

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe('Link is invalid or expired');
  });

  it('returns 404 for an unknown token', async () => {
    const response = await request(app)
      .get('/api/apply/unknown-token')
      .expect(404);

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe('Link is invalid or expired');
  });
});

describe('POST /api/apply/:token', () => {
  it('updates candidate status to Form Submitted and creates timeline event', async () => {
    const candidate = await createCandidate({ magicToken: 'submit-token-123' });

    const response = await request(app)
      .post('/api/apply/submit-token-123')
      .send({
        phone: '555-1234',
        location: 'New York, NY',
        currentRole: 'Software Engineer',
        noticePeriod: '2 weeks',
        salaryExpectation: '120000',
        linkedInUrl: 'https://linkedin.com/in/alicesmith',
      })
      .expect(200);

    expect(response.body.ok).toBe(true);

    const updated = await Candidate.findById(candidate._id);
    expect(updated.status).toBe('Form Submitted');
    expect(updated.magicTokenUsed).toBe(true);
    expect(updated.phone).toBe('555-1234');
    expect(updated.location).toBe('New York, NY');
    expect(updated.currentRole).toBe('Software Engineer');
    expect(updated.noticePeriod).toBe('2 weeks');
    expect(updated.salaryExpectation).toBe('120000');
    expect(updated.linkedInUrl).toBe('https://linkedin.com/in/alicesmith');

    const timeline = await TimelineEvent.find({ candidateId: candidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Form Submitted');
  });

  it('rejects submit with missing required fields', async () => {
    await createCandidate({ magicToken: 'missing-fields-token' });

    const response = await request(app)
      .post('/api/apply/missing-fields-token')
      .send({
        phone: '',
        location: 'New York, NY',
        currentRole: 'Software Engineer',
        noticePeriod: '2 weeks',
        salaryExpectation: '120000',
      })
      .expect(400);

    expect(response.body.message).toBe('Phone number is required');
  });

  it('returns 404 when resubmitting to a used token', async () => {
    await createCandidate({
      magicToken: 'resubmit-token-123',
      magicTokenUsed: true,
    });

    const response = await request(app)
      .post('/api/apply/resubmit-token-123')
      .send({
        phone: '555-1234',
        location: 'New York, NY',
        currentRole: 'Software Engineer',
        noticePeriod: '2 weeks',
        salaryExpectation: '120000',
      })
      .expect(404);

    expect(response.body.valid).toBe(false);
    expect(response.body.message).toBe('Link is invalid or expired');
  });
});
