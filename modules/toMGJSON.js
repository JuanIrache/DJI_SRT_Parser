//Export to Adobe After Effect's mgJSON format. It's poorly documented, but here's a minimal working example: https://github.com/JuanIrache/mgjson

const padStringNumber = require('./padStringNumber');
const bigStr = require('./bigStr');
const deduceHeaders = require('./deduceHeaders');

//After Effects can't read larger numbers
const largestMGJSONNum = 2147483648;

//Build the style that After Effects needs for static text
function createDataOutlineChildText(matchName, displayName, value) {
  if (typeof value != 'string') value = value.toString();
  return {
    objectType: 'dataStatic',
    displayName,
    dataType: {
      type: 'string',
      paddedStringProperties: {
        maxLen: value.length,
        maxDigitsInStrLength: value.length.toString().length,
        eventMarkerB: false
      }
    },
    matchName,
    value
  };
}

//Choose best value for altitude
function chooseAlt(pckt) {
  if (pckt.BAROMETER != undefined) {
    return pckt.BAROMETER;
  } else if (pckt.HB != undefined) {
    return pckt.HB;
  } else if (pckt.HS != undefined) {
    return pckt.HS;
  } else if (pckt.GPS != undefined && pckt.GPS.ALTITUDE) {
    return pckt.GPS.ALTITUDE;
  }
  return 0;
}

//Build the style that After Effects needs for dynamic values: numbers, arrays of numbers (axes) or strings (date)
function createDynamicDataOutline(matchName, displayName, units, type) {
  let result = {
    objectType: 'dataDynamic',
    displayName,
    sampleSetID: matchName,
    dataType: { type },
    //We apply (linear) interpolation to numeric values only
    interpolation: type === 'paddedString' ? 'hold' : 'linear',
    hasExpectedFrequecyB: false,
    //Some values will be set afterwards
    sampleCount: null,
    matchName
  };

  if (units) result.displayName += ` [${units}]`;
  if (type === 'numberString') {
    //Number saved as string (After Effects reasons)
    //Add fourCC to help AE identify streams
    result.dataType.numberStringProperties = {
      pattern: {
        //Will be calculated later
        digitsInteger: 0,
        digitsDecimal: 0,
        //Will use plus and minus signs always. Seems easier
        isSigned: true
      },
      range: {
        //We use the allowed extremes, will compare to actual data
        occuring: { min: largestMGJSONNum, max: -largestMGJSONNum },
        //Legal values could potentially be modified per stream type (for example, latitude within -+85, longitude -+180... but what's the benefit?)
        legal: { min: -largestMGJSONNum, max: largestMGJSONNum }
      }
    };
  } else if (type === 'numberStringArray') {
    //Array of numbers, for example axes of a sensor
    let deducedHeaders = deduceHeaders({ name: displayName, units });
    //Set datatype
    result.dataType.numberArrayProperties = {
      pattern: {
        isSigned: true,
        digitsInteger: 0,
        digitsDecimal: 0
      },
      //Limited to 3 axes, we split the rest to additional streams
      arraySize: units.length,
      //Set tentative headers for each array.
      arrayDisplayNames: deducedHeaders,
      arrayRanges: {
        ranges: units.map(s => ({
          occuring: { min: largestMGJSONNum, max: -largestMGJSONNum },
          legal: { min: -largestMGJSONNum, max: largestMGJSONNum }
        }))
      }
    };
  } else if (type === 'paddedString') {
    //Any other value is expressed as string

    //Add fourCC to help AE identify streams
    result.dataType.paddedStringProperties = {
      maxLen: 0,
      maxDigitsInStrLength: 0,
      eventMarkerB: false
    };
  }

  return result;
}

