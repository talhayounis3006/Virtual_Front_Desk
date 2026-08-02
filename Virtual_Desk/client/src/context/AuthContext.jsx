/**
 * ============================================================
 *  AUTH CONTEXT — context/AuthContext.jsx
 * ============================================================
 *  Global authentication state management using React Context.
 *
 *  WHAT IT DOES:
 *  - Stores the currently logged-in user
 *  - Provides login, register, and logout functions
 *  - On page load, restores the session from localStorage token
 *
 *  KEY CONCEPTS TO LEARN:
 *  1. React Context: a way to share state across the entire component tree
 *     without passing props down manually (prop drilling).
 *  2. createContext + useContext: the two parts of the Context API.
 *  3. localStorage: the JWT token is stored in the browser's localStorage
 *     so the user stays logged in across page reloads.
 *  4. useEffect: runs once on mount to check if a token exists.
 * ============================================================
 */

// React hooks for state and context
import { createContext, useContext, useState, useEffect } from "react";
// API helper functions
import { api } from "../services/api.js";

// Create the context with a default value of null
// This context will hold { user, loading, login, register, logout }
const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the entire app and provides auth state.
 * Any component inside can use `useAuth()` to access it.
 */
export function AuthProvider({ children }) {
  // The currently logged-in user (null if not logged in)
  const [user, setUser] = useState(null);
  // True while we're checking if a saved token is still valid
  const [loading, setLoading] = useState(true);

  /**
   * On component mount, check if there's a saved token in localStorage.
   * If yes, call the /auth/me endpoint to get the user's info.
   * This restores the session after a page refresh.
   */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.auth
        .me() // GET /api/auth/me with the token
        .then((data) => setUser(data)) // success → set the user
        .catch(() => localStorage.removeItem("token")) // invalid token → clear it
        .finally(() => setLoading(false)); // always stop loading
    } else {
      // No token → not logged in
      setLoading(false);
    }
  }, []); // empty dependency array = run once on mount

  /**
   * login — calls the login API, stores the token, and sets the user.
   */
  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem("token", data.token); // save JWT for future requests
    setUser(data.user);
    return data.user;
  };

  /**
   * register — calls the register API, stores the token, and sets the user.
   */
  const register = async (body) => {
    const data = await api.auth.register(body);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  /**
   * logout — removes the token and clears the user state.
   */
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Provide the auth state and functions to all children
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — custom hook to access the auth context.
 * Usage: const { user, login, logout } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);