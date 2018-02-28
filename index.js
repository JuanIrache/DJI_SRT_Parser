"use_strict"
var exports;
var http;
function DJI_SRT_Parser() {
  let metadata;
  let rawMetadata;
  let smoothened;
  let callbackF;
  let loaded;

  let srtToObject = function(srt) {//convert SRT strings file into array of objects
  	let converted = [];
  	const timecodeRegEx = /(\d{2}:\d{2}:\d{2},\d{3})\s-->\s/;
  	const packetRegEx = /^\d+$/;
  	const arrayRegEx = /\b([A-Za-z]+)\(([-\+\d.,]+)\)/g;
  	const valueRegEx = /\b([A-Za-z]+):[\s\w]?([-\+\d./]+)\b/g;
  	const dateRegEx = /\d{4}\.\d{1,2}\.\d{1,2} \d{1,2}:\d{2}:\d{2}/;
  	srt = srt.split(/[\n\r]/);
  	srt.forEach(line => {
      let match;
  		if (packetRegEx.test(line)) {//new packet
  			converted.push({});
  		} else if (match = timecodeRegEx.exec(line)) {
        converted[converted.length-1].TIMECODE = match[1];
      } else {
  			while (match = arrayRegEx.exec(line) ) {
  				converted[converted.length-1][match[1]] = match[2].split(",");
  			}
  			while (match = valueRegEx.exec(line)) {
  				converted[converted.length-1][match[1]] = match[2];
  			}
  			if (match = dateRegEx.exec(line)) {
  				converted[converted.length-1].DATE = match[0];
  			}
  		}
  	});
    if (converted.length < 1) {
      console.log("error converting object");
      return null;
    }
  	return converted;
  }

  let interpretMetadata = function(arr,smooth) {
    let computeSpeed = function(arr) {//computes 3 types of speed in km/h
    	let computed = JSON.parse(JSON.stringify(arr));
    	let measure = function(lat1, lon1, lat2, lon2){  // generally used geo measurement function. Source: https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
        var R = 6378.137; // Radius of earth in KM
        var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
        var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;
        return d * 1000; // meters
    	}
    	computed = computed.map((pck,i,cmp) => {
    		let result = JSON.parse(JSON.stringify(pck));
    		result.SPEED = {
    			TWOD:0,
    			VERTICAL:0,
    			THREED:0
    		};
    		if (i>0) {
    			let origin2d = [cmp[i-1].GPS.LATITUDE,cmp[i-1].GPS.LATITUDE];
    			let destin2d = [pck.GPS.LATITUDE,pck.GPS.LATITUDE];
    			let distance2D = measure(origin2d[0],origin2d[1],destin2d[0],destin2d[1]);
    			distance2D /= 1000;;
          let distanceVert = 0;
          if (pck.BAROMETER != undefined) {
            distanceVert = pck.BAROMETER-cmp[i-1].BAROMETER;
          } else if (pck.Hb != undefined) {
            distanceVert = pck.Hb-cmp[i-1].Hb;
          } else if (pck.Hs != undefined) {
            distanceVert = pck.Hs-cmp[i-1].Hs;
          }
    			distanceVert /= 1000;
    			let distance3D = Math.hypot(distance2D,distanceVert);
    			let time = (new Date(pck.DATE)-new Date(cmp[i-1].DATE))/1000.0;//seconds
    			time = time < 1 ? 1 : time;//make sure we are not dividing by zero, not sure why sometimes two packets have the same timestamp
    			time /= 60*60;
    			result.SPEED.TWOD = distance2D / time;
    			result.SPEED.VERTICAL = distanceVert / time;
    			result.SPEED.THREED = distance3D / time;
    		}
    		return result;
    	});
    	return computed;
    }

    let computeStats = function (arr) {
      let statsObject = function(obj) {
        if (Object.keys(obj).length === 0 && obj.constructor === Object) return null;
      	let result = {};
      	for (let elt in obj) {
          if (elt !== "TIMECODE") {//IGNORE TIMECODES FOR STATS
        		if (typeof obj[elt] === "object" && obj[elt] != null) {
        			result[elt] = statsObject(obj[elt]);
        		} else {
        			result[elt] = {
        				min:0,
        				max:0,
        				avg:0
        			}
        		}
          }
      	}
      	return result;
      }
      let recursiveStatsExtraction = function(res, arr) {
        let deepEqual = function(a, b) {
      	  if (a === b) return true;
      	  if (a == null || typeof a != "object" ||
      	      b == null || typeof b != "object")
      	    return false;
      	  var propsInA = 0, propsInB = 0;
      	  for (var prop in a)
      	    propsInA += 1;
      	  for (var prop in b) {
      	    propsInB += 1;
      	    if (!(prop in a) || !deepEqual(a[prop], b[prop]))
      	      return false;
      	  }
      	  return propsInA == propsInB;
      	}
      	let result = res;
      	for (let elt in result) {
      		let select = arr.map(pck => pck[elt]);
      		if (elt === "HOME") {	//fill fields that do not use standard stats
      			let allHomes = [];
      			select.reduce((acc,val) => {//save different homes if present
      				if (!deepEqual(val,acc)) allHomes.push(val);
      				return val;
      			},[]);
      			result[elt] = allHomes;
      		} else if (elt === "DATE") {
      			result[elt] = select[0];
            result.DURATION = (new Date(select[select.length-1]) - new Date(select[0]))/1000; //duration of video in seconds
      		} else if (elt === "TIMECODE") {
      			//DO NOTHING
      		} else if (typeof select[0] === "object" && select[0] != null) {
      			recursiveStatsExtraction(result[elt], select);
      		} else {
      			result[elt].min = select.reduce((acc,val) => val < acc ? val : acc,Infinity);
      			result[elt].max = select.reduce((acc,val) => val > acc ? val : acc,-Infinity);
      			result[elt].avg = select.reduce((acc,val) => acc+val ,0)/select.length;
      		}
      	}
      	return result;
      }
    	let result = statsObject(arr[0]);
      if (Object.keys(result).length === 0 && result.constructor === Object) return null;
    	result = recursiveStatsExtraction(result,arr);
      if (result.DURATION != undefined && result.SPEED.THREED.avg != undefined) {
        result.DISTANCE = (result.DURATION * (result.SPEED.THREED.avg * 1000 / (60*60))) ; //dsitance of flight in meters
      }
    	return result;
    }
    let interpretPacket = function (pck) {
      let interpretItem = function (key,datum) {//interprets known values to most useful data type
      	let interpreted = {};
      	if (key === "GPS") {
      		interpreted = {
      			LATITUDE:Number(datum[1]),
      			LONGITUDE:Number(datum[0]),
      			ALTITUDE:Number(datum[2])
      		};
      	} else if (key === "HOME") {
      		interpreted = {
      			LATITUDE:Number(datum[1]),
      			LONGITUDE:Number(datum[0])
      		};
      	} else if (key === "DATE" || key === "TIMECODE") {
      		interpreted = datum;
      	} else if (key === "EV") {
      		interpreted = eval(datum);
      	} else {
      		interpreted = Number(datum.replace(/[a-zA-Z]/g, ""));
      	}
        if (Object.keys(interpreted).length === 0 && interpreted.constructor === Object) return null;
      	return interpreted;
      }
    	interpreted = {};
    	for (let item in pck) {
    		interpreted[item] = interpretItem(item,pck[item]);
    	}
      if (Object.keys(interpreted).length === 0 && interpreted.constructor === Object) return null;
    	return interpreted;
    }
    let smoothenGPS = function(arr,amount) {	//averages positions with the specified surrounding seconds. Necessary due to DJI's SRT logs low precision
      smoothened = amount;
    	let smoothArr = JSON.parse(JSON.stringify(arr));
    	for (let i=0; i<arr.length; i++) {
    		let start = parseInt(i-amount);
    		let end = parseInt(i+amount);
    		let sums = {
    			LATITUDE:0,
    			LONGITUDE:0,
    			ALTITUDE:0
    		};
    		for (let j=start; j<end; j++) {
    			let k = Math.max(Math.min(j,arr.length-1),0);
    			sums.LATITUDE += arr[k].GPS.LATITUDE;
    			sums.LONGITUDE += arr[k].GPS.LONGITUDE;
    			sums.ALTITUDE += arr[k].GPS.ALTITUDE;
    		}
    		smoothArr[i].GPS.LATITUDE = sums.LATITUDE/(1+amount*2);
    		smoothArr[i].GPS.LONGITUDE = sums.LONGITUDE/(1+amount*2);
    		smoothArr[i].GPS.ALTITUDE = sums.ALTITUDE/(1+amount*2);
    	}
    	return smoothArr;
    }
    let newArr = arr.map(pck => interpretPacket(pck));
    let smoothing = smooth != undefined ? smooth : 4;
    smoothing = smoothing >= 0 ? smoothing : 0;
    if (smoothing !== 0)  {
      newArr = smoothenGPS(newArr,smoothing);
    }
    newArr = computeSpeed(newArr);
    let stats = computeStats(newArr);
    if (newArr.length < 1) {
      console.log("Error intrerpreting metadata");
      return null;
    }
    return {
      packets:newArr,
      stats:stats
    }
  }

  let createCSV = function(raw) {
    let csvExtract = function(obj,pre,val) {
      let prefix = pre ? pre+"_" : "";
    	let results = [];
    	for (let elt in obj) {
      		if (typeof obj[elt] === "object" && obj[elt] != null) {
            let children = csvExtract(obj[elt],prefix+elt,val);
            children.forEach(child => results.push(child));
      		} else if (val) {
      			results.push(JSON.stringify(obj[elt]));
      		} else {
            results.push(prefix+elt);
          }
    	}
    	return results.length ? results : null;
    }
    let rows = [];
    let array = raw ? rawMetadata : metadata.packets;
    rows.push(csvExtract(array[0]));
    array.forEach(pck => rows.push(csvExtract(pck,"",true)));
    if (rows.length <1) return null;
    let csvContent;
    csvContent = rows.reduce((acc,rowArray) => {
       let row = rowArray.join(",");
       return acc + row + "\r\n";
    },"");
    if (!csvContent) {
      console.log("Error creating CSV");
      return null;
    }
    return csvContent;
  }

  let loadFile = function(file,cb) {
    loaded = false;
    callbackF = cb;
    let loadFileBrowser = function(file) {
      let readTextFile = function(file,f) {
          let rawFile = new XMLHttpRequest();
          let allText;
          rawFile.open("GET", file, true);
          rawFile.onreadystatechange = function() {
              if(rawFile.readyState === 4) {
                  if(rawFile.status === 200 || rawFile.status == 0) {
                      let allText = rawFile.responseText;
                      f(allText);
                  }
              }
          }
          rawFile.send(null);
      }
      readTextFile(file,flow);
    }
    let loadFileNode = function(file) {
      http = require('http');
      var fs = require('fs');
      fs.readFile(file, function (err, data) {
        if (err) {
          throw err;
        }
        flow(data.toString());
      });
    }
    if (typeof window === 'undefined') {
      loadFileNode(file);
    } else {
      loadFileBrowser(file);
    }
  }

  let flow = function(data) {
    rawMetadata = srtToObject(data);
    metadata = interpretMetadata(rawMetadata);
    loaded = true;
    callbackF();
  }

  exports = function(file) {
    return {
      load:function(file,cb) {loadFile(file,cb)},
      getSmoothing:function() {return loaded ? smoothened : notReady()},
      setSmoothing:function(smooth) {if (loaded) {metadata = interpretMetadata(rawMetadata,smooth)} else {notReady()}},
      rawMetadata:function() {return loaded ? rawMetadata : notReady()},
      metadata:function() {return loaded ? metadata : notReady()},
      toCSV:function(raw) {return loaded ? createCSV(raw) : notReady()}
    }
  }();

}
DJI_SRT_Parser();

module.exports = exports;
