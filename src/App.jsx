import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import SurveyHome from './pages/worker/SurveyHome';
import SurveyForm from './pages/worker/SurveyForm';
import AdminDashboard from './pages/admin/AdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Redirect to their default home
  }
  
  return children;
};

const RoleBasedHome = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <SurveyHome />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <RoleBasedHome />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/survey/new" 
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <SurveyForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/survey/edit/:id" 
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <SurveyForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
