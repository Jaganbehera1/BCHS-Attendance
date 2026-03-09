import { useState, useEffect } from 'react';
import { supabase, Attendance } from '../lib/supabase';
import { localDB } from '../lib/localDB';
import { syncService } from '../lib/syncService';
import { Download, Calendar } from 'lucide-react';

export function MonthlyReport() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');

  useEffect(() => {
    initializeApp();
    fetchMonthlyAttendance();
  }, [selectedMonth, selectedClass, selectedSection]);

  const initializeApp = async () => {
    try {
      await localDB.init();
      syncService.startPeriodicSync();
    } catch (error) {
      console.error('Error initializing local database:', error);
    }
  };

  const fetchMonthlyAttendance = async () => {
    try {
      setLoading(true);
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(
        parseInt(selectedMonth.split('-')[0]),
        parseInt(selectedMonth.split('-')[1]),
        0
      )
        .toISOString()
        .split('T')[0];

      let attendanceData: Attendance[] = [];

      if (navigator.onLine) {
        try {
          let query = supabase
            .from('attendance')
            .select(`
              *,
              students (
                student_id,
                name,
                email,
                class_grade,
                section
              )
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

          if (selectedClass !== 'All') {
            query = query.eq('students.class_grade', selectedClass);
          }
          if (selectedSection !== 'All') {
            query = query.eq('students.section', selectedSection);
          }

          // Only include records with valid student data when filtering
          if (selectedClass !== 'All' || selectedSection !== 'All') {
            query = query.not('students', 'is', null);
          }

          const { data, error } = await query;

          if (error) throw error;
          attendanceData = data || [];

          // Store fetched data locally for offline access
          for (const record of attendanceData) {
            try {
              const localRecord = {
                id: record.id,
                student_id: record.student_id,
                date: record.date,
                check_in: record.check_in,
                check_out: record.check_out,
                class_grade: record.class_grade || record.students?.class_grade,
                section: record.section || record.students?.section,
                synced: true,
                created_at: record.created_at,
                updated_at: record.updated_at,
              };
              await localDB.storeAttendance(localRecord);
            } catch (localError) {
              console.warn('Error storing record locally:', localError);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch from Supabase, trying local data:', error);
          // Fall back to local data
          const allLocalData = await localDB.getAllAttendance();
          attendanceData = allLocalData
            .filter(record => record.date >= startDate && record.date <= endDate)
            .map(record => ({
              id: record.id,
              student_id: record.student_id,
              date: record.date,
              check_in: record.check_in,
              check_out: record.check_out,
              class_grade: record.class_grade,
              section: record.section,
              created_at: record.created_at,
              updated_at: record.updated_at,
              students: undefined // Local records don't have joined student data
            } as Attendance));
        }
      } else {
        // Offline mode - fetch from local DB
        console.log('Offline mode: fetching from local database');
        const allLocalData = await localDB.getAllAttendance();
        attendanceData = allLocalData
          .filter(record => record.date >= startDate && record.date <= endDate)
          .map(record => ({
            id: record.id,
            student_id: record.student_id,
            date: record.date,
            check_in: record.check_in,
            check_out: record.check_out,
            class_grade: record.class_grade,
            section: record.section,
            created_at: record.created_at,
            updated_at: record.updated_at,
            students: undefined // Local records don't have joined student data
          } as Attendance));
      }

      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEffectiveCheckout = (checkIn: string, checkOut?: string) => {
    return checkOut || new Date(new Date(checkIn).getFullYear(), new Date(checkIn).getMonth(), new Date(checkIn).getDate(), 23, 59, 59).toISOString();
  };

  const calculateDuration = (checkIn: string, checkOut?: string) => {
    const start = new Date(checkIn);
    const end = new Date(getEffectiveCheckout(checkIn, checkOut));
    const diff = end.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const downloadExcel = () => {
    const headers = [
      'Date',
      'Student ID',
      'Name',
      'Class',
      'Section',
      'Email',
      'Check-in Time',
      'Check-out Time',
      'Duration',
    ];

    // Sort attendance by date
    const sortedAttendance = [...attendance].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const rows = sortedAttendance.map((record) => {
      const student = record.students;
      const checkInTime = formatTime(record.check_in);
      const checkOutTime = record.check_out ? formatTime(record.check_out) : formatTime(getEffectiveCheckout(record.check_in, record.check_out));
      const duration = calculateDuration(record.check_in, record.check_out);

      return [
        record.date,
        student?.student_id || '',
        student?.name || '',
        student?.class_grade || '',
        student?.section || '',
        student?.email || '',
        checkInTime,
        checkOutTime,
        duration,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    let filename = `monthly_attendance_${selectedMonth}`;
    if (selectedClass !== 'All') filename += `_class${selectedClass}`;
    if (selectedSection !== 'All') filename += `_sec${selectedSection}`;
    filename += `.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupByStudent = () => {
    const grouped: { [key: string]: Attendance[] } = {};

    attendance.forEach((record) => {
      // Group by the foreign key student_id (UUID), not the joined student data
      const studentKey = record.student_id || 'Unknown';
      if (!grouped[studentKey]) {
        grouped[studentKey] = [];
      }
      grouped[studentKey].push(record);
    });

    return grouped;
  };

  const calculateStats = (records: Attendance[]) => {
    const totalDays = records.length;
    const completedDays = records.filter((r) => r.check_out).length;
    const totalHours = records.reduce((sum, record) => {
      if (!record.check_out) return sum;
      const diff =
        new Date(record.check_out).getTime() -
        new Date(record.check_in).getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);

    return {
      totalDays,
      completedDays,
      totalHours: totalHours.toFixed(1),
      avgHours: totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0',
    };
  };

  const groupedAttendance = groupByStudent();

  if (loading) {
    return <div className="text-center py-8">Loading monthly report...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Monthly Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600 flex-shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Classes</option>
            <option value="6">Class 6</option>
            <option value="7">Class 7</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
          </select>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
          <button
            onClick={downloadExcel}
            disabled={attendance.length === 0}
            className="w-full sm:col-span-2 lg:col-span-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Records</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{attendance.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Students</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
              {Object.keys(groupedAttendance).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Complete</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">
              {attendance.filter((a) => a.check_out).length}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Incomplete</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
              {attendance.filter((a) => !a.check_out).length}
            </p>
          </div>
        </div>
      </div>

      {/* Student Records */}
      {Object.keys(groupedAttendance).length === 0 ? (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md text-center text-gray-500">
          No attendance records for this month.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAttendance).map(([studentId, records]) => {
            const stats = calculateStats(records);
            const student = records[0].students;

            return (
              <div key={studentId} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Header - Same for both mobile and desktop */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 py-4 text-white">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {student?.name || 'Unknown Student'}
                      </h3>
                      <p className="text-sm text-blue-100">
                        ID: {student?.student_id || studentId}
                        {student?.class_grade && (
                          <span> • Class {student.class_grade} {student.section}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right text-sm sm:text-base">
                      <p className="text-blue-100">Days: <span className="font-semibold text-white">{stats.totalDays}</span></p>
                      <p className="text-blue-100">Hours: <span className="font-semibold text-white">{stats.totalHours}h</span></p>
                    </div>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Check In
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Check Out
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3 text-sm text-gray-900">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">
                            {formatTime(record.check_in)}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">
                            {record.check_out ? formatTime(record.check_out) : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">
                            {calculateDuration(record.check_in, record.check_out)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                  {records.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="text-xs text-gray-600">{calculateDuration(record.check_in, record.check_out)}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check In:</span>
                          <span className="font-medium text-gray-900">{formatTime(record.check_in)}</span>
                        </div>
                        {record.check_out && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check Out:</span>
                            <span className="font-medium text-gray-900">{formatTime(record.check_out)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
