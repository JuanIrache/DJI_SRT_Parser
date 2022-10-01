let preProcess;

function preload(file) {
  const fs = require('fs');
  let data = fs.readFileSync(file);
  return data.toString();
}

const DJISRTParser = require('./');

let data = preload(`./samples/mavic_pro.SRT`);
let MavicPro = DJISRTParser(data, 'mavic_pro.SRT');
test('Reading Mavic Pro file should return valid data', () => {
  expect(MavicPro).toBeDefined();
});
test('Result should contain raw metadata', () => {
  expect(MavicPro.rawMetadata()).toBeDefined();
});
test('Result should contain processed metadata', () => {
  expect(MavicPro.metadata()).toBeDefined();
});
test('Filename should be present', () => {
  expect(MavicPro.getFileName()).toBe('mavic_pro.SRT');
});
test('Date should be present', () => {
  expect(typeof MavicPro.metadata().stats.DATE).toBe('number');
});
test('This sample should contain a Home point', () => {
  expect(MavicPro.metadata().stats.HOME[0]).toEqual({
    LATITUDE: -20.2532,
    LONGITUDE: 149.0251
  });
});
test('The average 3D speed should be set', () => {
  expect(MavicPro.metadata().stats.SPEED.THREED.avg).toBe(21.56914922116961);
});
test('The max altitude should be readable from the barometer', () => {
  expect(MavicPro.metadata().stats.BAROMETER.max).toBe(118.65000000000002);
});
test('The duration should be a readable number', () => {
  expect(MavicPro.metadata().stats.DURATION).toBe(468000);
});
test('We should get the flight distance', () => {
  expect(MavicPro.metadata().stats.DISTANCE).toBe(2804.6421264700957);
});
test('We should be able to read the aperture', () => {
  expect(MavicPro.metadata().packets[0].FNUM).toBe(2.2);
});
test('We should be able to read the iso', () => {
  expect(MavicPro.metadata().packets[0].ISO).toBe(100);
});
test('We should be able to read the shutter speed', () => {
  expect(MavicPro.metadata().packets[0].SHUTTER).toBe(60);
});
//Mavic Air (no gps data)
data = preload(`./samples/mavic_air.SRT`);
let Mavic_Air = DJISRTParser(data, 'mavic_air.SRT');
test('Mavic Air result should contain at least some metadata', () => {
  expect(Mavic_Air.metadata()).toBeDefined();
});
//Old format
data = preload(`./samples/old_format.SRT`);
let Old_Format = DJISRTParser(data, 'old_format.SRT');
test('Old Format result should contain metadata', () => {
  expect(Old_Format.metadata()).toBeDefined();
});
test('The average 3D speed should be set in the old format', () => {
  expect(Old_Format.metadata().stats.SPEED.THREED.avg).toBe(21.56914922116961);
});
test('The max altitude should be readable from the HB field', () => {
  expect(Old_Format.metadata().stats.HB.max).toBe(118.65000000000002);
});
test('We should be able to read the aperture in the old format', () => {
  expect(Old_Format.metadata().packets[0].FNUM).toBe(2.8);
});
test('We should be able to read the exposure in the old format', () => {
  expect(Old_Format.metadata().stats.EV.avg).toBe(0);
});
//mavic 2
data = preload(`./samples/mavic_2_style.SRT`);
let Mavic_2 = DJISRTParser(data, 'mavic_2_style.SRT');
test('Mavic 2 Format result should contain metadata', () => {
  expect(Mavic_2.metadata()).toBeDefined();
});
test('The average 2D speed should be set in the Mavic 2 format', () => {
  expect(Mavic_2.metadata().stats.SPEED.TWOD.avg).toBe(19.531079073870547);
});
test('We should be able to read the aperture in the Mavic 2 format', () => {
  expect(Mavic_2.metadata().packets[0].FNUM).toBe(2.2);
});
test('We should be able to read the exposure in the Mavic 2 format', () => {
  expect(Mavic_2.metadata().stats.EV.avg).toBe(0);
});
//mavic 2 zoom
data = preload(`./samples/m2zoom.SRT`);
let m2z = DJISRTParser(data, 'm2zoom.SRT');
test('Mavic 2 Zoom Format result should contain metadata', () => {
  expect(m2z.metadata()).toBeDefined();
});
test('The average 2D speed should be set in the Mavic 2 Zoom format', () => {
  expect(m2z.metadata().stats.SPEED.TWOD.avg).toBe(10.102267576077548);
});
test('We should be able to read the aperture in the Mavic 2 Zoom format', () => {
  expect(m2z.metadata().packets[0].FNUM).toBe(2.8);
});
test('We should be able to read the exposure in the Mavic 2 Zoom format', () => {
  expect(m2z.metadata().stats.EV.avg).toBe(0);
});
//mavic pro buggy format
data = preload(`./samples/mavic_pro_buggy.SRT`);
let Buggy = DJISRTParser(data, 'mavic_pro_buggy.SRT');
test('Buggy Format result should contain metadata', () => {
  expect(Buggy.metadata()).toBeDefined();
});
test('The average 3D speed should be set in the buggy format', () => {
  expect(Buggy.metadata().stats.SPEED.THREED.avg).toBe(13.40770963200714);
});
test('The max satellites should be readable from the SATELLITES field', () => {
  expect(Buggy.metadata().stats.GPS.SATELLITES.max).toBe(18);
});
test('We should be able to read the aperture in the buggy format', () => {
  expect(Buggy.metadata().packets[0].FNUM).toBe(2.2);
});
//p4p attempt
data = preload(`./samples/p4p_sample.SRT`);
let p4p = DJISRTParser(data, 'p4p_sample.SRT');
test('p4p Format result should contain metadata', () => {
  expect(p4p.metadata()).toBeDefined();
});
test('The max satellites should be readable from the SATELLITES field', () => {
  expect(p4p.metadata().stats.GPS.SATELLITES.max).toBe(18);
});
test('We should be able to read the aperture in the p4p format', () => {
  expect(p4p.metadata().packets[0].FNUM).toBe(3.2);
});

