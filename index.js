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
var jp = require('jsonpath');

//const fast = require('@f5devcentral/f5-fast-core');

const USER_AGENT_STRING = 'fast pipeline prototype 0.1.0'

const fname = process.argv.pop();

console.log(fname);

const ls = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

const parseContentDisposition = (string) => {
  const parts = string.split(';')
  const dict = parts[1].trim().split('=')


  if(parts[0]!== 'attachment' || parts.length !== 2 || dict.length !== 2)
    throw new Error('content-disposition format unsupported: '+string);

  return {
    type: parts[0],
    filename: dict[1]
  }
}

const makeRequest = (opts, payload) => {
  const protocol = opts.protocol === 'http:' ? _http : _https;

  if(!opts.headers)
    opts.headers = {};

  if(!opts.headers['User-Agent']) {
    opts.headers['User-Agent'] = USER_AGENT_STRING;
  }
  console.log('makeRequest', opts);
  return new Promise((resolve, reject) => {
    const req = protocol.request(opts, (res) => {
      console.log(res.statusCode);
      console.log(res.headers);

      res.on('error', (err) => {
        console.error('response error;'+err);
      });

      if( res.statusCode >= 300 && res.statusCode < 400 ) {
        if(res.headers && res.headers.location) {
          const parsed = url.parse(res.headers.location);
          return makeRequest(Object.assign(opts, parsed), payload);
        } else {
          return reject(new Error('Redirected, but No Location header'));
        }
      }

      if( res.headers['content-type'] === 'application/octet-stream') {
        // handle file download, works on github at least...
        const cd = parseContentDisposition(res.headers['content-disposition']);

        //const fstream = fs.createWriteStream(cd.filename, {autoclose: false});
        //res.pipe(fstream);
        let bytes_recieved = 0;
        res.on('data', (data) => {
          bytes_recieved += data.length
        })
        res.on('end', () => {
          console.log(`${bytes_recieved} recieved`)
          return resolve({
            options: opts,
            status: res.statusCode,
            headers: res.headers,
            file: cd.filename
          });
        });

      } else {
        // ... other content assumed to be utf8, for now ...
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
      }
    });

    req.on('error', (e) => {
      console.log('other side is mean')
      //reject(new Error(`${opts.host}:${e.message}`));
    });

    if (payload) req.write(JSON.stringify(payload));
    req.end();
  })
  .catch((e) => {
    throw new Error(`makeRequest: ${e.stack}`);
  })
};

const url2opts = s => s ? url.parse(s) : {};

const requestStageBuilder = (stageConfig) => {
  //opts -> the options for the next stage
  //result -> the result from the last stage
  console.log('building stageConfig');
  return (result) => {
    //var names = jp.query(, '$..name');
    console.log('chain builder task');

    const options = {};

    if( result.body ) {
      result.body = JSON.parse(result.body);
    }


    // handle json path in URL, query result
    if(stageConfig.url.indexOf('$') === 0) {
      const locations = jp.query(result, stageConfig.url);
      if(locations.length === 1)
        Object.assign(options, url2opts(locations[0]));
      else {
        throw new Error(`Ambiguous or unresolved location:
          Object: ${result}
          JSONpath: ${stageConfig.url}
          Result: ${locations}`);
      }
    } else {
      const opts = url2opts(stageConfig.url);
      Object.assign(options, opts);
    }

    // overlay user options on URL inference
    Object.assign(options, stageConfig.options);

    // prepare body. TODO: follow yaml property branches to find json path leaves
    // reuse result body in post if there is one, use stage config body
    // if neither is specified, a body will not be sent
    const body = result.body || stageConfig.body;
    console.log('making request:', options, body);
    return makeRequest(options, body)
  }
}

const taskRouter = (config) => {
  console.log('routing config task', config);
  if(config.task === 'Request') {
    return requestStageBuilder(config);
  } else {
    throw new Error('No job for ' + JSON.stringify(config,null,2));
  }
}

const chainBuilder = (promise_list) => {
  console.log(promise_list.toString());

  return (input) => {
    let count = 0;
    return promise_list.reduce((agg, cur) => {
      return agg
        .then((result) => {
          count++;
          return cur(result);
        })
        .catch((err) => {
          throw new Error(`index ${count} ${err.stack}`);
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
      return taskRouter(config)({});
    }
  })
  .then((result) => {
    console.log('final', result.body);
  })
  .catch((err) => {
    console.error(err);
  })
