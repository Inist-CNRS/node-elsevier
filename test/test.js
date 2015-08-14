/*global describe, it*/
'use strict';

var path    = require('path');
var should  = require('should');
var metaELS = require('../index.js');
var testSet = [
  {
    "itemType" : "Serial",
    "pii": "S1534580715000751",
    "issn": "1534-5807",
    "year": "2015"
  },
  {
    "itemType" : "Serial",
    "pii": "S0005273614000935",
    "issn": "0005-2736",
    "year": "2014"
  },
  {
    "itemType" : "Serial",
    "pii": "S0377025710000340",
    "issn": "0377-0257",
    "year": "2010"
  },
];

describe('Elsevier API', function () {
  testSet.forEach(function(testCase) {
    PIIcheck(testCase);
    APIcheck(testCase);
  });

  it('should correctly handle pii arrays (@03)', function (done) {
    this.timeout(5000);
    var piis = testSet.map(function (set) { return set.pii; });

    metaELS.resolve({'piis': piis}, function (err, list) {
      should.ifError(err);

      list.should.be.instanceof(Array, 'the reponse is not an array');
      list.should.have.lengthOf(piis.length);

      list.forEach(function (item) {
        item.should.have.property('els-publication-date-year');
        item.should.have.property('els-pii');

        item['els-pii'].should.be.type('string');

        for (var i = testSet.length - 1; i >= 0; i--) {
          if (testSet[i].pii.toLowerCase() == item['els-pii'].toLowerCase()) { break; }
        };

        should.exist(testSet[i], 'the pii ' + item['els-pii'] + ' that we didn\'t send ');
        item['els-publication-date-year'].toString().should.equal(testSet[i].year);
      });

      done();
    });
  });
});

function PIIcheck(testCase) {
  describe('PII request ', function () {
    it('should be correctly enriched (@01) for ' + testCase.itemType, function (done) {
      metaELS.PIIquery(testCase.pii, function (err, doc) {
        should.ifError(err);
        should.equal(metaELS.PIIgetPublicationDateYear(doc), testCase.year);
        done();
      });
    });
  });
}

function APIcheck(testCase) {
  describe('API request ', function () {
    it('should be correctly enriched (@02) for ' + testCase.itemType, function (done) {
      metaELS.APIquery({'piis': Array(testCase.pii), 'apiKey': metaELS.apiKey}, function (err, doc) {
        should.ifError(err);
        should.equal(metaELS.APIgetPublicationDateYear(doc), testCase.year);
        done();
      });
    });
  });
}