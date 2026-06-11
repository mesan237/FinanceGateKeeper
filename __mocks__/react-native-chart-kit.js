// Manual mock for react-native-chart-kit. The real library renders SVG, which
// never runs under Jest — tests only assert that wrappers render and pass props.
module.exports = { BarChart: 'BarChart', PieChart: 'PieChart', LineChart: 'LineChart' };
