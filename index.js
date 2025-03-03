const tzlookup = require('tz-lookup');
const moment = require('moment-timezone');

const toMGJSON = require('./modules/toMGJSON');

const isoDateRegex =
  /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z/;

function DJI_SRT_Parser() {
  this.fileName = '';
  this.metadata = {};
  this.rawMetadata = [];
  this.smoothened = 0;
  this.millisecondsSample = 0;
  this.loaded = false;
  this.isMultiple = false;
  this.customProperties = {};
}
DJI_SRT_Parser.prototype.srtToObject = function (srt) {
  const maybeParseNumbers = d => {
    return isNum(d) ? Number(d) : d;
  };

  //convert SRT strings file into array of objects
  let converted = [];
  const timecodeRegEx = /(\d{2}:\d{2}:\d{2},\d{3})\s-->\s/;
  const packetRegEx = /^\d+$/;
  const arrayRegEx = /\b([A-Z_a-z]+)\(([-\+\w.,/]+)\)/g;
  const autelGPSRegex = /\bGPS\((W|E):([\d.]+),(N|S):([\d.]+),(-?[\d.]+)m/g;
  const valueRegEx = /\b([A-Z_a-z]+)\s?:[\s\[a-z_A-Z\]]?([-\+\d./]+)\w{0,3}\b/g;
  const dateRegEx = /\d{4}[-.]\d{1,2}[-.]\d{1,2} \d{1,2}:\d{2}:\d{2,}/;
  const accurateDateRegex =
    /(\d{4}[-.]\d{1,2}[-.]\d{1,2} \d{1,2}:\d{2}:\d{2}),(\w{3}),(\w{3})/g;
  const accurateDateRegex2 =
    /(\d{4}[-.]\d{1,2}[-.]\d{1,2} \d{1,2}:\d{2}:\d{2})[,.](\w{3})/g;
  // Identify DJI FPV for altitude fix
  const isDJIFPV =
    /font size="28"/.test(srt) &&
    /\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2}:\d{2}.\d{3}/.test(srt) &&
    /\[altitude: -?\d.*\]/.test(srt);
  //Split difficult Phantom4Pro format
  srt = srt
    .replace(/.*-->.*/g, match => match.replace(/,/g, ':separator:'))
    .replace(/\(([^\)]+)\)/g, match =>
      match.replace(/,/g, ':separator:').replace(/\s/g, '')
    )
    .replace(/, /g, ' ')
    .replace(/Â|°|(B0)/g, '')
    .replace(/\:separator\:/g, ',');
  //Split others
  srt = srt
    .split(/[\n\r]/)
    .map(l => l.trim())
    .map(l =>
      l
        .replace(/([a-zA-Z])\s([-\d])/g, '$1:$2')
        .replace(/([a-zA-Z])\s\(/g, '$1(')
        .replace(/([a-zA-Z])\.([a-zA-Z])/g, '$1_$2')
        .replace(/([a-zA-Z])\/(\d)/g, '$1:$2')
    )
    .filter(l => l.length);

  srt.forEach(line => {
    let match;
    if (packetRegEx.test(line)) {
      //new packet
      converted.push({});
    } else if ((match = timecodeRegEx.exec(line))) {
      converted[converted.length - 1].TIMECODE = match[1];
    } else {
      while ((match = arrayRegEx.exec(line))) {
        converted[converted.length - 1][match[1]] = match[2]
          .split(',')
          .map(d => maybeParseNumbers(d));
      }
      if ((match = autelGPSRegex.exec(line))) {
        converted[converted.length - 1].LONGITUDE =
          +match[4] * (match[3] === 'N' ? 1 : -1);
        converted[converted.length - 1].LATITUDE =
          +match[2] * (match[1] === 'E' ? 1 : -1);
        converted[converted.length - 1].ALTITUDE = +match[5];
      }

      while ((match = valueRegEx.exec(line))) {
        converted[converted.length - 1][match[1]] = maybeParseNumbers(match[2]);
      }
      if ((match = isoDateRegex.exec(line))) {
        converted[converted.length - 1].DATE = line;
      } else if ((match = accurateDateRegex.exec(line))) {
        converted[converted.length - 1].DATE =
          match[1] + ':' + match[2] + '.' + match[3];
      } else if ((match = accurateDateRegex2.exec(line))) {
        converted[converted.length - 1].DATE = match[1] + '.' + match[2];
      } else if ((match = dateRegEx.exec(line))) {
        converted[converted.length - 1].DATE = match[0].replace(
          /(:\d{2})(\d+)\d*$/,
          '$1.$2'
        );
      } else if (isDJIFPV && /\[altitude: -?\d.*\]/.test(line)) {
        // Correct altitude divided by 10 problem in DJI FPV drone
        converted[converted.length - 1].altitude = String(
          +converted[converted.length - 1].altitude * 10
        );
      }
    }
  });

  if (converted.length < 1 || Object.entries(converted[0]).length === 0) {
    console.error('Error converting object');
    return null;
  }
  return converted;
};

