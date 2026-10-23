import { getSupabase } from './config'

// The admins list lives in the database (see supabase/schema.sql). Everyone on it shares the same
// records; only admins can read or change the list, and nobody can remove themselves.

function db() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('No database connected')
  return supabase
}

export async function listAdmins(): Promise<string[]> {
  const { data, error } = await db().from('admins').select('email').order('added_at').order('email')
  if (error) throw error
  return (data as { email: string }[]).map((row) => row.email)
}

export async function addAdmin(email: string): Promise<void> {
  const { error } = await db().from('admins').insert({ email: email.trim().toLowerCase() })
  if (error?.code === '23505') throw new Error(`${email} is already an admin.`)
  if (error) throw error
}

export async function removeAdmin(email: string): Promise<void> {
  const { error } = await db().from('admins').delete().eq('email', email)
  if (error) throw error
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await db().auth.updateUser({ password })
  if (error) throw error
}
