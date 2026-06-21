import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import TicketDetail from "@/pages/TicketDetail";
import CreateTicket from "@/pages/CreateTicket";
import KnowledgeBase from "@/pages/KnowledgeBase";
import KbDetail from "@/pages/KbDetail";
import KbEditor from "@/pages/KbEditor";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";

import "@/App.css";

function Protected({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route path="/dashboard" element={<Protected roles={["admin","technician"]}><Dashboard /></Protected>} />
            <Route path="/tickets" element={<Protected><Tickets /></Protected>} />
            <Route path="/tickets/new" element={<Protected><CreateTicket /></Protected>} />
            <Route path="/tickets/:id" element={<Protected><TicketDetail /></Protected>} />
            <Route path="/kb" element={<Protected><KnowledgeBase /></Protected>} />
            <Route path="/kb/new" element={<Protected roles={["admin","technician"]}><KbEditor /></Protected>} />
            <Route path="/kb/:id" element={<Protected><KbDetail /></Protected>} />
            <Route path="/kb/:id/edit" element={<Protected roles={["admin","technician"]}><KbEditor /></Protected>} />
            <Route path="/users" element={<Protected roles={["admin"]}><UsersPage /></Protected>} />
            <Route path="/settings" element={<Protected roles={["admin"]}><SettingsPage /></Protected>} />

            <Route path="*" element={<Navigate to="/tickets" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
