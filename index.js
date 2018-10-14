var fs = require('fs');
const dgram = require('dgram');
var Accessory, Service, Characteristic, UUIDGen;

const MULTICAST_ADDR = "233.255.255.255";
const PORT_352AIR_SENSOR = 11530;

module.exports = function(homebridge) {
  if(!isConfig(homebridge.user.configPath(), "accessories", "The352AirQuality")) {
    return;
  }

  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerAccessory('homebridge-352airquality', 'The352AirQuality', The352AirQuality);
}

function isConfig(configFile, type, name) {
  var config = JSON.parse(fs.readFileSync(configFile));
  if("accessories" === type) {
    var accessories = config.accessories;
    for(var i in accessories) {
      if(accessories[i]['accessory'] === name) {
        return true;
      }
    }
  } else if("platforms" === type) {
    var platforms = config.platforms;
    for(var i in platforms) {
      if(platforms[i]['platform'] === name) {
        return true;
      }
    }
  } else {
  }

  return false;
}

function The352AirQuality(log, config) {
  if(null == config) {
    return;
  }

  this.log = log;
  this.config = config;

  var that = this;
  udpServer = dgram.createSocket({type:"udp4", reuseAddr:true, });

  udpServer.on('error', (err) => {
    that.log.debug(`udpServer error:\n${err.stack}`);
    udpServer.close();
  });

  udpServer.on('message', (msg, rinfo) => {
    var buf = Buffer.from(msg);
    if (buf.length != 33 || buf[0] != 0xA1) {
      return;
    }
    var ipAddr = `${rinfo.address}:${rinfo.port}`;
    var macAddr = buf.slice(2, 8).toString('hex');
    var pm25 = buf.slice(19, 21).readUInt16BE();

    that.result = {
      pm25: pm25,
      ipAddr: ipAddr,
      macAddr: macAddr,
    };
    that.log.debug("Received from sensor: " + JSON.stringify(that.result));
  });

  udpServer.on('listening', () => {
    udpServer.addMembership(MULTICAST_ADDR);
    const address = udpServer.address();
    that.log.debug(`udpServer listening ${address.address}:${address.port}`);
    that.result = {};
  });

  udpServer.bind(PORT_352AIR_SENSOR);
}

The352AirQuality.prototype = {
  identify: function(callback) {
    callback();
  },

  getServices: function() {
    var that = this;
    var services = [];

    var infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, "352Air")
      .setCharacteristic(Characteristic.Model, "PM2.5 Sensor")
      .setCharacteristic(Characteristic.SerialNumber, "Undefined");
    services.push(infoService);

    var pm25Service = new Service.AirQualitySensor(this.config['name']);
    var pm2_5Characteristic = pm25Service.addCharacteristic(Characteristic.PM2_5Density);
    pm25Service
      .getCharacteristic(Characteristic.AirQuality)
      .on(
        'get',
        function(callback) {
          this.log.debug("Return PM2.5 result:" + JSON.stringify(this.result));
          var density = NaN; // µg/m3
          var quality = Characteristic.AirQuality.UNKNOWN;
          if (this.result) {
            density = this.result.pm25;
            if (density <= 5) {
              quality = Characteristic.AirQuality.EXCELLENT;
            }else if (density <= 12) {
              quality = Characteristic.AirQuality.GOOD;
            }else if (density <= 35) {
              quality = Characteristic.AirQuality.FAIR;
            }else if (density <= 55) {
              quality = Characteristic.AirQuality.INFERIOR;
            }else {
              quality = Characteristic.AirQuality.POOR;
            }
          }

          pm2_5Characteristic.updateValue(density);
          callback(null, quality);
        }.bind(this)
      );

    services.push(pm25Service);

    return services;
  }
}
