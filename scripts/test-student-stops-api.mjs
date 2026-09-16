const apiUrl = (process.env.VITE_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const email = process.env.VITE_DEV_ADMIN_EMAIL;

const password = process.env.VITE_DEV_PASSWORD;

const tenantId = process.env.VITE_DEV_TENANT_ID;

const checkpointId = Date.now();

function required(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

required("VITE_DEV_ADMIN_EMAIL", email);

required("VITE_DEV_PASSWORD", password);

required("VITE_DEV_TENANT_ID", tenantId);

async function readJson(response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}\n${text}`);
  }

  return text ? JSON.parse(text) : undefined;
}

console.log("Student Stops API checkpoint");

console.log("----------------------------");

/**
 * ========================================================
 * LOGIN
 * ========================================================
 */
const loginResponse = await fetch(`${apiUrl}/auth/login`, {
  method: "POST",

  headers: {
    Accept: "application/json",

    "Content-Type": "application/json",
  },

  body: JSON.stringify({
    email,
    password,
  }),
});

const login = await readJson(loginResponse);

const token = login?.accessToken;

required("accessToken", token);

console.log("✓ administrator login");

const baseHeaders = {
  Authorization: `Bearer ${token}`,

  "x-tenant-id": tenantId,

  Accept: "application/json",
};

const jsonHeaders = {
  ...baseHeaders,

  "Content-Type": "application/json",
};

/**
 * ========================================================
 * LOAD ACTIVE SCHOOL
 * ========================================================
 */
const schoolsResponse = await fetch(`${apiUrl}/schools`, {
  headers: baseHeaders,
});

const schools = await readJson(schoolsResponse);

if (!Array.isArray(schools) || schools.length === 0) {
  throw new Error("No active school available");
}

const school = schools[0];

console.log("✓ active school loaded");

/**
 * ========================================================
 * LOAD ACTIVE STOPS
 * ========================================================
 */
const stopsResponse = await fetch(`${apiUrl}/stops?page=1&limit=100`, {
  headers: baseHeaders,
});

const stopsResult = await readJson(stopsResponse);

const stops = Array.isArray(stopsResult) ? stopsResult : stopsResult?.items;

if (!Array.isArray(stops)) {
  throw new Error("Stops response is invalid");
}

/**
 * Student stop assignment requires:
 * - active Stop
 * - same school as Student
 */
const eligibleStops = stops.filter(
  (stop) => stop.status === "active" && stop.schoolId === school.id,
);

if (eligibleStops.length < 1) {
  throw new Error(
    "At least one active Stop belonging to the checkpoint school is required",
  );
}

const pickupStop = eligibleStops[0];

/**
 * If only one stop exists we deliberately reuse it for
 * drop-off. The relationship model allows independent
 * pickup/drop-off assignment types.
 */
const dropoffStop = eligibleStops[1] ?? pickupStop;

console.log("✓ eligible stops loaded");

/**
 * ========================================================
 * CREATE ACTIVE CHECKPOINT STUDENT
 * ========================================================
 */
const externalRef = `WEB-STUDENT-STOPS-${checkpointId}`;

const createStudentResponse = await fetch(`${apiUrl}/students`, {
  method: "POST",

  headers: jsonHeaders,

  body: JSON.stringify({
    schoolId: school.id,

    externalRef,

    firstName: "Stops",

    lastName: "Checkpoint",

    grade: "Grade 4",
  }),
});

const student = await readJson(createStudentResponse);

if (!student || student.status !== "active") {
  throw new Error("Active checkpoint Student could not be created");
}

console.log("✓ checkpoint student created");

/**
 * ========================================================
 * INITIAL STATE
 * ========================================================
 */
async function loadAssignments() {
  const response = await fetch(`${apiUrl}/students/${student.id}/stops`, {
    headers: baseHeaders,
  });

  return readJson(response);
}

let assignments = await loadAssignments();

if (assignments.pickup !== null || assignments.dropoff !== null) {
  throw new Error("New Student should not already have stop assignments");
}

console.log("✓ initial stop assignments empty");

/**
 * ========================================================
 * SET PICKUP
 * ========================================================
 */
const pickupResponse = await fetch(
  `${apiUrl}/students/${student.id}/stops/pickup`,
  {
    method: "PUT",

    headers: jsonHeaders,

    body: JSON.stringify({
      stopId: pickupStop.id,
    }),
  },
);

await readJson(pickupResponse);

assignments = await loadAssignments();

if (assignments.pickup?.stopId !== pickupStop.id) {
  throw new Error("Pickup Stop assignment was not persisted");
}

console.log("✓ pickup stop assigned");

/**
 * ========================================================
 * SET DROP-OFF
 * ========================================================
 */
const dropoffResponse = await fetch(
  `${apiUrl}/students/${student.id}/stops/dropoff`,
  {
    method: "PUT",

    headers: jsonHeaders,

    body: JSON.stringify({
      stopId: dropoffStop.id,
    }),
  },
);

await readJson(dropoffResponse);

assignments = await loadAssignments();

if (assignments.dropoff?.stopId !== dropoffStop.id) {
  throw new Error("Drop-off Stop assignment was not persisted");
}

console.log("✓ drop-off stop assigned");

/**
 * ========================================================
 * VERIFY BOTH RELATIONSHIPS
 * ========================================================
 */
if (assignments.studentId !== student.id) {
  throw new Error("Student stop response belongs to another Student");
}

if (assignments.schoolId !== school.id) {
  throw new Error("Student stop response belongs to another school");
}

console.log("✓ stop assignments verified");

/**
 * ========================================================
 * CLEAR PICKUP
 * ========================================================
 */
const clearPickupResponse = await fetch(
  `${apiUrl}/students/${student.id}/stops/pickup`,
  {
    method: "DELETE",

    headers: baseHeaders,
  },
);

if (!clearPickupResponse.ok) {
  throw new Error(`Could not clear pickup Stop: ${clearPickupResponse.status}`);
}

assignments = await loadAssignments();

if (assignments.pickup !== null) {
  throw new Error("Pickup Stop assignment was not cleared");
}

console.log("✓ pickup stop cleared");

/**
 * ========================================================
 * CLEAR DROP-OFF
 * ========================================================
 */
const clearDropoffResponse = await fetch(
  `${apiUrl}/students/${student.id}/stops/dropoff`,
  {
    method: "DELETE",

    headers: baseHeaders,
  },
);

if (!clearDropoffResponse.ok) {
  throw new Error(
    `Could not clear drop-off Stop: ${clearDropoffResponse.status}`,
  );
}

assignments = await loadAssignments();

if (assignments.dropoff !== null) {
  throw new Error("Drop-off Stop assignment was not cleared");
}

console.log("✓ drop-off stop cleared");

/**
 * ========================================================
 * DEACTIVATE STUDENT
 * ========================================================
 */
const deactivateResponse = await fetch(
  `${apiUrl}/students/${student.id}/deactivate`,
  {
    method: "POST",

    headers: baseHeaders,
  },
);

const deactivated = await readJson(deactivateResponse);

if (deactivated.status !== "inactive") {
  throw new Error("Checkpoint Student was not deactivated");
}

console.log("✓ checkpoint student deactivated");

console.log();

console.log("Student Stops API checkpoint PASSED");