DJI_SRT_Parser.prototype.millisecondsPerSample = function (
  metadata,
  milliseconds
) {
  // get the smoothed array already saved and interpreted
  let newArr = metadata.packets;

  let millisecondsPerSampleTIMECODE = function (amount) {
    let lastTimecode = 0;
    let newResArr = [];

    for (let i = 0; i < newArr.length; i++) {
      let millisecondsFromTimecode = getMilliseconds(newArr[i].TIMECODE);

      if (millisecondsFromTimecode < lastTimecode) {
        continue;
      }

      newResArr.push(newArr[i]);
      // We save this value with the seconds parameters applyed
      lastTimecode = millisecondsFromTimecode + amount;
    }

    return newResArr;
  };

  // Calculate seconds from the timecode
  let getMilliseconds = function (timecode) {
    let m = timecode.split(','); // Split on the comma of milliseconds
    let t = m[0].split(':'); // Split on time separators

    let milliseconds = (+t[0] * 60 * 60 + +t[1] * 60 + +t[2]) * 1000;

    return Number(milliseconds) + Number(m[1]);
  };

  if (newArr[0].TIMECODE) {
    // If the value is 0, don't do anything
    if (milliseconds !== 0) {
      newArr = millisecondsPerSampleTIMECODE(milliseconds);
    }
    this.millisecondsSample = milliseconds;
  }

  return newArr;
};

