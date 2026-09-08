import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportToCSV(records, filename = 'attendance.csv') {
  try {
    // Create CSV header
    const headers = ['Date', 'Time', 'Type', 'Status', 'Name', 'Email'];
    const csvContent = [
      headers.join(','),
      ...records.map((record) => {
        const date = record.createdAt?.toDate?.();
        const dateStr = date?.toLocaleDateString() || 'N/A';
        const timeStr = date?.toLocaleTimeString() || 'N/A';
        const type = record.type || 'N/A';
        const status = record.status || 'N/A';
        const name = record.name || 'N/A';
        const email = record.email || 'N/A';

        return `"${dateStr}","${timeStr}","${type}","${status}","${name}","${email}"`;
      }),
    ].join('\n');

    // Save to file
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvContent);

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Attendance Records',
      UTI: 'public.comma-separated-values-text',
    });

    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}

export async function exportToJSON(records, filename = 'attendance.json') {
  try {
    const jsonContent = JSON.stringify(records, null, 2);

    // Save to file
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, jsonContent);

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Attendance Records',
    });

    return true;
  } catch (error) {
    console.error('Error exporting JSON:', error);
    throw error;
  }
}

export function generateAttendanceReport(records) {
  const report = {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    summary: {
      checkIns: records.filter((r) => r.type === 'checkin').length,
      checkOuts: records.filter((r) => r.type === 'checkout').length,
      matched: records.filter((r) => r.status === 'matched').length,
      unmatched: records.filter((r) => r.status !== 'matched').length,
    },
    records: records.map((record) => ({
      date: record.createdAt?.toDate?.().toLocaleDateString() || 'N/A',
      time: record.createdAt?.toDate?.().toLocaleTimeString() || 'N/A',
      type: record.type,
      status: record.status,
      name: record.name,
      email: record.email,
      uid: record.uid,
      matchScore: record.matchScore || 'N/A',
    })),
  };

  return report;
}
