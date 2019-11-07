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

let files = ['mavic_pro'];
let DJISRTParser = require('../index');
let i = 0;
preload(files[i] + '.SRT', confirm);
let DJIfile;
function confirm(data) {
  DJIfile = DJISRTParser(data, files[i] + '.SRT');
  if (DJIfile) {
    console.log('\nLoaded file ' + DJIfile.getFileName());

    const fs = require('fs');

    fs.writeFile('./out.mgjson', JSON.stringify(DJIfile.toMGJSON()), function(err) {
      if (err) {
        return console.log(err);
      }

      console.log('The file was saved!');
    });
  } else {
    console.log('\x1b[31m%s\x1b[0m', 'Failed to load');
  }
}
