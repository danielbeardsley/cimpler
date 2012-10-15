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
    $ cp config.sample.js config.js

## Configuration

Add your server's url (and port) as a github POST receive hook
 _(http://www.example.com:12345/)_

    $ vim config.js  # Edit to your liking, config.sample.js is well documented

## Running

Make sure the `config.github.listen_port` is accessible from the outside (or at
least github's servers).

    $ node server.js

## Hacking

The architecture is very simple and based on plugins.  A plugin has access to
several methods.

## Requirements

 * [Node.js](http://nodejs.org/)

## Inspired By

 * [Mergeatron](https://github.com/SnapInteractive/mergeatron)
 * [CI Joe](https://github.com/defunkt/cijoe)
