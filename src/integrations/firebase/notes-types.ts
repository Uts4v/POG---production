import { Timestamp } from "firebase/firestore";

export interface Note {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string; // User ID or "all" for everyone
  recipientName: string; // Name or "All Employees"
  subject: string;
  message: string;
  priority: "low" | "normal" | "high";
  isRead: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subscription {
  id: string;
  name: string; // e.g., "Claude Pro", "Freepik Premium"
  renewed_date?: Timestamp; // When the subscription was last renewed (new field)
  deadline_date?: Timestamp; // When the subscription expires (new field)
  renewalDate?: Timestamp; // Legacy field for backward compatibility
  description?: string; // Legacy field for backward compatibility
  notifyDaysBefore?: number; // Legacy field for backward compatibility
  cost: number; // Monthly cost
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastNotificationSent?: Timestamp;
}