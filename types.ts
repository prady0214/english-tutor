
export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'error' | 'closing';

export type Transcription = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isFinal: boolean;
};

export type ProgressMetrics = {
  grammar_score: number;
  pronunciation_score: number;
  fluency_score: number;
  frequent_errors: string[];
  lesson_suggested: string[];
};
