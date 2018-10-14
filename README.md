# homebridge-352air


- [homebridge](https://github.com/nfarina/homebridge)
- [352 PM2.5 检测仪](http://www.352air.com/jianceyi1/index.html)


## Example config

```json
{
  "bridge": {
      "name": "Homebridge",
      "username": "CC:22:3D:E3:CE:30",
      "port": 51826,
      "pin": "031-45-154"
    },
  "description": "This is an example configuration file with one Hygrotermograph accessory. You can use this as a template for creating your own configuration file containing devices you actually own.",
  "accessories": [
      {
            "accessory": "The352AirQuality",
            "name": "PM2.5",
            "timeout": 10
      }
    ]
}
```

## Screenshot

![](.github/apple-homkit-352air-screenshot.png)
