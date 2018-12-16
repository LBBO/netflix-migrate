#!/usr/bin/env node
'use strict';

const fs = require('fs');
const Netflix = require('netflix2');
const util = require('util');

// Promisify the netflix2 API so that it doesn't follow the
// (error, [...],  callback) => void scheme but instead looks
// like (...) => Promise
Netflix.prototype.login = util.promisify(Netflix.prototype.login);
Netflix.prototype.getProfiles = util.promisify(Netflix.prototype.getProfiles);
Netflix.prototype.switchProfile = util.promisify(Netflix.prototype.switchProfile);
Netflix.prototype.getRatingHistory = util.promisify(Netflix.prototype.getRatingHistory);
Netflix.prototype.setStarRating = util.promisify(Netflix.prototype.setStarRating);
Netflix.prototype.setThumbRating = util.promisify(Netflix.prototype.setThumbRating);
const sleep = util.promisify(setTimeout);

/**
 * Logs into specified Netflix account and profile and performs action
 * specified by program.export
 * @param {{email: String, password: String, profile: String, export: String | Boolean, import: String | Boolean,
 *     shouldExport: Boolean, spaces: Number | Null}} args
 * @param netflix {Netflix}
 */
async function main(args, netflix = new Netflix()) {
  try {
    await netflix.login({
                          email: args.email,
                          password: args.password
                        });

    const profileGuid = await main.getProfileGuid(netflix, args.profile);
    await main.switchProfile(netflix, profileGuid);

    if (args.shouldExport) {
      const filename = args.export === true ? undefined : args.export;
      await main.getRatingHistory(netflix, filename, args.spaces);
    } else {
      const filename = args.import === true ? undefined : args.import;
      await main.setRatingHistory(netflix, filename);
    }
  } catch (e) {
    main.exitWithMessage(e);
  }
}

/**
 * Prints error message to console and exits the process
 * @param {String | Error} message
 */
main.exitWithMessage = function(message) {
  console.error(message);
  process.exit(1);
};

/**
 * Executes an array of promises, one after another and returns a promise
 * that is resolved when the last promise resolves
 * @param {Promise[]} promises
 * @returns {Promise}
 */
main.waterfall = async function(promises) {
  return promises.reduce((promiseChain, currPromise) => promiseChain.then(currPromise), Promise.resolve());
};

/**
 * Gets profile guid from profile name
 * @param {Netflix} netflix
 * @param {String} profileName
 * @returns {Promise} Promise that is resolved with guid once fetched
 */
main.getProfileGuid = async function(netflix, profileName) {
  let profiles;
  
  try {
    profiles = await netflix.getProfiles();
  } catch (e) {
    console.error(e);
    throw new Error('Profile GUID could not be determined. For more information, please see previous log' +
                      'statements.');
  }
  
  const profileWithCorrectName = profiles.find(profile => profile.firstName === profileName);

  if (profileWithCorrectName === undefined) {
    throw new Error(`No profile with name "${profileName}"`);
  } else {
    return profileWithCorrectName.guid;
  }
};

/**
 * Switches to profile specified by guid
 * @param {Netflix} netflix
 * @param {*} guid
 * @returns {Promise} Promise that is resolved once profile is switched
 */
main.switchProfile = async function(netflix, guid) {
  try {
    return await netflix.switchProfile(guid);
  } catch (e) {
    console.error(e);
    throw new Error('Could not switch profiles. For more information, please see previous log statements.');
  }
};

/**
 * Gets rating history from current profile and prints it
 * to console or specified file
 * @param {Netflix} netflix
 * @param {String} [fileName]
 * @param {Number | Null} spaces
 * @returns {Promise} Promise that is resolved once rating history has been fetched
 * @todo make pure by extracting spaces into parameter
 */
main.getRatingHistory = async function(netflix, fileName, spaces) {
  let ratings;
  
  try {
    ratings = await netflix.getRatingHistory();
  } catch (e) {
    console.error(e);
    throw new Error('Could not retrieve rating history. For more information, please see previous log statements.');
  }
  
  const jsonRatings = JSON.stringify(ratings, null, spaces);

  if (fileName === undefined) {
    process.stdout.write(jsonRatings);
  } else {
    fs.writeFileSync(fileName, jsonRatings);
  }
};

/**
 * Reads rating history from specified medium and writes it into
 * current netflix profile. A 100 millisecond timeout is added after
 * each written rating in order to not annoy Netflix, so this may
 * take a while.
 * @param {Netflix} netflix
 * @param {String} [filename]
 * @returns {Promise} Promise that is resolved after setting the last rating
 */
main.setRatingHistory = async function(netflix, filename) {
  let jsonRatings;

  if (filename === undefined) {
    jsonRatings = process.stdin.read();
  } else {
    jsonRatings = fs.readFileSync(filename);
  }

  let ratings = JSON.parse(jsonRatings);

  return main.waterfall(ratings.map(rating => async () => {
    try {
      if (rating.ratingType === 'thumb') {
        await netflix.setThumbRating(rating.movieID, rating.yourRating);
      } else {
        await netflix.setStarRating(rating.movieID, rating.yourRating);
      }
    } catch (e) {
      console.error(e);
      throw new Error('Could not set rating for ' + rating.name + '. For more information, please see ' +
                        'previous log statements.');
    }
    await sleep(100);
  }));
};

module.exports = main;
