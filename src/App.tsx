import { useEffect, type ReactNode } from "react";

import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { AppShell } from "./app/AppShell";

import { AccountStatusPage } from "./account-status/AccountStatusPage";

import { LoginPage } from "./auth/LoginPage";

import { useAuth } from "./auth/AuthProvider";

import { PasswordChangeBoundary } from "./auth/PasswordChangeBoundary";

import { PlatformRoute } from "./auth/PlatformRoute";

import { ProtectedRoute } from "./auth/ProtectedRoute";

import { DashboardPage } from "./dashboard/DashboardPage";

import { SuperAdminPage } from "./super-admin/SuperAdminPage";

import { DriversPage } from "./drivers/DriversPage";

import { HomePage } from "./home/HomePage";

import { IncidentsPage } from "./incidents/IncidentsPage";

import { NotificationsPage } from "./notifications/NotificationsPage";

import { RoutesPage } from "./routes/RoutesPage";

import { TripsPage } from "./trips/TripsPage";

import { TripSeriesPage } from "./trips/series/TripSeriesPage";

import { StopsPage } from "./stops/StopsPage";

import { StudentsPage } from "./students/StudentsPage";

import { GuardiansPage } from "./guardians/GuardiansPage";

import { VehiclesPage } from "./vehicles/VehiclesPage";

import { TrackingPage } from "./tracking/TrackingPage";

import { SchoolsPage } from "./schools/SchoolsPage";

import { buildSchoolPath } from "./schools/school-routing";

import { buildTenantPath } from "./tenancy/tenant-routing";

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

/**
 * Canonical Students route.
 *
 * URL slugs are never treated as authorization.
 *
 * The requested school must already exist inside the
 * backend-authorised /auth/schools result before it may become
 * active frontend context.
 */
function SchoolScopedStudentsPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  /**
   * Unknown tenant/school URL.
   *
   * Return to the compatibility entry point rather than allowing
   * an arbitrary slug to become application state.
   */
  if (!routeSchool) {
    return <Navigate to="/students" replace />;
  }

  /**
   * Wait for AuthProvider to synchronise its verified school
   * context before mounting StudentsPage.
   */
  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <StudentsPage key={routeSchool.id} />;
}

/**
 * Temporary backward-compatible /students entry point.
 *
 * One/current school:
 *   immediately redirects to the canonical URL.
 *
 * Multiple schools without a stored selection:
 *   StudentsPage shows the school-context prompt and AppShell
 *   exposes the authorised school selector.
 */
function StudentsEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "students")}
        replace
      />
    );
  }

  return <StudentsPage />;
}

/**
 * Canonical school-scoped Trips route.
 *
 * As with Students, URL slugs only identify requested navigation
 * context. The school must already exist in /auth/schools.
 */
function SchoolScopedTripsPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/trips" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  /**
   * key forces a clean operational screen when switching schools,
   * preventing stale dialogs/resources from the previous school.
   */
  return <TripsPage key={routeSchool.id} />;
}

/**
 * Temporary compatibility entry.
 *
 * Existing bookmarks to /trips continue to work.
 */
function TripsEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "trips")}
        replace
      />
    );
  }

  return <TripsPage />;
}

/**
 * Canonical school-scoped Recurring Trips route.
 */
function SchoolScopedTripSeriesPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/trip-series" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <TripSeriesPage key={routeSchool.id} />;
}

function TripSeriesEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "trip-series")}
        replace
      />
    );
  }

  return <TripSeriesPage />;
}

/**
 * Canonical school-scoped Routes route.
 *
 * URL slugs are navigation context only. The requested school
 * must already exist in backend-authorised /auth/schools.
 */
function SchoolScopedRoutesPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/routes" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <RoutesPage key={routeSchool.id} />;
}

function RoutesEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "routes")}
        replace
      />
    );
  }

  return <RoutesPage />;
}

/**
 * Canonical school-scoped Stops route.
 *
 * The URL identifies navigation context only.
 * The requested school must already exist in /auth/schools.
 */
function SchoolScopedStopsPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/stops" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <StopsPage key={routeSchool.id} />;
}

/**
 * Temporary compatibility entry for existing /stops links.
 */
function StopsEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "stops")}
        replace
      />
    );
  }

  return <StopsPage />;
}

