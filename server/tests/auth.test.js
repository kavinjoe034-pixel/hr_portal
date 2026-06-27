const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/app');
const { authenticate } = require('../src/middleware/auth');
const User = require('../src/models/User');

// Mount a protected route for testing authentication middleware
app.get('/api/protected', authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash('RoveHire2025!', 10);
  await User.create({
    email: 'hr@rove.com',
    passwordHash,
    name: 'ROVE HR',
    role: 'hr'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Keep the seeded HR user; clear any other users if needed
});

describe('POST /api/auth/login', () => {
  it('returns a JWT token and user object for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@rove.com', password: 'RoveHire2025!' })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.user).toEqual({
      id: expect.any(String),
      email: 'hr@rove.com',
      name: 'ROVE HR'
    });
  });

  it('returns 401 for an incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@rove.com', password: 'wrongpassword' })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });
});

describe('GET /api/protected', () => {
  it('returns 401 when no authorization token is provided', async () => {
    const response = await request(app)
      .get('/api/protected')
      .expect(401);

    expect(response.body.message).toBe('Unauthorized');
  });
});