DJI_SRT_Parser.prototype.interpretMetadata = function (arr, smooth) {
  // Forcing srt to have one information line plus the timecode. Preventing empty lines and incomplete data in the array, something frequent at the end of the DJI´s SRTs.
  arr = arr.filter(value => Object.keys(value).length > 1);
  // Do not process empty files
  if (!arr.length) return null;

  let fixDateUTC;

  // Fix duplicated dates
  const fixDates = function (arr) {
    let computed = JSON.parse(JSON.stringify(arr));
    let offset = 0;
    if (fixDateUTC) {
      const sample = computed.find(
        c =>
          c.GPS &&
          c.GPS.LATITUDE != null &&
          c.GPS.LONGITUDE != null &&
          c.GPS.LATITUDE != 'n/a' &&
          c.GPS.LONGITUDE != 'n/a' &&
          c.DATE != null
      );
      if (sample) {
        try {
          const tz = tzlookup(sample.GPS.LATITUDE, sample.GPS.LONGITUDE);
          if (tz) {
            let d = moment(sample.DATE);
            offset = (d.utcOffset() - d.tz(tz).utcOffset()) * 60 * 1000;
          }
        } catch (error) {
          console.warn(error);
        }
      }
      computed.forEach(c => (c.DATE += offset));
    }
    computed.forEach((c, i, arr) => {
      if (i > 0 && i < arr.length - 1 && c.DATE === arr[i + 1].DATE) {
        const diff = c.DATE - arr[i - 1].DATE;
        c.DATE = c.DATE - diff / 2;
      }
    });
    return computed;
  };

  let computeSpeed = function (arr) {
    //computes 3 types of speed in km/h
    let computed = JSON.parse(JSON.stringify(arr));
    let measure = function (lat1, lon1, lat2, lon2) {
      // generally used geo measurement function. Source: https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
      if (
        [lat1, lon1, lat2, lon2].reduce(
          (acc, val) => (!isNum(val) ? true : acc),
          false
        )
      ) {
        return 0; //set distance to 0 if there are null or nans in positions
      }
      var R = 6378.137; // Radius of earth in KM
      var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
      var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c;
      return d * 1000; // meters
    };
    let accDistance = 0;
    computed = computed.map((pck, i, cmp) => {
      let result = JSON.parse(JSON.stringify(pck));
      result.SPEED = {
        TWOD: 0,
        VERTICAL: 0,
        THREED: 0
      };
      result.DISTANCE = 0;
      if (i > 0) {
        let origin2d = [cmp[i - 1].GPS.LATITUDE, cmp[i - 1].GPS.LONGITUDE];
        let destin2d = [pck.GPS.LATITUDE, pck.GPS.LONGITUDE];
        let distance2D = measure(
          origin2d[0],
          origin2d[1],
          destin2d[0],
          destin2d[1]
        );
        distance2D /= 1000;
        let distanceVert = getElevation(pck) - getElevation(cmp[i - 1]);
        distanceVert /= 1000;
        let distance3D = Math.hypot(distance2D, distanceVert);
        let time = 1; //Fallback time, 1 second
        if (pck.DIFFTIME != null) {
          time = pck.DIFFTIME / 1000;
        } else if (pck.DATE) {
          time =
            (new Date(pck.DATE).getTime() -
              new Date(cmp[i - 1].DATE).getTime()) /
            1000.0; //seconds
        } else if (pck.TIMECODE) {
          const parseTC = /(\d\d):(\d\d):(\d\d),(\d{3})/;
          let match = pck.TIMECODE.match(parseTC);
          const useDate = new Date(
            0,
            0,
            0,
            match[1],
            match[2],
            match[3],
            match[4]
          );
          match = cmp[i - 1].TIMECODE.match(parseTC);
          const prevDate = new Date(
            0,
            0,
            0,
            match[1],
            match[2],
            match[3],
            match[4]
          );
          time =
            (new Date(useDate).getTime() - new Date(prevDate).getTime()) /
            1000.0; //seconds
        }

        time = time == 0 ? 1 : time; //make sure we are not dividing by zero, not sure why sometimes two packets have the same timestamp
        time /= 60 * 60;
        accDistance += distance3D * 1000;
        result.DISTANCE = accDistance;

        //If preset speeds set, copy them
        if (result.SPEED_TWOD != null) result.SPEED.TWOD = result.SPEED_TWOD;
        else result.SPEED.TWOD = distance2D / time;
        delete result.SPEED_TWOD;

        if (result.SPEED_VERTICAL != null)
          result.SPEED.VERTICAL = result.SPEED_VERTICAL;
        else result.SPEED.VERTICAL = distanceVert / time;
        delete result.SPEED_VERTICAL;

        if (result.SPEED_THREED != null)
          result.SPEED.THREED = result.SPEED_THREED;
        else result.SPEED.THREED = distance3D / time;
        delete result.SPEED_THREED;
      }
      return result;
    });
    return computed;
  };

  let computeStats = function (arr) {
    let statsObject = function (obj) {
      if (obj.constructor === Object && Object.keys(obj).length === 0)
        return null;
      let result = {};
      for (let elt in obj) {
        if (elt !== 'TIMECODE') {
          //IGNORE TIMECODES FOR STATS
          if (typeof obj[elt] === 'object' && obj[elt] != null) {
            result[elt] = statsObject(obj[elt]);
          } else {
            result[elt] = {
              min: 0,
              max: 0,
              avg: 0
            };
          }
        }
      }
      return result;
    };
    let recursiveStatsExtraction = function (res, arr) {
      let deepEqual = function (a, b) {
        if (a === b) return true;
        if (
          a == null ||
          typeof a != 'object' ||
          b == null ||
          typeof b != 'object'
        )
          return false;
        var propsInA = 0,
          propsInB = 0;
        for (var prop in a) propsInA += 1;
        for (var prop in b) {
          propsInB += 1;
          if (!(prop in a) || !deepEqual(a[prop], b[prop])) return false;
        }
        return propsInA == propsInB;
      };
      let result = res;
      for (let elt in result) {
        let select = arr.map(pck => {
          //remove undefined values in mixed srt files
          if (pck) return pck[elt];
        });
        if (elt === 'HOME') {
          //fill fields that do not use standard stats
          let allHomes = [];
          select.reduce((acc, val) => {
            //save different homes if present
            if (!deepEqual(val, acc)) allHomes.push(val);
            return val;
          }, []);
          result[elt] = allHomes;
        } else if (elt === 'DATE') {
          result[elt] = select[0];
        } else if (elt === 'TIMECODE') {
          //DO NOTHING
        } else if (typeof select[0] === 'object' && select[0] != null) {
          recursiveStatsExtraction(result[elt], select);
        } else {
          result[elt].min = select.reduce(
            (acc, val) => (val < acc && isNum(val) ? val : acc),
            Infinity
          );
          result[elt].max = select.reduce(
            (acc, val) => (val > acc && isNum(val) ? val : acc),
            -Infinity
          );
          result[elt].avg =
            select.reduce((acc, val) => (isNum(val) ? acc + val : acc), 0) /
            select.length;
        }
      }
      return result;
    };
    let result = statsObject(arr[0]);
    if (result.constructor === Object && Object.keys(result).length === 0)
      return null;
    result = recursiveStatsExtraction(result, arr);
    if (arr[arr.length - 1].DIFFTIME != undefined) {
      result.DURATION = arr[arr.length - 1].DIFFTIME; //duration of video in milliseconds
    } else if (arr[arr.length - 1].DATE != undefined) {
      result.DURATION =
        new Date(arr[arr.length - 1].DATE) - new Date(arr[0].DATE); //duration of video in milliseconds
    }
    if (arr[arr.length - 1].DISTANCE != null) {
      result.DISTANCE = arr[arr.length - 1].DISTANCE; //dsitance of flight in meters
    }
    return result;
  };
  let interpretPacket = function (pck, seemsRadians) {
    //Fix strange RTK format
    const fixRTK = function (pck) {
      if (!pck.GPS && pck.RTK) {
        const result = JSON.parse(JSON.stringify(pck));
        result.GPS = JSON.parse(JSON.stringify(result.RTK));
        delete result.RTK;
        return result;
      }
      return pck;
    };
    let interpretItem = function (key, datum) {
      //interprets known values to most useful data type
      let interpretedI = {};
      if (seemsRadians && (key === 'latitude' || key === 'longtitude')) {
        datum *= 180 / Math.PI;
      }
      if (key.toUpperCase() === 'GPS') {
        const m300format = /^\d+\.\d+M$/.test(datum[2]);
        const idx = {
          lat: m300format ? 0 : 1,
          lon: m300format ? 1 : 0
        };
        interpretedI = {
          LATITUDE: isNum(datum[idx.lat]) ? Number(datum[idx.lat]) : 'n/a',
          LONGITUDE: isNum(datum[idx.lon]) ? Number(datum[idx.lon]) : 'n/a'
        };
        if (m300format && isNum(datum[2].replace(/[a-z]/gi, ''))) {
          interpretedI.PRECISION = Number(datum[2].replace(/[a-z]/gi, ''));
        } else if (isNum(datum[2])) {
          interpretedI.SATELLITES = Number(datum[2]);
        } else if (/\dm$/.test(datum[2])) {
          interpretedI.ALTITUDE = +datum[2].replace(/m$/, '');
        }
      } else if (key.toUpperCase() === 'F_PRY') {
        interpretedI = {
          1: isNum(datum[1]) ? Number(datum[1]) : 'n/a',
          2: isNum(datum[0]) ? Number(datum[0]) : 'n/a',
          3: isNum(datum[2]) ? Number(datum[2]) : 'n/a'
        };
      } else if (key.toUpperCase() === 'G_PRY') {
        interpretedI = {
          1: isNum(datum[1]) ? Number(datum[1]) : 'n/a',
          2: isNum(datum[0]) ? Number(datum[0]) : 'n/a',
          3: isNum(datum[2]) ? Number(datum[2]) : 'n/a'
        };
      } else if (key.toUpperCase() === 'HOME') {
        interpretedI = {
          LATITUDE: Number(datum[1]),
          LONGITUDE: Number(datum[0])
        };
        if (datum.length > 2) {
          interpretedI.ALTITUDE = +datum[2].replace(/m$/, '');
        }
      } else if (key.toUpperCase() === 'TIMECODE') {
        interpretedI = datum;
      } else if (key.toUpperCase() === 'DATE') {
        let date = datum;
        // Fix date offset if not Zulu
        if (fixDateUTC == null) fixDateUTC = !/.+Z$/.test(datum);
        if (!isoDateRegex.exec(datum))
          date = datum
            .replace(/\./g, '-')
            .replace(' ', 'T')
            .replace(/-([0-9](\b|[a-zA-Z]))/g, '-0$1')
            .replace(/:(\w{3})-(\w{3})$/g, '.$1')
            .replace(/-(\d+Z?)$/, '.$1');

        interpretedI = new Date(date).getTime();
      } else if (key.toUpperCase() === 'EV') {
        interpretedI = eval(datum);
      } else if (key.toUpperCase() === 'SHUTTER') {
        interpretedI = isNum(datum)
          ? Number(datum)
          : Number(datum.replace('1/', ''));
      } else if (key.toUpperCase() === 'FNUM' && Number(datum) > 50) {
        //convert f numbers represented like 280
        interpretedI = Number(datum) / 100;
      } else if (Array.isArray(datum)) {
        interpretedI = datum.map(d =>
          isNum(d) ? Number(d) : Number(d.replace(/[a-zA-Z]/g, ''))
        );
      } else {
        interpretedI = isNum(datum)
          ? Number(datum)
          : Number(datum.replace(/[a-zA-Z]/g, ''));
      }
      if (
        interpretedI.constructor === Object &&
        Object.keys(interpretedI).length === 0
      )
        return null;
      return interpretedI;
    };
    let fillMissingFields = function (pckt) {
      let replaceKey = function (o, old_key, new_key) {
        if (old_key !== new_key) {
          Object.defineProperty(
            o,
            new_key,
            Object.getOwnPropertyDescriptor(o, old_key)
          );
          delete o[old_key];
        }
      };
      let references = {
        //translate keys form various formats
        SHUTTER: ['TV', 'SS'],
        FNUM: ['IR', 'F'],
        ALTITUDE: ['H', 'ABS_ALT'],
        BAROMETER: ['REL_ALT']
      };
      for (let key in references) {
        if (pckt[key] == undefined) {
          for (const match of references[key]) {
            if (pckt[match] != undefined) {
              replaceKey(pckt, match, key);
              break;
            }
          }
        }
      }

      //Make up date with timecode if not present
      if (!pckt['DATE'] && pckt['TIMECODE']) {
        pckt['DATE'] = new Date(
          new Date()
            .toISOString()
            .replace(/\d{2}:\d{2}:\d{2}.\d{3}Z/i, pckt['TIMECODE'])
            .replace(/,/, '.')
        ).getTime();
      }

      const seemsAutel =
        (pckt['N'] != null || pckt['S'] != null) &&
        (pckt['W'] != null || pckt['E'] != null) &&
        pckt['NUM'] != null;

      //Mavic 2 style
      let latitude = seemsAutel
        ? pckt['N'] != null
          ? pckt['N']
          : -pckt['S']
        : pckt['LATITUDE'];
      let longitude = seemsAutel
        ? pckt['E'] != null
          ? pckt['E']
          : -pckt['W']
        : pckt['LONGITUDE'] || pckt['LONGTITUDE'];
      let satellites = pckt['SATELLITES'];
      // NUM in autel seems to be F number sometimes
      // let satellites = seemsAutel ? pckt['NUM'] : pckt['SATELLITES'];
      if (seemsAutel) pckt['FNUM'] = pckt['NUM'];
      let precision = pckt['PRECISION'];
      if (seemsAutel) {
        delete pckt['N'];
        delete pckt['S'];
        delete pckt['W'];
        delete pckt['E'];
        delete pckt['NUM'];
      }
      // If one parameter exists, we fill the other later
      if (latitude != undefined || longitude != undefined) {
        pckt.GPS = {
          LONGITUDE: longitude,
          LATITUDE: latitude,
          SATELLITES: satellites,
          PRECISION: precision
        };
      }
      return pckt;
    };
    let interpretedP = {};
    pck = fixRTK(pck);
    for (let item in pck) {
      interpretedP[item.toUpperCase()] = interpretItem(item, pck[item]);
    }
    interpretedP = fillMissingFields(interpretedP);
    if (
      interpretedP.constructor === Object &&
      Object.keys(interpretedP).length === 0
    )
      return null;
    return interpretedP;
  };
  let smoothenGPS = function (arr, amount) {
    //averages positions with the specified surrounding seconds. Necessary due to DJI's SRT logs low precision
    let smoothArr = JSON.parse(JSON.stringify(arr));
    for (let i = 0; i < arr.length; i++) {
      let start = parseInt(i - amount);
      let end = parseInt(i + amount);
      const elevKey = getElevationKey(arr[i]);
      let sums = {
        LATITUDE: 0,
        LONGITUDE: 0,
        [elevKey]: 0
      };
      let latSkips = 0;
      let lonSkips = 0;
      let altSkips = 0;
      for (let j = start; j < end; j++) {
        let k = Math.max(Math.min(j, arr.length - 1), 0);
        if (isNum(arr[k].GPS.LATITUDE)) {
          sums.LATITUDE += arr[k].GPS.LATITUDE;
        } else {
          latSkips++;
        }
        if (isNum(arr[k].GPS.LONGITUDE)) {
          sums.LONGITUDE += arr[k].GPS.LONGITUDE;
        } else {
          lonSkips++;
        }
        if (isNum(arr[k][elevKey])) {
          sums[elevKey] += arr[k][elevKey];
        } else {
          altSkips++;
        }
      }
      smoothArr[i].GPS.LATITUDE = sums.LATITUDE / (amount * 2 - latSkips);
      smoothArr[i].GPS.LONGITUDE = sums.LONGITUDE / (amount * 2 - lonSkips);
      smoothArr[i][elevKey] = sums[elevKey] / (amount * 2 - altSkips);
    }
    return smoothArr;
  };

  // Mavic Air 2 has a bug where coords are in radians. This tries to detect this error and convert to degrees
  const deduceRadians = function (arr) {
    let maxLat = -Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let minLon = Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].latitude && arr[i].longtitude) {
        maxLat = Math.max(maxLat, arr[i].latitude);
        maxLon = Math.max(maxLon, arr[i].longtitude);
        minLat = Math.min(minLat, arr[i].latitude);
        minLon = Math.min(minLon, arr[i].longtitude);
      }
    }
    if (maxLon > Math.PI) return false;
    if (maxLon < -Math.PI) return false;
    if (maxLat > Math.PI / 2) return false;
    if (maxLat < -Math.PI / 2) return false;
    // This distance in radians would probably be impossible for a drone
    if (maxLat - minLat > 0.001) return false;
    if (maxLon - minLon > 0.001) return false;
    return true;
  };

  const seemsRadians = deduceRadians(arr);

  // If there was a time resampled array already created
  let newArr = arr.map(pck => interpretPacket(pck, seemsRadians));

  //Fix repeated dates
  newArr = fixDates(newArr);

  for (let i = 1; i < newArr.length; i++) {
    //loop back and forth to fill missing gps data with neighbours
    if (newArr[i].GPS) {
      try {
        if (!isNum(newArr[i].GPS.LATITUDE))
          newArr[i].GPS.LATITUDE = newArr[i - 1].GPS.LATITUDE;
        if (!isNum(newArr[i].GPS.LONGITUDE))
          newArr[i].GPS.LONGITUDE = newArr[i - 1].GPS.LONGITUDE;
        if (newArr[i].GPS.SATELLITES && !isNum(newArr[i].GPS.SATELLITES))
          newArr[i].GPS.SATELLITES = newArr[i - 1].GPS.SATELLITES;
        if (newArr[i].GPS.PRECISION && !isNum(newArr[i].GPS.PRECISION))
          newArr[i].GPS.PRECISION = newArr[i - 1].GPS.PRECISION;
      } catch (_) {}
    }
  }
  for (let i = newArr.length - 2; i >= 0; i--) {
    if (newArr[i].GPS) {
      try {
        if (!isNum(newArr[i].GPS.LATITUDE))
          newArr[i].GPS.LATITUDE = newArr[i + 1].GPS.LATITUDE;
        if (!isNum(newArr[i].GPS.LONGITUDE))
          newArr[i].GPS.LONGITUDE = newArr[i + 1].GPS.LONGITUDE;
        if (
          newArr[i].GPS.SATELLITES != null &&
          !isNum(newArr[i].GPS.SATELLITES)
        )
          newArr[i].GPS.SATELLITES = newArr[i + 1].GPS.SATELLITES;
        if (newArr[i].GPS.PRECISION != null && !isNum(newArr[i].GPS.PRECISION))
          newArr[i].GPS.PRECISION = newArr[i + 1].GPS.PRECISION;
      } catch (_) {}
    }
  }
  let smoothing = smooth != undefined ? smooth : 4;
  smoothing = smoothing >= 0 ? smoothing : 0;

  // Only accept parameters with GPS to prevent fatal errors
  let filteredGPSArr = newArr.filter(arr => arr.GPS);

  if (filteredGPSArr.length) {
    if (smoothing !== 0) {
      filteredGPSArr = smoothenGPS(filteredGPSArr, smoothing);
    }
    this.smoothened = smoothing;
    newArr = computeSpeed(filteredGPSArr);
  }

  if (!newArr.length) {
    console.error('Error intrerpreting metadata');
    return null;
  }

  let stats = computeStats(newArr);

  return {
    packets: newArr,
    stats: stats
  };
};

