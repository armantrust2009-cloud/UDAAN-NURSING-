import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/pages/DashboardLayout";
import DashboardHome from "@/pages/DashboardHome";
import StudentsPage from "@/pages/StudentsPage";
import FacultyPage from "@/pages/FacultyPage";
import CoursesPage from "@/pages/CoursesPage";
import FeesPage from "@/pages/FeesPage";
import AttendancePage from "@/pages/AttendancePage";
import LibraryPage from "@/pages/LibraryPage";
import InquiriesPage from "@/pages/InquiriesPage";
import SyllabusPage from "@/pages/SyllabusPage";
import ProfilePage from "@/pages/ProfilePage";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9]">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9]">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardHome />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="faculty" element={<FacultyPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="fees" element={<FeesPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="inquiries" element={<InquiriesPage />} />
              <Route path="syllabus" element={<SyllabusPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
