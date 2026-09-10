# SmartAttend — Phase 23 Test Checklist

**How to use this file**
- Replace `[ ]` with `[x]` when a test passes, `[!]` when it fails.
- Add notes after each item using `→` where relevant.
- Run against a real device (Android or iOS). Expo Go is not sufficient for WiFi SSID, camera, or face scan tests.

---

## 1. Authentication

### 1.1 Login
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1.1.1 | [ ] Employee ID login | Select org from dropdown → enter valid Employee ID + password → tap AUTHENTICATE | Navigates to employee Dashboard | |
| 1.1.2 | [ ] Admin email login | Toggle to Admin Email → enter valid admin email + password → tap AUTHENTICATE | Navigates to AdminDashboard | |
| 1.1.3 | [ ] Super Admin login | Toggle to Admin Email → enter SUPER_ADMIN email + password | Navigates to SuperAdminDashboard | |
| 1.1.4 | [ ] Wrong password | Enter correct ID, wrong password | Alert: "Login Failed — Invalid ID or Password" | |
| 1.1.5 | [ ] Wrong org | Enter correct ID + password but wrong org | Alert: "Invalid ID or Password for the selected Organization" | |
| 1.1.6 | [ ] Missing org field | Enter Employee ID + password, skip org selection | Alert: "Please select your Organization" | |
| 1.1.7 | [ ] Inactive account | Login with a deactivated user | Alert: "Account is deactivated. Please contact HR." | |
| 1.1.8 | [ ] Expired subscription | Login with a company whose subscription is expired | Alert: "Company subscription expired." | |
| 1.1.9 | [ ] Session persistence | Login → force-close app → reopen | User is still logged in, correct stack shown | |
| 1.1.10 | [ ] Token expiry | Manually set token exp to past in AsyncStorage → reopen app | Redirected to Login screen | |

### 1.2 Logout — AccountScreen
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1.2.1 | [ ] Logout button visible | Navigate to Account tab | Standalone red "Logout" button visible below menu items | |
| 1.2.2 | [ ] Confirmation dialog | Tap Logout button | Alert with title "Are you sure you want to logout?" and buttons Cancel + Logout | |
| 1.2.3 | [ ] Cancel logout | Tap Logout → tap Cancel | Dialog dismisses, user remains logged in, stays on AccountScreen | |
| 1.2.4 | [ ] Confirm logout | Tap Logout → tap Logout (destructive) | AsyncStorage cleared, navigates to Login screen | |

### 1.3 Logout — ProfileScreen
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1.3.1 | [ ] Logout button visible | Navigate to Profile | Red "Logout Session" button visible at bottom | |
| 1.3.2 | [ ] Confirmation dialog | Tap Logout Session | Same Alert: "Are you sure you want to logout?" | |
| 1.3.3 | [ ] Cancel logout | Tap Cancel | Stays on ProfileScreen | |
| 1.3.4 | [ ] Confirm logout | Tap Logout | Navigates to Login screen | |

### 1.4 Logout — AdminDashboardScreen
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1.4.1 | [ ] Logout icon visible | Open AdminDashboard | Logout icon button in top-right header | |
| 1.4.2 | [ ] Confirmation dialog | Tap logout icon | Alert: "Are you sure you want to logout?" | |
| 1.4.3 | [ ] Cancel logout | Tap Cancel | Stays on AdminDashboard | |
| 1.4.4 | [ ] Confirm logout | Tap Logout | Navigates to Login screen | |

---

## 2. Attendance — Core Actions

### 2.1 Punch In (Geo-Location mode)
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.1.1 | [ ] First punch in | Open AttendanceScan → tap Check-In Now | Location acquired → success alert with time, mode, session 1 | |
| 2.1.2 | [ ] Button disabled during request | Tap Check-In Now | Button shows ActivityIndicator, cannot be tapped again until complete | |
| 2.1.3 | [ ] Record created in Firestore | After punch in | Doc `att_{uid}_{date}` exists with status present/late, sessions[0].checkIn set | |
| 2.1.4 | [ ] Status card updates | After punch in | Status card shows "Checked In · Session 1 · Since HH:MM" | |
| 2.1.5 | [ ] Late detection | Punch in after grace period | isLate=true, lateMinutes > 0, status='late', late warning shown | |

