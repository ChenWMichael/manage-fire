import { supabase } from './supabase'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000/api'

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

export type CalculatorType = 'fire' | 'rent_buy' | 'house_affordability' | 'offer'

export interface Snapshot {
  id: string
  user_id: string
  name: string
  calculator_type: CalculatorType
  inputs: Record<string, unknown>
  summary: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const SNAPSHOT_LIMIT = 20

export async function saveSnapshot(
  calculator_type: CalculatorType,
  name: string,
  inputs: Record<string, unknown>,
  summary: Record<string, unknown>,
): Promise<Snapshot> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/snapshots`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ calculator_type, name, inputs, summary }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail ?? 'Failed to save snapshot')
  }
  return res.json() as Promise<Snapshot>
}

export async function getSnapshots(): Promise<Snapshot[]> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/snapshots`, { headers })
  if (!res.ok) throw new Error('Failed to fetch snapshots')
  return res.json() as Promise<Snapshot[]>
}

export async function getSnapshot(id: string): Promise<Snapshot> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/snapshots/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch snapshot')
  return res.json() as Promise<Snapshot>
}

export async function updateSnapshot(
  id: string,
  data: Partial<Pick<Snapshot, 'name' | 'inputs' | 'summary'>>,
): Promise<Snapshot> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/snapshots/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update snapshot')
  return res.json() as Promise<Snapshot>
}

export async function deleteSnapshot(id: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/snapshots/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to delete snapshot')
}

export async function deleteSnapshots(ids: string[]): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/snapshots`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('Failed to delete snapshots')
}

export interface Profile {
  id: string
  full_name: string | null
  fire_type: string | null
  created_at: string
  updated_at: string
}

export async function getProfile(): Promise<Profile> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/profile/me`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json() as Promise<Profile>
}

export async function updateProfile(data: { full_name?: string; fire_type?: string }): Promise<Profile> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}/profile/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json() as Promise<Profile>
}
