import type { ReactNode } from "react";

import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./app/AppShell";

import { AccountStatusPage } from "./account-status/AccountStatusPage";

import { LoginPage } from "./auth/LoginPage";

import { useAuth } from "./auth/AuthProvider";

import { PasswordChangeBoundary } from "./auth/PasswordChangeBoundary";

import { ProtectedRoute } from "./auth/ProtectedRoute";

import { SuperAdminRoute } from "./auth/SuperAdminRoute";

import { DashboardPage } from "./dashboard/DashboardPage";

import { SuperAdminPage } from "./super-admin/SuperAdminPage";

import { DriversPage } from "./drivers/DriversPage";

import { HomePage } from "./home/HomePage";

import { IncidentsPage } from "./incidents/IncidentsPage";

import { NotificationsPage } from "./notifications/NotificationsPage";

import { RoutesPage } from "./routes/RoutesPage";

import { TripsPage } from "./trips/TripsPage";

import { StopsPage } from "./stops/StopsPage";

import { StudentsPage } from "./students/StudentsPage";

import { GuardiansPage } from "./guardians/GuardiansPage";

import { VehiclesPage } from "./vehicles/VehiclesPage";

import { TrackingPage } from "./tracking/TrackingPage";

import { SchoolsPage } from "./schools/SchoolsPage";

import { SettingsPage } from "./settings/SettingsPage";

import { ChangePasswordPage } from "./security/ChangePasswordPage";

import { UsersAccessPage } from "./users/UsersAccessPage";

function ProtectedPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function UnknownRouteRedirect() {
  const {
    authenticated,
    isSuperAdmin,
    loading,
    access,
    passwordChangeRequired,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (authenticated && passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  if (isSuperAdmin) {
    return <Navigate to="/platform" replace />;
  }

  if (authenticated && access && !access.operational) {
    return <Navigate to="/account-status" replace />;
  }

  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      {/* ======================================================
          PUBLIC
          ====================================================== */}

      <Route path="/" element={<HomePage />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/change-password" element={<ChangePasswordPage />} />

      <Route path="/account-status" element={<AccountStatusPage />} />

      {/* ======================================================
          PLATFORM SUPER ADMIN
          ====================================================== */}

      <Route
        path="/platform"
        element={
          <PasswordChangeBoundary>
            <SuperAdminRoute>
              <SuperAdminPage />
            </SuperAdminRoute>
          </PasswordChangeBoundary>
        }
      />

      {/* ======================================================
          DASHBOARD
          ====================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedPage>
            <DashboardPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          OPERATIONAL MODULES
          ====================================================== */}

      <Route
        path="/tracking"
        element={
          <ProtectedPage>
            <TrackingPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL TRIPS MODULE
          ====================================================== */}

      <Route
        path="/trips"
        element={
          <ProtectedPage>
            <TripsPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL ROUTES MODULE
          ====================================================== */}

      <Route
        path="/routes"
        element={
          <ProtectedPage>
            <RoutesPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL STOPS MODULE
          ====================================================== */}

      <Route
        path="/stops"
        element={
          <ProtectedPage>
            <StopsPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL VEHICLES MODULE
          ====================================================== */}

      <Route
        path="/vehicles"
        element={
          <ProtectedPage>
            <VehiclesPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL DRIVERS MODULE
          ====================================================== */}

      <Route
        path="/drivers"
        element={
          <ProtectedPage>
            <DriversPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          FUTURE MODULES
          ====================================================== */}

      <Route
        path="/students"
        element={
          <ProtectedPage>
            <StudentsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/guardians"
        element={
          <ProtectedPage>
            <GuardiansPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/incidents"
        element={
          <ProtectedPage>
            <IncidentsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedPage>
            <NotificationsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/schools"
        element={
          <ProtectedPage>
            <SchoolsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedPage>
            <SettingsPage />
          </ProtectedPage>
        }
      />

      {/*
       * Identity administration deliberately bypasses commercial
       * access gating.
       *
       * Tenant membership + users.read/users.reset_password remain
       * authoritative at the backend.
       */}
      <Route
        path="/users-access"
        element={
          <PasswordChangeBoundary>
            <AppShell>
              <UsersAccessPage />
            </AppShell>
          </PasswordChangeBoundary>
        }
      />

      {/* ======================================================
          UNKNOWN ROUTES
          ====================================================== */}

      <Route path="*" element={<UnknownRouteRedirect />} />
    </Routes>
  );
}

export default App;
