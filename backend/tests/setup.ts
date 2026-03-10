import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { connectDB } from '../src/server';

dotenv.config();

export let mongoServer: MongoMemoryServer;
export const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

jest.setTimeout(30000);

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    await connectDB();
  } catch (error) {
    console.error('MongoDB setup error:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});

afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    console.error('Clear collections error:', error);
  }
});

export const createTestToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const mockAuthRequest = (userId: string) => {
  return {
    headers: {
      authorization: `Bearer ${createTestToken(userId)}`
    }
  };
};
