const fs = require('fs');
const OUTPUTFOLDER = './samples/processed_files/'; // This must be in "watchPathIgnorePatterns" in package.json, to prevent a infinite loop in Jest using --watch.
const DJISRTParser = require('.');

if (!fs.existsSync(OUTPUTFOLDER)) {
  fs.mkdirSync(OUTPUTFOLDER);
}

function preload(file) {
  let data = fs.readFileSync(file);
  return data.toString();
}

let data_p4_rtk2 = preload(`./samples/p4_rtk.SRT`);
let p4_rtk2 = DJISRTParser(data_p4_rtk2, 'p4_rtk.SRT');

test('Single file to CSV. Some "V_S" have negative values', () => {
  fs.writeFile(OUTPUTFOLDER + 'p4_rtk2.csv', p4_rtk2.toCSV(), err => expect(err).toBeNull());
});

test('Single file to CSV, rawMetadata enabled', () => {
  fs.writeFile(OUTPUTFOLDER + 'p4_rtk2_RawMeta.csv', p4_rtk2.toCSV(true), err => expect(err).toBeNull());
});

test('Single file to GeoJSON with waypoints', () => {
  fs.writeFile(OUTPUTFOLDER + 'p4_rtk2.json', p4_rtk2.toGeoJSON( /* rawMetadata = */ false, /* waypoints = */ true), err => expect(err).toBeNull());
});

test('Single file to GeoJSON with waypoints, rawMetadata enabled', () => {
  fs.writeFile(OUTPUTFOLDER + 'p4_rtk2_RawMeta.json', p4_rtk2.toGeoJSON( /* rawMetadata = */ true,  /* waypoints = */ true), err => expect(err).toBeNull());
});

// Set custom properties and export
let data = preload(`./samples/mavic_pro.SRT`);
let mavic_pro_ = DJISRTParser(data, 'mavic_pro.SRT');
test('Set custom properties and export to CSV', () => {
  mavic_pro_.setProperties({ 'propInt': 123, 'propInt2': 456 });
  mavic_pro_.setProperties({ 'propExtra': 'Prop added in a second instance' });
  fs.writeFile(OUTPUTFOLDER + 'mavic_pro_CustomProperties.csv', mavic_pro_.toCSV(), err => expect(err).toBeNull());
});


// Multiple Files
let multi_mavic_pro_p4_rtk = DJISRTParser([data, data_p4_rtk2], ['mavic_pro.SRT', 'p4_rtk.SRT']);

test('Multiple files to CSV', () => {
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk.csv', multi_mavic_pro_p4_rtk.toCSV(), err => expect(err).toBeNull());
});

test('Multiple files to CSV, rawMetadata enabled', () => {
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk_RawMeta.csv', multi_mavic_pro_p4_rtk.toCSV(true), err => expect(err).toBeNull());
});

test('Multiple files to GeoJSON with waypoints', () => {
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk.json', multi_mavic_pro_p4_rtk.toGeoJSON(false, true), err => expect(err).toBeNull());
});

test('Multiple files to GeoJSON with waypoints, rawMetadata enabled', () => {
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk_RawMeta.json', multi_mavic_pro_p4_rtk.toGeoJSON(true, true), err => expect(err).toBeNull());
});

test('Multiple files to MGJSON', () => {
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk.mgjson', JSON.stringify(multi_mavic_pro_p4_rtk.toMGJSON()), err => expect(err).toBeNull());
});

test('Set milliseconds on multiple files', () => {
  multi_mavic_pro_p4_rtk.setMillisecondsPerSample(7000);
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk_MillisecondsPerSample(7000).json', multi_mavic_pro_p4_rtk.toGeoJSON(), err => expect(err).toBeNull());
});

test('Set smoothing on multiple files', () => {
  multi_mavic_pro_p4_rtk.setSmoothing(0);
  fs.writeFile(OUTPUTFOLDER + 'multi_mavic_pro_p4_rtk_Smoothing(0).json', multi_mavic_pro_p4_rtk.toGeoJSON(), err => expect(err).toBeNull());
});

test('MGJSON with a single file', () => {
  fs.writeFile(OUTPUTFOLDER + 'p4_rtk2.mgjson', JSON.stringify(p4_rtk2.toMGJSON()), err => expect(err).toBeNull());
});
