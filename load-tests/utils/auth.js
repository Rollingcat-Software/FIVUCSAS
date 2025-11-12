/**
 * Authentication utilities for K6 load tests
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import config from '../config.js';

/**
 * Login and get access token + refresh token
 */
export function login(email, password) {
  const loginUrl = `${config.identityApiUrl}/api/v1/auth/login`;

  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'login' },
  };

  const response = http.post(loginUrl, payload, params);

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => r.json('accessToken') !== undefined,
    'login returns refresh token': (r) => r.json('refreshToken') !== undefined,
  });

  if (!success) {
    console.error(`Login failed: ${response.status} ${response.body}`);
    return null;
  }

  return {
    accessToken: response.json('accessToken'),
    refreshToken: response.json('refreshToken'),
    expiresIn: response.json('expiresIn') || 900,
  };
}

/**
 * Refresh access token using refresh token
 */
export function refreshToken(refreshToken) {
  const refreshUrl = `${config.identityApiUrl}/api/v1/auth/refresh`;

  const payload = JSON.stringify({
    refreshToken: refreshToken,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'token_refresh' },
  };

  const response = http.post(refreshUrl, payload, params);

  const success = check(response, {
    'refresh status is 200': (r) => r.status === 200,
    'refresh returns new access token': (r) => r.json('accessToken') !== undefined,
    'refresh returns new refresh token': (r) => r.json('refreshToken') !== undefined,
  });

  if (!success) {
    console.error(`Token refresh failed: ${response.status} ${response.body}`);
    return null;
  }

  return {
    accessToken: response.json('accessToken'),
    refreshToken: response.json('refreshToken'),
    expiresIn: response.json('expiresIn') || 900,
  };
}

/**
 * Register a new user (for setup)
 */
export function register(email, password, firstName, lastName) {
  const registerUrl = `${config.identityApiUrl}/api/v1/auth/register`;

  const payload = JSON.stringify({
    email: email,
    password: password,
    firstName: firstName,
    lastName: lastName,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'register' },
  };

  const response = http.post(registerUrl, payload, params);

  const success = check(response, {
    'register status is 201': (r) => r.status === 201,
  });

  return success;
}

/**
 * Get authorization headers with Bearer token
 */
export function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
}

/**
 * Logout (revoke refresh token)
 */
export function logout(accessToken, refreshToken) {
  const logoutUrl = `${config.identityApiUrl}/api/v1/auth/logout`;

  const payload = JSON.stringify({
    refreshToken: refreshToken,
  });

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'logout' },
  };

  const response = http.post(logoutUrl, payload, params);

  return check(response, {
    'logout status is 200': (r) => r.status === 200,
  });
}

/**
 * Logout from all devices (revoke all tokens)
 */
export function logoutAll(accessToken) {
  const logoutAllUrl = `${config.identityApiUrl}/api/v1/auth/logout-all`;

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'logout_all' },
  };

  const response = http.post(logoutAllUrl, null, params);

  return check(response, {
    'logout-all status is 200': (r) => r.status === 200,
  });
}

/**
 * Get active sessions
 */
export function getSessions(accessToken) {
  const sessionsUrl = `${config.identityApiUrl}/api/v1/auth/sessions`;

  const params = {
    headers: authHeaders(accessToken),
    tags: { name: 'get_sessions' },
  };

  const response = http.get(sessionsUrl, params);

  const success = check(response, {
    'get sessions status is 200': (r) => r.status === 200,
    'sessions is array': (r) => Array.isArray(r.json()),
  });

  if (!success) {
    return [];
  }

  return response.json();
}

export default {
  login,
  refreshToken,
  register,
  authHeaders,
  logout,
  logoutAll,
  getSessions,
};
