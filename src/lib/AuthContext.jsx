import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ id: 'local', public_settings: {} });
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Zkontroluj aktuální session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    }).catch(() => {
      setIsLoadingAuth(false);
    });

    // Poslouchej změny přihlášení
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthContext] onAuthStateChange:", event, "user:", session?.user?.id ?? "null");
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsLoadingAuth(false);
        return;
      }
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (authUser) => {
    console.log("[AuthContext] loadProfile — hledám v public.users id:", authUser.id);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      console.log("[AuthContext] loadProfile result:", profile, "error:", profileError);

      if (!profile) {
        // Profil neexistuje — typicky po potvrzení emailu, kdy upsert při registraci
        // selhal kvůli chybějící session (RLS). Vytvoříme ho teď z auth metadat.
        const meta = authUser.user_metadata ?? {};
        const { data: newProfile } = await supabase
          .from('users')
          .upsert({
            id: authUser.id,
            email: authUser.email,
            full_name: meta.full_name ?? null,
            phone: meta.phone ?? null,
            app_role: 'pending',
          })
          .select()
          .maybeSingle();
        setUser(newProfile ?? { id: authUser.id, email: authUser.email, app_role: 'pending' });
      } else {
        setUser(profile);
      }
    } catch (err) {
      console.error("[AuthContext] loadProfile exception:", err);
      setUser({ id: authUser.id, email: authUser.email, app_role: 'pending' });
    } finally {
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    }
  };

  const reloadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadProfile(session.user);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/';
  };

  const navigateToLogin = () => {
    // V naší implementaci App.jsx zobrazí Login přímo – žádný redirect potřeba
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      isPasswordRecovery,
      clearPasswordRecovery: () => setIsPasswordRecovery(false),
      reloadProfile,
      logout,
      navigateToLogin,
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
