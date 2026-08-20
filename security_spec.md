# Security Specification for ILA

## 1. Data Invariants
- A Monument must have a unique ID (number).
- A Monument must have a city, region, and type.
- Only the administrator (verified email) can create, update, or delete records.
- Records are publicly readable for consultation.

## 2. Invariants
- `id` is a required positive integer.
- `citta` and `regione` must be strings of reasonable length (<= 200 chars).
- `testo` can be long but must be capped at 50,000 chars.
- `traduzioni` array elements must match the `Traduzione` schema.

## 3. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to edit a record without being logged in.
2. **Unverified Auth**: Attempt to edit a record with an unverified email.
3. **Admin Elevation**: Attempt to create an `admins` doc to gain rights.
4. **Data Poisoning**: Inject a 50MB string into the `testo` field.
5. **Type Confusion**: Send `id` as a string instead of a number.
6. **Relational Sync**: Attempt to delete a monument while references to it exist (if any).
7. **Schema Gap**: Update a record with extra fields not in the blueprint.
8. **Terminal State**: (N/A for this app, no status life-cycle)
9. **PII Leak**: (N/A for monuments, but users collection must be guarded).
10. **Query Scraping**: Attempt a blanket list query without filters.
11. **Timestamp Spoofing**: Provide a future date for an update.
12. **Recursive Attack**: Deeply nested translations array.
