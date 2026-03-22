import { useState,useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import Interview from "./pages/Interview";
import HomePage from './pages/Home.jsx';
import AuthPage from './pages/Login.jsx';
import InterviewPage from './pages/Interview.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import QuestionManager from './pages/Manage.jsx';
import ProfilePage from './pages/Profile.jsx';
import CreateRoomPage from './pages/CreateRoom.jsx';
import { AuthProvider } from './context/authContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoadingScreen from './components/Loading.jsx';
import api from './utils/api.js';
function App() {
 const [loading, setLoading] = useState(true);
 const [user,setUser]=useState();
   const fetchUser = async () => {
    try {
      const res = await api("get", "me");
      setUser(res.data.user);
    } catch(error) {
      setUser(null);
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);
  if(loading)return <LoadingScreen />
  return (
     <AuthProvider>
   <Routes>
   
    <Route path="/" element={<HomePage user={user} />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/code/:roomID" element={
      <ProtectedRoute>
      <InterviewPage />
      </ProtectedRoute>
      } />
   <Route path="/dashboard" element={<DashboardPage />} />
   <Route path="/manage/:roomID" element={
    <ProtectedRoute>
    <QuestionManager />
   </ProtectedRoute>
    } />
    <Route path="/profile" element={
<ProtectedRoute>
      <ProfilePage />
      </ProtectedRoute>
    
  } />
      <Route path="/create" element={
<ProtectedRoute>
      <CreateRoomPage/>
      </ProtectedRoute>
    
  } />
  
  
    </Routes>
    </AuthProvider>

  )
}

export default App
