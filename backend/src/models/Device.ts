import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  name: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: string;
  lastSync: Date;
  createdAt: Date;
}

const deviceSchema = new Schema<IDevice>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  name: { type: String, required: true },
  browser: { type: String, enum: ['chrome', 'firefox', 'safari', 'edge'], required: true },
  os: { type: String, required: true },
  lastSync: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
