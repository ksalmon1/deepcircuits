import axios from 'axios';

/**
 * Shared axios instance for JSON endpoints. Laravel's session auth is used,
 * so the XSRF-TOKEN cookie (set by the framework) authenticates mutations.
 */
export const http = axios.create({
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
  withCredentials: true,
});

export default http;
