import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { LineChart, ContributionGraph } from "react-native-chart-kit";
import api from "../services/api";

const screenWidth = Dimensions.get("window").width;

// Fit inside a 2-column draggable grid (safe margin)
const CHART_WIDTH = screenWidth / 2 - 70;

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

  // Auto generate Y-axis
  const generateYAxisTicks = (data, points = 4) => {
    if (!data || data.length === 0) return [0, 50, 100];

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);

    if (minVal === maxVal) return [minVal - 1, minVal, minVal + 1].map(v => Number(v.toFixed(1)));

    const range = maxVal - minVal;
    const step = range > 0 ? range / (points - 1) : 1;
    const ticks = [];

    for (let i = 0; i < points; i++) {
      ticks.push(Number((minVal + i * step).toFixed(1)));
    }
    // Return in descending order for rendering from top to bottom
    return ticks.reverse();
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
          setChartData({ labels: [], datasets: [{ data: [] }] });
          return;
        }

        const labelsFull = history.map(h =>
          new Date(h.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        );

        const values = history.map(h => Number(h.value));

        const simplifiedLabels = labelsFull.map((l, i) =>
          i % Math.ceil(labelsFull.length / 5) === 0 ? l : ""
        );

        setChartData({
          labels: simplifiedLabels,
          datasets: [
            {
              data: values,
              strokeWidth: 2,
              color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
            },
          ],
        });

        setYAxisValues(generateYAxisTicks(values));
      } catch (err) {
        console.log("Chart fetch error:", err);
        setError("Could not load chart");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [deviceId, config?.key, lastUpdated]);

  const chartConfig = {
    backgroundGradientFrom: Colors.background,
    backgroundGradientTo: Colors.background,
    color: (opacity = 1) => `rgba(120, 130, 150, ${opacity})`,
    decimalPlaces: 1,
    propsForDots: {
      r: "3",
      strokeWidth: "1",
      stroke: Colors.primary,
    },
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }

  // Error / No data
  if (error || !chartData || chartData.datasets[0].data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: "center" }]}>
        <Text style={{ color: Colors.textSecondary }}>{error || "No data"}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Text style={[styles.title, { color: Colors.text }]}>{title}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
        {/* Y-axis ticks */}
        <View style={[styles.yAxisContainer, { height: CHART_HEIGHT }]}>
          {yAxisValues.map((v, i) => (
            <Text key={i} style={{ color: Colors.textSecondary, fontSize: 10 }}>
              {v}
            </Text>
          ))}
        </View>


        {/* Chart component */}
        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={120}
          chartConfig={chartConfig}
          withVerticalLabels={false} // Disable default Y-axis labels
          withInnerLines={false}
          withOuterLines={false}
          bezier
          style={styles.chart}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  yAxisContainer: {
    marginRight: 6,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingVertical: 10, // Adjust to align with chart's internal padding
  },
  chart: {
    borderRadius: 12,
  },
});

export default ChartWidget;