### 2.2 Punch Out (Geo-Location mode)
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.2.1 | [ ] Punch out | After punch in → tap Check-Out Now | Success alert with session hours and total work hours | |
| 2.2.2 | [ ] Button disabled during request | Tap Check-Out Now | Button shows ActivityIndicator, cannot be tapped again | |
| 2.2.3 | [ ] Record updated in Firestore | After punch out | sessions[0].checkOut set, workHours calculated, status updated | |
| 2.2.4 | [ ] Cannot punch out without punch in | Fresh day → tap Check-Out | Alert: "No Active Session — Please check-in first" | |
| 2.2.5 | [ ] sessionHours correct | Punch in at 09:00, out at 10:30 | sessionHours = 1.50 | |

### 2.3 Multiple Sessions
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.3.1 | [ ] Second punch in | After first session complete → tap Start New Session | New session appended, sessions.length = 2 | |
| 2.3.2 | [ ] Previous sessions retained | After second punch in | Session 1 row still visible with correct in/out times | |
| 2.3.3 | [ ] Cannot double punch in | During active session → tap Check-In | Alert: "Active Session — Please check-out first" | |
| 2.3.4 | [ ] Total work hours | Two sessions of 1h each | workHours = 2.00 after second checkout | |
| 2.3.5 | [ ] Session list display | Completed card | All sessions listed with in/out times and individual hours | |

### 2.4 Working Hours Calculation
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.4.1 | [ ] Full day status | Work ≥ fullDayHours (9h) | status = 'present' | |
| 2.4.2 | [ ] Half day status | Work between halfDayHours (4.5h) and fullDayHours | status = 'half_day' | |
| 2.4.3 | [ ] Late + full hours | Punch in late, work ≥ fullDayHours | status = 'late' | |
| 2.4.4 | [ ] Late + short hours | Punch in late, work < fullDayHours | status = 'half_day' | |
| 2.4.5 | [ ] Multi-session total | Sessions summed, not recalculated from first-in to last-out | workHours = sum of sessionHours | |

### 2.5 Break Management
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.5.1 | [ ] Break card hidden when not checked in | Open AttendanceScan, no active session | Break card not visible | |
| 2.5.2 | [ ] Break card visible when checked in | After punch in | Break card visible with "Start Break" button | |
| 2.5.3 | [ ] Start break | Tap Start Break | Alert: "Break Started ☕ at HH:MM", break row appears | |
| 2.5.4 | [ ] Break button disabled during request | Tap Start Break | Button disabled until Firestore write completes | |
| 2.5.5 | [ ] End break | Tap End Break | Alert: "Break Ended ✅ — duration: X min" | |
| 2.5.6 | [ ] Cannot start break without session | No active session | Alert: "Not Checked In" | |
| 2.5.7 | [ ] Cannot double-start break | Break already active → tap Start Break | Alert: "Break Active — End it first" | |
| 2.5.8 | [ ] Multiple breaks | End break → start second break | Second break allowed up to maxBreakCount | |
| 2.5.9 | [ ] Break limit by count | Exceed maxBreakCount | Alert: "Break Limit Reached — Maximum X break(s) allowed" | |
| 2.5.10 | [ ] Break limit by minutes | Exceed maxBreakMinutes | Alert: "Break Limit Reached — You have used all X minutes" | |
| 2.5.11 | [ ] Break disabled by config | Set breakEnabled=false in office_settings | Break card not shown at all | |

### 2.6 Dynamic Configuration
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.6.1 | [ ] Grace period respected | Change gracePeriodMinutes in Firestore → punch in just inside grace | Not marked late | |
| 2.6.2 | [ ] Office start time respected | Change officeStartTime → punch in after new time + grace | Marked late | |
| 2.6.3 | [ ] Config loads on focus | Change config in Firestore → navigate away and back | New config applied on next punch | |

---