//p4rtk
data = preload(`./samples/p4_rtk.SRT`);
let p4rtk = DJISRTParser(data, 'p4_rtk.SRT');
test('p4 RTK Format result should contain metadata', () => {
  expect(p4rtk.metadata()).toBeDefined();
});
test('The max satellites should be readable from the SATELLITES field', () => {
  expect(p4rtk.metadata().stats.GPS.SATELLITES.max).toBe(15);
});
test('We should be able to read the aperture in the p4p rtk format', () => {
  expect(p4rtk.metadata().packets[0].FNUM).toBe(5.6);
});
test('We should be able to read G_PRY in the p4p rtk format', () => {
  expect(p4rtk.metadata().packets[0].G_PRY).toBeDefined();
});

//mavic 2 pro extra large - Milliseconds
data = preload(`./samples/mavic_2pro_new.SRT`);
let Mavic_2_pro = DJISRTParser(data, 'mavic_2pro_new.SRT');
Mavic_2_pro.setSmoothing(0);
test('Mavic 2 large - all the packets', () => {
  expect(Mavic_2_pro.metadata().packets.length).toBe(8952);
});
test('Mavic 2 large - aprox. half the packets', () => {
  Mavic_2_pro.setMillisecondsPerSample(80);
  expect(Mavic_2_pro.metadata().packets.length).toBe(4559);
});
test('Mavic 2 large - low quantity packets', () => {
  Mavic_2_pro.setMillisecondsPerSample(1500);
  expect(Mavic_2_pro.metadata().packets.length).toBe(243);
});
test('Mavic 2 large - get Milliseconds function', () => {
  Mavic_2_pro.setMillisecondsPerSample(700);
  expect(Mavic_2_pro.getMillisecondsPerSample()).toBe(700);
});
test('Mavic 2 Pro Format result should contain metadata', () => {
  expect(Mavic_2_pro.metadata()).toBeDefined();
});
test('We should be able to read the focal length in the Mavic 2 format', () => {
  expect(Mavic_2_pro.metadata().packets[0].FOCAL_LEN).toBe(280);
});

// EXPORT TO FORMATS
let data_p4_rtk2 = preload(`./samples/p4_rtk.SRT`);
let p4_rtk2 = DJISRTParser(data_p4_rtk2, 'p4_rtk.SRT');

test('Single file to CSV. Some "V_S" have negative values', () => {
  expect(p4_rtk2.toCSV().length).toBe(16419);
});

test('Single file to CSV, rawMetadata enabled', () => {
  expect(p4_rtk2.toCSV(true).length).toBe(10238);
});

test('Single file to GeoJSON with waypoints', () => {
  preProcess = p4_rtk2.toGeoJSON(
    /* rawMetadata = */ false,
    /* waypoints = */ true
  );
  expect(preProcess.length).toBe(34647);

  let coordinate = JSON.parse(preProcess).features[0].geometry.coordinates[0];
  expect(typeof coordinate).toBe('number'); // Very important, coordinates must be numbers
});

test('Single file to GeoJSON with waypoints, rawMetadata enabled', () => {
  preProcess = p4_rtk2.toGeoJSON(
    /* rawMetadata = */ true,
    /* waypoints = */ true
  );
  expect(preProcess.length).toBe(21242);

  let coordinate = JSON.parse(preProcess).features[0].geometry.coordinates[0];
  expect(typeof coordinate).toBe('number'); // Very important, coordinates must be numbers
});

// Set custom properties and export
data = preload(`./samples/mavic_pro.SRT`);
let mavic_pro_ = DJISRTParser(data, 'mavic_pro.SRT');
test('Set custom properties and export', () => {
  // expect(mavic_pro_.toCSV().length).toBe(96532);
  mavic_pro_.setProperties({ propInt: 123, propInt2: 456 });
  mavic_pro_.setProperties({ propExtra: 'Prop added in a second instance' });
  // expect(mavic_pro_.toCSV().length).toBe(118087);

  let geoJSONProps = JSON.parse(mavic_pro_.toGeoJSON(false, true)).features[0]
    .properties;
  expect(geoJSONProps.propInt).toBe(123);
  expect(geoJSONProps.propExtra).toBe('Prop added in a second instance');
});

