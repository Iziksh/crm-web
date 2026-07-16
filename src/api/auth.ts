import { apiFetch } from "./client";

export interface AuthResponse {
  token: string;
  type: string;
  username: string;
  email: string;
}

export interface LoginResponse {
  otpRequired: boolean;
  token: string | null;
  type: string | null;
  username: string;
  email: string | null;
  deviceToken: string | null;
  maskedEmail: string | null;
}

export function login(username: string, password: string, deviceToken: string | null) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, deviceToken }),
  });
}

export function verifyLoginOtp(username: string, otp: string, trustDevice: boolean) {
  return apiFetch<LoginResponse>("/auth/login/verify-otp", {
    method: "POST",
    body: JSON.stringify({ username, otp, trustDevice }),
  });
}

export function resendLoginOtp(username: string) {
  return apiFetch<{ message: string }>("/auth/login/resend-otp", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function signup(username: string, email: string, password: string, company: string) {
  return apiFetch<{ message: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password, company }),
  });
}

export function verifySignup(email: string, otp: string) {
  return apiFetch<AuthResponse>("/auth/signup/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function resendSignupOtp(email: string) {
  return apiFetch<{ message: string }>("/auth/signup/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function acceptInvitation(token: string, username: string, password: string) {
  return apiFetch<AuthResponse>("/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token, username, password }),
  });
}

export function verifyInvite(email: string, otp: string, password: string) {
  return apiFetch<AuthResponse>("/admin/users/verify-invite", {
    method: "POST",
    body: JSON.stringify({ email, otp, password }),
  });
}
