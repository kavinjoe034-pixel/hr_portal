const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Candidate = require('../src/models/Candidate');
const Interview = require('../src/models/Interview');
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
  await Interview.deleteMany({});
  await TimelineEvent.deleteMany({});
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

describe('POST /api/interviews/candidates/:id', () => {
  it('schedules an interview and updates candidate status', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job);

    const response = await request(app)
      .post(`/api/interviews/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: '2025-08-15',
        time: '14:30',
        type: 'Technical',
        interviewer: 'Jane Doe',
        notes: 'Focus on system design.',
      })
      .expect(201);

    expect(response.body.candidateId.name).toBe('Alice Smith');
    expect(response.body.type).toBe('Technical');
    expect(response.body.status).toBe('Scheduled');

    const updated = await Candidate.findById(candidate._id);
    expect(updated.status).toBe('Interview Scheduled');

    const timeline = await TimelineEvent.find({ candidateId: candidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Interview Scheduled');
  });

  it('rejects scheduling for a terminal candidate', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Hired' });

    const response = await request(app)
      .post(`/api/interviews/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: '2025-08-15',
        time: '14:30',
        type: 'Screening',
        interviewer: 'Jane Doe',
      })
      .expect(400);

    expect(response.body.message).toBe('Cannot schedule interviews for a terminal candidate');
  });

  it('rejects invalid input', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job);

    const response = await request(app)
      .post(`/api/interviews/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: 'not-a-date',
        time: '14:30',
        type: 'Technical',
        interviewer: 'Jane Doe',
      })
      .expect(400);

    expect(response.body.message).toBe('Valid date is required');
  });
});

describe('PATCH /api/interviews/:id/feedback', () => {
  it('adds feedback, marks interview completed, and creates timeline event', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Interview Scheduled' });
    const interview = await Interview.create({
      candidateId: candidate._id,
      date: new Date('2025-08-15'),
      time: '14:30',
      type: 'Technical',
      interviewer: 'Jane Doe',
      status: 'Scheduled',
    });

    const response = await request(app)
      .patch(`/api/interviews/${interview._id}/feedback`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        recommendation: 'hire',
        note: 'Strong candidate.',
      })
      .expect(200);

    expect(response.body.status).toBe('Completed');
    expect(response.body.feedback.recommendation).toBe('hire');
    expect(response.body.feedback.note).toBe('Strong candidate.');

    const timeline = await TimelineEvent.find({ candidateId: candidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Interview Completed');
  });

  it('rejects feedback for a completed interview', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job);
    const interview = await Interview.create({
      candidateId: candidate._id,
      date: new Date('2025-08-15'),
      time: '14:30',
      type: 'Technical',
      interviewer: 'Jane Doe',
      status: 'Completed',
      feedback: { recommendation: 'hire', note: 'Good.' },
    });

    const response = await request(app)
      .patch(`/api/interviews/${interview._id}/feedback`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ recommendation: 'maybe' })
      .expect(400);

    expect(response.body.message).toBe('Feedback can only be added to scheduled interviews');
  });
});

describe('GET /api/interviews', () => {
  it('lists all interviews sorted by date ascending', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job);
    await Interview.create({
      candidateId: candidate._id,
      date: new Date('2025-09-01'),
      time: '10:00',
      type: 'Screening',
      interviewer: 'Bob',
      status: 'Scheduled',
    });
    await Interview.create({
      candidateId: candidate._id,
      date: new Date('2025-08-01'),
      time: '11:00',
      type: 'Technical',
      interviewer: 'Alice',
      status: 'Scheduled',
    });

    const response = await request(app)
      .get('/api/interviews')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].candidateId.name).toBe('Alice Smith');
    expect(response.body[0].date).toMatch(/^2025-08-01/);
    expect(response.body[1].date).toMatch(/^2025-09-01/);
  });
});

describe('PATCH /api/candidates/:id/status', () => {
  it('hires a candidate when an offer exists', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, {
      status: 'Offer Sent',
      offer: {
        roleTitle: 'Backend Engineer',
        offerLetterUrl: '/uploads/offer.pdf',
        ndaUrl: '/uploads/nda.pdf',
        generatedAt: new Date(),
      },
    });

    const response = await request(app)
      .patch(`/api/candidates/${candidate._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Hired' })
      .expect(200);

    expect(response.body.status).toBe('Hired');

    const timeline = await TimelineEvent.find({ candidateId: candidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Hired');
  });

  it('rejects hiring without an offer', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Interview Scheduled' });

    const response = await request(app)
      .patch(`/api/candidates/${candidate._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Hired' })
      .expect(400);

    expect(response.body.message).toBe('Offer letter is required before hiring');
  });

  it('rejects a candidate with a reason', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job, { status: 'Interview Scheduled' });

    const response = await request(app)
      .patch(`/api/candidates/${candidate._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Rejected', reason: 'Not a culture fit.' })
      .expect(200);

    expect(response.body.status).toBe('Rejected');

    const updated = await Candidate.findById(candidate._id);
    expect(updated.rejectionReason).toBe('Not a culture fit.');

    const timeline = await TimelineEvent.find({ candidateId: candidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Rejected');
  });

  it('rejects rejection without a reason', async () => {
    const job = await createJob();
    const candidate = await createCandidate(job);

    const response = await request(app)
      .patch(`/api/candidates/${candidate._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Rejected' })
      .expect(400);

    expect(response.body.message).toBe('Rejection reason is required');
  });
});
