const PREFIX = "crm.deviceTrust.";

export function getDeviceToken(username: string): string | null {
  return localStorage.getItem(PREFIX + username.toLowerCase());
}

export function setDeviceToken(username: string, token: string) {
  localStorage.setItem(PREFIX + username.toLowerCase(), token);
}
