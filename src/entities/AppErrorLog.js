import { supabase } from '@/lib/supabase-client';

// Minimal entity — does not extend BaseEntity because error logs are append-only
// and we need custom select logic (admin only, no RLS list for normal users).

class AppErrorLogEntity {
  async list(limit = 200) {
    const { data, error } = await supabase
      .from('app_error_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`app_error_log list() failed: ${error.message}`);
    return data ?? [];
  }

  async delete(id) {
    const { error } = await supabase
      .from('app_error_log')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`app_error_log delete() failed: ${error.message}`);
  }

  async deleteAll() {
    const { error } = await supabase
      .from('app_error_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
    if (error) throw new Error(`app_error_log deleteAll() failed: ${error.message}`);
  }
}

export const AppErrorLog = new AppErrorLogEntity();
