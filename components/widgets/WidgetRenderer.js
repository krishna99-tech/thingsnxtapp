import React from "react";

// 🧩 Import all individual widget components
import CardWidget from './CardWidget';
import GaugeWidget from './GaugeWidget';
import IndicatorWidget from './IndicatorWidget';
import LEDControlWidget from './LEDControlWidget';
import ChartWidget from './ChartWidget';
import BatteryWidget from './BatteryWidget';
import ConnectivityWidget from './ConnectivityWidget';
import DigitalValueCard from './DigitalValueCard';
import EnergyBarWidget from './EnergyBarWidget';
import StatusIndicator from './StatusIndicator';
import TankLevelWidget from './TankLevelWidget';
import ThermometerWidget from './ThermometerWidget';
import LineChartWidget from './LineChartWidget'

// 🗺️ Create a mapping from widget type to component
const WIDGET_COMPONENTS = {
  gauge: GaugeWidget,
  indicator: IndicatorWidget,
  status: StatusIndicator,
  led: LEDControlWidget,
  chart: ChartWidget,
  battery: BatteryWidget,
  connectivity: ConnectivityWidget,
  digital: DigitalValueCard,
  energy: EnergyBarWidget,
  tank: TankLevelWidget,
  thermometer: ThermometerWidget,
  card: CardWidget, // Default fallback
  line_chart: LineChartWidget,
};

/**
 * WidgetRenderer dynamically selects and renders the correct widget component
 * based on the widget's type and passes down the necessary props.
 */
const WidgetRenderer = ({ item, isDarkTheme, onLongPress, onDelete }) => {
  if (!item) return null;

  // Select the component from the map, or fall back to CardWidget
  const WidgetComponent = WIDGET_COMPONENTS[item.type] || WIDGET_COMPONENTS.card;

  // Base props shared by most widgets
  const baseProps = {
    title: item.label,
    isDarkTheme,
  };

  // Dynamically build props based on widget type
  let props = { ...baseProps };

  switch (item.type) {
    case "gauge":
    case "indicator":
    case "status":
    case "card":
    case "digital":
    case "energy":
    case "tank":
    case "thermometer":
    case "battery":
      props = { ...props, value: item.value, telemetry: item.telemetry?.[item.config?.key] };
      break;
    case "connectivity":
      const isOnline = item.value === 'online' || item.telemetry?.[item.config?.key] === 'online';
      props = { ...props, online: isOnline };
      break;
    case "led":
      // onDelete is handled by the edit overlay, onLongPress is passed for scheduling modals
      props = { ...props, widgetId: item._id, deviceId: item.device_id, deviceToken: item.device_token, virtualPin: item.virtual_pin, initialState: !!item.value, nextSchedule: item.next_schedule, onLongPress: () => onLongPress(item._id) };
      break;
    case "chart":
      props = { ...props, deviceId: item.device_id, config: item.config, lastUpdated: item.lastUpdated };
      break;
    default: // Fallback for any other type, treating it like a 'card'
      props = { ...props, value: item.value, telemetry: item.telemetry?.[item.config?.key], icon: item.config?.icon };
  }

  return <WidgetComponent {...props} />;
};

export default WidgetRenderer;