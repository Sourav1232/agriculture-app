import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import axios from 'axios';
import './SensorTable.css';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwqbfadHJ8PISPJBGoTcM4wjd7yG1fIVbNukXgzcmJnD8Mqij-wbPrTt-yyIw3w34NfIg/exec';

const SensorTable = () => {
  const [moistureData, setMoistureData] = useState([['0', '0', '0']]);
  const [co2Data, setCo2Data] = useState([['0', '0', '0']]);
  const [temperatureData, setTemperatureData] = useState(['0']);
  const [humidityData, setHumidityData] = useState(['0']);

  const [showChart, setShowChart] = useState({
    moisture: false,
    co2: false,
    temperature: false,
    humidity: false,
  });

  const [lastProcessedIndex, setLastProcessedIndex] = useState(-1);
  const [sensorDataSet, setSensorDataSet] = useState([]); // Store the entire dataset

  const [chartRange, setChartRange] = useState(0); // Keep track of the current chart range (offset for pagination)

  const toggleChart = (sensorType) => {
    setShowChart((prevState) => ({
      ...prevState,
      [sensorType]: !prevState[sensorType],
    }));
  };

  useEffect(() => {
    const processSensorData = (sensorData) => {
      if (sensorData.length > 0 && lastProcessedIndex < sensorData.length - 1) {
        const newIndex = lastProcessedIndex + 1;
        const currentEntry = sensorData[newIndex];
  
        setMoistureData((prev) => [...prev, [currentEntry.soilMoisture_sensor1, currentEntry.soilMoisture_sensor2, currentEntry.soilMoisture_sensor3]]);
        setCo2Data((prev) => [...prev, [currentEntry.gas_sensor1, currentEntry.gas_sensor2, currentEntry.gas_sensor3]]);
        setTemperatureData((prev) => [...prev, currentEntry.temperature]);
        setHumidityData((prev) => [...prev, currentEntry.humidity]);
  
        setLastProcessedIndex(newIndex);
        setSensorDataSet(sensorData); // Save the full dataset
      }
    };
  
    const fetchData = async () => {
      try {
        const response = await axios.get(GOOGLE_SCRIPT_URL);
        const sensorData = response.data;
        processSensorData(sensorData);
      } catch (error) {
        console.error('Error fetching data from Google Sheets', error);
      }
    };
  
    const interval = setInterval(fetchData, 10000);
    fetchData();
  
    return () => clearInterval(interval);
  }, [lastProcessedIndex]);

  const exportToExcel = () => {
    const excelData = [
      [
        'Soil Moisture Sensor 1',
        'Soil Moisture Sensor 2',
        'Soil Moisture Sensor 3',
        'CO2 Sensor 1',
        'CO2 Sensor 2',
        'CO2 Sensor 3',
        'Temperature',
        'Humidity',
        'Date',
        'Time',
      ],
    ];

    sensorDataSet.forEach((entry) => {
      excelData.push([
        entry.soilMoisture_sensor1,
        entry.soilMoisture_sensor2,
        entry.soilMoisture_sensor3,
        entry.gas_sensor1,
        entry.gas_sensor2,
        entry.gas_sensor3,
        entry.temperature,
        entry.humidity,
        new Date(entry.date).toLocaleDateString(),
        new Date(entry.time).toLocaleTimeString(),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sensor Data');
    XLSX.writeFile(workbook, 'sensor_data.xlsx');
  };

  const generateChartLabels = () => {
    const length = sensorDataSet.length;
    const start = Math.max(0, length - 10 - chartRange * 10); // Show 10 data points based on chartRange
    const end = Math.min(start + 10, length);

    return sensorDataSet.slice(start, end).map((entry) => {
      const date = new Date(entry.time);
      return date.toLocaleTimeString(); // Use actual time for labels
    });
  };

  const chartData = (labels, sensor1Data, sensor2Data, sensor3Data, labelPrefix) => {
    const length = sensor1Data.length;
    const start = Math.max(0, length - 10 - chartRange * 10); // Same start-end logic for the chart
    const end = Math.min(start + 10, length);

    const isMultipleSensors = labelPrefix === 'Soil Moisture' || labelPrefix === 'CO2';

    const datasets = isMultipleSensors
      ? [
          {
            label: `${labelPrefix} Sensor 1`,
            data: sensor1Data.slice(start, end), // Slice data for sensor 1
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: false,
          },
          {
            label: `${labelPrefix} Sensor 2`,
            data: sensor2Data.slice(start, end), // Slice data for sensor 2
            borderColor: 'rgba(54, 162, 235, 1)',
            fill: false,
          },
          {
            label: `${labelPrefix} Sensor 3`,
            data: sensor3Data.slice(start, end), // Slice data for sensor 3
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false,
          },
        ]
      : [
          {
            label: `${labelPrefix} Sensor`,
            data: sensor1Data.slice(start, end), // Single sensor data slicing
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: false,
          },
        ];

    return {
      labels: labels,
      datasets: datasets,
    };
  };


  const handlePrevious = () => {
    const maxRange = Math.ceil(sensorDataSet.length / 10) - 1;
    if (chartRange < maxRange) {
      setChartRange((prev) => prev + 1); // Move to the previous set of data
    }
  };
  
  const handleNext = () => {
    if (chartRange > 0) {
      setChartRange((prev) => prev - 1); // Move to the next (more recent) set of data
    }
  };
  
  

  return (
    <div className="sensor-container">
      <h1>Agriculture Project</h1>
      <button onClick={exportToExcel} className="export-button">
        Export to Excel
      </button>

      {/* Moisture Sensors Table */}
      <div className="table-container">
        <h2>Soil Moisture Sensors</h2>
        <table className="sensor-table">
          <thead>
            <tr>
              <th>Sensor 1</th>
              <th>Sensor 2</th>
              <th>Sensor 3</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {moistureData.slice(-10).map((row, rowIndex) => (
              <tr key={`moisture-row-${rowIndex}`}>
                {row.map((value, index) => (
                  <td key={`moisture-${index}`}>{value}</td>
                ))}
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + rowIndex]?.date).toLocaleDateString()}</td>
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + rowIndex]?.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => toggleChart('moisture')} className="chart-button">
          Show/Hide Chart
        </button>
        {showChart.moisture && (
          <>
            <Line
              data={chartData(
                generateChartLabels(),
                moistureData.map((data) => data[0]),
                moistureData.map((data) => data[1]),
                moistureData.map((data) => data[2]),
                'Soil Moisture'
              )}
            />
            <div className="chart-navigation">
              <button onClick={handlePrevious} className="nav-button" disabled={chartRange >= Math.floor(moistureData.length / 10)}>
                {'<'}
              </button>
              <button onClick={handleNext} className="nav-button" disabled={chartRange === 0}>
                {'>'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* CO2 Sensors Table */}
      <div className="table-container">
        <h2>CO2 Sensors</h2>
        <table className="sensor-table">
          <thead>
            <tr>
              <th>Sensor 1</th>
              <th>Sensor 2</th>
              <th>Sensor 3</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {co2Data.slice(-10).map((row, rowIndex) => (
              <tr key={`co2-row-${rowIndex}`}>
                {row.map((value, index) => (
                  <td key={`co2-${index}`}>{value}</td>
                ))}
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + rowIndex]?.date).toLocaleDateString()}</td>
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + rowIndex]?.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => toggleChart('co2')} className="chart-button">
          Show/Hide Chart
        </button>
        {showChart.co2 && (
          <>
            <Line
              data={chartData(
                generateChartLabels(),
                co2Data.map((data) => data[0]),
                co2Data.map((data) => data[1]),
                co2Data.map((data) => data[2]),
                'CO2'
              )}
            />
            <div className="chart-navigation">
              <button onClick={handlePrevious} className="nav-button" disabled={chartRange >= Math.floor(co2Data.length / 10)}>
                {'<'}
              </button>
              <button onClick={handleNext} className="nav-button" disabled={chartRange === 0}>
                {'>'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Temperature Table */}
      <div className="table-container">
        <h2>Temperature Sensor</h2>
        <table className="sensor-table">
          <thead>
            <tr>
              <th>Temperature</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {temperatureData.slice(-10).map((value, index) => (
              <tr key={`temperature-row-${index}`}>
                <td>{value}</td>
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + index]?.date).toLocaleDateString()}</td>
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + index]?.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => toggleChart('temperature')} className="chart-button">
          Show/Hide Chart
        </button>
        {showChart.temperature && (
          <>
            <Line
              data={chartData(generateChartLabels(), temperatureData, [], [], 'Temperature')}
            />
            <div className="chart-navigation">
              <button onClick={handlePrevious} className="nav-button" disabled={chartRange >= Math.floor(temperatureData.length / 10)}>
                {'<'}
              </button>
              <button onClick={handleNext} className="nav-button" disabled={chartRange === 0}>
                {'>'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Humidity Table */}
      <div className="table-container">
        <h2>Humidity Sensor</h2>
        <table className="sensor-table">
          <thead>
            <tr>
              <th>Humidity</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {humidityData.slice(-10).map((value, index) => (
              <tr key={`humidity-row-${index}`}>
                <td>{value}</td>
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + index]?.date).toLocaleDateString()}</td>
                <td>{new Date(sensorDataSet[sensorDataSet.length - 10 + index]?.time).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => toggleChart('humidity')} className="chart-button">
          Show/Hide Chart
        </button>
        {showChart.humidity && (
          <>
            <Line
              data={chartData(generateChartLabels(), humidityData, [], [], 'Humidity')}
            />
            <div className="chart-navigation">
              <button onClick={handlePrevious} className="nav-button" disabled={chartRange >= Math.floor(humidityData.length / 10)}>
                {'<'}
              </button>
              <button onClick={handleNext} className="nav-button" disabled={chartRange === 0}>
                {'>'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SensorTable;
