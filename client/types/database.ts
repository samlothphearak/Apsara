export type Profile = {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  location: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  visibility: "public" | "friends" | "private";
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};
