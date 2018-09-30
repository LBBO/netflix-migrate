#!/usr/bin/env node
'use strict';

require('array.prototype.find').shim();
const fs = require('fs');
const Netflix = require('netflix2');
const program = require('commander');
const prompt = require('prompt');
const util = require('util');

Netflix.prototype.login = util.promisify(Netflix.prototype.login);
Netflix.prototype.getProfiles = util.promisify(Netflix.prototype.getProfiles);
Netflix.prototype.switchProfile = util.promisify(Netflix.prototype.switchProfile);
Netflix.prototype.getRatingHistory = util.promisify(Netflix.prototype.getRatingHistory);
Netflix.prototype.setVideoRating = util.promisify(Netflix.prototype.setVideoRating);

function exitWithMessage(message) {
  console.error(message);
  process.exit(1);
}

async function waterfall(promises) {
  return promises.reduce((promiseChain, currPromise) => promiseChain.then(currPromise), Promise.resolve());
}

async function login(netflix, credentials) {
  return netflix.login(credentials);
}

async function getProfileGuid(netflix, profileName) {
  return netflix.getProfiles()
    .then(profiles => {
      const profile = profiles.find(profile => profile.firstName === profileName);

      if (profile === undefined) {
        throw new Error(`No profile with name "${profileName}"`);
      } else {
        return profile;
      }
    });
}

async function switchProfile(netflix, guid) {
  return netflix.switchProfile(guid);
}

async function getRatingHistory(netflix) {
  return netflix.getRatingHistory()
    .then(ratings => {
      var jsonRatings = JSON.stringify(ratings, null, program.spaces);
      // @todo make program.export more intuitive (should EITHER define program mode OR contain output file path)
      if (program.export === true) {
        process.stdout.write(jsonRatings);
      } else {
        fs.writeFileSync(program.export, jsonRatings);
      }
    });
}

async function setRatingHistory(netflix) {
  var jsonRatings;

  if (program.import === true) {
    jsonRatings = process.stdin.read()
  } else {
    jsonRatings = fs.readFileSync(program.import)
  }

  var ratings = JSON.parse(jsonRatings);

  return waterfall(ratings.map(rating => () => new Promise((resolve, reject) => {
    try {
      netflix.setVideoRating(rating.movieID, rating.yourRating)
      .then(() => {
        setTimeout(resolve, 100);
      });
    } catch (e) {
      reject(e);
    }
  })));
}

async function main(args) {
  var netflix = new Netflix();

  try {
    await login(netflix, {
      email: args.email,
      password: args.password
    });

    const profileGuid = await getProfileGuid(netflix, args.profile);
    await switchProfile(netflix, profileGuid);

    if (program.export) {
      await getRatingHistory(netflix);
    } else {
      await setRatingHistory(netflix);
    }
  } catch (e) {
    exitWithMessage(e);
  }
}

program
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('-r, --profile <profile>')
  .option('-i, --import [file]')
  .option('-x, --export [file]')
  .option('-s, --spaces [spaces]')
  .parse(process.argv);

if (program.import && program.export) {
  exitWithMessage('Options `import` and `export` cannot be used together.');
}

program.export = program.export || !program.import;

if (program.spaces === true) {
  program.spaces = 4;
}
program.spaces = parseInt(program.spaces) || null;

prompt.override = program;
prompt.message = '';
prompt.colors = false;

var prompts = [{
  name: 'email',
  description: 'Email'
}, {
  name: 'password',
  description: 'Password',
  hidden: true
}, {
  name: 'profile',
  description: 'Profile'
}];

prompt.get(prompts, function (error, args) {
  if (error) {
    if (error.message === 'canceled') {
      console.log(); // new line
    } else {
      process.statusCode = 1;
      console.error(error);
    }
  } else {
    main(args);
  }
})
