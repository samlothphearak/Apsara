do $$
declare
  existing_user record;
  base_username text;
  candidate text;
begin
  for existing_user in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users as u
    where not exists (
      select 1
      from public.profiles as p
      where p.id = u.id
    )
  loop
    base_username := lower(
      coalesce(
        nullif(existing_user.raw_user_meta_data ->> 'username', ''),
        split_part(coalesce(existing_user.email, ''), '@', 1)
      )
    );

    base_username := left(
      regexp_replace(base_username, '[^a-z0-9_]', '', 'g'),
      20
    );

    if char_length(base_username) < 3 then
      base_username := 'user';
    end if;

    candidate := base_username;

    while exists (
      select 1
      from public.profiles
      where username = candidate
    ) loop
      candidate := left(base_username, 20)
        || '_' || substr(gen_random_uuid()::text, 1, 6);
    end loop;

    insert into public.profiles (id, username, full_name)
    values (
      existing_user.id,
      candidate,
      coalesce(existing_user.raw_user_meta_data ->> 'full_name', '')
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;
