/*global describe, it*/
'use strict';

var path    = require('path');
var should  = require('should');
var elsevier = require('../index.js');
var elsevierMissApikeyMessage = "apiKey not found - skipping - " +
    "(should be set it in ELS_APIKEY env after request at http://dev.elsevier.com/myapikey.html)"

var testSet = [
  {
    "itemType" : "Serial",
    "pii": "S1534580715000751",
    "prism:doi": "10.1016/j.devcel.2015.01.032",
    "dc:title": "A CRISPR/Cas9 Vector System for Tissue-Specific Gene Disruption in Zebrafish"
  },
  {
    "itemType" : "Serial",
    "pii": "S0005273614000935",
    "prism:doi": "10.1016/j.bbamem.2014.02.021",
    "dc:title": "Sphingolipid symmetry governs membrane lipid raft structure"
  },
  {
    "itemType" : "Serial",
    "pii": "S0377025710000340",
    "prism:doi": "10.1016/j.jnnfm.2010.02.006",
    "dc:title": "Nonequilibrium thermodynamics modeling of coupled biochemical cycles in living cells"
  }
];

var apiKey = process.env.ELS_APIKEY

describe('Elsevier API', function () {
  testSet.forEach(function(testCase) {
    PIIcheck(testCase);
    APIcheck(testCase);
  });

  if (apiKey) {
    it('should correctly handle pii arrays (@03)', function (done) {
      this.timeout(0);
      var piis = testSet.map(function (set) { return set.pii; });

      elsevier.resolve({'piis': piis, 'apiKey': apiKey}, function (err, list) {
        should.ifError(err);

        list.should.be.instanceof(Array, 'the reponse is not an array');
        list.should.have.lengthOf(piis.length);

        list.forEach(function (item) {
          item.should.have.property('eid');
          item.should.have.property('dc:identifier');

          item['dc:identifier'].should.be.type('string');

        });

        done();
      });
    });
  } else {
    console.error(elsevierMissApikeyMessage);
  }
});

function PIIcheck(testCase) {
  describe('PII request ', function () {
    this.timeout(0);
    it('should be correctly enriched with title (@01) for ' + testCase.itemType, function (done) {
      elsevier.PIIquery({'pii': testCase.pii}, function (err, doc) {
        should.ifError(err);
        should.equal(doc['full-text-retrieval-response']['coredata']['dc:title'].trim(), testCase['dc:title']);
        done();
      });
    });
  });
}

function APIcheck(testCase) {
  describe('API request ', function () {
    this.timeout(0);
    if (apiKey) {
      it('should be correctly enriched with doi (@02) for ' + testCase.itemType, function (done) {
        elsevier.query({'piis': Array(testCase.pii), 'apiKey': apiKey}, function (err, doc) {
          should.ifError(err);
          should.equal(doc['search-results']['entry'][0]['prism:doi'], testCase['prism:doi']);
          done();
        });
      });
    } else {
      console.error(elsevierMissApikeyMessage);
    }
  });
}