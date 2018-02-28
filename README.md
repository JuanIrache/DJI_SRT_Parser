# DJI_SRT_Parser

Parses and interprets some data from DJI's Drones SRT metadata files.
Currently only tested with Mavic Pro SRT files. You can send me yours if you want it implemented.
Please let me know if you create something with this :).

## Installation

Using npm:
```shell
$ npm install --save dji_srt_parser
```

## Usage
```js
//Load module
let DJISRTParser = require('dji_srt_parser');

//Specify data source
let file = "filePath";

//Load data and specify callback to run when loaded
DJISRTParser.load(file+".SRT",confirm);

//Once loaded...
function confirm() {
  //rawMetadata() returns an array of objects with labels and the unmodified SRT data in the form of strings
  console.log(DJISRTParser.rawMetadata());
  //metadata() returns an object with 2 elements
  //(1) a packets array similar to rawMetadata() but with smoothing applied to GPS locations (see below why smoothing is used) and with computed speeds in 2d, 3d and vertical
  //(2) a stats object containing stats like minimum, average and maximum speeds based on the interpreted data
  console.log(DJISRTParser.metadata());
  //toCSV() exports the current interpretation of data to a CSV spreadsheet the optional value raw exports the raw data instead
  DJISRTParser.toCSV();
  //getSmoothing() returns the current smoothing value (how many data packets to average with, in each array direction)
  console.log(DJISRTParser.getSmoothing());
  //setSmoothing() modifies the current smoothing value, 0 for no smoothing
  console.log(DJISRTParser.setSmoothing(0));
}
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

## TODO
- Provide arrays of only one field?
- Export data for After Effects
