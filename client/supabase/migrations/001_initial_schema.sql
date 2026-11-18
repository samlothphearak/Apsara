
-- =========================================
-- SOCIALLY: INITIAL DATABASE
-- PostgreSQL + Supabase
-- =========================================

create extension if not exists pgcrypto;

-- 1. PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id)
    on delete cascade,

  username text unique not null,
  full_name text not null default '',
  bio text not null default '',
  avatar_url text,
  cover_url text,
  website text,
  location text,

  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_length
    check (char_length(username) between 3 and 30),

  constraint username_format
    check (username ~ '^[a-zA-Z0-9_]+$')
);

create index profiles_username_idx
on public.profiles(username);

-- 2. POSTS
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id)
    on delete cascade,
  content text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(content) <= 10000)
);

create index posts_user_created_idx
on public.posts(user_id, created_at desc);

-- 3. POST MEDIA
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id)
    on delete cascade,
  media_url text not null,
  media_type text not null default 'image',
  created_at timestamptz not null default now()
);

-- 4. POST LIKES
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id)
    on delete cascade,
  user_id uuid not null references public.profiles(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- 5. COMMENTS
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id)
    on delete cascade,
  user_id uuid not null references public.profiles(id)
    on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(content) between 1 and 3000)
);

-- 6. FRIENDSHIPS
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id)
    on delete cascade,
  addressee_id uuid not null references public.profiles(id)
    on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique(requester_id, addressee_id)
);

-- 7. FOLLOWS
create table public.follows (
  follower_id uuid not null references public.profiles(id)
    on delete cascade,
  following_id uuid not null references public.profiles(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  check(follower_id <> following_id)
);

-- 8. CONVERSATIONS
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 9. CONVERSATION MEMBERS
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id)
    on delete cascade,
  user_id uuid not null references public.profiles(id)
    on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);

-- 10. MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id)
    on delete cascade,
  sender_id uuid not null references public.profiles(id)
    on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (char_length(content) between 1 and 5000)
);

-- 11. NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id)
    on delete cascade,
  actor_id uuid references public.profiles(id)
    on delete set null,
  type text not null,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================
-- AUTO CREATE PROFILE ON SIGNUP
-- =========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
begin
  base_username := lower(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      split_part(new.email, '@', 1)
    )
  );

  base_username := regexp_replace(
    base_username,
    '[^a-z0-9_]',
    '',
    'g'
  );

  base_username := left(base_username, 20);

  if char_length(base_username) < 3 then
    base_username := 'user';
  end if;

  candidate := base_username;

  while exists (
    select 1 from public.profiles
    where username = candidate
  ) loop
    candidate := left(base_username, 20)
      || '_' || substr(gen_random_uuid()::text, 1, 6);
  end loop;

  insert into public.profiles (
    id, username, full_name
  )
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.friendships enable row level security;
alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- PROFILES
create policy "Authenticated users can view profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- POSTS
create policy "Users can view public posts"
on public.posts for select
to authenticated
using (
  visibility = 'public'
  or user_id = (select auth.uid())
);

create policy "Users can create their own posts"
on public.posts for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own posts"
on public.posts for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete their own posts"
on public.posts for delete
to authenticated
using (user_id = (select auth.uid()));

-- POST MEDIA
create policy "View media attached to visible posts"
on public.post_media for select
to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
    and (
      p.visibility = 'public'
      or p.user_id = (select auth.uid())
    )
  )
);

create policy "Post owners manage media"
on public.post_media for all
to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
    and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id
    and p.user_id = (select auth.uid())
  )
);

-- LIKES
create policy "View likes"
on public.post_likes for select
to authenticated
using (true);

create policy "Like as yourself"
on public.post_likes for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Remove your own likes"
on public.post_likes for delete
to authenticated
using (user_id = (select auth.uid()));

-- COMMENTS
create policy "View comments"
on public.comments for select
to authenticated
using (true);

create policy "Create your own comments"
on public.comments for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Update your own comments"
on public.comments for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Delete your own comments"
on public.comments for delete
to authenticated
using (user_id = (select auth.uid()));

-- FRIENDSHIPS
create policy "View your friendship requests"
on public.friendships for select
to authenticated
using (
  requester_id = (select auth.uid())
  or addressee_id = (select auth.uid())
);

create policy "Send friend requests"
on public.friendships for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
);

create policy "Respond to friend requests"
on public.friendships for update
to authenticated
using (addressee_id = (select auth.uid()))
with check (
  addressee_id = (select auth.uid())
);

create policy "Remove your friendship"
on public.friendships for delete
to authenticated
using (
  requester_id = (select auth.uid())
  or addressee_id = (select auth.uid())
);

-- FOLLOWS
create policy "View follows"
on public.follows for select
to authenticated
using (true);

create policy "Follow users"
on public.follows for insert
to authenticated
with check (follower_id = (select auth.uid()));

create policy "Unfollow users"
on public.follows for delete
to authenticated
using (follower_id = (select auth.uid()));

-- CONVERSATIONS
create policy "Conversation members can view conversations"
on public.conversations for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = id
    and cm.user_id = (select auth.uid())
  )
);

-- MEMBERS
create policy "View members of your conversations"
on public.conversation_members for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_id
    and cm.user_id = (select auth.uid())
  )
);

-- MESSAGES
create policy "Conversation members can read messages"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
    and cm.user_id = (select auth.uid())
  )
);

create policy "Conversation members can send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
    and cm.user_id = (select auth.uid())
  )
);

-- NOTIFICATIONS
create policy "View your notifications"
on public.notifications for select
to authenticated
using (recipient_id = (select auth.uid()));

create policy "Update your notifications"
on public.notifications for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

-- =========================================
-- INDEXES
-- =========================================

create index post_likes_post_idx
on public.post_likes(post_id);

create index comments_post_created_idx
on public.comments(post_id, created_at desc);

create index friendships_addressee_idx
on public.friendships(addressee_id, status);

create index messages_conversation_created_idx
on public.messages(conversation_id, created_at);

create index notifications_recipient_idx
on public.notifications(recipient_id, created_at desc);

create index follows_following_idx
on public.follows(following_id);
