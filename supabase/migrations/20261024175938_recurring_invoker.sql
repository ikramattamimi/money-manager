-- post_due_recurring tidak perlu SECURITY DEFINER: pg_cron menjalankannya
-- sebagai postgres (melewati RLS), dari app RLS berlaku seperti biasa.
alter function public.post_due_recurring(uuid) security invoker;

create policy "recurring_pending: owner/editor bisa menambah" on public.recurring_pending
  for insert to authenticated with check (private.can_edit_book(book_id));