DJI_SRT_Parser.prototype.setCustomProperties = function (customProps = false) {
  // If no value is passed, clean the properties
  if (!customProps) return (this.customProperties = {});

  if (typeof customProps === 'object')
    return (this.customProperties = {
      ...this.customProperties,
      ...customProps
    });

  return false;
};

function getElevationKey(src) {
  //Elevation has different names on each format
  if (src.ALTITUDE != undefined) {
    return 'ALTITUDE';
  } else if (src.BAROMETER != undefined) {
    return 'BAROMETER';
  } else if (src.HB != undefined) {
    return 'HB';
  }
  return 'ALTITUDE';
}

function getElevation(src) {
  //Elevation has different names on each format
  if (src.ALTITUDE != undefined) {
    return src.ALTITUDE;
  } else if (src.BAROMETER != undefined) {
    return src.BAROMETER;
  } else if (src.HB != undefined) {
    return src.HB;
  }
  return null;
}

DJI_SRT_Parser.prototype.createCSV = function (raw) {
  let context = this;
  let columnHeads = [],
    rows = [];

  // Source: https://stackoverflow.com/questions/34513964/how-to-convert-this-nested-object-into-a-flat-object
  const flatObject = input => {
    function flat(res, key, val, pre = '') {
      const prefix = [pre, key].filter(v => v).join('.');
      return val != null && typeof val === 'object'
        ? Object.keys(val).reduce(
            (prev, curr) => flat(prev, curr, val[curr], prefix),
            res
          )
        : Object.assign(res, { [prefix]: val });
    }

    return Object.keys(input).reduce(
      (prev, curr) => flat(prev, curr, input[curr]),
      {}
    );
  };

  const prepareColumnHeads = obj => {
    obj = flatObject(obj); // Flat arrays and objects
    obj = { ...obj, ...context.customProperties, ...{ NAME: 1 } };
    columnHeads = Object.keys(obj);
    return columnHeads;
  };

  const populateData = (array, fileName) => {
    let dataArr = [];

    array.forEach(arr => {
      let obj = flatObject(arr);
      let results = [];

      // Double quotes on every field. It's  always neccesary?
      columnHeads.forEach(column => {
        if (obj.hasOwnProperty(column)) results.push(`"${obj[column]}"`);
        else if (context.customProperties[column])
          // Custom properties
          results.push(`"${context.customProperties[column]}"`);
        else if ('NAME' === column)
          results.push(`"${cleanFileName(fileName)}"`);
        else results.push(' '); // Fill empty columns
      });
      dataArr.push(results);
    });
    return dataArr;
  };

  if (context.isMultiple) {
    let array = raw
      ? Object.values(this.rawMetadata)
      : Object.keys(this.metadata).map(key => this.metadata[key].packets);

    // First search for all the different headers in all the files
    let mergedFirstElements;
    array.forEach(arr => {
      mergedFirstElements = { ...mergedFirstElements, ...arr[0] };
    });

    rows = [prepareColumnHeads(mergedFirstElements)];

    array.forEach((arr, key) => {
      rows = [...rows, ...populateData(arr, context.fileName[key])];
    });
  } else {
    let array = raw ? this.rawMetadata : this.metadata.packets;
    rows = [prepareColumnHeads(array[0])];
    rows = [...rows, ...populateData(array, context.fileName)];
  }

  if (rows.length < 1) return null;

  let csvContent = rows.reduce((acc, rowArray) => {
    let row = rowArray.join(',');
    return acc + row + '\r\n';
  }, '');

  if (!csvContent) {
    console.error('Error creating CSV');
    return null;
  }
  return csvContent;
};

