"use_strict"
let file = "sample";
let DJISRTParser = require("../index");
DJISRTParser.load(file+".SRT",confirm);
function confirm() {
	console.log("Average ·D speed was "+DJISRTParser.metadata().stats.SPEED.THREED.avg+" km/h");
}
