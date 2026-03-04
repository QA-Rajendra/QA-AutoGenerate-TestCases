import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile 
} from "firebase/auth";
import { auth } from "../config/firebase";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      setCurrentUser(result.user);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to sign up";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUser(result.user);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to log in";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setCurrentUser(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to log out";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
