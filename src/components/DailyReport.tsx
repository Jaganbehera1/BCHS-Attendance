import { useState, useEffect } from 'react';
import { supabase, Attendance } from '../lib/supabase';
import { localDB } from '../lib/localDB';
import { syncService } from '../lib/syncService';
import { Download, Calendar } from 'lucide-react';

export function DailyReport() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');

  useEffect(() => {
    initializeApp();
    fetchDailyReport();
  }, [selectedDate, selectedClass, selectedSection]);

  const initializeApp = async () => {
    try {
      await localDB.init();
      syncService.startPeriodicSync();
    } catch (error) {
      console.error('Error initializing local database:', error);
    }
  };

  const fetchDailyReport = async () => {
    try {
      setLoading(true);

      let studentData: Student[] = [];
      let attendanceData: Attendance[] = [];

      if (navigator.onLine) {
        try {
          // Fetch all students for selected class/section
          let studentQuery = supabase
            .from('students')
            .select('*')
            .eq('is_active', true);

          if (selectedClass !== 'All') {
            studentQuery = studentQuery.eq('class_grade', selectedClass);
          }
          if (selectedSection !== 'All') {
            studentQuery = studentQuery.eq('section', selectedSection);
          }

          const { data: studentsResult, error: studentError } = await studentQuery;
          if (studentError) throw studentError;
          studentData = studentsResult || [];

          // Fetch attendance for the selected date
          let attendanceQuery = supabase
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
            .eq('date', selectedDate);

          if (selectedClass !== 'All') {
            attendanceQuery = attendanceQuery.eq('students.class_grade', selectedClass);
          }
          if (selectedSection !== 'All') {
            attendanceQuery = attendanceQuery.eq('students.section', selectedSection);
          }

          // Only include records with valid student data when filtering
          if (selectedClass !== 'All' || selectedSection !== 'All') {
            attendanceQuery = attendanceQuery.not('students', 'is', null);
          }

          const { data: attendanceResult, error: attendanceError } = await attendanceQuery;
          if (attendanceError) throw attendanceError;
          attendanceData = attendanceResult || [];

          // Store fetched attendance data locally for offline access
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
          // For offline mode, we can't fetch students, so show limited data
          const localAttendance = await localDB.getAttendanceForDate(selectedDate);
          attendanceData = localAttendance.map(record => ({
            id: record.id,
            student_id: record.student_id,
            date: record.date,
            check_in: record.check_in,
            check_out: record.check_out,
            class_grade: record.class_grade,
            section: record.section,
            created_at: record.created_at,
            updated_at: record.updated_at,
            students: null
          }));
          studentData = []; // Can't fetch students offline
        }
      } else {
        // Offline mode
        console.log('Offline mode: fetching attendance from local database');
        const localAttendance = await localDB.getAttendanceForDate(selectedDate);
        attendanceData = localAttendance.map(record => ({
          id: record.id,
          student_id: record.student_id,
          date: record.date,
          check_in: record.check_in,
          check_out: record.check_out,
          class_grade: record.class_grade,
          section: record.section,
          created_at: record.created_at,
          updated_at: record.updated_at,
          students: null
        }));
        studentData = []; // Can't fetch students offline
      }

      setStudents(studentData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error fetching daily report:', error);
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
      'Status',
      'Check In',
      'Check Out',
      'Duration',
    ];

    // Create attendance map for quick lookup
    const attendanceMap = new Map();
    attendance.forEach(record => {
      const studentId = record.student_id;
      attendanceMap.set(studentId, record);
    });

    const rows = students.map(student => {
      const attendanceRecord = attendanceMap.get(student.id);
      const isPresent = !!attendanceRecord;

      return [
        selectedDate,
        student.student_id,
        student.name,
        student.class_grade,
        student.section,
        isPresent ? 'Present' : 'Absent',
        attendanceRecord ? formatTime(attendanceRecord.check_in) : '-',
        attendanceRecord ? formatTime(getEffectiveCheckout(attendanceRecord.check_in, attendanceRecord.check_out)) : '-',
        attendanceRecord ? calculateDuration(attendanceRecord.check_in, attendanceRecord.check_out) : '-',
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

    const dateStr = new Date(selectedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let filename = `daily_attendance_${selectedDate}`;
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

  if (loading) {
    return <div className="text-center py-8">Loading daily report...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Daily Attendance Report</h2>
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
          <button
            onClick={downloadExcel}
            disabled={students.length === 0}
            className="w-full sm:col-span-2 lg:col-span-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Daily Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Total Students</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{students.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Present</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{attendance.length}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Absent</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{students.length - attendance.length}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Rate</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">
              {students.length > 0 ? ((attendance.length / students.length) * 100).toFixed(0) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Table / Card View */}
      {students.length === 0 ? (
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md text-center text-gray-500">
          No students found for the selected filters.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
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
                      Status
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => {
                    const attendanceRecord = attendance.find(a => a.student_id === student.id);
                    const isPresent = !!attendanceRecord;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.student_id}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {student.class_grade}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {student.section}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              isPresent
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isPresent ? 'Present' : 'Absent'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {attendanceRecord ? formatTime(attendanceRecord.check_in) : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {attendanceRecord?.check_out ? formatTime(attendanceRecord.check_out) : (attendanceRecord ? formatTime(getEffectiveCheckout(attendanceRecord.check_in, attendanceRecord.check_out)) : '-')}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {attendanceRecord ? calculateDuration(attendanceRecord.check_in, attendanceRecord.check_out) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {students.map((student) => {
              const attendanceRecord = attendance.find(a => a.student_id === student.id);
              const isPresent = !!attendanceRecord;

              return (
                <div key={student.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-600">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-600">ID: {student.student_id}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                        isPresent
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-600">Class</p>
                      <p className="font-medium text-gray-900">{student.class_grade}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Section</p>
                      <p className="font-medium text-gray-900">{student.section}</p>
                    </div>
                  </div>

                  {isPresent && (
                    <div className="space-y-2 text-sm border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Check In</span>
                        <span className="font-medium text-gray-900">{formatTime(attendanceRecord.check_in)}</span>
                      </div>
                      {attendanceRecord?.check_out && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Check Out</span>
                            <span className="font-medium text-gray-900">{formatTime(attendanceRecord.check_out)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Duration</span>
                            <span className="font-medium text-gray-900">{calculateDuration(attendanceRecord.check_in, attendanceRecord.check_out)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