//Returns the data as parts of an mgjson object
function convertSamples(data) {
  //Will hold the description of each stream
  let dataOutline = [];
  //Holds the streams
  let dataDynamicSamples = [];

  //Start deducing streams here
  function addOneStream({ streamName, units, sampleSetID, type, extract }) {
    try {
      //Prepare sample set
      let sampleSet = {
        sampleSetID,
        samples: []
      };

      //Create the stream structure
      let dataOutlineChild = createDynamicDataOutline(sampleSetID, streamName, units, type);
      //And find the type

      const setMaxMinPadStr = function(val, outline) {
        //Set found max lengths
        outline.dataType.paddedStringProperties.maxLen = Math.max(
          val.toString().length,
          outline.dataType.paddedStringProperties.maxLen
        );
        outline.dataType.paddedStringProperties.maxDigitsInStrLength = Math.max(
          val.length.toString().length,
          outline.dataType.paddedStringProperties.maxDigitsInStrLength
        );
      };

      //Loop all the samples
      data.forEach(s => {
        //Extract wanted data
        const value = extract(s);
        //Update mins and maxes
        const setMaxMinPadNum = function(val, pattern, range) {
          range.occuring.min = Math.min(val, range.occuring.min);
          range.occuring.max = Math.max(val, range.occuring.max);
          //And max left and right padding
          pattern.digitsInteger = Math.max(bigStr(Math.floor(val)).length, pattern.digitsInteger);
          pattern.digitsDecimal = Math.max(
            bigStr(val).replace(/^\d*\.?/, '').length,
            pattern.digitsDecimal
          );
        };

        //Back to data samples. Check that at least we have the valid values
        if (value != null) {
          let sample = { time: new Date(s.DATE) };
          if (type === 'numberString') {
            //Save numbers as strings
            sample.value = bigStr(value);
            //Update mins, maxes and padding
            setMaxMinPadNum(
              value,
              dataOutlineChild.dataType.numberStringProperties.pattern,
              dataOutlineChild.dataType.numberStringProperties.range
            );
          } else if (type === 'numberStringArray') {
            //Save arrays of numbers as arrays of strings
            sample.value = [];
            value.forEach((v, i) => {
              sample.value[i] = bigStr(v);
              //And update, mins, maxs and paddings
              setMaxMinPadNum(
                v,
                dataOutlineChild.dataType.numberArrayProperties.pattern,
                dataOutlineChild.dataType.numberArrayProperties.arrayRanges.ranges[i]
              );
            });
          } else if (type === 'paddedString') {
            //Save anything else as (padded)string
            sample.value = { length: value.length.toString(), str: value };
            setMaxMinPadStr(value, dataOutlineChild);
          }
          //Save sample
          sampleSet.samples.push(sample);
        }
      });

      sampleSet.samples.forEach(s => {
        if (type === 'numberString') {
          //Apply max padding to every sample
          s.value = padStringNumber(
            s.value,
            dataOutlineChild.dataType.numberStringProperties.pattern.digitsInteger,
            dataOutlineChild.dataType.numberStringProperties.pattern.digitsDecimal
          );
        } else if (type === 'numberStringArray') {
          //Apply max padding to every sample
          s.value = s.value.map(v =>
            padStringNumber(
              v,
              dataOutlineChild.dataType.numberArrayProperties.pattern.digitsInteger,
              dataOutlineChild.dataType.numberArrayProperties.pattern.digitsDecimal
            )
          );
        } else if (type === 'paddedString') {
          //Apply max padding to every sample
          s.value.str = s.value.str.padEnd(
            dataOutlineChild.dataType.paddedStringProperties.maxLen,
            ' '
          );
          s.value.length = s.value.length.padStart(
            dataOutlineChild.dataType.paddedStringProperties.maxDigitsInStrLength,
            '0'
          );
        }
      });
      //Save total samples count
      dataOutlineChild.sampleCount = sampleSet.samples.length;
      //Save stream
      dataOutline.push(dataOutlineChild);
      dataDynamicSamples.push(sampleSet);
    } catch (error) {
      console.error(error);
    }
  }

  if (data && data.length) {
    addOneStream({
      streamName: 'GPS: (Lat.,Long.,Alt.)',
      units: ['deg', 'deg', 'm'],
      sampleSetID: `streamGPS`,
      type: 'numberStringArray',
      extract: function(s) {
        return [s.GPS.LATITUDE, s.GPS.LONGITUDE, chooseAlt(s)];
      }
    });
    addOneStream({
      streamName: 'SPEED: (2D,3D.)',
      units: ['km/h', 'km/h'],
      sampleSetID: `streamSPEED`,
      type: 'numberStringArray',
      extract: function(s) {
        return [s.SPEED.TWOD, s.SPEED.THREED];
      }
    });
    addOneStream({
      streamName: 'DISTANCE:',
      units: ['m'],
      sampleSetID: `streamDISTANCE`,
      type: 'numberString',
      extract: function(s) {
        return s.DISTANCE;
      }
    });
    addOneStream({
      streamName: 'ISO:',
      units: null,
      sampleSetID: `streamISO`,
      type: 'numberString',
      extract: function(s) {
        return s.ISO;
      }
    });
    addOneStream({
      streamName: 'SHUTTER:',
      units: null,
      sampleSetID: `streamSHUTTER`,
      type: 'numberString',
      extract: function(s) {
        return s.SHUTTER;
      }
    });
    addOneStream({
      streamName: 'FNUM:',
      units: null,
      sampleSetID: `streamFNUM`,
      type: 'numberString',
      extract: function(s) {
        return s.FNUM;
      }
    });
    addOneStream({
      streamName: 'DATE:',
      units: null,
      sampleSetID: `streamDATE`,
      type: 'paddedString',
      extract: function(s) {
        return new Date(s.DATE).toISOString();
      }
    });
  }

  return { dataOutline, dataDynamicSamples };
}

//Converts the processed data to After Effects format
module.exports = function(data, name = '') {
  const converted = convertSamples(data);
  //The format is very convoluted. This is the outer structure
  let result = {
    version: 'MGJSON2.0.0',
    creator: 'https://github.com/JuanIrache/DJI_SRT_Parser',
    dynamicSamplesPresentB: true,
    dynamicDataInfo: {
      useTimecodeB: false,
      utcInfo: {
        precisionLength: 3,
        isGMT: true
      }
    },
    //Create first data point with filename
    dataOutline: [
      createDataOutlineChildText('filename', 'File name', name.replace(/\.srt$/i, '')),
      ...converted.dataOutline
    ],
    //And paste the converted data
    dataDynamicSamples: converted.dataDynamicSamples
  };

  //Remove dynamic data if no samples
  if (!result.dataDynamicSamples.length) {
    delete result.dataDynamicSamples;
    delete result.dynamicDataInfo;
    result.dynamicSamplesPresentB = false;
  }

  return result;
};
