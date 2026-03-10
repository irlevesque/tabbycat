import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { mongoServer } from './setup';

describe('User Model', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should create new user with required fields', async () => {
    const user = new User({
      email: 'test@example.com',
      oauthProvider: 'google',
      oauthId: '123456789',
      createdAt: new Date()
    });

    await user.save();

    expect(user._id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.oauthProvider).toBe('google');
    expect(user.oauthId).toBe('123456789');
    expect(user.createdAt).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await User.create({
      email: 'test@example.com',
      oauthProvider: 'google',
      oauthId: '123456789',
      createdAt: new Date()
    });

    const duplicateUser = new User({
      email: 'test@example.com',
      oauthProvider: 'facebook',
      oauthId: '987654321',
      createdAt: new Date()
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  it('should create user with optional name', async () => {
    const user = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      oauthProvider: 'google',
      oauthId: '123456789',
      createdAt: new Date()
    });

    expect(user.name).toBe('Test User');
  });

  it('should have correct email index', async () => {
    const user = await User.create({
      email: 'test@example.com',
      oauthProvider: 'google',
      oauthId: '123456789',
      createdAt: new Date()
    });

    const indexes = await User.collection.indexes();
    const emailIndex = indexes.find((i: any) => i.key.email === 1);
    expect(emailIndex).toBeDefined();
  });
});