/**
 * Canonical school-scoped Vehicles route.
 *
 * URL slugs provide navigation context only. The requested school
 * must already exist in backend-authorised /auth/schools.
 */
function SchoolScopedVehiclesPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/vehicles" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <VehiclesPage key={routeSchool.id} />;
}

function VehiclesEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "vehicles")}
        replace
      />
    );
  }

  return <VehiclesPage />;
}

/**
 * Canonical school-scoped Drivers route.
 *
 * URL slugs provide navigation context only. The requested school
 * must already exist in backend-authorised /auth/schools.
 */
function SchoolScopedDriversPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/drivers" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <DriversPage key={routeSchool.id} />;
}

function DriversEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "drivers")}
        replace
      />
    );
  }

  return <DriversPage />;
}

/**
 * Canonical school-scoped Incidents route.
 *
 * URL slugs identify navigation context only.
 * The school must already exist in backend-authorised
 * /auth/schools before it may become active context.
 */
function SchoolScopedIncidentsPage() {
  const { tenantSlug, schoolSlug } = useParams();

  const { tenantMembership, schools, activeSchool, selectSchool } = useAuth();

  const routeSchool =
    tenantMembership?.slug === tenantSlug
      ? (schools.find((school) => school.slug === schoolSlug) ?? null)
      : null;

  useEffect(() => {
    if (routeSchool && activeSchool?.id !== routeSchool.id) {
      selectSchool(routeSchool.id);
    }
  }, [activeSchool?.id, routeSchool, selectSchool]);

  if (!tenantMembership || !tenantSlug || !schoolSlug) {
    return null;
  }

  if (!routeSchool) {
    return <Navigate to="/incidents" replace />;
  }

  if (activeSchool?.id !== routeSchool.id) {
    return null;
  }

  return <IncidentsPage key={routeSchool.id} />;
}

/**
 * Temporary compatibility entry for existing /incidents links.
 */
function IncidentsEntryPage() {
  const { tenantMembership, activeSchool, schools } = useAuth();

  const school = activeSchool ?? (schools.length === 1 ? schools[0] : null);

  if (tenantMembership && school) {
    return (
      <Navigate
        to={buildSchoolPath(tenantMembership.slug, school.slug, "incidents")}
        replace
      />
    );
  }

  return <IncidentsPage />;
}

/**
 * Tenant-wide route boundary.
 *
 * tenantSlug is navigation context only. It can never switch the
 * authenticated tenant or manufacture tenant authority.
 */
function TenantScopedPage({ children }: { children: ReactNode }) {
  const { tenantSlug } = useParams();

  const { tenantMembership } = useAuth();

  if (!tenantMembership || !tenantSlug) {
    return null;
  }

  if (tenantMembership.slug !== tenantSlug) {
    return <Navigate to={buildTenantPath(tenantMembership.slug)} replace />;
  }

  return children;
}

/**
 * Backward-compatible entry for old flat tenant routes.
 */
function TenantEntryPage({
  section,
  children,
}: {
  section?: string;
  children: ReactNode;
}) {
  const { tenantMembership } = useAuth();

  if (tenantMembership) {
    return (
      <Navigate to={buildTenantPath(tenantMembership.slug, section)} replace />
    );
  }

  return children;
}

