# DJI_SRT_Parser

Parses and interprets some data from DJI's Drones SRT metadata files.
Mostly tested with Mavic Pro SRT files. You can send me yours if you want it implemented.
Please let me know if you create something with this :).

- Used in [Telemetry Overlay](https://goprotelemetryextractor.com/telemetry-overlay-gps-video-sensors)
- Used for creating the [SRT Viewer](https://djitelemetryoverlay.com/srt-viewer/)
- [Example video](https://youtu.be/zAkUTOLmdmQ) with this code and After Effects

## Installation

Using npm:

```shell
$ npm install dji_srt_parser
```

## Usage

```js
// Load module
let DJISRTParser = require('dji_srt_parser');

// Specify data source name
let fileName = 'filePath.SRT';

// And load the data in a string (with your preferred method)
let dataString = readTextFile(fileName);

// You can create multiple instances, one for reading each SRT file. Specify data as a string and filename for future reference.
let DJIData = DJISRTParser(dataString, fileName);

// You can also especify data and fileName as an array of strings, so you can import multiples files at once.
// When exported to GeoJSON, each one will be exported inside the same GeometryCollection as a separate Feature (LineString).
let fileName2 = 'filePath2.SRT';
let dataString2 = readTextFile(fileName2);
let multi_DJIData = DJISRTParser(
  [dataString, dataString2],
  [fileName, filename2]
);

// toGeoJSON(raw, waypoints, elevationOffset) exports the current interpretation of data to the geoJSON format. The optional value raw exports the raw data instead. The second parameter, waypoints, specifies whether to include a single feature with all the data for each waypoint. The third parameter, elevationOffset, offset the elevation values by the specified meters. You can then use tokml or togpx modules to convert to those formats
let geoJSON = DJIData.toGeoJSON();

// rawMetadata() returns an array of objects with labels and the unmodified SRT data in the form of strings
console.log(DJIData.rawMetadata());

// If mutiple files are imported in the same instance, rawMetadata() will return all the files in the format:
// { "fileName" : ...rawMetadata, "fileName2" : ...rawMetadata2 }
// Alternativally, you can especify the fileName and get only the rawMetadata of that singular file
console.log(multi_DJIData.rawMetadata()); // return all the files
console.log(multi_DJIData.rawMetadata(filename2)); // return only that file

// metadata() returns an object with 2 elements
// (1) a packets array similar to rawMetadata() but with smoothing applied to GPS locations (see below why smoothing is used), distances and with computed speeds in 2d, 3d and vertical
// (2) a stats object containing stats like minimum, average and maximum speeds based on the interpreted data
console.log(DJIData.metadata());

// If mutiple files are imported, metadata() will return all the files in the format:
// { "fileName" : { "packets" : ...data, "stats" : ...data }, ...fileName2 }.
// Alternatively, you can especify the fileName and get only the metadata of that singular file
console.log(multi_DJIData.metadata(filename2)); // return only that file
console.log(multi_DJIData.metadata()); // return all the files

//getSmoothing() returns the current smoothing value (how many data packets to average with, in each array direction)
console.log(DJIData.getSmoothing());
//setSmoothing() modifies the current smoothing value, 0 for no smoothing
// If multiple files are imported, this will be applied to all the files
console.log(DJIData.setSmoothing(0));

//getMillisecondsPerSamples() returns the current millisecondsPerSamples value. This delimits how many milliseconds have to pass between data packets, useful for scenarios that imply long files, and/or for drones that record in excesive sample rate, like mavic 2 pro (every 40ms.)
console.log(DJIData.getMillisecondsPerSamples());
//setMillisecondsPerSamples() modifies the current sample rate value, 0 for no resample. NOTE: if used in conjuntion with setSmoothing, must be in last position. The discarded packets will not affect the stats and the calculated smooth value.
// If multiple files are imported, this will be applied to all the files
console.log(DJIData.setMillisecondsPerSamples(0));

// setProperties() add custom properties to the features. These are incorporated into the "properties" of each feature in the GeoJSON, and as new columns if it's exported to CSV.
// Use false to clean the properties already added, otherwise use an JSON Object to add data.
let obj = { customProperty: 'value', customProperty2: 123 };
console.log(DJIData.setProperties(obj));

//getFileName() returns the filename, useful if you loaded multiple files in multiple instances
// If multiple files are imported, it's return an array of fileNames
console.log(DJIData.getFileName());

//toCSV() exports the current interpretation of data to CSV format. The optional value raw exports the raw data instead
let csvData = DJIData.toCSV();

//toMGJSON(elevationOffset) exports the current interpretation of data to Adobe's mgJSON format for use in After Effects (see more info below). An elevation offset can be specified in meters.
let mgjsonData = DJIData.toMGJSON();

//Now you can also load a GeoJSON (or JSON) file directly into the rawMetadata field. This can be useful if you want to import data from other sources into the system,
let DJIData = DJISRTParser(
  JSONDataString,
  JSONfileName,
  /* isPreparedData = */ true
);
//These data must follow the same structure as rawMetadata() usually has:
// {
//   "TIMECODE":"00:00:01,000",
//   "HOME":[
//     "149.0251",
//     "-20.2532"
//   ],
//   "DATE":"2017.08.05 14:11:51",
//   "GPS":[
//     "149.0251",
//     "-20.2533",
//     "16"
//   ],
//   "BAROMETER":"1.9",
//   "ISO":"100",
//   "Shutter":"60",
//   "Fnum":"2.2"
// }
```

Smoothing is applied when interpreting the data because the GPS values provided by DJI are not accurate enough. They don't have enough digits. We average them with the surrounding values to create more pleasant paths and to be able to compute somewhat meaningful speeds. The interpreted values are not necessarily more accurate.

## Units of interpreted data

(As far as we know)

- Timecode: HH:MM:SS,FFF
- GPS: degrees (and meters for third value, altitude)
- Date: timestamp in milliseconds (note that the time zone is not specified, could be local where the drone was registered, or flown...)
- Barometer: meters (more accurate than GPS altitude)
- Speed: km/h
- Duration: milliseconds
- Distance: meters
- ISO, shutter and EV (not always present)

## How to use mgJSON files

I gathered some information on the mgJSON format in this repo: [mgJSON](https://github.com/JuanIrache/mgjson)

## Contribution

Please make your changes to the **dev** branch, so that automated tests can be run before merging to **master**. Also, if possible, provide tests for new functionality.

## Acknowledgements/credits

- [Juan Irache](https://github.com/JuanIrache) - Main developer
- [Gastón Zalba](https://github.com/GastonZalba) - Contributor

## To-Do

- Handle home altitude?
- Add tests for export formats