## 3. Location

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 3.1 | [ ] Permission allowed | Grant location permission → punch in | GPS acquired, locationData stored in session | |
| 3.2 | [ ] Permission denied | Deny location permission → punch in (geo-fence enabled) | Alert: "Location permission is required..." | |
| 3.3 | [ ] Inside allowed area | Geo-fence enabled, device inside radius → punch in | Attendance marked successfully | |
| 3.4 | [ ] Outside allowed area | Geo-fence enabled, device outside radius → punch in | Alert: "You are Xm away from office..." | |
| 3.5 | [ ] GPS disabled | Turn off device location services → punch in (geo-fence enabled) | Alert: "GPS is disabled. Please turn on Location Services." | |
| 3.6 | [ ] GPS timeout | Simulate slow GPS (move indoors) → punch in | Alert: "Location request timed out. Please move to an open area." | |
| 3.7 | [ ] Geo-fence disabled | Set geoFencing.enabled=false → punch in from any location | Attendance marked, locationData still captured for audit | |
| 3.8 | [ ] WFH skips geo-fence | Open AttendanceScan with isWFH=true → punch in from outside office | Geo-fence not checked, GPS still captured | |
| 3.9 | [ ] Location stored in record | After punch in | sessions[0].location has latitude, longitude, accuracy, timestamp | |

---

## 4. Face Recognition

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 4.1 | [ ] Face scan screen opens | Face recognition enabled → tap Check-In | RealTimeFaceScanScreen opens as full-screen modal | |
| 4.2 | [ ] START button disabled during processing | Tap START PUNCH IN while processing | Button has disabled=true, cannot trigger second request | |
| 4.3 | [ ] PUNCH button disabled during processing | Tap PUNCH IN while processing | Button has disabled=true, if(processing) return guard active | |
| 4.4 | [ ] Valid face verification | Registered face → tap PUNCH IN | Face verified → attendance marked → Alert: "Attendance Marked ✅" | |
| 4.5 | [ ] Failed face verification | Wrong face / low match score | Alert: "Verification Failed — Face does not match the registered profile" | |
| 4.6 | [ ] Face API unavailable | Backend down → tap PUNCH IN | Alert: "Verification Failed — Face verification service is unavailable" | |
| 4.7 | [ ] Camera permission denied | Deny camera → open face scan screen | Permission screen shown with "Grant Permission" button | |
| 4.8 | [ ] Camera not ready | Tap PUNCH IN before camera initialises | Button only shown after cameraReady=true | |
| 4.9 | [ ] Cancel face scan | Tap X / back → return to AttendanceScan | loading state cleared, Check-In button re-enabled | |
| 4.10 | [ ] faceVerified field | After face scan punch in | faceVerified=true stored in attendance record | |
| 4.11 | [ ] Multi-session work hours via face scan | Two sessions via face scan → checkout | workHours = sum of sessionHours, not raw first-in to last-out diff | |

---

## 5. WiFi Validation

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 5.1 | [ ] Correct WiFi | wifiRestrictionEnabled=true, connected to allowed SSID → punch in | WiFi validated, attendance proceeds | |
| 5.2 | [ ] Wrong WiFi | Connected to non-allowed SSID → punch in | Alert: "WiFi Validation Failed — You are connected to X which is not authorised" | |
| 5.3 | [ ] Not on WiFi | Mobile data only → punch in | Alert: "You must be connected to an approved WiFi network" | |
| 5.4 | [ ] WiFi restriction disabled | wifiRestrictionEnabled=false → punch in from any network | WiFi check skipped entirely | |
| 5.5 | [ ] SSID unreadable — fail open | Location permission denied on Android → punch in | Attendance allowed (fail-open), logged as unverified | |
| 5.6 | [ ] SSID unreadable — location services off | Location services off on Android → punch in | Attendance allowed (fail-open), logged as unverified | |
| 5.7 | [ ] WFH skips WiFi | isWFH=true → punch in | WiFi check skipped entirely | |
| 5.8 | [ ] BSSID matching | Allowed network has bssid configured, connected to correct AP | Matched by SSID + BSSID | |
| 5.9 | [ ] BSSID mismatch (rogue AP) | Same SSID, different BSSID → punch in | Blocked: "not an authorised office network" | |

