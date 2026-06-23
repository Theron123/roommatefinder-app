export type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  photoUrl: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  latOffset: number;
  lngOffset?: number;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
};
