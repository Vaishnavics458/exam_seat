// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api'; // api.getAuthUser / getAuthToken available

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const user = api.getAuthUser();
  const token = api.getAuthToken();

  // not logged in -> redirect to login
  if (!token || !user) return <Navigate to="/login" replace />;

  // if allowedRoles is empty => allow only admin by default? (we'll treat empty as allow any authenticated)
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // redirect to the appropriate dashboard based on role
      if (user.role === 'admin') return <Navigate to="/admin" replace />;
      if (user.role === 'student') return <Navigate to="/student" replace />;
      if (user.role === 'invigilator') return <Navigate to="/invigilator" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
