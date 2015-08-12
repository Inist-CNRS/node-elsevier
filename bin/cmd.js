#!/usr/bin/env node
'use strict';

/**
 * Command used to enrich csv source with meta info from a pii identifi
 *
 */
var metaELS = require('../index.js');
var fs      = require('fs');
var path    = require('path');
var csv     = require('csv');
var yargs   = require('yargs')
  .usage('Enrich a csv with meta information requested from a pii.' +
    '\n  Usage: $0 [-es] [-f file_name | -k pii_key_name | --pii pii_string]')
  .alias('file', 'f')
  .alias('piikey', 'k')
  .alias('extended', 'e')
  .alias('delimiter', 'd')
  .alias('wait', 'w')
  .alias('silent', 's')
  .describe('piikey', 'the field name containing pii (default "pii").')
  .describe('delimiter', 'delimiter of the csv file. Defaults to ";".')
  .describe('file', 'A csv file to parse. If absent, will read from standard input.')
  .describe('wait', 'minimum time to wait between queries, in milliseconds. Defaults to 200.')
  .describe('pii', 'A single pii to resolve.');
var argv = yargs.argv;

// show usage if --help option is used
if (argv.help || argv.h) {
  yargs.showHelp();
  process.exit(0);
}

var fields   = [];
var piikey   = argv.piikey || 'pii';
var waitTime = parseInt(argv.wait) || 200;
var options  = { extended: argv.extended || false };

if (argv.pii) {
  // request for a single pii
  return metaELS.resolve(argv.pii, options, function (err, meta) {
    if (err) { throw err; }
    console.log(meta);
  });
}

var parser     = csv.parse({ delimiter: argv.delimiter || ';', columns: true });
var stream     = argv.file ? fs.createReadStream(argv.file) : process.stdin;
var buffer     = [];
var first      = true;
var busy       = false;
var ended      = false;
var bufferSize = 20;

var piiFields  = Object.keys(metaELS.APIgetInfo(null, true));
var baseFields = [];

function writeLine(record, meta) {
  if (!record) { return; }

  var values = [];

  baseFields.forEach(function (f) {
    values.push(record[f] || '');
  });

  if (typeof meta === 'object') {
    piiFields.forEach(function (f) {
      values.push(meta[f] || '');
    });
  }

  process.stdout.write(values.join(';') + '\n');
}

function resolve(callback) {
  if (buffer.length === 0) { return callback(); }
  if (buffer.length < bufferSize && !ended) { return callback(); }

  var records = buffer.splice(0, bufferSize);
  var piis    = records.map(function (r) { return r[piikey]; })

  metaELS.resolve(piis, options, function (err, list) {
    if (err) { console.error(err); }
    if (!Array.isArray(list)) {
      console.error(new Error('meta-pii did not return an array'));
      return records.forEach(function (r) { writeLine(r); });
    }

    records.forEach(function (record) {
      var item;

      for (var i = list.length - 1; i >= 0; i--) {
        if (typeof list[i]['els-pii'] !== 'string') { continue; }

        if (record[piikey].toLowerCase() == list[i]['els-pii'].toLowerCase()) {
          item = list[i];
          break;
        }
      };

      writeLine(record, item);
    });

    setTimeout(function() { resolve(callback); }, options.waitTime);
  });
}

stream.pipe(parser)
.on('readable', function () {
  var row = parser.read();
  if (!row) { return; }

  if (first) {
    for (var p in row) { baseFields.push(p); }
    process.stdout.write(baseFields.concat(piiFields).join(';') + '\n');
    first = false;
  }

  if (!row[piikey]) {
    console.error("Error : pii key field ", piikey, " not found");
    return writeLine(row);
  }

  buffer.push(row);

  if (!busy) {
    busy = true;
    resolve(function () {
      busy = false;
    });
  }

}).on('end', function () {
  ended = true;
  if (!busy) { resolve(function () {}); }
}).on('error', function (err) {
  console.error(err);
});
