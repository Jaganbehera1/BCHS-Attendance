import { useState, useEffect } from 'react';
import { supabase, Attendance } from '../lib/supabase';
import { Calendar, Clock } from 'lucide-react';

export function AttendanceDashboard() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedClass, selectedSection]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
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

      // Group by student and keep only the most recent record per student
      const studentRecords = new Map();
      (data || []).forEach(record => {
        const studentId = record.student_id;
        if (!studentRecords.has(studentId)) {
          studentRecords.set(studentId, []);
        }
        studentRecords.get(studentId).push(record);
      });

      // For each student, keep only the most recent record (by check_in time)
      const latestRecords = [];
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Daily Attendance</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={20} className="text-gray-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Present</p>
              <p className="text-3xl font-bold text-green-600">{attendance.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Clock size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Still In Office</p>
              <p className="text-3xl font-bold text-blue-600">
                {attendance.filter((a) => !a.check_out).length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Clock size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Checked Out</p>
              <p className="text-3xl font-bold text-gray-600">
                {attendance.filter((a) => a.check_out).length}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full">
              <Clock size={24} className="text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No attendance records for this date.
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.students?.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.students?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.class_grade || record.students?.class_grade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.section || record.students?.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-green-600" />
                        {formatTime(record.check_in)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.check_out ? (
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-red-600" />
                          {formatTime(record.check_out)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {calculateDuration(record.check_in, record.check_out)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
      </div>
    </div>
  );
}
