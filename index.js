'use strict';

var request = require('request').defaults({
  proxy: process.env.http_proxy ||
         process.env.HTTP_PROXY ||
         process.env.https_proxy ||
         process.env.HTTPS_PROXY
});

exports.resolve = function (options, cb) {
  var r = {};
  var params = {};

  if (!options.apiKey) {
    params.apiKey = process.env.ELS_APIKEY;
  } else {
    params.apiKey = options.apiKey;
  }

  if (typeof options.piis === 'object') {
    params.piis = options.piis;
    exports.query(params, function (err, response) {
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

      return cb(null, entries);
    }

    if (response['search-results']) {
      return cb(null, response);
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
exports.PIIquery = function (options, callback) {

  var url = 'http://api.elsevier.com/content/article/PII:';
  var error;

  url += encodeURIComponent(options['pii']);

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

/**
 * Query Elsevier API and get results
 * @param  {Object}   param   the actual API parameters
 * @param  {Array}   param.piis : pii to search metadata for
 * @param  {Function} callback(err, result)
 */
exports.query = function (params, callback) {

  var maxcount = 200;
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
