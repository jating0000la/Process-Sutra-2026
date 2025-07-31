import { User } from "@shared/schema";

export const isAdmin = (user: User | undefined): boolean => {
  return user?.role === 'admin';
};

export const canAccessAdminFeatures = (user: User | undefined): boolean => {
  return isAdmin(user);
};

export const canCreateFlows = (user: User | undefined): boolean => {
  return isAdmin(user);
};

export const canManageForms = (user: User | undefined): boolean => {
  return isAdmin(user);
};

export const canViewSystemAnalytics = (user: User | undefined): boolean => {
  return isAdmin(user);
};

export const canAccessSimulator = (user: User | undefined): boolean => {
  return isAdmin(user);
};

export const canManageUsers = (user: User | undefined): boolean => {
  return isAdmin(user);
};

// For regular users - things they CAN do
export const canFillForms = (user: User | undefined): boolean => {
  return !!user; // Any authenticated user can fill forms
};

export const canViewOwnTasks = (user: User | undefined): boolean => {
  return !!user; // Any authenticated user can view their own tasks
};

export const canViewOwnPerformance = (user: User | undefined): boolean => {
  return !!user; // Any authenticated user can view their own performance
};