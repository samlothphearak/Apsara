-- Social interactions, privacy-aware post visibility, notifications, and messaging.

drop policy if exists "Users can view public posts" on public.posts;
drop policy if exists "Users can view posts allowed by visibility" on public.posts;
create policy "Users can view posts allowed by visibility"
on public.posts for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    visibility = 'public'
    and (
      not coalesce(
        (select p.is_private from public.profiles p where p.id = posts.user_id),
        false
      )
      or exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = (select auth.uid()) and f.addressee_id = posts.user_id)
            or (f.addressee_id = (select auth.uid()) and f.requester_id = posts.user_id)
          )
      )
    )
  )
  or (
    visibility = 'friends'
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = posts.user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = posts.user_id)
        )
    )
  )
);

drop policy if exists "View media attached to visible posts" on public.post_media;
create policy "View media attached to visible posts"
on public.post_media for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "View likes" on public.post_likes;
drop policy if exists "View likes on visible posts" on public.post_likes;
create policy "View likes on visible posts"
on public.post_likes for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "Like as yourself" on public.post_likes;
drop policy if exists "Like visible posts as yourself" on public.post_likes;
create policy "Like visible posts as yourself"
on public.post_likes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id)
);

drop policy if exists "View comments" on public.comments;
drop policy if exists "View comments on visible posts" on public.comments;
create policy "View comments on visible posts"
on public.comments for select to authenticated
using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "Create your own comments" on public.comments;
drop policy if exists "Comment on visible posts as yourself" on public.comments;
create policy "Comment on visible posts as yourself"
on public.comments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id)
);

drop policy if exists "View your friendship requests" on public.friendships;
drop policy if exists "View friendship connections and requests" on public.friendships;
create policy "View friendship connections and requests"
on public.friendships for select to authenticated
using (
  status = 'accepted'
  or requester_id = (select auth.uid())
  or addressee_id = (select auth.uid())
);

drop policy if exists "Send friend requests" on public.friendships;
create or replace function public.send_friend_request(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_id uuid;
begin
  if current_user_id is null or target_user_id is null
    or target_user_id = current_user_id then
    raise exception 'Choose another member to send a friend request.';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = target_user_id
  ) then
    raise exception 'That member could not be found.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(current_user_id::text, target_user_id::text)
        || ':' ||
      greatest(current_user_id::text, target_user_id::text),
      0
    )
  );

  if exists (
    select 1
    from public.friendships f
    where f.status in ('pending', 'accepted')
      and (
        (f.requester_id = current_user_id and f.addressee_id = target_user_id)
        or (f.requester_id = target_user_id and f.addressee_id = current_user_id)
      )
  ) then
    raise exception 'A friend request or friendship already exists.';
  end if;

  update public.friendships
  set status = 'pending', updated_at = now()
  where requester_id = current_user_id
    and addressee_id = target_user_id
    and status = 'rejected'
  returning id into request_id;

  if request_id is null then
    insert into public.friendships (requester_id, addressee_id, status)
    values (current_user_id, target_user_id, 'pending')
    returning id into request_id;
  end if;

  return request_id;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

drop policy if exists "Respond to friend requests" on public.friendships;
create or replace function public.respond_to_friend_request(
  request_id uuid,
  accept_request boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friendships
  set status = case when accept_request then 'accepted' else 'rejected' end,
      updated_at = now()
  where id = request_id
    and addressee_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'This friend request is no longer available.';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and entity_id = request_id
    and type = 'friend_request'
    and read_at is null;
end;
$$;

revoke all on function public.respond_to_friend_request(uuid, boolean) from public;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

create or replace function public.create_social_notification(
  recipient_user_id uuid,
  actor_user_id uuid,
  notification_type text,
  related_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if recipient_user_id is not null
    and actor_user_id is not null
    and recipient_user_id <> actor_user_id then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (recipient_user_id, actor_user_id, notification_type, related_entity_id);
  end if;
end;
$$;

revoke all on function public.create_social_notification(uuid, uuid, text, uuid)
  from public, authenticated;

create or replace function public.notify_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.create_social_notification(
      new.addressee_id, new.requester_id, 'friend_request', new.id
    );
  elsif tg_op = 'UPDATE' and old.status = 'rejected'
    and new.status = 'pending' then
    perform public.create_social_notification(
      new.addressee_id, new.requester_id, 'friend_request', new.id
    );
  elsif tg_op = 'UPDATE' and old.status = 'pending'
    and new.status = 'accepted' then
    perform public.create_social_notification(
      new.requester_id, new.addressee_id, 'friend_accepted', new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify
after insert or update of status on public.friendships
for each row execute function public.notify_friendship_change();

create or replace function public.mark_deleted_friend_request_read()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set read_at = now()
  where entity_id = old.id
    and type = 'friend_request'
    and read_at is null;
  return old;
end;
$$;

drop trigger if exists friendships_mark_request_read on public.friendships;
create trigger friendships_mark_request_read
after delete on public.friendships
for each row execute function public.mark_deleted_friend_request_read();

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_social_notification(
    new.following_id, new.follower_id, 'follow', null
  );
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
after insert on public.follows
for each row execute function public.notify_new_follow();

create or replace function public.notify_post_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_owner_id uuid;
begin
  select p.user_id into post_owner_id
  from public.posts p
  where p.id = new.post_id;

  if tg_table_name = 'post_likes' then
    perform public.create_social_notification(
      post_owner_id, new.user_id, 'post_like', new.post_id
    );
  else
    perform public.create_social_notification(
      post_owner_id, new.user_id, 'post_comment', new.post_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify
after insert on public.post_likes
for each row execute function public.notify_post_activity();

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
after insert on public.comments
for each row execute function public.notify_post_activity();

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row record;
begin
  for member_row in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
  loop
    perform public.create_social_notification(
      member_row.user_id, new.sender_id, 'message', new.conversation_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
after insert on public.messages
for each row execute function public.notify_new_message();

create or replace function public.start_friend_conversation(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null or target_user_id is null
    or target_user_id = current_user_id then
    raise exception 'Choose another member to message.';
  end if;

  if not exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = current_user_id and f.addressee_id = target_user_id)
        or (f.addressee_id = current_user_id and f.requester_id = target_user_id)
      )
  ) then
    raise exception 'You can start a conversation after becoming friends.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      least(current_user_id::text, target_user_id::text)
        || ':' ||
      greatest(current_user_id::text, target_user_id::text),
      0
    )
  );

  select mine.conversation_id into existing_conversation_id
  from public.conversation_members mine
  join public.conversation_members theirs
    on theirs.conversation_id = mine.conversation_id
  where mine.user_id = current_user_id
    and theirs.user_id = target_user_id
    and not exists (
      select 1
      from public.conversation_members extra
      where extra.conversation_id = mine.conversation_id
        and extra.user_id not in (current_user_id, target_user_id)
    )
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations default values
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, target_user_id);

  return new_conversation_id;
end;
$$;

revoke all on function public.start_friend_conversation(uuid) from public;
grant execute on function public.start_friend_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_conversation_member(target_conversation_id, auth.uid()) then
    raise exception 'You cannot read this conversation.';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = target_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
