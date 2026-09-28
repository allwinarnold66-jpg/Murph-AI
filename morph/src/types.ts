export type VoiceType = 'male' | 'female';
export type Language = 'auto' | 'en' | 'ta';
export interface Character { id: string; name: string; personality: string; voiceType: VoiceType; language: Language; voiceURI?: string; rate: number; pitch: number; image: Blob; createdAt: number }
export interface ChatMsg { role: 'user' | 'assistant'; content: string }
export type Status = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
