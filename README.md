# fast-http-pipeline

HTTP pipeline with FAST templates

# Introduction

Define HTTP pipelines with YAML configs and [JSONPath](https://jsonpath.com/) syntax.

# Usage

```sh
npm ci
node . <pipeline file>
```

# Example Pipelines

Hello World

```YAML
task: Request
url: https://google.com
options:
  timeout: 1000
```

A more complex example with configuration using the same options as Node's
HTTP Request objects

```YAML
- task: request
  url: http://localhost:3000/HelloWorld
  method: POST
  headers:
    Content-Type: application/json
  body:
   name: Matt
- task: request
  url: http://big-ip.example.com/mgmt/shared/appsvcs/declare
  options:
    method: POST
    headers:
      Content-Type: application/json
    body: $
```
The results of the first request are used in the second request.

In the 'body' section of the second request, the dollar sign is JSONPath that
refers to the results from the previous request. The previous request's response
will be validated JSON, and the entire object will be placed into the next
request.

# Quick Reference [source](https://nodejs.org/api/http.html)

* url {{string}}

* options {{Object}}

  - agent {{boolean}}

    Controls Agent behavior. Possible values:
     * undefined (default): use http.globalAgent for this host and port.
     * false: causes a new Agent with default values to be used.

  - auth {{string}}

    Basic authentication i.e. 'user:password' to compute an
    Authorization header.

  - createConnection {{Function}}

    A function that produces a socket/stream to use
    for the request when the agent option is not used. This can be used to avoid
    creating a custom Agent class just to override the default createConnection
    function. See agent.createConnection() for more details. Any Duplex stream is
    a valid return value.

  - defaultPort {{number}}

    Default port for the protocol. Default: agent.defaultPort
    if an Agent is used, else undefined.

  - family {{number}}

    IP address family to use when resolving host or hostname.
    Valid values are 4 or 6. When unspecified, both IP v4 and v6 will be used.

  - headers {{Object}}
    An object containing request headers.

  - host {{string}}

    A domain name or IP address of the server to issue the request
    to. Default: 'localhost'.

  - hostname {{string}}

    Alias for host. To support url.parse(), hostname will be
    used if both host and hostname are specified.

  - insecureHTTPParser {{boolean}}

    Use an insecure HTTP parser that accepts invalid
    HTTP headers when true. Using the insecure parser should be avoided. See --
    insecure-http-parser for more information. Default: false

  - localAddress {{string}}

    Local interface to bind for network connections.

  - lookup {{Function}}

    Custom lookup function. Default: dns.lookup().

  - maxHeaderSize {{number}}

    Optionally overrides the value of --max-http-header-
    size for requests received from the server, i.e. the maximum length of response
    headers in bytes. Default: 16384 (16KB).

  - method {{string}}

    A string specifying the HTTP request method. Default: 'GET'.

  - path {{string}}

    Request path. Should include query string if any. E.G. '/
    index.html?page=12'. An exception is thrown when the request path contains
    illegal characters. Currently, only spaces are rejected but that may change in
    the future. Default: '/'.

  - port {{number}}

    Port of remote server. Default: defaultPort if set, else 80.

  - protocol {{string}}

    Protocol to use. Default: 'http:'.

  - setHost {{boolean}}:

    Specifies whether or not to automatically add the Host
    header. Defaults to true.

  - socketPath {{string}}

    Unix Domain Socket (cannot be used if one of host or port
      is specified, those specify a TCP Socket).

  - timeout {{number}}:

    A number specifying the socket timeout in milliseconds. This
    will set the timeout before the socket is connected.

* webhook {{string}}
  URL to post results of this request


# Known Issues

- TODO: JSON path transfer
- TODO: Template integration for response->request transforms
