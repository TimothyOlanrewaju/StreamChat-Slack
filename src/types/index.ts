export interface FeedbackData {
  customerId: string;
  feedback: string;
  category: 'bug' | 'suggestion' | 'complaint';
}

export interface ChannelData {
  id: string;
  name: string;
  category: string;
  lastMessage: string;
  memberCount: number;
  resolved: boolean;
}

