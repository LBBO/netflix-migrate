# netflix-migrate [![Build Status](https://travis-ci.com/genderquery/netflix-migrate.svg?branch=master)](https://travis-ci.com/genderquery/netflix-migrate)

A command line utility to export and import your ratings.

## Installation
```
npm install -g netflix-migrate
```

## Usage
```
netflix-migrate --email old@example.com --profile Lana --export ratings.json
netflix-migrate --email new@example.com --profile Lana --import ratings.json
```
You will be prompted for your email address, password, and/or profile name if not provided as a parameter. If you do not specify a file path for `--export` or `--import`, `stdout` and `stdin` will be used, respectively. If `--export` or `--import` are not provided, `--export` is assumed (and `stdout` will be used).

## Warning

Use of this software may constitute a breach in the [Netflix Terms of Use](https://help.netflix.com/legal/termsofuse) and/or the [End User License Agreement](https://help.netflix.com/legal/eula). Use at your own risk.
