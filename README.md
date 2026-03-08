# Tea Break Tracker

This project tracks employee work sessions, breaks, and earns tea points.

## Location-Based Clock-In

A new feature captures the user's geographic location when they clock in. The location is obtained via the browser's `navigator.geolocation` API, reverse‑geocoded using OpenStreetMap's Nominatim service, and stored in the Firestore session document. Administrators can view the clock‑in address and map in the admin dashboard.

### Behavior

- On the employee dashboard, clicking **Clock In** requests location permission.
- If the user denies permission or an error occurs, clock‑in is blocked and a toast message is shown.
- Successfully captured location is saved with the session and displayed in the user UI and admin pages.

### Admin Features

- **Location Column**: Session history tables now include a location column showing the clock-in address.
- **Individual Employee Maps**: A new "Locations" tab in employee detail view shows an interactive OpenStreetMap with markers for all clock-in locations of that specific employee.
- **Comprehensive Locations Overview**: Main admin dashboard now includes a full-screen "Employee Locations Overview" section showing ALL employee clock-in locations on one interactive map for easy tracking and monitoring.
- **Export with Location**: PDF and CSV exports now include location data in the reports.

### Developer Notes

- New hook: `src/hooks/useLocation.ts` (geolocation + reverse geocoding).
- Session type extended with optional `clockInLocation`.
- Admin component `src/components/admin/AdminLocationView.tsx` renders the address and map for individual sessions.
- Admin component `src/components/admin/EmployeeLocationsMap.tsx` shows interactive map with markers for a single employee.
- Admin component `src/components/admin/AllEmployeesLocationsMap.tsx` shows comprehensive map with all employees' locations.
- Ensure `C:\Users\...\.local\bin` is on your PATH to use the Claude CLI.

