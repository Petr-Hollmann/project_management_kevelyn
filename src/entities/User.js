import { supabase } from '@/lib/supabase-client';

export const User = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    const realProfile = profile ?? { id: user.id, email: user.email, app_role: 'user' };

    // Test mode: superAdmin impersonating an installer
    if (realProfile.app_role === 'admin') {
      const impersonatedWorkerId = typeof window !== 'undefined'
        ? localStorage.getItem('impersonated_worker_id')
        : null;
      if (impersonatedWorkerId) {
        const { data: impersonatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('worker_profile_id', impersonatedWorkerId)
          .single();
        if (impersonatedUser && impersonatedUser.app_role === 'installer') return impersonatedUser;
        // Worker profile exists but has no linked user account — return minimal installer mock
        return { ...realProfile, id: null, app_role: 'installer', worker_profile_id: impersonatedWorkerId };
      }
    }

    return realProfile;
  },

  // Onboarding.jsx volá tuto funkci
  async updateMyUserData(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('users')
      .upsert({ id: user.id, email: user.email, ...payload })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async list() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async delete(id) {
    const { error } = await supabase.rpc('delete_user_by_id', { user_id: id });
    if (error) throw new Error(error.message);
    return true;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin(returnUrl) {
    window.location.href = returnUrl
      ? `/login?redirect=${encodeURIComponent(returnUrl)}`
      : '/login';
  },
};
