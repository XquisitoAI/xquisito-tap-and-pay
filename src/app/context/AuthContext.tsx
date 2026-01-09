"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authService,
  type AuthResponse,
  type ProfileData,
} from "@/app/services/auth.service";

interface User {
  id: string;
  phone?: string;
  email?: string;
  accountType: string;
}

interface Profile {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  photoUrl?: string;
  accountType: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sendOTP: (phone: string) => Promise<AuthResponse>;
  verifyOTP: (phone: string, token: string) => Promise<AuthResponse>;
  createOrUpdateProfile: (profileData: ProfileData) => Promise<AuthResponse>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario del localStorage al montar
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Set auth token in AuthService
        if (currentUser.token) {
          authService.setAuthToken(currentUser.token);
          console.log(
            "🔑 Auth token restored in AuthService from localStorage"
          );
        }
        // Cargar perfil y esperar a que termine
        await loadProfile();
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authService.getMyProfile();
      console.log("📊 AuthContext loadProfile response:", response);

      if (response.success && response.data) {
        // El backend puede devolver data.data.profile o data.profile
        const responseData = (response as any).data;
        const profileData =
          responseData?.data?.profile || responseData?.profile;

        if (profileData) {
          console.log("✅ Profile loaded in AuthContext:", profileData);
          setProfile(profileData);
        } else {
          console.warn("⚠️ No profile data found in response");
        }
      } else if (response.error?.includes("Sesión expirada")) {
        // Token refresh failed - user was logged out by authService
        console.log("🔐 Session expired, user logged out");
        setUser(null);
        setProfile(null);
      } else {
        console.warn("⚠️ Error loading profile:", response.error);
      }
    } catch (error) {
      console.error("❌ Error loading profile:", error);
    }
  };

  const sendOTP = async (phone: string): Promise<AuthResponse> => {
    const response = await authService.sendPhoneOTP(phone);
    return response;
  };

  const verifyOTP = async (
    phone: string,
    token: string
  ): Promise<AuthResponse> => {
    const response = await authService.verifyPhoneOTP(phone, token);

    if (response.success && response.data) {
      // Add token to user object for context consistency
      const userWithToken = {
        ...response.data.user,
        token: response.data.session.access_token,
      };

      setUser(userWithToken);
      if (response.data.profile) {
        setProfile(response.data.profile);
      }

      // Set auth token in AuthService immediately
      authService.setAuthToken(response.data.session.access_token);
      console.log("🔑 Auth token set in AuthService after OTP verification");
    }

    return response;
  };

  const createOrUpdateProfile = async (
    profileData: ProfileData
  ): Promise<AuthResponse> => {
    const response = await authService.createOrUpdateProfile(profileData);

    if (response.success && response.data?.profile) {
      setProfile(response.data.profile);
    }

    return response;
  };

  const updateProfile = async (
    updates: Partial<ProfileData>
  ): Promise<AuthResponse> => {
    const response = await authService.updateMyProfile(updates);

    if (response.success && response.data?.profile) {
      setProfile(response.data.profile);
    }

    return response;
  };

  const logout = async () => {
    await authService.logout();
    // Clear auth token from AuthService
    authService.clearAuthToken();
    // Clear all session data including room context
    authService.clearAllSessionData();
    console.log("🔐 Complete logout: auth token and session data cleared");
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    sendOTP,
    verifyOTP,
    createOrUpdateProfile,
    updateProfile,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}
