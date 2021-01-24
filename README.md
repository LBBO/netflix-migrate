# netflix-migrate [![Build Status](https://travis-ci.com/LBBO/netflix-migrate.svg?branch=master)](https://travis-ci.com/LBBO/netflix-migrate)

A command line utility to export and import your ratings.

## Usage

First, you will need to retrieve the cookie Netflix sets in your browser after you log in. To do that, please log into
your account just as usual. Once you're logged in, please open your browser's developer tools by pressing F12. Please
make sure you are in the console tab of the dev tools. You should now have an input field, where you need to
enter `document.cookie` and press enter. Please copy the value that is returned by your browsers (including the
quotation marks!). This value will be required in a moment.

Next, you can execute the actual commands. Please replace the actual values by your own:

```
npx netflix-migrate --cookie "your=cookie from=just-now" --profile Lana --export netflixData.json
npx netflix-migrate --cookie "your=cookie from=just-now" --profile Lana --import netflixData.json
```

You will be prompted for your cookie, and/or profile name if not provided as a parameter. In this case, please make sure
you don't wrap the value by quotation marks! If you do not specify a file path for `--export` or `--import`,
`stdout` and `stdin` will be used, respectively. If `--export` or `--import` are not provided, `--export` is assumed (
and `stdout` will be used).

Your exported data will also contain your viewing history. Currently, the import function is only able to import the
rating history, but that will hopefully change soon. However, you now already have your data and once the functionality
is added you will be able to import your old viewing history too, even if you don't have any access to the old account
anymore.

## Warning

Use of this software may constitute a breach in the [Netflix Terms of Use](https://help.netflix.com/legal/termsofuse)
and/or the [End User License Agreement](https://help.netflix.com/legal/eula). Use at your own risk.
