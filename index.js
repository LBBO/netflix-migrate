#!/usr/bin/env node
'use strict';

require('array.prototype.find').shim();
const fs = require('fs');
const Netflix = require('netflix2');
const program = require('commander');
const prompt = require('prompt');
const util = require('util');

// Promisify the netflix2 API so that it doesn't follow the
// (error, [...],  callback) => void scheme but instead looks
// like (...) => Promise
Netflix.prototype.login = util.promisify(Netflix.prototype.login);
Netflix.prototype.getProfiles = util.promisify(Netflix.prototype.getProfiles);
Netflix.prototype.switchProfile = util.promisify(Netflix.prototype.switchProfile);
Netflix.prototype.getRatingHistory = util.promisify(Netflix.prototype.getRatingHistory);
Netflix.prototype.setVideoRating = util.promisify(Netflix.prototype.setVideoRating);

/**
 * Prints error message to console and exits the process
 * @param {String | Error} message 
 */
function exitWithMessage(message) {
  console.error(message);
  process.exit(1);
}

/**
 * Executes an array of promises, one after another and returns a promise
 * that is resolved when the last promise resolves
 * @param {Promise[]} promises
 * @returns {Promise}
 */
async function waterfall(promises) {
  return promises.reduce((promiseChain, currPromise) => promiseChain.then(currPromise), Promise.resolve());
}

/**
 * Gets profile guid from profile name
 * @param {netflix2} netflix 
 * @param {String} profileName 
 * @returns {Promise} Promise that is resolved with guid once fetched
 */
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

/**
 * Switches to profile specified by guid
 * @param {netflix2} netflix
 * @param {*} guid
 * @returns {Promise} Promise that is resolved once profile is switched
 */
async function switchProfile(netflix, guid) {
  return netflix.switchProfile(guid);
}

/**
 * Gets rating history from current profile and prints it
 * to console or file specified in program.export
 * @param {netflix2} netflix
 * @returns {Promise} Promise that is resolved once rating history has been fetched
 * @todo make pure by extracting output medium / file path into parameter
 */
async function getRatingHistory(netflix) {
  return netflix.getRatingHistory()
    .then(ratings => {
      var jsonRatings = JSON.stringify(ratings, null, program.spaces);

      if (program.export === true) {
        process.stdout.write(jsonRatings);
      } else {
        fs.writeFileSync(program.export, jsonRatings);
      }
    });
}

/**
 * Reads rating history from specified medium and writes it into
 * current netflix profile. A 100 millisecond timeout is added after
 * each written rating in order to not annoy Netflix, so this may
 * take a while.
 * @param {netflix2} netflix
 * @returns {Promise} Promise that is resolved after setting the last rating
 * @todo make pure by extracting output medium / file path into parameter
 */
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

/**
 * Logs into specified Netflix account and profile and performs action
 * specified by program.export
 * @param {{email: String, password: String, profile: String}} args 
 * @todo make pure by extracting desired action into parameter
 */
async function main(args) {
  var netflix = new Netflix();

  try {
    await netflix.login({
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

// Specify supported arguments
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

/**
 * @todo make program.export more intuitive (should EITHER define program mode OR contain output file path)
 */
program.export = program.export || !program.import;

// If arg "spaces" is set, use either it's value or a default value of 4
if (program.spaces === true) {
  program.spaces = 4;
}
program.spaces = parseInt(program.spaces) || null;

// Ensure the user is not prompted for values they already provided in the args
prompt.override = program;
prompt.message = '';
prompt.colors = false;

// Specify values the user should be prompted for
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

// Prompt user for remaining values and pass them on to main
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
