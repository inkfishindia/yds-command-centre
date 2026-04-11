
export enum UserAccountStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  PENDING = 'Pending',
  SUSPENDED = 'Suspended'
}

export interface UserProfile { 
  id: string; 
  fullName: string; 
  email: string; 
  picture?: string; 
}

export interface UserManagement {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  hub: string;
  status: UserAccountStatus;
  lastLogin?: string;
  permissions?: string;
}

export interface AuthContextType { 
  isSignedIn: boolean; 
  isMockMode: boolean; 
  userProfile: UserProfile | null; 
  gsiInitialized: boolean; 
  initialAuthCheckComplete: boolean; 
  isAuthActionInProgress: boolean; 
  signIn: () => void; 
  signOut: () => Promise<void>; 
  refreshAuthToken: (scopes?: string | string[]) => Promise<string>; 
}
