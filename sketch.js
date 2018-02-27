"use_strict"

function setup() {
	//readTextFile("sample.SRT",flow);
	createCanvas(windowWidth, windowHeight);
	createDJISRTParser(file+".SRT",finished);
	noFill();
}
let file = "/samples/sample2";
let loaded;
function finished() {
	loaded = true;
}

function drawOnce(metadata) {
	let arr = metadata.packets;
	let stats = metadata.stats;
	colorMode(HSB);
	background(255);
	let drawInside = function(pck,index,array) {
		let lat = map(pck.GPS.LATITUDE,stats.GPS.LATITUDE.min,stats.GPS.LATITUDE.max,height*.7-10,10);
		let lon = map(pck.GPS.LONGITUDE,stats.GPS.LONGITUDE.min,stats.GPS.LONGITUDE.max,10,width-10);
		let plat = index > 0 ? map(array[index-1].GPS.LATITUDE,stats.GPS.LATITUDE.min,stats.GPS.LATITUDE.max,height*.7-10,10) : lat;
		let plon = index > 0 ? map(array[index-1].GPS.LONGITUDE,stats.GPS.LONGITUDE.min,stats.GPS.LONGITUDE.max,10,width-10) : lon;
		let alt = map(pck.BAROMETER,stats.BAROMETER.min,stats.BAROMETER.max,1,10);
		let spd = map(pck.SPEED.THREED,stats.SPEED.THREED.min,stats.SPEED.THREED.max,150,0);
		strokeWeight(alt);
		stroke(spd,100,100,.4);
		line (plon,plat,lon,lat);
		push();
		translate(0,height*.7);
		lat = map(pck.BAROMETER,stats.BAROMETER.min,stats.BAROMETER.max,height*.3-10,10);
		plat = index > 0 ? map(array[index-1].BAROMETER,stats.BAROMETER.min,stats.BAROMETER.max,height*.3-10,10) : lat;
		alt = map(pck.GPS.LATITUDE,stats.GPS.LATITUDE.min,stats.GPS.LATITUDE.max,10,1);
		spd = map(pck.SPEED.VERTICAL,stats.SPEED.VERTICAL.min,stats.SPEED.VERTICAL.max,150,0);
		strokeWeight(alt);
		stroke(spd,100,100,.4);
		line (plon,plat,lon,lat);
		pop();
	}
	arr.forEach(drawInside);
}

function pointTo(pck) {
	if (pck) {
		strokeWeight(2);
		let stats = DJISRTParser.metadata().stats;
		let lat = map(pck.GPS.LATITUDE,stats.GPS.LATITUDE.min,stats.GPS.LATITUDE.max,height*.7-10,10);
		let lon = map(pck.GPS.LONGITUDE,stats.GPS.LONGITUDE.min,stats.GPS.LONGITUDE.max,10,width-10);
		lat = constrain(lat,0,height);
		lon = constrain(lon,0,width);
		let spd = map(pck.SPEED.THREED,stats.SPEED.THREED.min,stats.SPEED.THREED.max,150,0);
		stroke(50);
		ellipse(lon,lat,20,20);
		push();
		translate(0,height*.7);
		lat = map(pck.BAROMETER,stats.BAROMETER.min,stats.BAROMETER.max,height*.3-10,10);
		lat = constrain(lat,0,height);
		spd = map(pck.SPEED.VERTICAL,stats.SPEED.VERTICAL.min,stats.SPEED.VERTICAL.max,150,0);
		ellipse(lon,lat,20,20);
		pop();
	}
}


function draw() {
	if (loaded) {
		background(255);
		drawOnce(DJISRTParser.metadata());
		let packetIndex = int(map(mouseX,0,width,0,DJISRTParser.metadata().packets.length-1));
		let packet = DJISRTParser.metadata().packets[packetIndex];
		pointTo(packet);
	}
}

function keyPressed() {
	if (loaded) {
		let smooth;
		console.log(keyCode);
		switch(keyCode) {
			case 65:
				smooth = DJISRTParser.getSmoothing();
				smooth--;
				smooth = smooth >= 0 ? smooth : 0;
				DJISRTParser.setSmoothing(smooth);
				break;
			case 83:
				smooth = DJISRTParser.getSmoothing();
				smooth++;
				smooth = smooth <= 20 ? smooth : 20;
				DJISRTParser.setSmoothing(smooth);
				break;
			case 74:
				downloadData(file+".JSON",JSON.stringify(DJISRTParser.metadata()),"JSON");
				break;
				case 67:
				downloadData(file+".CSV",DJISRTParser.toCSV(false),"CSV");
				break;
		}
	}
}

function downloadData(filename,text,type) {
	var element = document.createElement('a');
	if (type === "CSV") {
		element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
	} else {
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	}
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