DJI_SRT_Parser.prototype.createMGJSON = function (
  name = '',
  elevationOffset = 0
) {
  let packets = this.isMultiple
    ? Object.keys(this.metadata)
        .map(key => this.metadata[key].packets)
        .reduce((acc, val) => acc.concat(val), []) // Merge everything
    : this.metadata.packets;

  name = this.isMultiple && Array.isArray(name) ? name.join('-') : name;

  const mgJSONContent = toMGJSON(packets, name, elevationOffset);
  return mgJSONContent;
};

DJI_SRT_Parser.prototype.createGeoJSON = function (
  raw,
  waypoints,
  elevationOffset = 0
) {
  let context = this;
  function GeoJSONExtract(obj, raw) {
    let extractProps = function (childObj, pre) {
      let results = [];
      for (let child in childObj) {
        if (typeof childObj[child] === 'object' && childObj[child] != null) {
          let children = extractProps(childObj[child], pre + '_' + child);
          children.forEach(child => results.push(child));
        } else {
          results.push({ name: pre + '_' + child, value: childObj[child] });
        }
      }
      return results;
    };
    let extractCoordinates = function (coordsObj) {
      let coordResult = [];
      if (raw) {
        if (coordsObj.GPS.length >= 0 && coordsObj.GPS[0])
          coordResult[0] = coordsObj.GPS[0];
        if (coordsObj.GPS.length >= 1 && coordsObj.GPS[1])
          coordResult[1] = coordsObj.GPS[1];
      } else {
        if (coordsObj.GPS.LONGITUDE) coordResult[0] = coordsObj.GPS.LONGITUDE;
        if (coordsObj.GPS.LATITUDE) coordResult[1] = coordsObj.GPS.LATITUDE;
        if (getElevation(coordsObj) != null) {
          coordResult[2] = getElevation(coordsObj) + elevationOffset;
        }
      }
      return coordResult;
    };
    let result = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: []
      },
      properties: { ...context.customProperties }
    };

    for (let elt in obj) {
      if (elt === 'DATE') {
        result.properties.timestamp = obj[elt];
      } else if (elt === 'GPS') {
        result.geometry.coordinates = extractCoordinates(obj);
      } else if (typeof obj[elt] === 'object' && obj[elt] != null) {
        let children = extractProps(obj[elt], elt);
        children.forEach(child => {
          result.properties[child.name] = child.value;
        });
      } else {
        result.properties[elt] = obj[elt];
      }
    }
    return result;
  }
  let GeoJSONContent = {
    type: 'FeatureCollection',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
      }
    },
    features: []
  };

  function preProcess(array, fileName) {
    let features = [];

    array.forEach(pck => features.push(GeoJSONExtract(pck, raw)));

    if (waypoints) {
      GeoJSONContent.features = [...GeoJSONContent.features, ...features];
    }

    let createLinestring = function (features) {
      let result = {
        type: 'Feature',
        properties: {
          source: 'dji-srt-parser',
          timestamp: [],
          name: cleanFileName(fileName),
          ...context.customProperties
        },
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      };

      let props = features[0].properties;
      for (let prop in props) {
        if (
          ![
            'DATE',
            'TIMECODE',
            'GPS',
            'timestamp',
            'BAROMETER',
            'DISTANCE',
            'SPEED_THREED',
            'SPEED_TWOD',
            'SPEED_VERTICAL',
            'HB'
          ].includes(prop)
        ) {
          result.properties[prop] = props[prop];
        }
      }

      features.forEach(feature => {
        result.geometry.coordinates.push(feature.geometry.coordinates);
        result.properties.timestamp.push(feature.properties.timestamp);
      });
      return result;
    };

    GeoJSONContent.features.push(createLinestring(features));
  }

  if (context.isMultiple) {
    Object.keys(this.metadata).forEach(key => {
      if (raw) preProcess(this.rawMetadata[key], key);
      else preProcess(this.metadata[key].packets, key);
    });
  } else {
    preProcess(
      raw ? this.rawMetadata : this.metadata.packets,
      context.fileName
    );
  }

  if (!GeoJSONContent.features) {
    console.error('Error creating GeoJSON');
    return null;
  }

  return JSON.stringify(GeoJSONContent);
};

