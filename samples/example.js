'use_strict';

function preload(file, cb) {
  let loadFileBrowser = function(file) {
    let readTextFile = function(file, f) {
      let rawFile = new XMLHttpRequest();
      rawFile.open('GET', file, true);
      rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4) {
          if (rawFile.status === 200 || rawFile.status == 0) {
            let allText = rawFile.responseText;
            cb(allText);
          }
        }
      };
      rawFile.send(null);
    };
    readTextFile(file, context.flow);
  };
  let loadFileNode = function(file) {
    let http = require('http');
    var fs = require('fs');
    fs.readFile(file, function(err, data) {
      if (err) {
        throw err;
      }
      cb(data.toString());
    });
  };
  if (typeof window === 'undefined') {
    loadFileNode(file);
  } else {
    loadFileBrowser(file);
  }
}

let files = ['mavic_pro', 'mavic_air', 'old_format', 'mavic_pro_buggy', 'mavic_2_style'];
let DJISRTParser = require('../index');
let i = 0;
preload(files[i] + '.SRT', confirm);
let DJIfile;
function confirm(data) {
  DJIfile = DJISRTParser(data, files[i] + '.SRT');
  if (DJIfile) {
    console.log('\nLoaded file ' + DJIfile.getFileName());
    console.log('The video was recorded on ' + new Date(DJIfile.metadata().stats.DATE));
    if (DJIfile.metadata().stats.HOME) {
      console.log(
        "The drone's home was set to " + DJIfile.metadata().stats.HOME[0].LATITUDE + 'º,' + DJIfile.metadata().stats.HOME[0].LONGITUDE + 'º'
      );
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'Home data missing');
    }
    if (DJIfile.metadata().stats.SPEED) {
      console.log('Average 3D speed was ' + Math.round(DJIfile.metadata().stats.SPEED.THREED.avg) + ' km/h');
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'Speed data missing');
    }
    let elevation;
    if (DJIfile.metadata().stats.BAROMETER) {
      elevation = DJIfile.metadata().stats.BAROMETER.max;
    } else if (DJIfile.metadata().stats.HB) {
      elevation = DJIfile.metadata().stats.HB.max;
    } else if (DJIfile.metadata().stats.HS) {
      elevation = DJIfile.metadata().stats.HS.max;
    } else if (DJIfile.metadata().stats.GPS && DJIfile.metadata().stats.GPS.ALTITUDE) {
      elevation = DJIfile.metadata().stats.GPS.ALTITUDE.max;
    }
    if (elevation) {
      console.log('Highest registered elevation was ' + elevation + ' meters');
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'No elevation data');
    }
    if (typeof DJIfile.metadata().stats.DURATION !== 'number') {
      console.log('\x1b[31m%s\x1b[0m', 'Duration is missing');
    } else {
      console.log('The video recorded for ' + DJIfile.metadata().stats.DURATION / 1000 + ' seconds');
    }
    if (DJIfile.metadata().stats.GPS) {
      console.log('While flying for ' + Math.round(DJIfile.metadata().stats.DISTANCE) + ' meters');
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'GPS data missing');
    }
    if (
      DJIfile.metadata().packets[0].FNUM != undefined &&
      DJIfile.metadata().packets[0].SHUTTER != undefined &&
      DJIfile.metadata().packets[0].ISO != undefined
    ) {
      console.log(
        'Initial aperture was F' +
          DJIfile.metadata().packets[0].FNUM +
          ', shutter speed was 1/' +
          DJIfile.metadata().packets[0].SHUTTER +
          ' and ISO was ' +
          DJIfile.metadata().packets[0].ISO
      );
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'Some camera data missing (ISO, Shutter or Fnum)');
    }
    if (!DJIfile.metadata().stats.EV) {
      console.log('The camera was probably using auto-exposure');
    } else if (DJIfile.metadata().stats.EV.avg === 0) {
      console.log('The image looks properly exposed');
    } else if (DJIfile.metadata().stats.EV.avg > 0) {
      console.log('The image looks overexposed');
    } else if (DJIfile.metadata().stats.EV.avg < 0) {
      console.log('The image looks underexposed');
    }
    i++;
    if (i < files.length) preload(files[i] + '.SRT', confirm);
  } else {
    console.log('\x1b[31m%s\x1b[0m', 'Failed to load');
  }
}
