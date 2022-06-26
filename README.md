# netflix-migrate [![Build Status](https://travis-ci.com/LBBO/netflix-migrate.svg?branch=master)](https://travis-ci.com/LBBO/netflix-migrate) ![Docker Pulls](https://img.shields.io/docker/pulls/rlabinc/netflix-migrate.svg?style=flat&label=pulls&logo=docker)

A command line utility to export and import your ratings.

## Usage
```
npx netflix-migrate --email old@example.com --profile Lana --export netflixData.json
npx netflix-migrate --email new@example.com --profile Lana --import netflixData.json
```
You will be prompted for your email address, password, and/or profile name if not provided as a parameter. If you do not specify a file path for `--export` or `--import`, `stdout` and `stdin` will be used, respectively. If `--export` or `--import` are not provided, `--export` is assumed (and `stdout` will be used).

Your exported data will also contain your viewing history. Currently, the import function is only able to import the rating history, but that will hopefully change soon. However, you now already have your data and once the functionality is added you will be able to import your old viewing history too, even if you don't have any access to the old account anymore.

## Docker Usage
```bash
docker run -it --rm \
  --name=netflix-migrate \
  -e TZ=Europe/London `#optional` \
  -e EMAIL=mail@example.com \
  -e PASSWORD='qwerty123' `#better to use single quotes` \
  -e PROFILE_NAME=John \
  -e OPERATION=export `#import or export` \
  -e FILE_NAME=NetflixData.json \
  -v /path/to/Data:/Data \
  rlabinc/netflix-migrate:latest
```

Your exported data will also contain your viewing history. Currently, the import function is only able to import the rating history, but that will hopefully change soon. However, you now already have your data and once the functionality is added you will be able to import your old viewing history too, even if you don't have any access to the old account anymore.

## Docker Parameters

Container images are configured using parameters passed at runtime (such as those above).

| Parameter | Function |
| :----: | --- |
| `-e TZ=Europe/London` | Specify a timezone to use EG Europe/London. |
| `-e EMAIL=mail@example.com` | Specify email to use. |
| `-e PASSWORD='qwerty123'` | Specify Netflix password. It is better to use single quotes. |
| `-e PROFILE=John` | Specify Netflix profile name. |
| `-e OPERATION=export` | Set to `export` to export Netflix data or set `import` to import data. |
| `-e FILE_NAME=NetflixData.json` | Specify the data file name. |
| `-v /Data` | Local path for netflix-migrate data file. |

## Warning

Use of this software may constitute a breach in the [Netflix Terms of Use](https://help.netflix.com/legal/termsofuse) and/or the [End User License Agreement](https://help.netflix.com/legal/eula). Use at your own risk.
