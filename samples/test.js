"use_strict"
let files = ["mavic_pro","mavic_air","old_format"];
let DJISRTParser = require("../index");
let i = 0;
DJISRTParser.load(files[i]+".SRT",confirm);
function confirm() {
	console.log("\nLoaded file "+files[i]);
	console.log("The video was recorded on "+new Date(DJISRTParser.metadata().stats.DATE));
	if (DJISRTParser.metadata().stats.HOME) {
		console.log("The drone's home was set to "+DJISRTParser.metadata().stats.HOME[0].LATITUDE+"º,"+DJISRTParser.metadata().stats.HOME[0].LONGITUDE+"º");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "Home data missing");
	}
	if (DJISRTParser.metadata().stats.SPEED) {
		console.log("Average 3D speed was "+Math.round(DJISRTParser.metadata().stats.SPEED.THREED.avg)+" km/h");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "Speed data missing");
	}
	let elevation;
	if (DJISRTParser.metadata().stats.BAROMETER) {
		elevation = DJISRTParser.metadata().stats.BAROMETER.max;
	} else if (DJISRTParser.metadata().stats.HB) {
		elevation = DJISRTParser.metadata().stats.HB.max;
	} else if (DJISRTParser.metadata().stats.HS) {
		elevation = DJISRTParser.metadata().stats.HS.max;
	} else if (DJISRTParser.metadata().stats.GPS) {
		elevation = DJISRTParser.metadata().stats.GPS.ALTITUDE.max;
	}
	if (elevation) {
		console.log("Highest registered elevation was "+elevation+" meters");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "No elevation data");
	}
	console.log("The video recorded for "+DJISRTParser.metadata().stats.DURATION+" seconds");
	if (DJISRTParser.metadata().stats.GPS) {
		console.log("While flying for "+Math.round(DJISRTParser.metadata().stats.DISTANCE)+" meters");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "GPS data missing");
	}
	if (DJISRTParser.metadata().packets[0].FNUM != undefined && DJISRTParser.metadata().packets[0].SHUTTER != undefined && DJISRTParser.metadata().packets[0].ISO != undefined) {
		console.log("Initial aperture was F"+DJISRTParser.metadata().packets[0].FNUM+", shutter speed was 1/"+DJISRTParser.metadata().packets[0].SHUTTER+" and ISO was "+DJISRTParser.metadata().packets[0].ISO);
	} else {
		console.log("\x1b[31m%s\x1b[0m", "Some camera data missing (ISO, Shutter or Fnum)");
	}
	if (!DJISRTParser.metadata().stats.EV) {
		console.log("The camera was probably using auto-exposure");
	} else if (DJISRTParser.metadata().stats.EV.avg === 0) {
		console.log("The image looks properly exposed");
	} else if (DJISRTParser.metadata().stats.EV.avg > 0) {
		console.log("The image looks overexposed");
	} else if (DJISRTParser.metadata().stats.EV.avg < 0) {
		console.log("The image looks underexposed");
	}
	i++;
	if (i<files.length) DJISRTParser.load(files[i]+".SRT",confirm);
}
