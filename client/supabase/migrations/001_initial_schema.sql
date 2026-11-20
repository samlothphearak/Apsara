-- =========================================================
-- APSARA: INITIAL DATABASE + PROFILE REPAIR
-- PostgreSQL / Supabase
--
-- Run this in the Supabase SQL Editor for a new/empty project.
-- It is safe to re-run for objects created by this script:
-- tables/indexes use IF NOT EXISTS, policies/triggers are recreated.
-- It does NOT delete auth.users or existing profile data.
-- =========================================================

create extension if not exists pgcrypto;

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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
  constraint profiles_username_length check (char_length(username) between 3 and 30),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

create index if not exists profiles_username_idx on public.profiles(username);

-- 2. POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(content) <= 10000)
);
create index if not exists posts_user_created_idx
  on public.posts(user_id, created_at desc);

-- 3. POST MEDIA
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image',
  created_at timestamptz not null default now()
);

-- 4. POST LIKES
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

-- 5. COMMENTS
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(content) between 1 and 3000)
);

-- 6. FRIENDSHIPS
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique(requester_id, addressee_id)
);

-- 7. FOLLOWS
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  check (follower_id <> following_id)
);

-- 8. CONVERSATIONS
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 9. CONVERSATION MEMBERS
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);

-- 10. MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (char_length(content) between 1 and 5000)
);

-- 11. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 12. CREATE A PROFILE AUTOMATICALLY WHEN A USER SIGNS UP.
-- Username is derived from metadata.username or email, then made unique.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
  email_name text;
begin
  email_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'user');
  base_username := lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    email_name
  ));

  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  base_username := left(base_username, 20);

  if char_length(base_username) < 3 then
    base_username := 'user';
  end if;

  candidate := base_username;

  while exists (
    select 1
    from public.profiles p
    where p.username = candidate
  ) loop
    candidate := left(base_username, 20) || '_' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end loop;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 13. REPAIR EXISTING AUTH ACCOUNTS THAT DO NOT HAVE A PROFILE.
-- This preserves existing users and existing profiles.
do $$
declare
  user_row record;
  base_username text;
  candidate text;
  email_name text;
begin
  for user_row in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    email_name := coalesce(
      nullif(split_part(coalesce(user_row.email, ''), '@', 1), ''),
      'user'
    );

    base_username := lower(coalesce(
      nullif(user_row.raw_user_meta_data ->> 'username', ''),
      email_name
    ));
    base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
    base_username := left(base_username, 20);

    if char_length(base_username) < 3 then
      base_username := 'user';
    end if;

    candidate := base_username;
    while exists (
      select 1 from public.profiles p where p.username = candidate
    ) loop
      candidate := left(base_username, 20) || '_' ||
        substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    end loop;

    insert into public.profiles (id, username, full_name)
    values (
      user_row.id,
      candidate,
      coalesce(user_row.raw_user_meta_data ->> 'full_name', '')
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

-- 14. UPDATED_AT HELPER
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

drop trigger if exists friendships_set_updated_at on public.friendships;
create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- 15. ENABLE ROW LEVEL SECURITY
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

-- 16. REMOVE/RECREATE POLICIES FROM THIS MIGRATION (safe to rerun)
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view public posts" on public.posts;
drop policy if exists "Users can create their own posts" on public.posts;
drop policy if exists "Users can update their own posts" on public.posts;
drop policy if exists "Users can delete their own posts" on public.posts;
drop policy if exists "View media attached to visible posts" on public.post_media;
drop policy if exists "Post owners manage media" on public.post_media;
drop policy if exists "View likes" on public.post_likes;
drop policy if exists "Like as yourself" on public.post_likes;
drop policy if exists "Remove your own likes" on public.post_likes;
drop policy if exists "View comments" on public.comments;
drop policy if exists "Create your own comments" on public.comments;
drop policy if exists "Update your own comments" on public.comments;
drop policy if exists "Delete your own comments" on public.comments;
drop policy if exists "View your friendship requests" on public.friendships;
drop policy if exists "Send friend requests" on public.friendships;
drop policy if exists "Respond to friend requests" on public.friendships;
drop policy if exists "Remove your friendship" on public.friendships;
drop policy if exists "View follows" on public.follows;
drop policy if exists "Follow users" on public.follows;
drop policy if exists "Unfollow users" on public.follows;
drop policy if exists "Conversation members can view conversations" on public.conversations;
drop policy if exists "View members of your conversations" on public.conversation_members;
drop policy if exists "Conversation members can read messages" on public.messages;
drop policy if exists "Conversation members can send messages" on public.messages;
drop policy if exists "View your notifications" on public.notifications;
drop policy if exists "Update your notifications" on public.notifications;

-- Profiles: authenticated users can discover profiles; only owners can update.
create policy "Authenticated users can view profiles"
on public.profiles for select to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Posts: public and own posts are readable in this starter schema.
create policy "Users can view public posts"
on public.posts for select to authenticated
using (visibility = 'public' or user_id = (select auth.uid()));

create policy "Users can create their own posts"
on public.posts for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own posts"
on public.posts for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete their own posts"
on public.posts for delete to authenticated
using (user_id = (select auth.uid()));

-- Media
create policy "View media attached to visible posts"
on public.post_media for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (p.visibility = 'public' or p.user_id = (select auth.uid()))
  )
);

