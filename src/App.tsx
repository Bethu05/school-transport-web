import type {
  ReactNode,
} from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import {
  AppShell,
} from './app/AppShell';

import {
  LoginPage,
} from './auth/LoginPage';

import {
  ProtectedRoute,
} from './auth/ProtectedRoute';

import {
  DashboardPage,
} from './dashboard/DashboardPage';

import {
  DriversPage,
} from './drivers/DriversPage';

import {
  HomePage,
} from './home/HomePage';

import {
  IncidentsPage,
} from './incidents/IncidentsPage';

import {
  NotificationsPage,
} from './notifications/NotificationsPage';

import {
  RoutesPage,
} from './routes/RoutesPage';

import {
  TripsPage,
} from './trips/TripsPage';

import {
  StopsPage,
} from './stops/StopsPage';

import {
  StudentsPage,
} from './students/StudentsPage';

import {
  GuardiansPage,
} from './guardians/GuardiansPage';

import {
  VehiclesPage,
} from './vehicles/VehiclesPage';

import {
  TrackingPage,
} from './tracking/TrackingPage';

function ProtectedPage({
  children,
}: {
  children:
  ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppShell>
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}

function PlaceholderPage({
  title,
}: {
  title: string;
}) {
  return (
    <div>
      <h1>
        {title}
      </h1>

      <p>
        This module will be connected next.
      </p>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* ======================================================
          PUBLIC
          ====================================================== */}

      <Route
        path="/"
        element={
          <HomePage />
        }
      />

      <Route
        path="/login"
        element={
          <LoginPage />
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
        path="/settings"
        element={
          <ProtectedPage>
            <PlaceholderPage
              title="Settings"
            />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          UNKNOWN ROUTES
          ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;