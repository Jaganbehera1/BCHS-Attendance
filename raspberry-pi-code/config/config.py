"""
Configuration Module
Centralized configuration management
"""

import os
from typing import Dict, Any

class Config:
    """Configuration management for the attendance system"""

    def __init__(self):
        # Default configuration
        self._config = {
            # API Settings
            "api_url": "https://your-project.supabase.co/functions/v1/mark-attendance",
            "supabase_url": "https://your-project.supabase.co",
            "supabase_anon_key": "your-supabase-anon-key",

            # Hardware Settings
            "sensor_port": "/dev/ttyUSB0",
            "baudrate": 57600,

            # Service Settings
            "cooldown_period": 10,  # seconds between scans
            "sync_interval": 3600,  # seconds (1 hour)
            "reset_marks_daily": True,

            # Database Settings
            "local_db_path": "attendance_local.db",

            # Logging
            "log_level": "INFO",
            "log_file": "attendance_system.log"
        }

        # Load from environment variables
        self._load_from_env()

    def _load_from_env(self) -> None:
        """Load configuration from environment variables"""
        env_mapping = {
            "ATTENDANCE_API_URL": "api_url",
            "SUPABASE_URL": "supabase_url",
            "SUPABASE_ANON_KEY": "supabase_anon_key",
            "SENSOR_PORT": "sensor_port",
            "BAUDRATE": "baudrate",
            "COOLDOWN_PERIOD": "cooldown_period",
            "SYNC_INTERVAL": "sync_interval",
            "LOCAL_DB_PATH": "local_db_path",
            "LOG_LEVEL": "log_level",
            "LOG_FILE": "log_file"
        }

        for env_var, config_key in env_mapping.items():
            value = os.getenv(env_var)
            if value is not None:
                # Convert string values to appropriate types
                if config_key in ["baudrate", "cooldown_period", "sync_interval"]:
                    try:
                        self._config[config_key] = int(value)
                    except ValueError:
                        pass
                elif config_key in ["reset_marks_daily"]:
                    self._config[config_key] = value.lower() in ('true', '1', 'yes')
                else:
                    self._config[config_key] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self._config.get(key, default)

    def set(self, key: str, value: Any) -> None:
        """Set configuration value"""
        self._config[key] = value

    def get_all(self) -> Dict[str, Any]:
        """Get all configuration"""
        return self._config.copy()

    def validate(self) -> List[str]:
        """Validate configuration"""
        errors = []

        # Check required fields
        required_fields = ["api_url", "supabase_url", "supabase_anon_key"]
        for field in required_fields:
            if not self._config.get(field) or self._config[field].startswith("your-"):
                errors.append(f"Required field '{field}' not properly configured")

        # Check sensor port exists (basic check)
        if not os.path.exists(self._config["sensor_port"]):
            errors.append(f"Sensor port {self._config['sensor_port']} not found")

        return errors

# Global configuration instance
config = Config()