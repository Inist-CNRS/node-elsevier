#!/usr/bin/env node
'use strict';

/**
 * Command used to enrich csv source with meta info from a pii identifi
 *
 */
var elsevier = require('../index.js');
var yargs   = require('yargs')
  .usage('Enrich a csv with meta information requested from a pii.' +
    '\n  Usage: $0 [-es] --pii pii_string]')
  .describe('pii', 'A single pii to resolve.');
var argv = yargs.argv;
var apiKey = argv.apiKey || false;
var parameters = argv.query || false;

// show usage if --help option is used
if (argv.help || argv.h) {
  yargs.showHelp();
  process.exit(0);
}

if (argv.pii) {
  // request for a single pii with optional parameters
  elsevier.PIIquery({'pii': argv.pii}, function (err, response) {
    if (err) { throw err; }
    console.log(response);
  });
} else {
  yargs.showHelp();
  process.exit(0);
}


