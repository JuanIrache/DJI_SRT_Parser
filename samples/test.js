"use_strict"
let file = "sample";
let DJISRTParser = require("../index");
DJISRTParser.load(file+".SRT",confirm);
function confirm() {
	console.log("Average 3D speed was "+DJISRTParser.metadata().stats.SPEED.THREED.avg+" km/h");
}
