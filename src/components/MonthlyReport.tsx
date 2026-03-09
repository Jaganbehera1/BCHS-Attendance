import { useState, useEffect } from 'react';
import { supabase, Attendance } from '../lib/supabase';
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
    fetchMonthlyAttendance();
  }, [selectedMonth, selectedClass, selectedSection]);

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
      setAttendance(data || []);
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

    const monthName = new Date(selectedMonth + '-01').toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
    });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Monthly Report</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
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
          </div>
          <div>
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
          <button
            onClick={downloadExcel}
            disabled={attendance.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold text-blue-600">{attendance.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Unique Students</p>
            <p className="text-2xl font-bold text-green-600">
              {Object.keys(groupedAttendance).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Complete Days</p>
            <p className="text-2xl font-bold text-yellow-600">
              {attendance.filter((a) => a.check_out).length}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Incomplete Days</p>
            <p className="text-2xl font-bold text-red-600">
              {attendance.filter((a) => !a.check_out).length}
            </p>
          </div>
        </div>
      </div>

      {Object.keys(groupedAttendance).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
          No attendance records for this month.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAttendance).map(([studentId, records]) => {
            const stats = calculateStats(records);
            const student = records[0].students;

            return (
              <div key={studentId} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {student?.name || 'Unknown Student'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ID: {student?.student_id || studentId}
                        {student?.class_grade && (
                          <span> • Class {student.class_grade} {student.section}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Days Present: <span className="font-semibold">{stats.totalDays}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Total Hours:{' '}
                        <span className="font-semibold">{stats.totalHours}h</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Check In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Check Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {formatTime(record.check_in)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {record.check_out ? formatTime(record.check_out) : '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {calculateDuration(record.check_in, record.check_out)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
