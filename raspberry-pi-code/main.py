#!/usr/bin/env python3
"""
Main Attendance System Service
Central service that orchestrates all attendance system operations
"""

import sys
import time
import signal
import argparse
from datetime import datetime, time
from typing import Optional
import threading

# Import services
from config.config import config
from services.attendance_service import AttendanceService
from services.sync_service import SyncService
from services.enrollment_service import EnrollmentService

class AttendanceSystemService:
    """Main attendance system service"""

    def __init__(self):
        self.attendance_service: Optional[AttendanceService] = None
        self.sync_service: Optional[SyncService] = None
        self.enrollment_service: Optional[EnrollmentService] = None

        self.running = False
        self.sync_thread: Optional[threading.Thread] = None

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def initialize(self) -> bool:
        """Initialize all services"""
        try:
            print("🚀 Initializing Attendance System Service...")

            # Validate configuration
            config_errors = config.validate()
            if config_errors:
                print("❌ Configuration errors:")
                for error in config_errors:
                    print(f"   - {error}")
                return False

            # Initialize services
            self.attendance_service = AttendanceService(
                api_url=config.get("api_url"),
                sensor_port=config.get("sensor_port")
            )

            self.sync_service = SyncService(
                api_url=config.get("api_url")
            )

            self.enrollment_service = EnrollmentService(
                sensor_port=config.get("sensor_port")
            )

            print("✅ All services initialized successfully")
            return True

        except Exception as e:
            print(f"❌ Failed to initialize services: {e}")
            return False

    def start(self) -> None:
        """Start the attendance system service"""
        if not self.initialize():
            sys.exit(1)

        self.running = True
        print("🎯 Attendance System Service Started")
        print("=" * 50)

        # Start background sync
        self._start_background_sync()

        # Main service loop
        try:
            while self.running:
                self._show_menu()
                choice = input("\nSelect option (1-8): ").strip()

                if choice == "1":
                    self._start_attendance_monitoring()
                elif choice == "2":
                    self._stop_attendance_monitoring()
                elif choice == "3":
                    self._sync_data()
                elif choice == "4":
                    self._manage_enrollment()
                elif choice == "5":
                    self._show_status()
                elif choice == "6":
                    self._run_diagnostics()
                elif choice == "7":
                    self._configure_system()
                elif choice == "8":
                    self.stop()
                    break
                else:
                    print("❌ Invalid option")

        except KeyboardInterrupt:
            print("\n\n🛑 Service interrupted by user")
        finally:
            self.stop()

    def stop(self) -> None:
        """Stop the attendance system service"""
        print("\n🔄 Shutting down Attendance System Service...")

        self.running = False

        if self.attendance_service:
            self.attendance_service.stop_monitoring()

        if self.sync_thread and self.sync_thread.is_alive():
            self.sync_thread.join(timeout=5)

        print("✅ Service stopped")

    def _start_background_sync(self) -> None:
        """Start background synchronization thread"""
        def sync_worker():
            while self.running:
                try:
                    # Wait for sync interval
                    time.sleep(config.get("sync_interval"))

                    if self.running:  # Check again after sleep
                        print(f"\n🔄 Background sync at {datetime.now()}")
                        if self.sync_service:
                            result = self.sync_service.sync_attendance_to_supabase()
                            if result["synced"] > 0 or result["failed"] > 0:
                                print(f"   Synced: {result['synced']}, Failed: {result['failed']}")

                except Exception as e:
                    print(f"Background sync error: {e}")
                    time.sleep(60)  # Wait a minute before retrying

        self.sync_thread = threading.Thread(target=sync_worker, daemon=True)
        self.sync_thread.start()
        print("✅ Background sync started")

    def _show_menu(self) -> None:
        """Display main menu"""
        print("\n" + "=" * 50)
        print("🎯 ATTENDANCE SYSTEM CONTROL PANEL")
        print("=" * 50)
        print("1. Start Attendance Monitoring")
        print("2. Stop Attendance Monitoring")
        print("3. Sync Data")
        print("4. Manage Fingerprint Enrollment")
        print("5. Show System Status")
        print("6. Run Diagnostics")
        print("7. Configure System")
        print("8. Exit")
        print("=" * 50)

    def _start_attendance_monitoring(self) -> None:
        """Start attendance monitoring"""
        if not self.attendance_service:
            print("❌ Attendance service not initialized")
            return

        print("🖐️  Starting attendance monitoring...")
        print("Press Ctrl+C to stop monitoring")

        try:
            self.attendance_service.start_monitoring()
        except KeyboardInterrupt:
            print("\n✅ Attendance monitoring stopped")

    def _stop_attendance_monitoring(self) -> None:
        """Stop attendance monitoring"""
        if self.attendance_service:
            self.attendance_service.stop_monitoring()
            print("✅ Attendance monitoring stopped")
        else:
            print("❌ Attendance service not available")

    def _sync_data(self) -> None:
        """Manual data synchronization"""
        if not self.sync_service:
            print("❌ Sync service not initialized")
            return

        print("🔄 Starting manual sync...")

        # Sync students
        print("📚 Syncing students...")
        student_success = self.sync_service.sync_students_from_supabase()

        # Sync attendance
        print("📝 Syncing attendance...")
        attendance_result = self.sync_service.sync_attendance_to_supabase()

        print("✅ Sync complete!")
        print(f"   Students: {'✅' if student_success else '❌'}")
        print(f"   Attendance: {attendance_result['synced']} synced, {attendance_result['failed']} failed")

    def _manage_enrollment(self) -> None:
        """Manage fingerprint enrollment"""
        if not self.enrollment_service:
            print("❌ Enrollment service not initialized")
            return

        while True:
            print("\n" + "-" * 30)
            print("🖐️  FINGERPRINT ENROLLMENT")
            print("-" * 30)
            print("1. Show enrollment status")
            print("2. Enroll new fingerprint")
            print("3. Verify fingerprint")
            print("4. Back to main menu")

            choice = input("\nSelect option (1-4): ").strip()

            if choice == "1":
                status = self.enrollment_service.get_enrollment_status()
                print(f"\n📊 Enrollment Status:")
                print(f"   Total Students: {status['total_students']}")
                print(f"   Enrolled: {status['enrolled_count']}")
                print(f"   Not Enrolled: {status['unenrolled_count']}")
                print(f"\n👥 Student Mapping:")
                for student in status['student_mapping']:
                    print(f"   {student['student_id']}: {student['name']} - {student['status']}")

            elif choice == "2":
                try:
                    fingerprint_id = int(input("Enter fingerprint ID to enroll: "))
                    if self.enrollment_service.enroll_fingerprint(fingerprint_id):
                        print("✅ Enrollment successful!")
                    else:
                        print("❌ Enrollment failed!")
                except ValueError:
                    print("❌ Invalid fingerprint ID")

            elif choice == "3":
                try:
                    fingerprint_id = int(input("Enter fingerprint ID to verify: "))
                    if self.enrollment_service.verify_fingerprint(fingerprint_id):
                        print("✅ Verification successful!")
                    else:
                        print("❌ Verification failed!")
                except ValueError:
                    print("❌ Invalid fingerprint ID")

            elif choice == "4":
                break
            else:
                print("❌ Invalid option")

    def _show_status(self) -> None:
        """Show system status"""
        print("\n📊 System Status")
        print("=" * 30)

        # Service status
        print("🔧 Services:")
        print(f"   Attendance: {'✅' if self.attendance_service else '❌'}")
        print(f"   Sync: {'✅' if self.sync_service else '❌'}")
        print(f"   Enrollment: {'✅' if self.enrollment_service else '❌'}")

        # Sync status
        if self.sync_service:
            sync_status = self.sync_service.get_sync_status()
            print("\n🔄 Sync Status:")
            print(f"   Online: {'✅' if sync_status['is_online'] else '❌'}")
            print(f"   Unsynced Records: {sync_status['unsynced_records']}")
            print(f"   Total Students: {sync_status['total_students']}")

        # Attendance status
        if self.attendance_service:
            print("\n🖐️  Attendance:")
            print(f"   Running: {'✅' if self.attendance_service.is_running else '❌'}")
            print(f"   Today's Marks: {len(self.attendance_service.marked_today)}")

    def _run_diagnostics(self) -> None:
        """Run system diagnostics"""
        print("\n🔍 Running System Diagnostics...")
        print("=" * 40)

        issues = []

        # Check configuration
        config_errors = config.validate()
        if config_errors:
            issues.extend(config_errors)

        # Check services
        if not self.attendance_service:
            issues.append("Attendance service not initialized")
        if not self.sync_service:
            issues.append("Sync service not initialized")
        if not self.enrollment_service:
            issues.append("Enrollment service not initialized")

        # Check sensor
        if self.enrollment_service and not self.enrollment_service.initialize_sensor():
            issues.append("Cannot connect to fingerprint sensor")

        # Check database
        try:
            from local_db import LocalAttendanceDB
            db = LocalAttendanceDB()
            # Try a simple query
            db.get_all_students()
        except Exception as e:
            issues.append(f"Database error: {e}")

        if issues:
            print("❌ Issues found:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("✅ All systems operational!")

    def _configure_system(self) -> None:
        """Configure system settings"""
        print("\n⚙️  System Configuration")
        print("=" * 30)

        current_config = config.get_all()
        for key, value in current_config.items():
            print(f"{key}: {value}")

        print("\n📝 To change settings, edit environment variables or config files")
        print("Example: export ATTENDANCE_API_URL='your-api-url'")

    def _signal_handler(self, signum, frame) -> None:
        """Handle system signals"""
        print(f"\n🛑 Received signal {signum}")
        self.stop()
        sys.exit(0)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Attendance System Service")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")

    args = parser.parse_args()

    # Initialize and start service
    service = AttendanceSystemService()

    if args.daemon:
        # Run as daemon (basic implementation)
        print("🔄 Starting as daemon...")
        try:
            while True:
                service.start()
                time.sleep(1)  # Restart if service exits
        except KeyboardInterrupt:
            service.stop()
    else:
        # Run interactively
        service.start()


if __name__ == "__main__":
    main()