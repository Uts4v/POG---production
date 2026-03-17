POG – Proof Of Grind

POG (Proof Of Grind) is a productivity-focused web application designed to help individuals and organizations track, analyze, and optimize work performance using the Pomodoro productivity methodology.
The platform provides a structured clock-in, clock-out, and break management system that allows users to accurately monitor their work sessions and break intervals. When a user starts working, they simply clock in, which activates a timer and records the start time. If a break is needed, the user can initiate a break session, which tracks the duration of the break and logs the exact start and end time. Once the break ends, the work timer automatically resumes.
Based on the total working time and break time, the system calculates a Focus Rate, providing users with a measurable indicator of their productivity. All activities are recorded and presented through an intuitive analytics dashboard that includes professional charts and graphs, allowing users to review their daily, weekly, and monthly productivity patterns.
For organizations, POG includes a powerful admin dashboard that enables managers to monitor employee productivity in real time. Administrators can see whether employees are actively working or currently on break, as well as analyze detailed statistics such as total working hours, break duration, number of breaks, and overall productivity trends across different time periods.
In addition to productivity tracking, POG also includes a Subscription Management System. Users can track subscriptions for tools, software, or services they rely on for work. The platform automatically records subscription expiry dates and sends Telegram notifications starting 7 days before expiration, reminding users daily to renew their services and avoid workflow disruptions.
POG combines time tracking, productivity analytics, employee monitoring, and subscription management into a single streamlined platform designed to help individuals and teams maintain accountability, improve focus, and maximize efficiency.

Future Roadmap for POG – Proof Of Grind

To further enhance the capabilities of POG, several advanced features are planned to expand the platform into a comprehensive productivity and workforce management ecosystem.
1. Location-Based Clock-In System
A location verification feature will be implemented when an employee clocks in. The system will capture the exact geographic location at the moment of clock-in and store it in the database along with a readable location label. This will help administrators verify whether employees have clocked in from the office or another location, increasing accountability and transparency for remote or hybrid teams.
2. Task Management System (Company Package)
A built-in task assignment and tracking system will allow administrators to assign tasks directly to employees. Employees will be able to mark tasks as completed once finished.
 The system will automatically maintain a weekly and monthly task record for each employee, generating structured task summaries that can be used during weekly performance reviews and team meetings.
3. End-to-End Encrypted Team Chat (Company Package)
A secure internal chat system will enable employees to communicate with each other directly inside the platform. The messaging system will use end-to-end encryption, ensuring that conversations remain private and cannot be accessed by administrators or the platform itself.
4. Integrated Focus Music System
POG will introduce an in-built focus music feature that allows users to listen to calming or productivity-enhancing audio while working or studying. This may integrate with Shopify APIs, free music APIs, or personal music accounts, enabling users to customize their listening experience to maintain focus during work sessions.
5. Team Task Visibility (Company Package)
Employees will be able to see which tasks are assigned to other team members through the dashboard. This transparency will improve team coordination, accountability, and collaboration, ensuring everyone understands the team's workload and responsibilities.
6. Quick Notes & Knowledge Widget
A lightweight note-taking widget will be available in the navigation bar, allowing users to quickly write down ideas, reminders, or important information during work sessions. Users will also have access to a full-sized note-taking page for more detailed documentation and organization.
7. AI-Powered Employee Performance Insights (Company Package)
An AI assistant for administrators will provide intelligent insights about employee productivity and performance. Admins will be able to ask questions such as:
“How productive was this employee this week?”


“Who had the highest focus rate this month?”
“Which employees take the most breaks?”
The AI will analyze collected data such as work hours, focus rates, break patterns, and completed tasks to generate clear insights and performance summaries.

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

