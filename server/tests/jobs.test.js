const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Candidate = require('../src/models/Candidate');

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
});

describe('GET /api/jobs', () => {
  it('returns an empty array initially', async () => {
    const response = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('returns jobs with candidate counts', async () => {
    const job = await Job.create({
      title: 'Frontend Engineer',
      description: 'Build UI',
      skills: ['React', 'TypeScript'],
    });

    await Candidate.create({
      name: 'Alice',
      email: 'alice@example.com',
      jobId: job._id,
      status: 'Applied',
    });

    const response = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Frontend Engineer');
    expect(response.body[0].candidateCount).toBe(1);
  });
});

describe('POST /api/jobs', () => {
  it('creates a new job with default Open status', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Backend Engineer',
        description: 'Build APIs',
        skills: 'Node.js, MongoDB',
      })
      .expect(201);

    expect(response.body.title).toBe('Backend Engineer');
    expect(response.body.description).toBe('Build APIs');
    expect(response.body.skills).toEqual(['Node.js', 'MongoDB']);
    expect(response.body.status).toBe('Open');
  });

  it('rejects a job without a title', async () => {
    const response = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'Missing title' })
      .expect(400);

    expect(response.body.message).toBe('Title is required');
  });
});

describe('PATCH /api/jobs/:id/status', () => {
  it('toggles the job status to Closed', async () => {
    const job = await Job.create({
      title: 'DevOps Engineer',
      description: 'Cloud infra',
      skills: ['AWS'],
    });

    const response = await request(app)
      .patch(`/api/jobs/${job._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.status).toBe('Closed');

    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.status).toBe('Closed');
  });

  it('returns 404 for an unknown job id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .patch(`/api/jobs/${unknownId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.message).toBe('Job not found');
  });
});