DJI_SRT_Parser.prototype.loadFile = function (data, fileName, isPreparedData) {
  let context = this;
  this.fileName = fileName;
  this.loaded = false;

  let decode = function (d) {
    if (typeof d === 'string' && d.split(',')[0].includes('base64')) {
      return atob(d.split(',')[1]);
    } else {
      return d;
    }
  };

  let decoded;
  if (Array.isArray(data) && Array.isArray(fileName)) {
    context.isMultiple = true;
    decoded = data.map(d => decode(d));
  } else {
    decoded = decode(data);
  }

  this.flow(decoded, isPreparedData);
};

DJI_SRT_Parser.prototype.getMetadata = function (fileName = null) {
  if (fileName && this.isMultiple) return this.metadata[fileName];

  return this.metadata;
};

DJI_SRT_Parser.prototype.getRawMetadata = function (fileName = null) {
  if (fileName && this.isMultiple) return this.rawMetadata[fileName];

  return this.rawMetadata;
};

DJI_SRT_Parser.prototype.flow = function (data, isPreparedData) {
  this.rawMetadata = {};

  let rawMetadata;

  const throwEmptyError = () => {
    throw 'Not valid data';
  };

  const maybeParse = data => {
    try {
      JSON.parse(data);
    } catch (e) {
      return data;
    }
    return JSON.parse(data);
  };

  const getRaw = data => {
    return isPreparedData ? maybeParse(data) : this.srtToObject(data);
  };

  if (this.isMultiple) {
    data.forEach((d, key) => {
      rawMetadata = getRaw(d);

      if (rawMetadata) {
        let fileName = this.fileName[key];

        this.rawMetadata[fileName] = rawMetadata;

        this.metadata[fileName] = this.interpretMetadata(rawMetadata);
      }
    });

    // If no data, return null
    if (!Object.keys(this.rawMetadata).length) throwEmptyError();
  } else {
    rawMetadata = getRaw(data);

    if (rawMetadata) {
      this.rawMetadata = rawMetadata;
      this.metadata = this.interpretMetadata(this.rawMetadata);
    } else {
      // If no data, return null
      throwEmptyError();
    }
  }

  this.loaded = true;
};