create policy "Post owners manage media"
on public.post_media for all to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id = (select auth.uid())
  )
);

-- Likes
create policy "View likes"
on public.post_likes for select to authenticated using (true);

create policy "Like as yourself"
on public.post_likes for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Remove your own likes"
on public.post_likes for delete to authenticated
using (user_id = (select auth.uid()));

-- Comments
create policy "View comments"
on public.comments for select to authenticated using (true);

create policy "Create your own comments"
on public.comments for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Update your own comments"
on public.comments for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Delete your own comments"
on public.comments for delete to authenticated
using (user_id = (select auth.uid()));

-- Friendships
create policy "View your friendship requests"
on public.friendships for select to authenticated
using (
  requester_id = (select auth.uid())
  or addressee_id = (select auth.uid())
);

create policy "Send friend requests"
on public.friendships for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
);

create policy "Respond to friend requests"
on public.friendships for update to authenticated
using (addressee_id = (select auth.uid()))
with check (addressee_id = (select auth.uid()));

create policy "Remove your friendship"
on public.friendships for delete to authenticated
using (
  requester_id = (select auth.uid())
  or addressee_id = (select auth.uid())
);

-- Follows
create policy "View follows"
on public.follows for select to authenticated using (true);

create policy "Follow users"
on public.follows for insert to authenticated
with check (follower_id = (select auth.uid()));

create policy "Unfollow users"
on public.follows for delete to authenticated
using (follower_id = (select auth.uid()));

-- Avoid recursive RLS on conversation_members by using a SECURITY DEFINER helper.
create or replace function public.is_conversation_member(
  target_conversation_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = target_user_id
  );
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

create policy "Conversation members can view conversations"
on public.conversations for select to authenticated
using (public.is_conversation_member(id, (select auth.uid())));

create policy "View members of your conversations"
on public.conversation_members for select to authenticated
using (
  public.is_conversation_member(conversation_id, (select auth.uid()))
);

create policy "Conversation members can read messages"
on public.messages for select to authenticated
using (
  public.is_conversation_member(conversation_id, (select auth.uid()))
);

create policy "Conversation members can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_conversation_member(conversation_id, (select auth.uid()))
);

-- Notifications
create policy "View your notifications"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "Update your notifications"
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

-- 17. INDEXES
create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at desc);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index if not exists follows_following_idx on public.follows(following_id);

-- 18. VERIFY PROFILE BACKFILL
-- After running, this query should show profile_id populated for each account.
select
  u.id as auth_user_id,
  u.email,
  p.id as profile_id,
  p.username,
  p.full_name
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
