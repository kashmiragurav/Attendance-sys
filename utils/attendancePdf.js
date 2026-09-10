/**
 * Attendance PDF Report Generator
 * Uses expo-print to render HTML → PDF, expo-sharing to share/save.
 * Role enforcement is done at the call site (query scope), not here.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const STATUS_COLORS = {
    present: '#2ECC71',
    late: '#F39C12',
    half_day: '#9B59B6',
    absent: '#E74C3C',
    weekly_off: '#607D8B',
    paid_leave: '#4A90E2',
};

const fmtStatus = (s) => (s || 'absent').replace('_', ' ').toUpperCase();
const fmtMode = (m) => (m === 'WFH' ? '🏠 WFH' : '🏢 OFFICE');
const fmtHours = (h) => (typeof h === 'number' ? h.toFixed(2) + ' hrs' : '0.00 hrs');
const fmtTime = (t) => t || '--:--';

/**
 * Build HTML for a single-employee monthly report.
 * @param {{ name, employeeId, companyName }} employee
 * @param {Array} records  attendance docs for the period
 * @param {{ month: string, year: number }} period
 */
export const buildEmployeeReportHtml = (employee, records, period) => {
    const sorted = [...records].sort((a, b) => (a.date > b.date ? 1 : -1));

    const totalHours = sorted.reduce((t, r) => t + (r.workHours || 0), 0);
    const present = sorted.filter(r => r.status === 'present').length;
    const late = sorted.filter(r => r.status === 'late').length;
    const halfDay = sorted.filter(r => r.status === 'half_day').length;
    const absent = sorted.filter(r => r.status === 'absent').length;
    const wfhDays = sorted.filter(r => r.attendanceMode === 'WFH').length;

    const rows = sorted.map(r => {
        const color = STATUS_COLORS[r.status] || '#95A5A6';
        const sessions = Array.isArray(r.sessions) && r.sessions.length > 0
            ? r.sessions.map((s, i) =>
                `<div style="font-size:11px;color:#555;">S${i + 1}: ${fmtTime(s.checkInTime)} → ${fmtTime(s.checkOutTime)} (${(s.sessionHours || 0).toFixed(2)}h)</div>`
              ).join('')
            : `<div style="font-size:11px;color:#555;">${fmtTime(r.checkInTime)} → ${fmtTime(r.checkOutTime)}</div>`;

        const breaks = Array.isArray(r.breaks) && r.breaks.filter(b => b.end).length > 0
            ? r.breaks.filter(b => b.end).map(b =>
                `<span style="font-size:10px;color:#E67E22;">${b.startTime}→${b.endTime}(${b.durationMinutes}m)</span>`
              ).join(' ')
            : '<span style="font-size:10px;color:#aaa;">—</span>';

        return `
        <tr>
          <td>${r.date}</td>
          <td>${sessions}</td>
          <td>${breaks}</td>
          <td>${fmtHours(r.workHours)}</td>
          <td><span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">${fmtStatus(r.status)}</span></td>
          <td style="font-size:11px;">${fmtMode(r.attendanceMode)}</td>
          <td style="font-size:10px;color:${r.faceVerified ? '#2ECC71' : '#95A5A6'};">${r.faceVerified ? '✓ Verified' : r.method || '—'}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; color: #2C3E50; font-size: 13px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #7F8C8D; font-size: 12px; margin-bottom: 20px; }
  .summary { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .stat { background: #F8F9FA; border-radius: 8px; padding: 10px 16px; text-align: center; min-width: 80px; }
  .stat-val { font-size: 22px; font-weight: bold; }
  .stat-lbl { font-size: 10px; color: #7F8C8D; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2C3E50; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
  td { padding: 7px 8px; border-bottom: 1px solid #ECF0F1; vertical-align: top; }
  tr:nth-child(even) td { background: #F9F9F9; }
  .footer { margin-top: 20px; font-size: 10px; color: #95A5A6; text-align: right; }
</style>
</head>
<body>
  <h1>Attendance Report — ${employee.name}</h1>
  <div class="sub">
    Employee ID: ${employee.employeeId || '—'} &nbsp;|&nbsp;
    Company: ${employee.companyName || '—'} &nbsp;|&nbsp;
    Period: ${period.month} ${period.year}
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-val" style="color:#2ECC71;">${present}</div><div class="stat-lbl">Present</div></div>
    <div class="stat"><div class="stat-val" style="color:#F39C12;">${late}</div><div class="stat-lbl">Late</div></div>
    <div class="stat"><div class="stat-val" style="color:#9B59B6;">${halfDay}</div><div class="stat-lbl">Half Day</div></div>
    <div class="stat"><div class="stat-val" style="color:#E74C3C;">${absent}</div><div class="stat-lbl">Absent</div></div>
    <div class="stat"><div class="stat-val" style="color:#F39C12;">${wfhDays}</div><div class="stat-lbl">WFH Days</div></div>
    <div class="stat"><div class="stat-val" style="color:#4A90E2;">${fmtHours(totalHours)}</div><div class="stat-lbl">Total Hours</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Sessions (In → Out)</th><th>Breaks</th>
        <th>Work Hours</th><th>Status</th><th>Mode</th><th>Verification</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; SmartAttend</div>
</body>
</html>`;
};

/**
 * Build HTML for an admin team/company monthly report.
 * @param {string} companyName
 * @param {Array<{ name, employeeId, department, present, late, halfDay, absent, wfhDays, totalHours }>} summaryRows
 * @param {{ month: string, year: number }} period
 */
export const buildAdminReportHtml = (companyName, summaryRows, period) => {
    const totalEmployees = summaryRows.length;
    const totalPresent = summaryRows.reduce((t, r) => t + r.present, 0);
    const totalHours = summaryRows.reduce((t, r) => t + r.totalHours, 0);
    const totalWfh = summaryRows.reduce((t, r) => t + r.wfhDays, 0);

    const rows = summaryRows.map(r => `
    <tr>
      <td>${r.employeeId}</td>
      <td>${r.name}</td>
      <td>${r.department || '—'}</td>
      <td style="color:#2ECC71;font-weight:bold;">${r.present}</td>
      <td style="color:#F39C12;">${r.late}</td>
      <td style="color:#9B59B6;">${r.halfDay}</td>
      <td style="color:#E74C3C;">${r.absent}</td>
      <td style="color:#F39C12;">${r.wfhDays}</td>
      <td style="color:#4A90E2;font-weight:bold;">${r.totalHours.toFixed(2)}h</td>
    </tr>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; color: #2C3E50; font-size: 13px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #7F8C8D; font-size: 12px; margin-bottom: 20px; }
  .summary { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { background: #F8F9FA; border-radius: 8px; padding: 10px 16px; text-align: center; min-width: 90px; }
  .stat-val { font-size: 22px; font-weight: bold; }
  .stat-lbl { font-size: 10px; color: #7F8C8D; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a2a6c; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
  td { padding: 7px 8px; border-bottom: 1px solid #ECF0F1; }
  tr:nth-child(even) td { background: #F9F9F9; }
  .footer { margin-top: 20px; font-size: 10px; color: #95A5A6; text-align: right; }
</style>
</head>
<body>
  <h1>Monthly Attendance Report</h1>
  <div class="sub">
    Company: ${companyName} &nbsp;|&nbsp; Period: ${period.month} ${period.year}
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-val">${totalEmployees}</div><div class="stat-lbl">Employees</div></div>
    <div class="stat"><div class="stat-val" style="color:#2ECC71;">${totalPresent}</div><div class="stat-lbl">Total Present</div></div>
    <div class="stat"><div class="stat-val" style="color:#F39C12;">${totalWfh}</div><div class="stat-lbl">WFH Days</div></div>
    <div class="stat"><div class="stat-val" style="color:#4A90E2;">${totalHours.toFixed(1)}h</div><div class="stat-lbl">Total Hours</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Emp ID</th><th>Name</th><th>Department</th>
        <th>Present</th><th>Late</th><th>Half Day</th><th>Absent</th><th>WFH</th><th>Total Hours</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; SmartAttend</div>
</body>
</html>`;
};

/**
 * Generate and share a PDF from an HTML string.
 * @param {string} html
 * @param {string} filename  e.g. 'attendance_jan_2025.pdf'
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export const generateAndSharePdf = async (html, filename) => {
    try {
        const { uri } = await Print.printToFileAsync({ html, base64: false });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            return { ok: false, error: 'Sharing is not available on this device.' };
        }

        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: filename,
            UTI: 'com.adobe.pdf',
        });

        return { ok: true };
    } catch (err) {
        console.error('[PDF] Generation failed:', err);
        return { ok: false, error: err.message };
    }
};
