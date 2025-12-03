// LineChartWidget.js
import React from "react";
import { View } from "react-native";
import { VictoryChart, VictoryLine, VictoryTheme } from "victory-native";

const LineChartWidget = ({ data }) => {
  return (
    <View>
      <VictoryChart theme={VictoryTheme.material}>
        <VictoryLine
          data={data}
          interpolation="natural"
          style={{ data: { strokeWidth: 3 } }}
        />
      </VictoryChart>
    </View>
  );
};

export default LineChartWidget;
