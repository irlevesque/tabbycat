import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  oauthProvider: string;
  oauthId: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: String,
  oauthProvider: { type: String, required: true },
  oauthId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', userSchema);
