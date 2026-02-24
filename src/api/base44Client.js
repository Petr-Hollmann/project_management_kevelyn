// Legacy shim — kept so any remaining imports don't break.
// For new code, import directly from @/entities/* and @/lib/supabase-client.
export { supabase } from '@/lib/supabase-client';
export { User } from '@/entities/User';
export { BaseEntity } from '@/entities/BaseEntity';
