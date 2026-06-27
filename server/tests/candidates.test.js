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

const getAuthToken = async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'hr@rove.com', password: 'RoveHire2025!' });
  return response.body.token;
};

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

  authToken = await getAuthToken();
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

  // Clean up any PDFs created during tests
  const files = fs.readdirSync(uploadDir);
  for (const file of files) {
    if (file.endsWith('.pdf')) {
      fs.unlinkSync(path.join(uploadDir, file));
    }
  }
});

const createTestPdf = (filename = 'resume.pdf') => {
  const filePath = path.join(uploadDir, filename);
  const content = '%PDF-1.4 test pdf content';
  fs.writeFileSync(filePath, content);
  return filePath;
};

describe('GET /api/candidates', () => {
  it('returns seeded candidates with job titles', async () => {
    const job = await Job.create({
      title: 'Backend Engineer',
      description: 'Build APIs',
      skills: ['Node.js'],
      status: 'Open',
    });

    await Candidate.create({
      name: 'Alice',
      email: 'alice@example.com',
      jobId: job._id,
      status: 'Applied',
      lastActivityAt: new Date(),
    });

    const response = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Alice');
    expect(response.body[0].jobId.title).toBe('Backend Engineer');
    expect(response.body[0].status).toBe('Applied');
  });

  it('filters candidates by status', async () => {
    const job = await Job.create({
      title: 'Frontend Engineer',
      description: 'Build UI',
      skills: ['React'],
      status: 'Open',
    });

    await Candidate.create({
      name: 'Bob',
      email: 'bob@example.com',
      jobId: job._id,
      status: 'Applied',
      lastActivityAt: new Date(),
    });

    await Candidate.create({
      name: 'Carol',
      email: 'carol@example.com',
      jobId: job._id,
      status: 'Form Submitted',
      lastActivityAt: new Date(),
    });

    const response = await request(app)
      .get('/api/candidates?status=Form%20Submitted')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Carol');
  });

  it('searches candidates by name or email', async () => {
    const job = await Job.create({
      title: 'DevOps Engineer',
      description: 'Cloud',
      skills: ['AWS'],
      status: 'Open',
    });

    await Candidate.create({
      name: 'Diana Prince',
      email: 'diana@example.com',
      jobId: job._id,
      status: 'Applied',
      lastActivityAt: new Date(),
    });

    await Candidate.create({
      name: 'Eve',
      email: 'wonder@example.com',
      jobId: job._id,
      status: 'Applied',
      lastActivityAt: new Date(),
    });

    const response = await request(app)
      .get('/api/candidates?q=prince')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Diana Prince');
  });
});

describe('POST /api/candidates', () => {
  it('creates a candidate with resume and returns magic link', async () => {
    const job = await Job.create({
      title: 'Full-Stack Engineer',
      description: 'Build product',
      skills: ['React', 'Node.js'],
      status: 'Open',
    });

    const resumePath = createTestPdf('test-resume.pdf');

    const response = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .field('name', 'John Doe')
      .field('email', 'john@example.com')
      .field('jobId', job._id.toString())
      .attach('resume', resumePath)
      .expect(201);

    expect(response.body.candidate).toBeDefined();
    expect(response.body.candidate.name).toBe('John Doe');
    expect(response.body.candidate.email).toBe('john@example.com');
    expect(response.body.candidate.jobId.title).toBe('Full-Stack Engineer');
    expect(response.body.candidate.status).toBe('Applied');
    expect(response.body.candidate.resumeUrl).toMatch(/\/uploads\/[\w-]+\.pdf$/);
    expect(response.body.magicLink).toMatch(/http:\/\/localhost:5173\/apply\/[a-f0-9]{64}$/);

    const savedCandidate = await Candidate.findById(response.body.candidate._id);
    expect(savedCandidate).not.toBeNull();
    expect(savedCandidate.magicToken).toBeTruthy();
    expect(savedCandidate.magicTokenUsed).toBe(false);
    expect(savedCandidate.magicTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());

    const timeline = await TimelineEvent.find({ candidateId: savedCandidate._id });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('Applied');
  });

  it('rejects non-PDF files', async () => {
    const job = await Job.create({
      title: 'Data Engineer',
      description: 'Data pipelines',
      skills: ['Python'],
      status: 'Open',
    });

    const textPath = path.join(uploadDir, 'resume.txt');
    fs.writeFileSync(textPath, 'not a pdf');

    const response = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .field('name', 'John Doe')
      .field('email', 'john@example.com')
      .field('jobId', job._id.toString())
      .attach('resume', textPath)
      .expect(400);

    expect(response.body.message).toBe('Only PDF files are allowed');

    fs.unlinkSync(textPath);
  });

  it('rejects closed jobs', async () => {
    const job = await Job.create({
      title: 'Closed Role',
      description: 'Not hiring',
      skills: ['React'],
      status: 'Closed',
    });

    const resumePath = createTestPdf('closed-resume.pdf');

    const response = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .field('name', 'Jane Doe')
      .field('email', 'jane@example.com')
      .field('jobId', job._id.toString())
      .attach('resume', resumePath)
      .expect(400);

    expect(response.body.message).toBe('Job is closed and cannot accept new candidates');
  });

  it('rejects missing required fields', async () => {
    const response = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .field('email', 'john@example.com')
      .expect(400);

    expect(response.body.message).toBe('Name is required');
  });
});

describe('GET /api/candidates/:id', () => {
  it('returns candidate profile with timeline', async () => {
    const job = await Job.create({
      title: 'Security Engineer',
      description: 'Secure systems',
      skills: ['Security'],
      status: 'Open',
    });

    const candidate = await Candidate.create({
      name: 'Frank',
      email: 'frank@example.com',
      jobId: job._id,
      status: 'Applied',
      lastActivityAt: new Date(),
    });

    await TimelineEvent.create({
      candidateId: candidate._id,
      type: 'Applied',
      title: 'Application received',
      description: 'Frank applied.',
    });

    const response = await request(app)
      .get(`/api/candidates/${candidate._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.candidate.name).toBe('Frank');
    expect(response.body.candidate.jobId.title).toBe('Security Engineer');
    expect(response.body.interviews).toEqual([]);
    expect(response.body.timeline).toHaveLength(1);
    expect(response.body.timeline[0].type).toBe('Applied');
  });

  it('returns 404 for unknown candidate id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/api/candidates/${unknownId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.message).toBe('Candidate not found');
  });
});
