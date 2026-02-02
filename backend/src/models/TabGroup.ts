import mongoose, { Document, Schema } from 'mongoose';

export interface ITabGroup extends Document {
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  groupId: string;
  title: string;
  color: string;
  collapsed: boolean;
  windowId: string;
  tabs: string[];
  timestamp: Date;
}

const tabGroupSchema = new Schema<ITabGroup>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  groupId: { type: String, required: true },
  title: { type: String, required: true },
  color: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  windowId: { type: String, required: true },
  tabs: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

tabGroupSchema.index({ userId: 1, deviceId: 1, groupId: 1 }, { unique: true });

export const TabGroup = mongoose.model<ITabGroup>('TabGroup', tabGroupSchema);
