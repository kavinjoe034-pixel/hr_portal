const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawnSync } = require('child_process');
const path = require('path');
const net = require('net');

const isMongoReachable = (uri) => new Promise((resolve) => {
  try {
    const match = uri.match(/mongodb(?:\+srv)?:\/\/[^:/]+(?::(\d+))?/);
    if (!match) return resolve(false);
    const port = match[1] ? parseInt(match[1], 10) : 27017;
    const host = '127.0.0.1';
    const socket = net.createConnection({ host, port });
    socket.on('connect', () => { socket.end(); resolve(true); });
    socket.on('error', () => resolve(false));
  } catch {
    resolve(false);
  }
});

(async () => {
  const uri = process.env.MONGODB_URI || require('../config/env').mongoUri;
  let mongod;
  if (!(await isMongoReachable(uri))) {
    console.log('MongoDB not reachable; starting in-memory server for seed...');
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
  } else {
    process.env.MONGO_URI = uri;
  }
  const result = spawnSync('node', [path.join(__dirname, 'seed.js')], {
    stdio: 'inherit',
    env: process.env,
  });
  if (mongod) await mongod.stop();
  process.exit(result.status ?? 0);
})();
