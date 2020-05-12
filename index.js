/**

  FAST HTTP Pipeline
  Author: Matthew Zinke <m.zinke@f5.com>

  FAST HTTP will quickly stand up an HTTP services for making
  pipelined HTTP calls.

  Takes a configuration file and runs it.

*/
const fs = require('fs')
const _http = require('http');
const _https = require('https');
const util = require('util');
const url = require('url');
const yaml = require('js-yaml');

//const fast = require('@f5devcentral/f5-fast-core');

const USER_AGENT_STRING = 'fast pipeline prototype 0.1.0'

const fname = process.argv.pop();

console.log(fname);

const ls = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

const makeRequest = (opts, payload) => {
  const protocol = opts.protocol === 'http:' ? _http : _https;

  if(!opts.headers['User-Agent']) {
    opts.headers['User-Agent'] = USER_AGENT_STRING;
  }
  return new Promise((resolve, reject) => {
      const req = protocol.request(opts, (res) => {
        console.log(res.statusCode);
          const buffer = [];
          res.setEncoding('utf8');
          res.on('data', (data) => {
              buffer.push(data);
          });
          res.on('end', () => {
              let body = buffer.join('');
              return resolve({
                  options: opts,
                  status: res.statusCode,
                  headers: res.headers,
                  body: body
              });
          });
      });

      req.on('error', (e) => {
        reject(new Error(`${opts.host}:${e.message}`));
      });

      if (payload) req.write(JSON.stringify(payload));
      req.end();
  });
};


const requestStageBuilder = (opts) => {
  //opts -> the options for the next stage
  //result -> the result from the last stage
  return (result) => {
    const body = result.body || opts.body;
    console.log('making request:', opts, result.body);
    return makeRequest(opts, body)
  }
}

const taskRouter = (config) => {
  if(config.task === 'Request') {
    const opts = config.url ? url.parse(config.url) : {};
    const options = Object.assign({
      method: 'GET'
    }, opts);
    Object.assign(options, config.options);
    return requestStageBuilder(options);
  } else {
    throw new Error('No job for ' + JSON.stringify(config,null,2));
  }
}

const chainBuilder = (promise_list) => {
  console.log(promise_list);

  return (input) => {
    return promise_list.reduce((agg, cur) => {
      return agg
        .then((result) => {
          return cur(result);
        });
    }, Promise.resolve(input))
  }
};

readFile(fname)
  .then((script) => {
    const raw = script.toString('utf8');
    const config = yaml.safeLoad(raw);
    console.log(config);
    if( config instanceof Array ) {
      return chainBuilder(config.map(stage => taskRouter(stage)))({});
    } else {
      return taskRouter(config);
    }
  })
  .then((result) => {
    console.log('final', result.body);
  })
  .catch((err) => {
    console.error(err);
  })
