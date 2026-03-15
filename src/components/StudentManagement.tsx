import { useState, useEffect } from 'react';
import { supabase, Student } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    fingerprint_id: '',
    email: '',
    phone: '',
    class_grade: '6',
    section: 'A',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_id.trim()) {
      alert('Student ID is required');
      return;
    }

    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    if (!formData.fingerprint_id.trim()) {
      alert('Fingerprint ID is required');
      return;
    }

    try {
      const studentData = {
        student_id: formData.student_id.trim(),
        name: formData.name.trim(),
        fingerprint_id: parseInt(formData.fingerprint_id),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        class_grade: formData.class_grade,
        section: formData.section,
      };

      if (editingId) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingId);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('students')
          .insert([studentData]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      setFormData({ student_id: '', name: '', fingerprint_id: '', email: '', phone: '', class_grade: '6', section: 'A' });
      setEditingId(null);
      setShowForm(false);
      fetchStudents();
      alert('Student saved successfully!');
    } catch (error: any) {
      console.error('Error saving student:', error);
      alert(`Error: ${error.message || 'Failed to save student. Please check all fields.'}`);
    }
  };

  const handleEdit = (student: Student) => {
    setFormData({
      student_id: student.student_id,
      name: student.name,
      fingerprint_id: student.fingerprint_id.toString(),
      email: student.email || '',
      phone: student.phone || '',
      class_grade: student.class_grade || '6',
      section: student.section || 'A',
    });
    setEditingId(student.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchStudents();
    } catch (error) {
      console.error('Error updating student status:', error);
    }
  };

  const cancelEdit = () => {
    setFormData({ student_id: '', name: '', fingerprint_id: '', email: '', phone: '', class_grade: '6', section: 'A' });
    setEditingId(null);
    setShowForm(false);
  };

  const enrollFingerprint = async () => {
    if (enrolling) return;

    setEnrolling(true);
    try {
      alert('Place finger on scanner...');

      // Optional direct API endpoint for local Raspberry Pi (set via VITE_ENROLLMENT_API_URL)
      const localApiUrl = import.meta.env.VITE_ENROLLMENT_API_URL;

      let fingerprintId: number | null = null;

      if (localApiUrl) {
        const response = await fetch(localApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || 'Enrollment failed');
        }

        fingerprintId = json.fingerprint_id;
      } else {
        const { data, error } = await supabase.functions.invoke('enroll-fingerprint');
        if (error) {
          throw error;
        }
        fingerprintId = data.fingerprint_id;
      }

      if (fingerprintId == null) {
        throw new Error('Enrollment returned no ID');
      }

      setFormData({ ...formData, fingerprint_id: fingerprintId.toString() });
      alert('Enrollment successful!');
    } catch (error: any) {
      console.error('Enrollment error:', error);
      alert(`Enrollment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading students...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancel' : 'Add Student'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Student' : 'Add New Student'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID *
              </label>
              <input
                type="text"
                required
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., STU001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class *
              </label>
              <select
                required
                value={formData.class_grade}
                onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="6">Class 6</option>
                <option value="7">Class 7</option>
                <option value="8">Class 8</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section *
              </label>
              <select
                required
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fingerprint ID *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  value={formData.fingerprint_id}
                  onChange={(e) => setFormData({ ...formData, fingerprint_id: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Click Enroll Fingerprint"
                  readOnly
                />
                <button
                  type="button"
                  onClick={enrollFingerprint}
                  disabled={enrolling}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Fingerprint'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="student@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save size={20} />
                {editingId ? 'Update' : 'Save'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X size={20} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

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
                  Fingerprint ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 sm:px-6 py-4 text-center text-gray-500">
                    No students found. Add your first student above.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
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
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.fingerprint_id}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.email || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <button
                        onClick={() => toggleActive(student.id, student.is_active)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                          student.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {student.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {students.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">No students found. Add your first student above.</p>
          </div>
        ) : (
          students.map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-600">ID: {student.student_id}</p>
                </div>
                <button
                  onClick={() => toggleActive(student.id, student.is_active)}
                  className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 transition-colors ${
                    student.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {student.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm border-b pb-4">
                <div>
                  <p className="text-xs text-gray-600">Class</p>
                  <p className="font-medium text-gray-900">{student.class_grade}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Section</p>
                  <p className="font-medium text-gray-900">{student.section}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fingerprint ID</p>
                  <p className="font-medium text-gray-900">{student.fingerprint_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900 truncate">{student.phone || '-'}</p>
                </div>
              </div>

              {student.email && (
                <div className="mb-4 text-sm">
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="font-medium text-gray-900 break-all">{student.email}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(student)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(student.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
