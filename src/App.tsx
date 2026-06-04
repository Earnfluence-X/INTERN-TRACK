import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useStore } from './lib/store';
import { Sidebar } from './components/layout/Sidebar';
import { Header, DesktopHeader } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/ui/Toast';
import { OnboardingPage } from './pages/Onboarding';
import { DashboardPage } from './pages/Dashboard';
import { BoardPage } from './pages/Board';
import { CalendarPage } from './pages/Calendar';
import { ContactsPage, ContactDetailPage } from './pages/Contacts';
import { DocumentsPage } from './pages/Documents';
import { InterviewsPage } from './pages/Interviews';
import { AnalyticsPage } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { ApplicationFormPage } from './pages/ApplicationForm';
import { ApplicationDetailPage } from './pages/ApplicationDetail';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <DesktopHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isOnboarded } = useStore();
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function EditApplicationPage() {
  const { id } = useParams<{ id: string }>();
  return <ApplicationFormPage editId={id} />;
}

function AppRoutes() {
  const { isOnboarded } = useStore();

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={isOnboarded ? <Navigate to="/" replace /> : <OnboardingPage />}
      />

      <Route path="/" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />

      <Route path="/board" element={
        <ProtectedRoute><BoardPage /></ProtectedRoute>
      } />

      <Route path="/calendar" element={
        <ProtectedRoute><CalendarPage /></ProtectedRoute>
      } />

      <Route path="/contacts" element={
        <ProtectedRoute><ContactsPage /></ProtectedRoute>
      } />

      <Route path="/contacts/:id" element={
        <ProtectedRoute><ContactDetailPage /></ProtectedRoute>
      } />

      <Route path="/documents" element={
        <ProtectedRoute><DocumentsPage /></ProtectedRoute>
      } />

      <Route path="/interviews" element={
        <ProtectedRoute><InterviewsPage /></ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      } />

      <Route path="/applications/new" element={
        <ProtectedRoute><ApplicationFormPage /></ProtectedRoute>
      } />

      <Route path="/applications/:id" element={
        <ProtectedRoute><ApplicationDetailPage /></ProtectedRoute>
      } />

      <Route path="/applications/:id/edit" element={
        <ProtectedRoute><EditApplicationPage /></ProtectedRoute>
      } />

      <Route path="*" element={
        isOnboarded ? <Navigate to="/" replace /> : <Navigate to="/onboarding" replace />
      } />
    </Routes>
  );
}

export default function App() {
  const { loadUser, refreshAll } = useStore();

  useEffect(() => {
    loadUser();
    refreshAll();
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <AppRoutes />
    </BrowserRouter>
  );
}
