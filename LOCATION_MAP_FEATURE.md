# Location Map Feature - Admin Panel

## Overview
The Location Map feature allows company admins to visualize employee punch-in and punch-out locations on an interactive map. This helps admins verify that employees are marking attendance from the correct locations.

## Features

### 1. **Interactive Map View**
- Displays all employee punch-in/out locations for a selected date
- Custom markers for check-in (green) and check-out (red)
- Tap on markers to view detailed information

### 2. **Marker Information**
Each marker shows:
- Employee name and ID
- Check-in/Check-out time
- GPS coordinates (latitude, longitude)
- Late status (if applicable)
- Work hours (for check-out markers)

### 3. **Filtering Options**
- **Date Filter**: View locations for any specific date
- **Employee Search**: Filter by employee name or ID
- Real-time filtering updates the map

### 4. **Map Controls**
- Zoom in/out
- Pan to explore different areas
- Auto-center on first location
- Compass and scale indicators

## How to Access

### For Admin Users:
1. Navigate to **Admin Dashboard**
2. Go to **Daily Attendance** screen
3. Click the **Map Icon** (📍) in the top-right header
4. The Location Map screen will open

## Screen Components

### Header
- **Back Button**: Return to attendance screen
- **Title**: "Location Map" with subtitle
- **Filter Button**: Open filter modal

### Date Bar
- Shows currently selected date
- Tap to change date (date picker integration needed)

### Stats Bar
- Visual legend for marker colors
- Total number of records displayed

### Map Area
- Full-screen interactive map
- Custom markers for each punch event
- Callout popups with detailed information

### Filter Modal
- Search by employee name or ID
- Apply/Clear filter buttons

## Technical Implementation

### Dependencies
```json
{
  "react-native-maps": "^1.x.x",
  "expo-location": "~19.0.8"
}
```

### Files Created/Modified

#### New Files:
- `screens/admin/AdminLocationMapScreen.js` - Main map screen component

#### Modified Files:
- `screens/admin/AdminAttendanceScreen.js` - Added map button in header
- `App.js` - Added navigation route for AdminLocationMap

### Data Structure
The screen fetches attendance records with location data:
```javascript
{
  employeeId: "EMP001",
  employeeName: "John Doe",
  date: "2026-01-25",
  checkInTime: "09:30",
  checkOutTime: "18:30",
  location: {
    latitude: 18.5204,
    longitude: 73.8567
  },
  checkoutLocation: {
    latitude: 18.5210,
    longitude: 73.8570
  },
  workHours: 9.0,
  isLate: false
}
```

## Usage Instructions

### Viewing Employee Locations:
1. Open the Location Map screen
2. The map will auto-center on the first location
3. Green markers = Check-in locations
4. Red markers = Check-out locations
5. Tap any marker to see details

### Filtering by Employee:
1. Tap the filter icon in the header
2. Enter employee name or ID in the search box
3. Tap "Apply Filter"
4. Map updates to show only matching employees

### Changing Date:
1. Tap the date selector in the date bar
2. Select a new date (requires date picker integration)
3. Map refreshes with new date's data

## Future Enhancements

### Planned Features:
1. **Date Picker Integration**: Add a proper date picker component
2. **Geofencing**: Show office boundary on map
3. **Distance Calculation**: Calculate distance from office
4. **Route Lines**: Draw lines between check-in and check-out locations
5. **Export Map**: Save map as image/PDF
6. **Heatmap View**: Show density of punch locations
7. **Multi-date View**: Compare locations across multiple dates
8. **Location Alerts**: Notify if punch location is outside allowed area

### Advanced Features:
- **Clustering**: Group nearby markers for better performance
- **Custom Map Styles**: Dark mode, satellite view
- **Location History**: Show employee's location history over time
- **Offline Maps**: Cache map tiles for offline viewing

## Troubleshooting

### Map Not Showing:
- Ensure `react-native-maps` is properly installed
- Check that location permissions are granted
- Verify Google Maps API key (for Android)

### No Markers Displayed:
- Check if attendance records have location data
- Verify the selected date has attendance records
- Ensure location tracking was enabled during punch-in/out

### Performance Issues:
- Limit the number of markers displayed
- Use marker clustering for large datasets
- Optimize map region updates

## Security & Privacy

### Data Protection:
- Location data is stored securely in Firestore
- Only company admins can view employee locations
- Tenant isolation ensures data privacy between companies
- Location data is only captured during punch-in/out

### Compliance:
- Inform employees about location tracking
- Obtain consent for location data collection
- Comply with local privacy regulations (GDPR, etc.)
- Provide option to view/delete location data

## API Reference

### Navigation
```javascript
navigation.navigate('AdminLocationMap')
```

### Props
The screen doesn't require any props - it uses the auth context to get company information.

### State Management
- Uses local state for map region and filters
- Fetches data from Firestore on mount and date change
- Real-time updates when filters are applied

## Support

For issues or feature requests, contact the development team or create an issue in the project repository.

---

**Version**: 1.0.0  
**Last Updated**: January 25, 2026  
**Author**: Development Team
