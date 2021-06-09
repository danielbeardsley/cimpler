# cimpler

[![Build Status](https://travis-ci.org/danielbeardsley/cimpler.png?branch=master)](https://travis-ci.org/danielbeardsley/cimpler)

cimpler is a Node.js continous integration server that primarily
interfaces with [Github post-recieve hooks][post-receive] and the
[Github commit status api][status]
It's designed to be straight-forward to setup and configure
yet allows for easy extension with plugins.

## Usage (command line)
The most common usage won't be direct at all.
i.e. Github post-recieve hook triggers builds,
build status and log are reported using the Github commit status api,
logs and results are found and viewed in the browser.

But, cimpler does provide a local-repo post-receive hook and a nice CLI:

    $> cimpler --help
    Examples:
       cimpler build [-b branch-name]   trigger a build on the current repo
       cimpler status                   echo the list of builds in the
                                        queue (* means building)
    
    Options:
      --command, -c  Custom shell command to execute for this build
                     instead of the one from the config file
      --branch, -b   Name of the branch to build (defaults to current)
      --verbose, -v  Produce more output for the status command.
                     Includes details for each build.
      --port, -p     HTTP port of the cimpler server
                     (defaults to the value in config.js)

## Installation

    $ git clone https://github.com/danielbeardsley/cimpler.git
    $ cd cimpler
    $ npm install --production
    $ cp config.sample.js config.js

## Configuration

Add your server's url with path: `/github` as a github post-receive hook:
 _(http://www.example.com/github)_

    $ vim config.js  # Edit to your liking, config.sample.js is well documented

## Running

If you are using the github plugin,
make sure the `config.httpPort` is accessible from the outside
(or at least from github's servers).

    $ bin/cimpler --server

## Hacking

    $ npm install
    $ npm test

The architecture is very simple and based on plugins.  A plugin has access to
several methods and events. Please look at the existing plugins as a guide to
writing your own.

### Plugin Interface

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

   * If `config` is an array, the `init()` function will be called once for
     each value in the array. This allows you to configure multiple instances
     of a plugin.

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

 * [Node.js](http://nodejs.org/) (8 and above)

## Inspired By

 * [Mergeatron](https://github.com/SnapInteractive/mergeatron)
 * [CI Joe](https://github.com/defunkt/cijoe)

[post-receive]: https://help.github.com/articles/post-receive-hooks
[status]: http://developer.github.com/v3/repos/statuses/
