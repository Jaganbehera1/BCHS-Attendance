export interface LocalAttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  check_in: string;
  check_out?: string;
  class_grade?: string;
  section?: string;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'AttendanceDB';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('attendance')) {
          const store = db.createObjectStore('attendance', { keyPath: 'id' });
          store.createIndex('student_date', ['student_id', 'date'], { unique: true });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  async storeAttendance(record: LocalAttendanceRecord): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['attendance'], 'readwrite');
      const store = transaction.objectStore('attendance');

      const request = store.put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAttendanceByStudentAndDate(studentId: string, date: string): Promise<LocalAttendanceRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['attendance'], 'readonly');
      const store = transaction.objectStore('attendance');
      const index = store.index('student_date');

      const request = index.get([studentId, date]);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async updateAttendance(id: string, updates: Partial<LocalAttendanceRecord>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['attendance'], 'readwrite');
      const store = transaction.objectStore('attendance');

      const getRequest = store.get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          Object.assign(record, updates, { updated_at: new Date().toISOString() });
          const putRequest = store.put(record);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          reject(new Error('Record not found'));
        }
      };
    });
  }

  async getUnsyncedRecords(): Promise<LocalAttendanceRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['attendance'], 'readonly');
      const store = transaction.objectStore('attendance');
      const index = store.index('synced');

      const request = index.getAll(false);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async markAsSynced(id: string): Promise<void> {
    return this.updateAttendance(id, { synced: true });
  }

  async getAttendanceForDate(date: string): Promise<LocalAttendanceRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['attendance'], 'readonly');
      const store = transaction.objectStore('attendance');
      const index = store.index('date');

      const request = index.getAll(date);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllAttendance(): Promise<LocalAttendanceRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['attendance'], 'readonly');
      const store = transaction.objectStore('attendance');

      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

export const localDB = new LocalDatabase();