// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api'; // default export from your api.js

/**
 * ProtectedRoute
 * - allowedRoles: array of roles e.g. ['admin'] or ['student']
 * - children: component to render when allowed
 *
 * Behavior:
 * - if no token -> redirect to /login
 * - if token but user role not in allowedRoles -> redirect to /login
 * - admin always allowed when 'admin' included in allowedRoles or when allowedRoles is omitted.
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const token = api.getAuthToken ? api.getAuthToken() : null;
  const user = api.getAuthUser ? api.getAuthUser() : null;

  if (!token || !user) {
    // not logged in
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles empty -> require only authentication
  if (allowedRoles.length === 0) return children;

  // normalize role in user object (some tokens store role string)
  const role = (user.role || user || '').toString();

  // allow if role included
  if (allowedRoles.includes(role)) return children;

  // admin always allowed if 'admin' in allowedRoles OR if user.role === 'admin' and allowedRoles doesn't exclude?
  // We'll allow admin if it exists in user.role even if not explicitly included, to keep admin omnipotent.
  if (role === 'admin') return children;

  // otherwise forbidden -> redirect
  return <Navigate to="/login" replace />;
}
