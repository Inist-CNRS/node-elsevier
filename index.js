'use strict';

var request = require('request').defaults({
  proxy: process.env.http_proxy ||
         process.env.HTTP_PROXY ||
         process.env.https_proxy ||
         process.env.HTTPS_PROXY
});
var config = require('./lib/config.js');
var apiKey, maxcount;

// load credentials for DOI requests
if (config.apiKey) {
  apiKey = config.apiKey;
} else {
  console.error("apiKey undefined ! needed for Elsevier API requests");
  console.error("You can only use PII requests");
}
if (config.maxcount) {
  maxcount = config.maxcount;
}

exports.apiKey = apiKey;

exports.resolve = function (options, cb) {
  var r = {};
  var params = {};

  if (!options.apiKey && apiKey) {
    params.apiKey = apiKey;
  } else {
    params.apiKey = options.apiKey;
  }

  if (typeof options.piis === 'object') {
    params.piis = options.piis;
    exports.APIquery(params, function (err, response) {
      if (err) {
        console.error("Error : " + err);
        return cb(err);
      }

      if (response === null) { return cb(null, {}); }
      if (!response) { return cb(new Error('no response')); }
      if (typeof response !== 'object') {
        return cb(new Error('response is not a valid object'));
      }
      if (!response['search-results']) {
        return cb(new Error('response object has no message' + JSON.stringify(response)));
      }

    if (response['search-results'] && Array.isArray(response['search-results'].entry)) {
      // suppress duplicated results on dc:identifier
      var cache = {};
      var entries = response['search-results'].entry;
      entries = entries.filter(function(elem,index,array){
        return cache[elem['dc:identifier']]?0:cache[elem['dc:identifier']]=1;
      });

      var list = entries.map(function (item) {
        return exports.APIgetInfo(item, options.extended);
      });
      return cb(null, list);
    }

      if (response['search-results']) {
        return cb(null, exports.APIgetInfo(response, options.extended));
      }
      return cb(null, {});
    });
  } else if (options.pii){
    exports.PIIquery(options.pii, function (err, response) {
      if (err) {
        console.error("Error : " + err);
        return cb(err);
      }

      if (response === null) { return cb(null, {}); }
      if (!response) { return cb(new Error('no response')); }
      if (typeof response !== 'object') {
        return cb(new Error('response is not a valid object'));
      }
      if (!response['full-text-retrieval-response']) {
        return cb(new Error('response object has no message'));
      }

      if (response['full-text-retrieval-response']) {
        return cb(null, exports.PIIgetInfo(response, options.extended));
      }
      return cb(null, {});
    });
  }
};

/**
 * Query Elsevier API for single PII and get results
 * (no credential needed et more informations returned in coredata)
 * @param  {Object}   search   the actual query parameters
 * @param  {String}   pii : pii to search metadata for
 * @param  {Function} callback(err, result)
 */
exports.PIIquery = function (pii, callback) {

  var url = 'http://api.elsevier.com/content/article/PII:';
  var error;

  url += encodeURIComponent(pii);

  request.get({'url': url, 'headers': {'Accept': 'application/json'}}, function (err, res, body) {

    if (err) { return callback(err); }

    if (res.statusCode === 404) {
      // pii not found
      return callback(null, null);
    } else if (res.statusCode !== 200) {
      error = new Error('Unexpected status code : ' + res.statusCode);
      error.url = url;
      return callback(error);
    }

    var info;

    try {
      info = JSON.parse(body);
    } catch(e) {
      return callback(e);
    }

    // if an error is thrown, the json should contain the status code and a detailed message
    if (info['service-error']) {
      error = new Error('got an unknown error from the API');
      error.message = info['service-error'].statusText;
      return callback(error) ;
    }

    callback(null , info);
  });
};

exports.PIIgetPublicationDateYear = function(apiResult) {
  if (typeof apiResult !== 'object' || apiResult === null) { return {}; }
  if (typeof apiResult['full-text-retrieval-response'] === 'object' &&
    typeof apiResult['full-text-retrieval-response'].coredata === 'object'
    ) {
    if (apiResult['full-text-retrieval-response'].coredata['prism:coverDate']) {
      return apiResult['full-text-retrieval-response'].coredata['prism:coverDate'].substring(0, 4);
    }
  }
  return {};
};

exports.PIIgetPublicationTitle = function(apiResult) {
  if (typeof apiResult !== 'object' || apiResult === null) { return {}; }
  if (typeof apiResult['full-text-retrieval-response'] === 'object' &&
    typeof apiResult['full-text-retrieval-response'].coredata === 'object'
    ) {
      return apiResult['full-text-retrieval-response'].coredata['prism:publicationName'];
  }
  return {};
};