function cleanFileName(fileName) {
  return fileName.replace(/\.[^/.]+$/, ''); // Remove file extension
}

function notReady() {
  console.error('Data not ready');
  return null;
}

function isNum(val) {
  return /^[-\+\d.,]+$/.test(val);
}

function toExport(context, file, fileName, isPreparedData) {
  context.loadFile(file, fileName, isPreparedData);

  return {
    getSmoothing: function () {
      return context.loaded ? context.smoothened : notReady();
    },
    getMillisecondsPerSample: function () {
      return context.loaded ? context.millisecondsSample : notReady();
    },
    setSmoothing: function (smooth) {
      if (!context.loaded) return notReady();

      if (context.isMultiple) {
        Object.keys(context.rawMetadata).forEach(key => {
          context.metadata[key] = context.interpretMetadata(
            context.rawMetadata[key],
            smooth
          );
        });
        return context.metadata;
      }

      return (context.metadata = context.interpretMetadata(
        context.rawMetadata,
        smooth
      ));
    },
    setMillisecondsPerSample: function (milliseconds) {
      if (!context.loaded) return notReady();

      if (context.isMultiple) {
        Object.keys(context.metadata).forEach(key => {
          context.metadata[key].packets = context.millisecondsPerSample(
            context.metadata[key],
            milliseconds
          );
        });
        return context.metadata.packets;
      }

      return (context.metadata.packets = context.millisecondsPerSample(
        context.metadata,
        milliseconds
      ));
    },
    rawMetadata: function (fileName) {
      return context.loaded ? context.getRawMetadata(fileName) : notReady();
    },
    metadata: function (fileName) {
      return context.loaded ? context.getMetadata(fileName) : notReady();
    },
    toCSV: function (raw) {
      return context.loaded ? context.createCSV(raw) : notReady();
    },
    toMGJSON: function (elevationOffset) {
      return context.loaded
        ? context.createMGJSON(context.fileName, elevationOffset)
        : notReady();
    },
    toGeoJSON: function (raw, waypoints, elevationOffset) {
      return context.loaded
        ? context.createGeoJSON(raw, waypoints, elevationOffset)
        : notReady();
    },
    getFileName: function () {
      return context.loaded ? context.fileName : notReady();
    },
    setProperties: function (customProps) {
      return context.loaded
        ? context.setCustomProperties(customProps)
        : notReady();
    }
  };
}

/**
 * @param {string | array} file - The loaded data in a string (or array of strings)
 * @param {string | array} fileName - The fileName/s in a string (or array of strings)
 * @param {boolean} [isPreparedData] - It's a custom GeoJSON that was passed in file?
 */
function create_DJI_SRT_Parser(file, fileName, isPreparedData) {
  try {
    const instance = new DJI_SRT_Parser();
    return toExport(instance, file, fileName, isPreparedData);
  } catch (err) {
    console.error(err);
    return null;
  }
}

module.exports = create_DJI_SRT_Parser;
