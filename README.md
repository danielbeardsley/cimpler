# cimpler

[![Build
Status](https://secure.travis-ci.org/danielbeardsley/cimpler.png)](http://travis-ci.org/danielbeardsley/cimpler)

cimpler is a very simple Node.js continous integration server that
interfaces with [Github post-recieve
hooks](https://help.github.com/articles/post-receive-hooks) and the
[Github commit status api](http://developer.github.com/v3/repos/statuses/).

It's super simple to setup and configure.  At this time it's designed to only
manage one repo at a time.

## Installation

    $ git clone https://github.com/danielbeardsley/cimpler.git
    $ cd cimpler
    $ npm install --production
    $ cp config.sample.js config.js

## Configuration

Add your server's url (and port) as a github POST receive hook
 _(http://www.example.com:12345/)_

    $ vim config.js  # Edit to your liking, config.sample.js is well documented

## Running

If you are using the github plugin,
make sure the `config.httpPort` is accessible from the outside
(or at least from github's servers).

    $ node server.js

## Hacking

    $ npm install
    $ npm test

The architecture is very simple and based on plugins.  A plugin has access to
several methods and events. Please look at the existing plugins as a guide to
writing your own.

### Plugins

A plugin is a node.js module that exports an object which has an `init`
property like: `function(config, cimpler)`

* __config:__ The value from the corresponding entry in config.js ("some value"
    from below)

        // config.js
        module.exports = {
           plugins: {
              'plugin-name': "some value" // passed to the init() function
           }, ...
        }

* __cimpler:__ an instance of Cimpler which exposes methods and events
   * Methods:
      * `.addBuild(build)` : Adds a build to the system. A build is an object
        with these properties at a minimum:
         * `repo` : a string identifying the repository of the build (a url,
           a local path to the originating repo)
         * `branch` : The name of the branch this build should be run against
      * `.consumeBuild(callback[, repoRegex])` : registers this plugin as a
        build consumer.
         * `callback` has signature: `function(build, started, finished)`
            * `started()` and `finished()` are both functions a plugin should
              call when a build is started and finished.
            * `started()` and the `buildStarted` event will be triggered
              implicitly if `finished()` is called first.
         * If `repoRegex` is provided, only builds with a `build.repo`
           property that match the regex will be passed to the callback.
         * The callback will be called for each build, serially. `callback()`
           will only be called for the next build once `finished()` is called.
      * `.shutdown()` : Initiates shutdown of the server and triggers the
        `shutdown` event.
   * Events:
      * `buildAdded(build)` : Emitted immediately after `cimpler.addBuild`
        is called
      * `buildStarted(build)` : Emitted after a build has been started by
        a build consumer
      * `buildFinished(build)` : Emitted after a build has finished
      * `shutdown` : Your plugin should release it's resources because the
        server is shutting down.


## Requirements

 * [Node.js](http://nodejs.org/) (0.6 and above)

## Inspired By

 * [Mergeatron](https://github.com/SnapInteractive/mergeatron)
 * [CI Joe](https://github.com/defunkt/cijoe)
