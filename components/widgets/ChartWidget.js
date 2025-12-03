import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import api from "../../services/api";

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = screenWidth / 2 - 60;
const CHART_HEIGHT = 120;

const ChartWidget = ({ title, deviceId, config, isDarkTheme, lastUpdated }) => {
  const [chartData, setChartData] = useState(null);
  const [yAxisValues, setYAxisValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const Colors = {
    background: isDarkTheme ? "#111827" : "#FFFFFF",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#9CA3AF" : "#475569",
  };

  // Generate correct Y-axis scale
  const generateYAxisTicks = (data, ticks = 5) => {
    const min = Math.min(...data);
    const max = Math.max(...data);

    const diff = max - min || 1;
    const step = diff / (ticks - 1);

    const arr = [];
    for (let i = 0; i < ticks; i++) {
      arr.push((min + step * i).toFixed(1));
    }
    return arr.reverse(); // top → bottom
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!deviceId || !config?.key) {
        setError("Missing device or key");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const history = await api.getTelemetryHistory(deviceId, config.key, "24h");

        if (!history || history.length === 0) {
          setError("No Data");
          return;
        }

        const values = history.map(h => Number(h.value));
        const labelsFull = history.map(h =>
          new Date(h.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        );

        // Reduce X-axis labels (5 labels max)
        const labelStep = Math.ceil(labelsFull.length / 5);
        const xLabels = labelsFull.map((l, i) => (i % labelStep === 0 ? l : ""));

        setChartData({
          labels: xLabels,
          datasets: [{ data: values, strokeWidth: 2 }],
        });

        setYAxisValues(generateYAxisTicks(values));
      } catch (err) {
        console.log("Chart Error:", err);
        setError("Error loading chart");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [deviceId, config?.key, lastUpdated]);

  const chartConfig = {
    backgroundGradientFrom: Colors.background,
    backgroundGradientTo: Colors.background,
    color: () => Colors.primary,
    decimalPlaces: 1,
    propsForDots: {
      r: "3",
      strokeWidth: "1",
      stroke: Colors.primary,
    },
    propsForLabels: {
      fontSize: 8,
      fill: Colors.textSecondary,
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (error || !chartData) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <Text style={{ color: Colors.textSecondary }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Text style={[styles.title, { color: Colors.text }]}>{title}</Text>

      <View style={{ flexDirection: "row", width: "100%" }}>
        {/* Y-Axis Labels */}
        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {yAxisValues.map((v, idx) => (
            <Text key={idx} style={{ fontSize: 10, color: Colors.textSecondary }}>
              {v}
            </Text>
          ))}
        </View>

        {/* Chart */}
        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          chartConfig={chartConfig}
          withDots={true}
          withShadow={false}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={false}
          bezier
          style={styles.chart}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  yAxis: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginRight: 4,
  },
  chart: {
    borderRadius: 12,
  },
});

export default ChartWidget;
