# meta-els
Return metadata from a Elsevier PII identifier

## installation
```shell
npm install -g meta-els
```


## Usage

### Module usage

```shell
var metaELS = require('meta-els');
var options = {};

// request for one pii
metaELS.resolve("S1534580715000751", options, function (err, item) {
  if (err) { console.error(err); }
  console.log(item);
});

// request for an array of piis
metaELS.resolve(["S1534580715000751", "S0005273614000935"], options, function (err, list) {
  if (err) { console.error(err); }
  list.forEach(function (item) {
    console.log(item);
  });
});
```

### Command line usage
Getting help
```shell
meta-els -h
Enrich a csv with meta information requested from a pii.
  Usage: bin/cmd.js [-es] [-f file_name | -k pii_key_name | --pii pii_string]

Options:
  --piikey, -k     the field name containing pii (default "pii").
  --delimiter, -d  delimiter of the csv file. Defaults to ";".
  --file, -f       A csv file to parse. If absent, will read from standard input
                   .
  --wait, -w       minimum time to wait between queries, in milliseconds.
                   Defaults to 200.
  --pii            A single pii to resolve.



