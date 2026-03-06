# Tea Break Tracker

This project tracks employee work sessions, breaks, and earns tea points.

## Location-Based Clock-In

A new feature captures the user's geographic location when they clock in. The location is obtained via the browser's `navigator.geolocation` API, reverse‑geocoded using OpenStreetMap's Nominatim service, and stored in the Firestore session document. Administrators can view the clock‑in address and map in the admin dashboard.

### Behavior

- On the employee dashboard, clicking **Clock In** requests location permission.
- If the user denies permission or an error occurs, clock‑in is blocked and a toast message is shown.
- Successfully captured location is saved with the session and displayed in the user UI and admin pages.

### Developer Notes

- New hook: `src/hooks/useLocation.ts` (geolocation + reverse geocoding).
- Session type extended with optional `clockInLocation`.
- Admin component `src/components/admin/AdminLocationView.tsx` renders the address and map.
- Ensure `C:\Users\...\.local\bin` is on your PATH to use the Claude CLI.

