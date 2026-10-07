import { Routes, Route } from "react-router-dom";
import './App.css'
import { AuthProvider } from './context/authContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import HomePage from './pages/Home.jsx';
import AuthPage from './pages/Login.jsx';
import InterviewPage from './pages/Interview.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import QuestionManager from './pages/Manage.jsx';
import ProfilePage from './pages/Profile.jsx';
import CreateRoomPage from './pages/CreateRoom.jsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/login"   element={<AuthPage initialMode="login" />} />
        <Route path="/signup"  element={<AuthPage initialMode="signup" />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/code/:roomID" element={
          <ProtectedRoute><InterviewPage /></ProtectedRoute>
        } />
        <Route path="/manage/:roomID" element={
          <ProtectedRoute><QuestionManager /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/create"  element={
          <ProtectedRoute><CreateRoomPage /></ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
