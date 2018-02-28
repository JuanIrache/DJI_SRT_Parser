"use_strict"
let file = "sample";
let DJISRTParser = require("../index");
DJISRTParser.load(file+".SRT",confirm);
function confirm() {
	console.log("The video was recorded on "+new Date(DJISRTParser.metadata().stats.DATE));
	console.log("The drone's home was set to "+DJISRTParser.metadata().stats.HOME[0].LATITUDE+"º,"+DJISRTParser.metadata().stats.HOME[0].LONGITUDE+"º");
	console.log("Average 3D speed was "+Math.round(DJISRTParser.metadata().stats.SPEED.THREED.avg)+" km/h");
	let elevation = 0;
	if (DJISRTParser.metadata().stats.BAROMETER != undefined) {
		elevation = DJISRTParser.metadata().stats.BAROMETER.max;
	} else if (DJISRTParser.metadata().stats.Hb != undefined) {
		elevation = DJISRTParser.metadata().stats.Hb.max;
	} else if (DJISRTParser.metadata().stats.Hs != undefined) {
		elevation = DJISRTParser.metadata().stats.Hs.max;
	}
	console.log("Highest registered elevation was "+elevation+" meters");
	console.log("The video recorded for "+DJISRTParser.metadata().stats.DURATION+" seconds while flying for "+Math.round(DJISRTParser.metadata().stats.DISTANCE)+" meters");
	console.log("Initial aperture was F"+DJISRTParser.metadata().stats.Fnum.min);
	if (DJISRTParser.metadata().stats.EV == undefined) {
		console.log("The camera was probably using auto-exposure");
	} else if (DJISRTParser.metadata().stats.EV.avg === 0) {
		console.log("The image looks properly exposed");
	} else if (DJISRTParser.metadata().stats.EV.avg > 0) {
		console.log("The image looks overexposed");
	} else if (DJISRTParser.metadata().stats.EV.avg < 0) {
		console.log("The image looks underexposed");
	}
}