function UnknownRouteRedirect() {
  const {
    authenticated,
    isPlatformUser,
    loading,
    access,
    passwordChangeRequired,
    tenantMembership,
  } = useAuth();

  if (loading) {
    return null;
  }

  if (authenticated && passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  if (isPlatformUser) {
    return <Navigate to="/platform" replace />;
  }

  if (authenticated && access && !access.operational) {
    return <Navigate to="/account-status" replace />;
  }

  if (authenticated) {
    return (
      <Navigate
        to={
          tenantMembership
            ? buildTenantPath(tenantMembership.slug)
            : "/dashboard"
        }
        replace
      />
    );
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
            <PlatformRoute>
              <SuperAdminPage />
            </PlatformRoute>
          </PasswordChangeBoundary>
        }
      />

      {/* ======================================================
          DASHBOARD
          ====================================================== */}

      <Route
        path="/tenant/:tenantSlug"
        element={
          <ProtectedPage>
            <TenantScopedPage>
              <DashboardPage />
            </TenantScopedPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedPage>
            <TenantEntryPage>
              <DashboardPage />
            </TenantEntryPage>
          </ProtectedPage>
        }
      />

      {/* ======================================================
          OPERATIONAL MODULES
          ====================================================== */}

      <Route
        path="/tenant/:tenantSlug/tracking"
        element={
          <ProtectedPage>
            <TenantScopedPage>
              <TrackingPage />
            </TenantScopedPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/tracking"
        element={
          <ProtectedPage>
            <TenantEntryPage section="tracking">
              <TrackingPage />
            </TenantEntryPage>
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL TRIPS MODULE
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/trips"
        element={
          <ProtectedPage>
            <SchoolScopedTripsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedPage>
            <TripsEntryPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          RECURRING TRIPS MODULE
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/trip-series"
        element={
          <ProtectedPage>
            <SchoolScopedTripSeriesPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/trip-series"
        element={
          <ProtectedPage>
            <TripSeriesEntryPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL ROUTES MODULE
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/routes"
        element={
          <ProtectedPage>
            <SchoolScopedRoutesPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/routes"
        element={
          <ProtectedPage>
            <RoutesEntryPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL STOPS MODULE
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/stops"
        element={
          <ProtectedPage>
            <SchoolScopedStopsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/stops"
        element={
          <ProtectedPage>
            <StopsEntryPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL VEHICLES MODULE
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/vehicles"
        element={
          <ProtectedPage>
            <SchoolScopedVehiclesPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedPage>
            <VehiclesEntryPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          REAL DRIVERS MODULE
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/drivers"
        element={
          <ProtectedPage>
            <SchoolScopedDriversPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/drivers"
        element={
          <ProtectedPage>
            <DriversEntryPage />
          </ProtectedPage>
        }
      />

      {/* ======================================================
          FUTURE MODULES
          ====================================================== */}

      <Route
        path="/school/:tenantSlug/:schoolSlug/students"
        element={
          <ProtectedPage>
            <SchoolScopedStudentsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedPage>
            <StudentsEntryPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/tenant/:tenantSlug/guardians"
        element={
          <ProtectedPage>
            <TenantScopedPage>
              <GuardiansPage />
            </TenantScopedPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/guardians"
        element={
          <ProtectedPage>
            <TenantEntryPage section="guardians">
              <GuardiansPage />
            </TenantEntryPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/school/:tenantSlug/:schoolSlug/incidents"
        element={
          <ProtectedPage>
            <SchoolScopedIncidentsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/incidents"
        element={
          <ProtectedPage>
            <IncidentsEntryPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/tenant/:tenantSlug/notifications"
        element={
          <ProtectedPage>
            <TenantScopedPage>
              <NotificationsPage />
            </TenantScopedPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedPage>
            <TenantEntryPage section="notifications">
              <NotificationsPage />
            </TenantEntryPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/tenant/:tenantSlug/schools"
        element={
          <ProtectedPage>
            <TenantScopedPage>
              <SchoolsPage />
            </TenantScopedPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/schools"
        element={
          <ProtectedPage>
            <TenantEntryPage section="schools">
              <SchoolsPage />
            </TenantEntryPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/tenant/:tenantSlug/settings"
        element={
          <ProtectedPage>
            <TenantScopedPage>
              <SettingsPage />
            </TenantScopedPage>
          </ProtectedPage>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedPage>
            <TenantEntryPage section="settings">
              <SettingsPage />
            </TenantEntryPage>
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
        path="/tenant/:tenantSlug/users-access"
        element={
          <PasswordChangeBoundary>
            <ProtectedRoute enforceCommercialAccess={false}>
              <AppShell>
                <TenantScopedPage>
                  <UsersAccessPage />
                </TenantScopedPage>
              </AppShell>
            </ProtectedRoute>
          </PasswordChangeBoundary>
        }
      />

      <Route
        path="/users-access"
        element={
          <PasswordChangeBoundary>
            <ProtectedRoute enforceCommercialAccess={false}>
              <AppShell>
                <TenantEntryPage section="users-access">
                  <UsersAccessPage />
                </TenantEntryPage>
              </AppShell>
            </ProtectedRoute>
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
