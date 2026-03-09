import { supabase } from './supabase';
import { localDB, LocalAttendanceRecord } from './localDB';

export class SyncService {
  private syncInProgress = false;

  async syncToSupabase(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let synced = 0;
    let failed = 0;

    try {
      const unsyncedRecords = await localDB.getUnsyncedRecords();

      for (const record of unsyncedRecords) {
        try {
          // Check if record already exists in Supabase
          const { data: existingRecord, error: fetchError } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', record.student_id)
            .eq('date', record.date)
            .maybeSingle();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing record:', fetchError);
            failed++;
            continue;
          }

          let result;
          if (existingRecord) {
            // Update existing record
            result = await supabase
              .from('attendance')
              .update({
                check_out: record.check_out,
                updated_at: record.updated_at,
                class_grade: record.class_grade,
                section: record.section,
              })
              .eq('id', existingRecord.id);
          } else {
            // Insert new record
            result = await supabase
              .from('attendance')
              .insert({
                student_id: record.student_id,
                date: record.date,
                check_in: record.check_in,
                check_out: record.check_out,
                class_grade: record.class_grade,
                section: record.section,
              });
          }

          if (result.error) {
            console.error('Error syncing record:', result.error);
            failed++;
          } else {
            await localDB.markAsSynced(record.id);
            synced++;
          }
        } catch (error) {
          console.error('Error syncing record:', error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }

    return { synced, failed };
  }

  async syncFromSupabase(): Promise<void> {
    // This could be used to sync missing records from Supabase to local
    // For now, we'll focus on pushing local records to Supabase
    console.log('Sync from Supabase not implemented yet');
  }

  startPeriodicSync(): void {
    // Sync every 5 minutes for testing, change to daily for production
    setInterval(async () => {
      if (navigator.onLine) {
        const result = await this.syncToSupabase();
        if (result.synced > 0 || result.failed > 0) {
          console.log(`Synced ${result.synced} records, ${result.failed} failed`);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also sync at midnight
    this.scheduleMidnightSync();
  }

  private scheduleMidnightSync(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight

    const timeUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(async () => {
      if (navigator.onLine) {
        console.log('Performing midnight sync...');
        const result = await this.syncToSupabase();
        console.log(`Midnight sync: ${result.synced} synced, ${result.failed} failed`);
      }
      // Schedule next midnight sync
      this.scheduleMidnightSync();
    }, timeUntilMidnight);
  }

  async forceSync(): Promise<{ synced: number; failed: number }> {
    return this.syncToSupabase();
  }
}

export const syncService = new SyncService();