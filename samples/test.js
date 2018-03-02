"use_strict"
let files = ["mavic_pro","mavic_air","old_format"];
let DJISRTParser = require("../index");
let i = 0;
let DJIfile = DJISRTParser(files[i]+".SRT",confirm);
function confirm() {
	console.log("\nLoaded file "+DJIfile.getFileName());
	console.log("The video was recorded on "+new Date(DJIfile.metadata().stats.DATE));
	if (DJIfile.metadata().stats.HOME) {
		console.log("The drone's home was set to "+DJIfile.metadata().stats.HOME[0].LATITUDE+"º,"+DJIfile.metadata().stats.HOME[0].LONGITUDE+"º");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "Home data missing");
	}
	if (DJIfile.metadata().stats.SPEED) {
		console.log("Average 3D speed was "+Math.round(DJIfile.metadata().stats.SPEED.THREED.avg)+" km/h");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "Speed data missing");
	}
	let elevation;
	if (DJIfile.metadata().stats.BAROMETER) {
		elevation = DJIfile.metadata().stats.BAROMETER.max;
	} else if (DJIfile.metadata().stats.HB) {
		elevation = DJIfile.metadata().stats.HB.max;
	} else if (DJIfile.metadata().stats.HS) {
		elevation = DJIfile.metadata().stats.HS.max;
	}
	if (elevation) {
		console.log("Highest registered elevation was "+elevation+" meters");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "No elevation data");
	}
	console.log("The video recorded for "+DJIfile.metadata().stats.DURATION/1000+" seconds");
	if (DJIfile.metadata().stats.GPS) {
		console.log("While flying for "+Math.round(DJIfile.metadata().stats.DISTANCE)+" meters");
	} else {
		console.log("\x1b[31m%s\x1b[0m", "GPS data missing");
	}
	if (DJIfile.metadata().packets[0].FNUM != undefined && DJIfile.metadata().packets[0].SHUTTER != undefined && DJIfile.metadata().packets[0].ISO != undefined) {
		console.log("Initial aperture was F"+DJIfile.metadata().packets[0].FNUM+", shutter speed was 1/"+DJIfile.metadata().packets[0].SHUTTER+" and ISO was "+DJIfile.metadata().packets[0].ISO);
	} else {
		console.log("\x1b[31m%s\x1b[0m", "Some camera data missing (ISO, Shutter or Fnum)");
	}
	if (!DJIfile.metadata().stats.EV) {
		console.log("The camera was probably using auto-exposure");
	} else if (DJIfile.metadata().stats.EV.avg === 0) {
		console.log("The image looks properly exposed");
	} else if (DJIfile.metadata().stats.EV.avg > 0) {
		console.log("The image looks overexposed");
	} else if (DJIfile.metadata().stats.EV.avg < 0) {
		console.log("The image looks underexposed");
	}
	i++;
	if (i<files.length) DJIfile = DJISRTParser(files[i]+".SRT",confirm);
}