// Multiple Files
let multi_mavic_pro_p4_rtk = DJISRTParser(
  [data, data_p4_rtk2],
  ['mavic_pro.SRT', 'p4_rtk.SRT']
);

test('Get multiple files name', () => {
  expect(multi_mavic_pro_p4_rtk.getFileName()).toEqual([
    'mavic_pro.SRT',
    'p4_rtk.SRT'
  ]);
});

// test('Multiple files to CSV', () => {
//   expect(multi_mavic_pro_p4_rtk.toCSV().length).toBe(124137);
// });

test('Multiple files to CSV, rawMetadata enabled', () => {
  expect(multi_mavic_pro_p4_rtk.toCSV(true).length).toBe(81330);
});

// test('Multiple files to GeoJSON with waypoints', () => {
//   expect(multi_mavic_pro_p4_rtk.toGeoJSON(false, true).length).toBe(247337);
// });

test('Multiple files to GeoJSON with waypoints, rawMetadata enabled', () => {
  expect(multi_mavic_pro_p4_rtk.toGeoJSON(true, true).length).toBe(154735);
});

test('Get metadata from a particular file', () => {
  expect(
    multi_mavic_pro_p4_rtk.metadata('mavic_pro.SRT').stats.GPS.SATELLITES.max
  ).toBe(16);
});

test('Get rawMetadata from a particular file', () => {
  expect(
    multi_mavic_pro_p4_rtk.rawMetadata('mavic_pro.SRT')[0].TIMECODE
  ).toBeDefined();
});

test('Get rawMetadata from another particular file', () => {
  expect(
    multi_mavic_pro_p4_rtk.rawMetadata('p4_rtk.SRT')[0].F_PRY
  ).toBeDefined(); // Method 1
  expect(
    multi_mavic_pro_p4_rtk.rawMetadata()['p4_rtk.SRT'][0].F_PRY
  ).toBeDefined(); // Method 2
});

test('Set milliseconds on multiple files', () => {
  expect(
    JSON.parse(multi_mavic_pro_p4_rtk.toGeoJSON()).features[1].geometry
      .coordinates.length
  ).toBe(55); // Original coordinates
  multi_mavic_pro_p4_rtk.setMillisecondsPerSample(7000);
  expect(
    JSON.parse(multi_mavic_pro_p4_rtk.toGeoJSON()).features[1].geometry
      .coordinates.length
  ).toBe(8); // Reduced coordinates
});

test('Set smoothing on multiple files', () => {
  multi_mavic_pro_p4_rtk.setSmoothing(0);
  expect(multi_mavic_pro_p4_rtk.toGeoJSON()).toBeDefined();
});

// Load PreparedData
let preparedData = require('./samples/preparedData.json');
let loadPrepared = DJISRTParser(
  preparedData,
  'preparedData.SRT',
  /* isPreparedData = */ true
);
test('Loading prepared data in json format', () => {
  expect(loadPrepared.metadata().stats).toBeDefined();
});

loadPrepared = DJISRTParser(
  JSON.stringify(preparedData),
  'preparedData.SRT',
  /* isPreparedData = */ true
);
test('Loading prepared data as dataString', () => {
  expect(loadPrepared.metadata().stats).toBeDefined();
});

// Incomplete and Empty Data
let empty = preload(`./samples/broken_empty.SRT`);
let empty2 = preload(`./samples/broken_empty2.SRT`);
let incomplete = preload(`./samples/broken_incomplete.SRT`);

let brokenData = DJISRTParser(
  [empty, empty2, incomplete],
  ['broken_empty.SRT', 'broken_empty2.SRT', 'broken_incomplete.SRT']
);
test('Loading multiple files with no data, or incomplete', () => {
  expect(brokenData).toBeDefined();
  expect(brokenData.toGeoJSON()).toBeDefined();
  expect(brokenData.toCSV()).toBeDefined();
});

let incompleteData = DJISRTParser(
  [incomplete, data],
  ['broken_incomplete.SRT', 'mavic_pro.SRT']
);
// test('Loading multiples files, one with incomplete/broken data', () => {
//   expect(incompleteData.toGeoJSON(false, true).length).toBe(221451);
// });

let incompleteData2 = preload(`./samples/broken_incomplete2.SRT`);
let incomplete2 = DJISRTParser(incompleteData2, 'broken_incomplete2.SRT');
test('Loading file with incomplete/broken GPS data and filling it', () => {
  incomplete2.setSmoothing(0);
  expect(
    JSON.parse(incomplete2.toGeoJSON(false, true)).features[4].geometry.coordinates).toEqual([ -57.823383, -34.869941 ])
});

let mixedData = preload(`./samples/mix_p4rtk_mavic2pro.SRT`);
let mixed = DJISRTParser( mixedData, 'mix_p4rtk_mavic2pro.SRT');
test('Mixed data', () => {
  mixed.setSmoothing(0);
  expect(mixed.toGeoJSON(false, true)).toBeDefined()
});
