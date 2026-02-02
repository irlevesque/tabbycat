import mongoose, { Document, Schema } from 'mongoose';

export interface ITab extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  tabId: string;
  url: string;
  title: string;
  faviconUrl?: string;
  active: boolean;
  windowId: string;
  index: number;
  groupId?: string;
  pinned: boolean;
  lastAccessed: Date;
  timestamp: Date;
}

const tabSchema = new Schema<ITab>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  tabId: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  faviconUrl: String,
  active: { type: Boolean, default: false },
  windowId: { type: String, required: true },
  index: { type: Number, required: true },
  groupId: String,
  pinned: { type: Boolean, default: false },
  lastAccessed: { type: Date, default: Date.now },
  timestamp: { type: Date, default: Date.now }
});

tabSchema.index({ userId: 1, deviceId: 1, tabId: 1 }, { unique: true });

export const Tab = mongoose.model<ITab>('Tab', tabSchema);
