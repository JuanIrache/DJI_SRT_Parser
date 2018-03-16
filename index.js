function DJI_SRT_Parser() {
  this.fileName = "";
  this.metadata = {};
  this.rawMetadata = [];
  this.smoothened = 0;
  this.loaded = false;
}

DJI_SRT_Parser.prototype.srtToObject = function(srt) {//convert SRT strings file into array of objects
  let converted = [];
  const timecodeRegEx = /(\d{2}:\d{2}:\d{2},\d{3})\s-->\s/;
  const packetRegEx = /^\d+$/;
  const arrayRegEx = /\b([A-Za-z]+)\(([-\+\d.,]+)\)/g;
  const valueRegEx = /\b([A-Za-z]+)\s?:[\s\[a-zA-Z\]]?([-\+\d./]+)\w{0,3}\b/g;
  const dateRegEx = /\d{4}[-.]\d{1,2}[-.]\d{1,2} \d{1,2}:\d{2}:\d{2}/;
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
    console.log("Error converting object");
    return null;
  }
  return converted;
}

DJI_SRT_Parser.prototype.interpretMetadata = function(arr,smooth) {
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
    let accDistance = 0;
    computed = computed.map((pck,i,cmp) => {
      let result = JSON.parse(JSON.stringify(pck));
      result.SPEED = {
        TWOD:0,
        VERTICAL:0,
        THREED:0
      };
      result.DISTANCE = 0;
      if (i>0) {
        let origin2d = [cmp[i-1].GPS.LATITUDE,cmp[i-1].GPS.LATITUDE];
        let destin2d = [pck.GPS.LATITUDE,pck.GPS.LATITUDE];
        let distance2D = measure(origin2d[0],origin2d[1],destin2d[0],destin2d[1]);
        distance2D /= 1000;;
        let distanceVert = 0;
        if (pck.BAROMETER != undefined) {
          distanceVert = pck.BAROMETER-cmp[i-1].BAROMETER;
        } else if (pck.HB != undefined) {
          distanceVert = pck.HB-cmp[i-1].HB;
        } else if (pck.HS != undefined) {
          distanceVert = pck.HS-cmp[i-1].HS;
        }
        distanceVert /= 1000;
        let distance3D = Math.hypot(distance2D,distanceVert);
        let time = (new Date(pck.DATE)-new Date(cmp[i-1].DATE))/1000.0;//seconds
        time = time < 1 ? 1 : time;//make sure we are not dividing by zero, not sure why sometimes two packets have the same timestamp
        time /= 60*60;
        accDistance += distance3D*1000;
        result.DISTANCE = accDistance;
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
      if (obj.constructor === Object && Object.keys(obj).length === 0) return null;
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
        if (elt === "HOME") { //fill fields that do not use standard stats
          let allHomes = [];
          select.reduce((acc,val) => {//save different homes if present
            if (!deepEqual(val,acc)) allHomes.push(val);
            return val;
          },[]);
          result[elt] = allHomes;
        } else if (elt === "DATE") {
          result[elt] = select[0];
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
    if (result.constructor === Object && Object.keys(result).length === 0) return null;
    result = recursiveStatsExtraction(result,arr);
    if (arr[arr.length-1].DIFFTIME != undefined) {
      result.DURATION = arr[arr.length-1].DIFFTIME; //duration of video in milliseconds
    } else if (arr[arr.length-1].DATE != undefined) {
      result.DURATION = (new Date(arr[arr.length-1].DATE) - new Date(arr[0].DATE)); //duration of video in milliseconds
    }
    if (arr[arr.length-1].DISTANCE) {
      result.DISTANCE = arr[arr.length-1].DISTANCE ; //dsitance of flight in meters
    }
    return result;
  }
  let interpretPacket = function (pck) {
    let interpretItem = function (key,datum) {//interprets known values to most useful data type
      let interpretedI = {};
      if (key.toUpperCase() === "GPS") {
        interpretedI = {
          LATITUDE:Number(datum[1]),
          LONGITUDE:Number(datum[0]),
          ALTITUDE:Number(datum[2])
        };
      } else if (key.toUpperCase() === "HOME") {
        interpretedI = {
          LATITUDE:Number(datum[1]),
          LONGITUDE:Number(datum[0])
        };
      } else if (key.toUpperCase() === "TIMECODE"){
        interpretedI = datum;
      } else if (key.toUpperCase() === "DATE") {
        let date = datum.replace(/\./g,"-").replace(" ","T");
        interpretedI = new Date(date).getTime();
      } else if (key.toUpperCase() === "EV") {
        interpretedI = eval(datum);
      } else if (key.toUpperCase() === "SHUTTER") {
        interpretedI = Number(datum.replace("1/", ""));
      } else {
        interpretedI = Number(datum.replace(/[a-zA-Z]/g, ""));
      }
      if (interpretedI.constructor === Object && Object.keys(interpretedI).length === 0) return null;
      return interpretedI;
    }
    let fillMissingFields = function(pckt) {
      let replaceKey = function(o,old_key,new_key) {
        if (old_key !== new_key) {
            Object.defineProperty(o, new_key,
                Object.getOwnPropertyDescriptor(o, old_key));
            delete o[old_key];
        }
      }
      let references = {//translate keys form various formats
        SHUTTER:["TV"],
        FNUM:["IR"]
        //BAROMETER:["HB","HS",["GPS"]]
      };
      for (let key in references) {
        if (pckt[key] == undefined) {
          references[key].forEach(match => {
            if (pckt[match] != undefined) {
              replaceKey(pckt,match,key);
            }
          });
        }
      }
      return pckt;
    }
    let interpretedP = {};
    for (let item in pck) {
      interpretedP[item.toUpperCase()] = interpretItem(item,pck[item]);
    }
    interpretedP = fillMissingFields(interpretedP);
    if (interpretedP.constructor === Object && Object.keys(interpretedP).length === 0) return null;
    return interpretedP;
  }
  let smoothenGPS = function(arr,amount) {  //averages positions with the specified surrounding seconds. Necessary due to DJI's SRT logs low precision
    let smoothArr = JSON.parse(JSON.stringify(arr));
    for (let i=0; i<arr.length; i++) {
      let start = parseInt(i-amount);
      let end = parseInt(i+amount);
      let sums = {
        LATITUDE:0,
        LONGITUDE:0,
        ALTITUDE:0
      };
      let aqui = 0;
      for (let j=start; j<end; j++) {
        let k = Math.max(Math.min(j,arr.length-1),0);
        sums.LATITUDE += arr[k].GPS.LATITUDE;
        sums.LONGITUDE += arr[k].GPS.LONGITUDE;
        sums.ALTITUDE += arr[k].GPS.ALTITUDE;
        aqui++;
      }
      smoothArr[i].GPS.LATITUDE = sums.LATITUDE/(amount*2);
      smoothArr[i].GPS.LONGITUDE = sums.LONGITUDE/(amount*2);
      smoothArr[i].GPS.ALTITUDE = sums.ALTITUDE/(amount*2);
    }
    return smoothArr;
  }
  let newArr = arr.map(pck => interpretPacket(pck));
  let smoothing = smooth != undefined ? smooth : 4;
  smoothing = smoothing >= 0 ? smoothing : 0;
  if (newArr[0].GPS) {
    if (smoothing !== 0)  {
      newArr = smoothenGPS(newArr,smoothing);
    }
    this.smoothened = smoothing;
    newArr = computeSpeed(newArr);
  }
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

DJI_SRT_Parser.prototype.createCSV = function(raw) {
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
  let array = raw ? this.rawMetadata : this.metadata.packets;
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

DJI_SRT_Parser.prototype.loadFile = function(data,fileName) {
  let context = this;
  this.fileName = fileName;
  this.loaded = false;
  let decode = function(d) {
    if (d.split(",")[0] == "data:;base64") {
      return  atob(d.split(",")[1]);
    } else {
      return d;
    }
  }
  this.flow(decode(data));
}

DJI_SRT_Parser.prototype.flow = function(data,context) {
  let cntx = context || this;
  cntx.rawMetadata = cntx.srtToObject(data);
  cntx.metadata = cntx.interpretMetadata(cntx.rawMetadata);
  cntx.loaded = true;
}

function notReady() {
  console.log("Data not ready");
  return null;
}

function toExport(context,file,fileName) {
  context.loadFile(file,fileName);

  return {
    getSmoothing:function() {return context.loaded ? context.smoothened : notReady()},
    setSmoothing:function(smooth) {if (context.loaded) {context.metadata = context.interpretMetadata(context.rawMetadata,smooth)} else {notReady()}},
    rawMetadata:function() {return context.loaded ? context.rawMetadata : notReady()},
    metadata:function() {return context.loaded ? context.metadata : notReady()},
    toCSV:function(raw) {return context.loaded ? context.createCSV(raw) : notReady()},
    getFileName:function() {return context.loaded ? context.fileName : notReady()}
  }
}

function create_DJI_SRT_Parser(file,fileName) {
  try {
    var instance = new DJI_SRT_Parser();
    return toExport(instance,file,fileName);
  } catch (err) {
    console.log(err);
    return null;
  }
}

module.exports = create_DJI_SRT_Parser;