---

## 6. Photo Capture and Upload

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 6.1 | [ ] Photo captured on punch in | Camera permission granted → punch in | Camera opens silently, photo captured | |
| 6.2 | [ ] Photo captured on punch out | Punch out | Camera opens silently, photo captured | |
| 6.3 | [ ] Upload to Firebase Storage | After punch in/out | Photo URL stored in sessions[n].checkInPhotoUrl or checkOutPhotoUrl | |
| 6.4 | [ ] Storage path format | Inspect stored URL | Path: `attendance_photos/{companyId}/{userId}/{date}/{sessionIndex}_{action}.jpg` | |
| 6.5 | [ ] Attendance record maps photo | After upload | sessions[n].checkInPhotoUrl / checkOutPhotoUrl contains valid URL | |
| 6.6 | [ ] Upload failure is non-fatal | Simulate upload failure (bad network) | Attendance still marked, console.warn logged, no user-facing error | |
| 6.7 | [ ] Camera permission denied | Deny camera permission → punch in (non-face mode) | captureAttendancePhoto returns null, attendance proceeds without photo | |
| 6.8 | [ ] User declines camera | Cancel camera dialog → punch in | Photo is null, attendance proceeds | |
| 6.9 | [ ] Session index in path | Second session punch in | Path uses sessionIndex=1, not 0 | |

---

## 7. WFH Mode

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 7.1 | [ ] WFH punch in | Navigate to AttendanceScan with isWFH=true → punch in | attendanceMode='WFH' stored, geo-fence and WiFi skipped | |
| 7.2 | [ ] WFH punch out | After WFH punch in → punch out | checkOut recorded, workHours calculated correctly | |
| 7.3 | [ ] WFH GPS still captured | WFH punch in | locationData captured for audit (GPS not blocked) | |
| 7.4 | [ ] WFH face scan still required | Face recognition enabled + WFH → punch in | RealTimeFaceScanScreen opens, face verified before marking | |
| 7.5 | [ ] WFH header label | AttendanceScan opened in WFH mode | Header shows "WFH Attendance" and "Work From Home Mode" | |
| 7.6 | [ ] WFH in history | After WFH punch in/out → open AttendanceHistory | Record shows attendanceMode='WFH' | |
| 7.7 | [ ] WFH in admin work report | Admin opens AdminWorkReportScreen | WFH records included, attendanceMode displayed | |
| 7.8 | [ ] WFH in PDF report | Generate employee PDF | WFH days counted separately, mode column shows 🏠 WFH | |

---

## 8. Reports

### 8.1 Employee — AttendanceHistoryScreen
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.1.1 | [ ] History loads on focus | Navigate to AttendanceHistory | Records load, focus listener fires on every visit | |
| 8.1.2 | [ ] Present count includes late | Employee has late records | present stat includes late records | |
| 8.1.3 | [ ] halfDay separate from late | Employee has half_day records | halfDay stat separate from late stat | |
| 8.1.4 | [ ] Correct sessions shown | Tap a record with 2 sessions | Both sessions displayed with in/out times | |
| 8.1.5 | [ ] Correct work hours | Record with 2 sessions | workHours = sum of sessionHours | |

### 8.2 Admin — AdminWorkReportScreen
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.2.1 | [ ] Report loads | Admin opens AdminWorkReport | Employee list loads for selected date/month | |
| 8.2.2 | [ ] Present count includes late | Employee with all-late records | present count > 0 | |
| 8.2.3 | [ ] No duplicate load | Navigate to screen | Data loads once, not twice (no duplicate useEffect + focus listener) | |
| 8.2.4 | [ ] Date change reloads | Change selected date | Data reloads for new date | |
| 8.2.5 | [ ] Error alert on failure | Simulate network failure | Alert: "Connection Error — Could not load report data" | |

