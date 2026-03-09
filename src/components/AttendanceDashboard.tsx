import { useState, useEffect } from 'react';
import { supabase, Attendance } from '../lib/supabase';
import { localDB, LocalAttendanceRecord } from '../lib/localDB';
import { syncService } from '../lib/syncService';
import { Calendar, Clock } from 'lucide-react';

export function AttendanceDashboard() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');

  useEffect(() => {
    initializeApp();
    fetchAttendance();
  }, [selectedDate, selectedClass, selectedSection]);

  const initializeApp = async () => {
    try {
      await localDB.init();
      syncService.startPeriodicSync();
    } catch (error) {
      console.error('Error initializing local database:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      let attendanceData: Attendance[] = [];

      if (navigator.onLine) {
        try {
          // Try to fetch from Supabase
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
            .eq('date', selectedDate)
            .order('check_in', { ascending: false });

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
              const localRecord: LocalAttendanceRecord = {
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
          const localData = await localDB.getAttendanceForDate(selectedDate);
          attendanceData = localData.map(record => ({
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
        const localData = await localDB.getAttendanceForDate(selectedDate);
        attendanceData = localData.map(record => ({
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

      // Group by student and keep only the most recent record per student
      const studentRecords = new Map<string, Attendance[]>();
      attendanceData.forEach(record => {
        const studentId = record.student_id;
        if (!studentRecords.has(studentId)) {
          studentRecords.set(studentId, []);
        }
        studentRecords.get(studentId)!.push(record);
      });

      // For each student, keep only the most recent record (by check_in time)
      const latestRecords: Attendance[] = [];
      studentRecords.forEach(records => {
        if (records.length > 0) {
          // Sort by check_in descending and take the first (most recent)
          records.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
          latestRecords.push(records[0]);
        }
      });

      setAttendance(latestRecords);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  if (loading) {
    return <div className="text-center py-8">Loading attendance...</div>;
  }

  return (
      <div className="space-y-6">
      {/* Header and Filters */}
      <div className="space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">Daily Attendance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600 flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Present</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{attendance.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
              <Clock size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Still In Office</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
                {attendance.filter((a) => !a.check_out).length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
              <Clock size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Checked Out</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-600 mt-1">
                {attendance.filter((a) => a.check_out).length}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full flex-shrink-0">
              <Clock size={20} className="text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Table for Desktop, Cards for Mobile */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 py-4 text-center text-gray-500">
                    No attendance records for this date.
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.students?.student_id}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.students?.name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.class_grade || record.students?.class_grade}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.section || record.students?.section}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-green-600" />
                        {formatTime(record.check_in)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.check_out ? (
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-red-600" />
                          {formatTime(record.check_out)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {calculateDuration(record.check_in, record.check_out)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          record.check_out
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {record.check_out ? 'Checked Out' : 'Present'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {attendance.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No attendance records for this date.</p>
          ) : (
            attendance.map((record) => (
              <div key={record.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{record.students?.name}</p>
                    <p className="text-xs text-gray-600">ID: {record.students?.student_id}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      record.check_out
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {record.check_out ? 'Checked Out' : 'Present'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Class</p>
                    <p className="font-medium text-gray-900">{record.class_grade || record.students?.class_grade}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Section</p>
                    <p className="font-medium text-gray-900">{record.section || record.students?.section}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Clock size={16} className="text-green-600" />
                      Check In
                    </span>
                    <span className="font-medium text-gray-900">{formatTime(record.check_in)}</span>
                  </div>
                  {record.check_out && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Clock size={16} className="text-red-600" />
                          Check Out
                        </span>
                        <span className="font-medium text-gray-900">{formatTime(record.check_out)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium text-gray-900">{calculateDuration(record.check_in, record.check_out)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
