import { vi, describe, it, expect, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase-client'
import { User } from './User.js'

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

function makeChain(data) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  }
  return chain
}

const ADMIN = {
  id: 'admin-id',
  email: 'robin@kevelyn.cz',
  app_role: 'admin',
  worker_profile_id: 'worker-1',
  full_name: 'Robin Soudil',
}
const INSTALLER = {
  id: 'installer-id',
  email: 'robin@gmail.com',
  app_role: 'installer',
  worker_profile_id: 'worker-1',
  full_name: 'Robin Soudil',
}
const SUPERVISOR = {
  id: 'supervisor-id',
  email: 'sup@kevelyn.cz',
  app_role: 'supervisor',
  worker_profile_id: null,
  full_name: 'Supervisor',
}

describe('User.me()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // --- Tracer bullet ---
  it('throws when not authenticated', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })
    await expect(User.me()).rejects.toThrow('Not authenticated')
  })

  it('returns profile directly for installer (no impersonation)', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'installer-id' } }, error: null })
    supabase.from.mockReturnValue(makeChain(INSTALLER))

    const result = await User.me()
    expect(result).toEqual(INSTALLER)
  })

  it('returns admin profile when no impersonation active', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null })
    supabase.from.mockReturnValue(makeChain(ADMIN))

    const result = await User.me()
    expect(result).toEqual(ADMIN)
  })

  describe('impersonation (admin only)', () => {
    beforeEach(() => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null })
      localStorage.setItem('impersonated_worker_id', 'worker-1')
    })

    it('returns linked installer user', async () => {
      supabase.from
        .mockReturnValueOnce(makeChain(ADMIN))
        .mockReturnValueOnce(makeChain(INSTALLER))

      const result = await User.me()
      expect(result).toEqual(INSTALLER)
      expect(result.app_role).toBe('installer')
    })

    it('regression: linked user is admin — returns id:null mock, not admin ID', async () => {
      // Before fix: this returned ADMIN (with admin-id), leaking admin tasks to installer dashboard
      supabase.from
        .mockReturnValueOnce(makeChain(ADMIN))
        .mockReturnValueOnce(makeChain(ADMIN))

      const result = await User.me()
      expect(result.id).toBeNull()
      expect(result.app_role).toBe('installer')
      expect(result.worker_profile_id).toBe('worker-1')
    })

    it('no linked user account — returns id:null mock', async () => {
      supabase.from
        .mockReturnValueOnce(makeChain(ADMIN))
        .mockReturnValueOnce(makeChain(null))

      const result = await User.me()
      expect(result.id).toBeNull()
      expect(result.app_role).toBe('installer')
      expect(result.worker_profile_id).toBe('worker-1')
    })
  })

  it('supervisor is not subject to impersonation logic', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'supervisor-id' } }, error: null })
    supabase.from.mockReturnValue(makeChain(SUPERVISOR))
    localStorage.setItem('impersonated_worker_id', 'worker-1')

    const result = await User.me()
    expect(result).toEqual(SUPERVISOR)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})