exports.PIIgetInfo = function(doc, extended) {
  var info = {
    'els-publication-title': '',
    'els-article-title': '',
    'els-doi': '',
    'els-pii': '',
    'els-type': '',
    'els-ISSN': '',
    'els-ISBN': '',
    'els-publication-date': '',
    'els-publication-date-year': ''
  };

  if (typeof doc !== 'object' || doc === null) { return info; }
  if (typeof doc['full-text-retrieval-response'] === 'object' &&
    typeof doc['full-text-retrieval-response'].coredata === 'object'
    ) {
    //
    // return all meta informations
    info['els-meta'] = doc['full-text-retrieval-response'].coredata;

    // search standard information
    info['els-publication-title'] = doc['full-text-retrieval-response'].coredata['prism:publicationName'];
    info['els-article-title']     = doc['full-text-retrieval-response'].coredata['dc:title'];
    info['els-doi']               = doc['full-text-retrieval-response'].coredata['prism:doi'];
    info['els-pii']               = doc['full-text-retrieval-response'].coredata.pii;
    info['els-type']              = doc['full-text-retrieval-response'].coredata['prism:aggregationType'];
    if (doc['full-text-retrieval-response'].coredata['prism:isbn']) {
      info['els-ISBN'] = doc['full-text-retrieval-response'].coredata['prism:isbn'];
    }
    if (doc['full-text-retrieval-response'].coredata['prism:issn']) {
      info['els-ISSN'] = doc['full-text-retrieval-response'].coredata['prism:issn'];
    }
    if (doc['full-text-retrieval-response'].coredata['prism:coverDate']) {
      info['els-publication-date'] = doc['full-text-retrieval-response'].coredata['prism:coverDate'];
    }
    if (doc['full-text-retrieval-response'].coredata['prism:coverDate']) {
      info['els-publication-date-year'] = doc['full-text-retrieval-response'].coredata['prism:coverDate'].substring(0, 4);
    }
  }
  return info;
};

/**
 * Query Elsevier API and get results
 * @param  {Object}   param   the actual API parameters
 * @param  {Array}   param.piis : pii to search metadata for
 * @param  {Function} callback(err, result)
 */
exports.APIquery = function (params, callback) {

  // apiKey found in parameters override configuration
  if (! params.apiKey) {
    var error = new Error('Elsevier API needs apiKey ');
    return callback(error);
  }

  var url = 'http://api.elsevier.com/content/search/scidir-object?';
  url += 'suppressNavLinks=true&';
  url += '&apiKey=' + params.apiKey;
  url += '&httpAccept=application/json';
  url += '&field=url,identifier,description,prism:doi,prism:aggregationType,prism:publicationName,prism:coverDate,prism:pii,eid';

  if (Array.isArray(params.piis)) {
    url += '&count=' + maxcount + '&query=pii(' + params.piis.join(')+OR+pii(') + ')';
  } else {
    callback(null , null);
  }

  request.get(url, function (err, res, body) {
    if (err) { return callback(err); }

    if (res.statusCode === 404) {
      // doi not found
      return callback(null, null);
    } else if (res.statusCode !== 200) {
      var error = new Error('Unexpected status code : ' + res.statusCode);
      error.url = url;
      return callback(error);
    }

    var info;

    try {
      info = JSON.parse(body);
    } catch(e) {
      return callback(e);
    }

    // if an error is thrown, the json should contain the status code and a detailed message
    if (info['service-error']) {
      var error = new Error('got an unknown error from the API');
      error.status = info['service-error'].status;
      error.message = info['service-error'].status.statusText;
      return callback(error) ;
    }

    callback(null , info);
  });
};

exports.APIgetPublicationDateYear = function(doc) {
  var publication_date_year = '';

  if (typeof doc !== 'object' || doc === null) { return publication_date_year; }
  if (typeof doc['search-results'] === 'object'
    && typeof doc['search-results'].entry === 'object'
    && typeof doc['search-results'].entry[0] === 'object') {
    if (doc['search-results'].entry[0].error) {
      // no result
      return publication_date_year;
    }
    if (typeof doc['search-results'].entry[0]['prism:coverDate'] === 'object'
      && typeof doc['search-results'].entry[0]['prism:coverDate'][0] === 'object'
      ) {
      var publication_date = doc['search-results'].entry[0]['prism:coverDate'][0]['$'];
      publication_date_year = publication_date.substring(0, 4);
    }
  } else {
    console.error(doc);
  }
  return publication_date_year;
};

exports.APIgetInfo = function(doc, extended) {
  var info = {
    'els-doi': '',
    'els-pii': '',
    'els-publication-date': '',
    'els-publication-date-year': ''
  };

  if (typeof doc !== 'object' || doc === null) { return info; }

  if (typeof doc['prism:coverDate'] === 'object'
    && typeof doc['prism:coverDate'][0] === 'object'
    ) {
    info['els-publication-date'] = doc['prism:coverDate'][0]['$'];
    info['els-publication-date-year'] = info['els-publication-date'].substring(0, 4);
  }
  if (doc['dc:identifier']) {
    info['els-pii'] = doc['dc:identifier'].replace('PII:','').replace(/[-\(\)]/g,'');
  }
  if (doc['eid']) {
    info['els-eid'] = doc['eid'];
  }
  if (doc['prism:doi']) {
    info['els-doi'] = doc['prism:doi'];
  }

  return info;
};
