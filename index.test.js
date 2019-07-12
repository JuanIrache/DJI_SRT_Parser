function preload(file) {
  var fs = require('fs');
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
  expect(MavicPro.metadata().stats.HOME[0]).toEqual({ LATITUDE: -20.2532, LONGITUDE: 149.0251 });
});
test('The average 3D speed should be set', () => {
  expect(MavicPro.metadata().stats.SPEED.THREED.avg).toBe(17.67834309966437);
});
test('The max altitude should be readable from the barometer', () => {
  expect(MavicPro.metadata().stats.BAROMETER.max).toBe(118.7);
});
test('The duration should be a readable number', () => {
  expect(MavicPro.metadata().stats.DURATION).toBe(468000);
});
test('We should get the flight distance', () => {
  expect(MavicPro.metadata().stats.DISTANCE).toBe(2311.5426982713075);
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
  expect(Old_Format.metadata().stats.SPEED.THREED.avg).toBe(17.67834309966437);
});
test('The max altitude should be readable from the HB field', () => {
  expect(Old_Format.metadata().stats.HB.max).toBe(118.7);
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
  expect(Mavic_2.metadata().stats.SPEED.TWOD.avg).toBe(15.366779087834761);
});
test('We should be able to read the aperture in the Mavic 2 format', () => {
  expect(Mavic_2.metadata().packets[0].FNUM).toBe(2.2);
});
test('We should be able to read the exposure in the Mavic 2 format', () => {
  expect(Mavic_2.metadata().stats.EV.avg).toBe(0);
});
//mavic pro buggy format
data = preload(`./samples/mavic_pro_buggy.SRT`);
let Buggy = DJISRTParser(data, 'mavic_pro_buggy.SRT');
test('Buggy Format result should contain metadata', () => {
  expect(Buggy.metadata()).toBeDefined();
});
test('The average 3D speed should be set in the buggy format', () => {
  expect(Buggy.metadata().stats.SPEED.THREED.avg).toBe(10.126509453153785);
});
test('The max altitude should be readable from the ALTITUDE field', () => {
  expect(Buggy.metadata().stats.GPS.ALTITUDE.max).toBe(18);
});
test('We should be able to read the aperture in the buggy format', () => {
  expect(Buggy.metadata().packets[0].FNUM).toBe(2.2);
});