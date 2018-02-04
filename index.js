const Influx = require('influx');
const SpeedTest = require('speedtest-net');
const Cron = require('node-cron');

const INFLUX_DB_HOST = process.env.INFLUX_DB_HOST || "influxdb.rydbir.local";

const speedTestDb = new Influx.InfluxDB({
  host: INFLUX_DB_HOST,
  database: 'speedtest',
  schema: [
    {
      measurement: 'throughput',
      fields: {
        downloadSpeed: Influx.FieldType.FLOAT,
        uploadSpeed: Influx.FieldType.FLOAT,
        clientIp: Influx.FieldType.STRING,
        clientIsp: Influx.FieldType.STRING,
        testServerHost: Influx.FieldType.STRING,
        testServerLocation: Influx.FieldType.STRING,
        testServerPing: Influx.FieldType.FLOAT,
      },
      tags: [
        'cc', 'location', 'isp', 'ip', 'server'
      ]
    },
  ],
});

setupDb()
.then(() => {
  Cron.schedule('* * * * *', () => {
    console.log('Scheduled collect');
    collectSpeedData().then(() => {
      console.log('Done');
    }).catch(console.error);
  });
})
.catch(console.error);

// Functions

function setupDb() {
  return new Promise((resolve, reject) => {
    speedTestDb.getDatabaseNames().then(names => {
      if (!names.find(n => n === 'speedtest')) {
        speedTestDb.createDatabase('speedtest').then(resolve).catch(reject);
      }
      resolve();
    }).catch(reject);
  });
}

function collectSpeedData() {
  return new Promise((resolve, reject) => {
    console.log('About to measure the speed');
    const speedTestApi = SpeedTest({ maxTime: 5000 });
    speedTestApi.on('data', data => {
      let points = [];
      points.push({
        measurement: 'throughput',
        fields: {
          downloadSpeed: data.speeds.download,
          uploadSpeed: data.speeds.upload,
          clientIp: data.client.ip,
          clientIsp: data.client.isp,
          testServerHost: data.server.host,
          testServerLocation: data.server.location,
          testServerPing: data.server.ping,
        },
        tags: { cc: data.server.cc, location: data.server.location, isp: data.client.isp, ip: data.client.ip, server: data.server.host },
        timestamp: Date.now() + '000000',
      });
      speedTestDb.writePoints(points)
      .then(() => {
        console.log("Speedtest data for '" + data.client.ip + "' collected and sent to Influx DB");
        resolve();          
      })
      .catch(e => {
        reject(e.message);
      });
    });
    speedTestApi.on('error', err => {
      console.error(err);
      reject('speedtest error');
    });
  });
}