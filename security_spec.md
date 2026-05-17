# Security Specification - Smile Ezee Dentistry

## Data Invariants
1. Appointments can be created by any user (public booking).
2. Patients cannot read other patients' appointments.
3. Clinical staff (Admins) can read and manage all appointments.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **The Ghost Field**: Creating an appointment with `isAdmin: true`.
2. **The Price Hijack**: Setting `billAmount: 0` during booking.
3. **The Identity Spoof**: Setting `phone` or `name` of another person.
4. **The Time Warp**: Setting `createdAt` to a future date.
5. **The Orphan Write**: Creating sub-data without a parent reference (N/A here).
6. **The Mass Scraping**: Reading all documents as an unauthenticated user.
7. **The Status Jump**: Moving a `pending` appointment to `completed` from client side (Patient).
8. **The PII Leak**: Accessing the `appointments` collection without owner-rights.
9. **The Gigantism**: Injecting 1MB of text into the `issue` field.
10. **The ID Injection**: Using a 1MB string as a document ID.
11. **The Shadow Update**: Adding unvalidated fields to an existing appointment.
12. **The Service Poisoning**: Using an invalid `type` or `slot`.

## Test Plan
- Verify `create` allows valid shapes but blocks "Ghost Fields".
- Verify `list` is restricted to authenticated staff (once Auth is set up).
- Verify `update` is restricted to authenticated staff.
