import React from 'react';
import { 
  Lightbulb, 
  Thermometer, 
  PowerPlug, 
  DoorClosed, 
  Camera, 
  Lock, 
  Cpu, 
  Wifi, 
  WifiOff, 
  AlertTriangle 
} from 'lucide-react-native';

export const parseDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')) {
    return new Date(date + 'Z');
  }
  return new Date(date);
};

export const getDeviceStatus = (device) => {
  if (!device) return "offline";
  
  if (device.status === 'offline') return 'offline';

  if (device.last_active) {
    const lastActive = parseDate(device.last_active);
    const now = new Date();
    const secondsSinceActive = (now - lastActive) / 1000;
    
    if (secondsSinceActive > 60) {
      return "offline";
    }
    return "online";
  }
  
  return device.status || "offline";
};

export const getDeviceIcon = (type, size = 24, color = "#FFFFFF") => {
  const iconProps = { size, color, strokeWidth: 2 };
  switch (type) {
    case "light": return <Lightbulb {...iconProps} />;
    case "thermostat": return <Thermometer {...iconProps} />;
    case "plug": return <PowerPlug {...iconProps} />;
    case "door": return <DoorClosed {...iconProps} />;
    case 'camera': return <Camera {...iconProps} />;
    case 'lock': return <Lock {...iconProps} />;
    default: return <Cpu {...iconProps} />;
  }
};

export const getStatusIcon = (status, size = 16) => {
  switch (status) {
    case "online": return <Wifi size={size} color="#10B981" strokeWidth={2.5} />;
    case "offline": return <WifiOff size={size} color="#EF4444" strokeWidth={2.5} />;
    case "warning": return <AlertTriangle size={size} color="#F59E0B" strokeWidth={2.5} />;
    default: return null;
  }
};
