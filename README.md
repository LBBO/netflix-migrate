# netflix-migrate [![Build Status](https://travis-ci.com/LBBO/netflix-migrate.svg?branch=master)](https://travis-ci.com/LBBO/netflix-migrate)

A command line utility to export and import your ratings.

## Usage
To do its task, this tool needs to make Netflix believe that it is you. Sadly, this can no longer be done
with just your username and password. Instead, you will have to extract the cookie Netflix sets for you
and provide it to the CLI. But don't worry, I'll guide you through the entire process.

### Extracting the cookie
First, you'll need to login to Netflix and select your profile, just as usual. Now, please open your
browser's dev tools by pressing F12 or right-clicking on the website and choosing "Inspect". Please
select the "Network" tab on the top of the window that just popped up.

You should see a list of requests that Netflix is making. Scroll to the very top, where you should find
a request to `www.netflix.com`. If you don't see this request, just reload the page while the network tab
is open and look for it, again.

Next, please click on this request. A new area should appear with a tab named "Headers". In that tab, please
scroll down to the area titled "Request Headers" and search for `cookie: [very long value]`. Please copy
this entire value by manually selecting it with your mouse and pressing Ctrl + C (right-clicking and
choosing "Copy value" can lead to incorrect results in some browsers). Make sure you do not miss any
characters.

### Passing the cookie to the CLI
Now that you've got your cookie, you can execute the actual commands. Please replace the actual values
below with your own. Make sure the cookie is surrounded by quotation marks! That section of the command
should look somewhat like `--cookie "memclid=...%7D"` (your value inside the quotation marks might vary!).
Here are the commands you'll need:

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

## YouTube Demo

[In case you're not so tech savvy, here's a short demo video](https://youtu.be/D4YWp814UzM)

## Warning

Use of this software may constitute a breach in the [Netflix Terms of Use](https://help.netflix.com/legal/termsofuse)
and/or the [End User License Agreement](https://help.netflix.com/legal/eula). Use at your own risk.