### 8.3 Admin — AdminEmployeeHistoryScreen
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.3.1 | [ ] Stats card shows 5 columns | Open employee history | Present, Late, Half Day, Absent, Total columns visible | |
| 8.3.2 | [ ] Present includes late | Employee with late records | present count includes late | |
| 8.3.3 | [ ] halfDay separate | Employee with half_day records | halfDay column separate from late | |
| 8.3.4 | [ ] Correct employee data | Open history for specific employee | Only that employee's records shown | |

### 8.4 PDF Generation
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.4.1 | [ ] Employee PDF | Trigger generateAndSharePdf with employee HTML | PDF generated, share sheet opens | |
| 8.4.2 | [ ] Admin PDF | Trigger generateAndSharePdf with admin HTML | PDF generated, share sheet opens | |
| 8.4.3 | [ ] Correct sessions in PDF | Employee with 2 sessions | Both sessions listed in PDF rows | |
| 8.4.4 | [ ] Correct work hours in PDF | Employee with multi-session day | workHours = sum of sessionHours, not raw diff | |
| 8.4.5 | [ ] Correct status counts | Employee with mixed statuses | Present/Late/HalfDay/Absent counts match screen stats | |
| 8.4.6 | [ ] WFH days in PDF | Employee with WFH records | WFH days counted, mode column shows 🏠 WFH | |
| 8.4.7 | [ ] Sharing unavailable | Simulate Sharing.isAvailableAsync=false | Returns { ok: false, error: 'Sharing is not available on this device.' } | |

### 8.5 Super Admin
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.5.1 | [ ] SuperAdmin dashboard loads | Login as SUPER_ADMIN | SuperAdminDashboard shown, company list visible | |
| 8.5.2 | [ ] Company details | Tap a company | SuperAdminCompanyDetailsScreen opens with correct data | |
| 8.5.3 | [ ] Attendance config | Open SuperAdminAttendanceConfig | Config fields editable and saved to Firestore | |

---

## 9. Firebase Data Integrity

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 9.1 | [ ] Authorized read | Logged-in user reads own attendance | Data returned correctly | |
| 9.2 | [ ] Cross-tenant read blocked | User A reads attendance with User B's companyId | where() filters by companyId, only own company data returned | |
| 9.3 | [ ] Authorized write | User writes own attendance record | writeAttendanceRecord succeeds | |
| 9.4 | [ ] Write blocked — wrong userId | Attempt to write record with different userId | writeAttendanceRecord throws "Unauthorized: cannot write attendance for another user" | |
| 9.5 | [ ] Write blocked — wrong companyId | Attempt to write record with different companyId | writeAttendanceRecord throws "Unauthorized: company mismatch" | |
| 9.6 | [ ] Write blocked — wrong docId | Attempt to write to another user's doc ID | writeAttendanceRecord throws "Unauthorized: document ownership mismatch" | |
| 9.7 | [ ] Deterministic doc ID | Punch in | Doc ID = `att_{uid}_{YYYY-MM-DD}` | |
| 9.8 | [ ] No duplicate records | Tap Check-In rapidly multiple times | Only one record created, subsequent taps blocked by loading guard | |
| 9.9 | [ ] No duplicate records — face scan | Tap PUNCH IN rapidly | processing guard prevents second handleCapture call | |
| 9.10 | [ ] Correct data mapping | Inspect Firestore doc after punch in/out | All fields present: userId, companyId, date, sessions, workHours, status, attendanceMode, updatedAt | |
| 9.11 | [ ] where() error returns error field | Simulate Firestore query failure | Returns { docs: [], error: message } — no unhandled throw | |
| 9.12 | [ ] Legacy doc fallback | Record with non-standard doc ID | getTodayAttendanceDoc falls back to where() query | |

---

