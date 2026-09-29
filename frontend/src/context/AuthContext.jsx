import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('mrx-token')) { setLoading(false); return; }
    api.auth.me().then(({ data }) => setUser(data)).catch(() => { localStorage.removeItem('mrx-token'); }).finally(() => setLoading(false));
  }, []);
  const value = useMemo(() => ({ user, loading, signIn: (session) => { localStorage.setItem('mrx-token', session.token); setUser(session.user); }, updateUser: (nextUser) => setUser(nextUser), signOut: () => { localStorage.removeItem('mrx-token'); setUser(null); } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
