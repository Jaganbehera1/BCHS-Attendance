import serial
import struct
import time

class FingerprintSensor:
    """Interface with R307/AS608 fingerprint sensor"""

    STARTCODE = 0xEF01
    COMMAND_PACKET = 0x01
    DATA_PACKET = 0x02
    RESULT_PACKET = 0x07

    CMD_GET_IMG = 0x01
    CMD_IMG2TZ = 0x02
    CMD_MATCH = 0x03
    CMD_SEARCH = 0x04
    CMD_REGMODEL = 0x05
    CMD_STORE = 0x06
    CMD_LOAD = 0x07
    CMD_DPSYS = 0x0E
    CMD_EMPTYDATABASE = 0x0D
    CMD_LEDON = 0x50
    CMD_LEDOFF = 0x51

    def __init__(self, port='/dev/ttyUSB0', baudrate=57600, timeout=1):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial = None
        self.connect()

    def connect(self):
        """Connect to fingerprint sensor"""
        try:
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            print(f"Connected to fingerprint sensor on {self.port}")
            return True
        except serial.SerialException as e:
            print(f"Failed to connect: {e}")
            return False

    def disconnect(self):
        """Disconnect from sensor"""
        if self.serial and self.serial.is_open:
            self.serial.close()
            print("Disconnected from fingerprint sensor")

    def send_command(self, command, data=None):
        """Send command to sensor"""
        if data is None:
            data = []

        packet = self._build_packet(command, data)
        self.serial.write(packet)
        return self._read_response()

    def _build_packet(self, command, data):
        """Build command packet for sensor"""
        if isinstance(data, int):
            data = [data]

        packet = struct.pack('>H', self.STARTCODE)
        packet += struct.pack('>H', 0xFFFFFFFF & 0xFFFF)
        packet += struct.pack('>B', self.COMMAND_PACKET)

        length = len(data) + 2
        packet += struct.pack('>H', length)
        packet += struct.pack('>B', command)

        for byte in data:
            packet += struct.pack('>B', byte)

        checksum = sum([self.COMMAND_PACKET, length >> 8, length & 0xFF, command] + data)
        packet += struct.pack('>H', checksum & 0xFFFF)

        return packet

    def _read_response(self):
        """Read response from sensor"""
        try:
            header = self.serial.read(4)
            if len(header) < 4:
                return None, 0

            start_code = struct.unpack('>H', header[0:2])[0]
            packet_type = header[3]

            if start_code != self.STARTCODE:
                return None, 0

            length_bytes = self.serial.read(2)
            length = struct.unpack('>H', length_bytes)[0]

            data = self.serial.read(length)

            return data, packet_type
        except Exception as e:
            print(f"Error reading response: {e}")
            return None, 0

    def get_image(self):
        """Capture fingerprint image"""
        data, packet_type = self.send_command(self.CMD_GET_IMG)
        if data and data[0] == 0x00:
            return True
        return False

    def image_to_tz(self, slot=1):
        """Convert image to template"""
        data, packet_type = self.send_command(self.CMD_IMG2TZ, [slot])
        if data and data[0] == 0x00:
            return True
        return False

    def search(self):
        """Search for fingerprint match"""
        data, packet_type = self.send_command(self.CMD_SEARCH, [0x01, 0x00, 0x00, 0x00])
        if data and len(data) >= 4 and data[0] == 0x00:
            finger_id = (data[1] << 8) | data[2]
            score = (data[3] << 8) | data[4] if len(data) > 4 else 0
            return finger_id, score
        return None, 0

    def store_template(self, finger_id):
        """Store template in sensor"""
        data, packet_type = self.send_command(self.CMD_STORE, [0x01, (finger_id >> 8) & 0xFF, finger_id & 0xFF])
        if data and data[0] == 0x00:
            return True
        return False

    def enroll_fingerprint(self, finger_id):
        """Enroll new fingerprint"""
        print(f"Enrolling fingerprint ID {finger_id}...")

        print("Place finger on sensor...")
        while not self.get_image():
            time.sleep(0.1)
        print("Image captured. Remove finger.")

        if not self.image_to_tz(1):
            print("Failed to convert image to template")
            return False

        time.sleep(2)
        print("Place same finger again...")
        while not self.get_image():
            time.sleep(0.1)
        print("Image captured. Remove finger.")

        if not self.image_to_tz(2):
            print("Failed to convert second image")
            return False

        data, _ = self.send_command(self.CMD_REGMODEL)
        if data and data[0] == 0x00:
            if self.store_template(finger_id):
                print(f"Fingerprint {finger_id} enrolled successfully")
                return True

        print("Failed to create model")
        return False

    def led_on(self):
        """Turn on LED"""
        self.send_command(self.CMD_LEDON)

    def led_off(self):
        """Turn off LED"""
        self.send_command(self.CMD_LEDOFF)


def test_sensor(port='/dev/ttyUSB0'):
    """Test sensor connection"""
    sensor = FingerprintSensor(port=port)

    if sensor.serial and sensor.serial.is_open:
        sensor.led_on()
        time.sleep(1)
        sensor.led_off()
        sensor.disconnect()
        return True
    return False
