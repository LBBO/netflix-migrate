# netflix-migrate [![Build Status](https://travis-ci.com/LBBO/netflix-migrate.svg?branch=master)](https://travis-ci.com/LBBO/netflix-migrate)

A command line utility to export and import your ratings.

## Usage
```
npx netflix-migrate --email old@example.com --profile Lana --export netflixData.json
npx netflix-migrate --email new@example.com --profile Lana --import netflixData.json
```
You will be prompted for your email address, password, and/or profile name if not provided as a parameter. If you do not specify a file path for `--export` or `--import`, `stdout` and `stdin` will be used, respectively. If `--export` or `--import` are not provided, `--export` is assumed (and `stdout` will be used).

Your exported data will also contain your viewing history. Currently, the import function is only able to import the rating history, but that will hopefully change soon. However, you now already have your data and once the functionality is added you will be able to import your old viewing history too, even if you don't have any access to the old account anymore.

## Warning

Use of this software may constitute a breach in the [Netflix Terms of Use](https://help.netflix.com/legal/termsofuse) and/or the [End User License Agreement](https://help.netflix.com/legal/eula). Use at your own risk.