## 10. UI — Employee Screens

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 10.1 | [ ] AdminEmployeesScreen — no overflow | Open employee list with long names | Employee name and ID truncate cleanly, no layout overflow | |
| 10.2 | [ ] AdminEmployeeDetailScreen — no overflow | Open employee detail with long values | infoValue wraps or truncates, password text numberOfLines=1 | |
| 10.3 | [ ] AccountScreen logout button | Open Account tab | Standalone red Logout button below menu items, not inside menu array | |
| 10.4 | [ ] PersonalDetailsScreen label | Open Personal Details | Field label reads "Employee Name" not "All Staff" or "Staff Name" | |
| 10.5 | [ ] AdminEmployeeHistoryScreen — 5 stat columns | Open employee history | Present, Late, Half Day, Absent, Total — all 5 visible without overflow | |
| 10.6 | [ ] AccountScreen Work Report nav | Tap Work Report menu item | Navigates to AttendanceHistory screen | |
| 10.7 | [ ] DashboardScreen no duplicate load | Navigate to Dashboard | loadTodayAttendance fires once via useFocusEffect, not twice | |
| 10.8 | [ ] AttendanceScanScreen no duplicate load | Navigate to AttendanceScan | loadData fires once via focus listener, not twice | |

---

## 11. Error Handling

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 11.1 | [ ] AttendanceScanScreen load failure | Kill network → open AttendanceScan | Alert: "Connection Error — Could not load attendance data" | |
| 11.2 | [ ] Punch in write failure | Kill network after location acquired → punch in | Alert: "Error — Failed to mark check-in. Please try again." | |
| 11.3 | [ ] Punch out write failure | Kill network after location acquired → punch out | Alert: "Error — Failed to mark check-out. Please try again." | |
| 11.4 | [ ] Break start failure | Kill network → start break | Alert: "Error — Failed to start break." | |
| 11.5 | [ ] Break end failure | Kill network → end break | Alert: "Error — Failed to end break." | |
| 11.6 | [ ] AdminAttendanceScreen load failure | Kill network → open AdminAttendance | Alert: "Connection Error" shown | |
| 11.7 | [ ] AdminWorkReportScreen load failure | Kill network → open AdminWorkReport | Alert: "Connection Error — Could not load report data" | |
| 11.8 | [ ] AdminDashboardScreen load failure | Kill network → open AdminDashboard | Alert: "Connection Error — Could not load dashboard data. Pull down to refresh." | |
| 11.9 | [ ] Face verification failure alert | Backend returns isMatch=false | Alert: "Verification Failed — Face does not match..." | |
| 11.10 | [ ] No silent catch blocks | Review all catch blocks | Every catch either shows Alert.alert or is intentionally silent (dashboard load) | |

---

## 12. Timestamp and Date Consistency (Phase 22)

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 12.1 | [ ] Stored timestamp is ISO UTC | Inspect Firestore after punch in | checkIn, checkOut, sessions[n].checkIn are ISO 8601 UTC strings | |
| 12.2 | [ ] Displayed time is local | View attendance details | checkInTime, checkOutTime display in local 12h format (HH:MM AM/PM) | |
| 12.3 | [ ] Date field is local date | Inspect Firestore doc | date field = YYYY-MM-DD in device local timezone | |
| 12.4 | [ ] Doc ID matches date field | Inspect Firestore doc | doc ID = `att_{uid}_{date}` where date matches the date field | |
| 12.5 | [ ] sessionHours uses UTC diff | Punch in 09:00, out 10:30 | sessionHours = 1.50 regardless of timezone | |
| 12.6 | [ ] Multi-session workHours = sum | Two sessions via face scan checkout | workHours = sessions[0].sessionHours + sessions[1].sessionHours | |
| 12.7 | [ ] Late check uses local time | Punch in at 09:35 with grace=10, start=09:30 | Not late (within grace). Punch in at 09:41 → marked late | |
| 12.8 | [ ] Break duration uses UTC diff | Start break, end 30 min later | durationMinutes = 30 | |

---

## Known Limitations (Not Bugs)

- Overnight sessions are not supported. The attendance date is fixed to the local date at punch-in time.
- WiFi SSID validation requires a Development Build. It does not work in Expo Go.
- Face recognition requires the backend face API server to be running.
- Firebase security rules are not server-enforced (REST API with API key only). All security is app-level via `writeAttendanceRecord`.
- PDF sharing requires `expo-sharing` to be available on the device (`Sharing.isAvailableAsync()`).
