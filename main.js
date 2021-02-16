#!/usr/bin/env node
'use strict';

const fs = require('fs');
const Netflix = require('netflix2');
const util = require('util');

// Promisify the netflix2 API so that it doesn't follow the
// (error, [...],  callback) => void scheme but instead looks
// like (...) => Promise
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
		console.log('Logging into Netflix using Cookies');
		const cookies = args.cookie && args.cookie.split(/\r?\n/gm).join('').trim()
		await netflix.login({
								// remove linie breaks, just in case
								cookies: cookies
							});

		console.log('Switching to profile ' + args.profile);
		const profileGuid = await main.getProfileGuid(netflix, args.profile);
		await main.switchProfile(netflix, profileGuid);

		if (args.shouldExport) {
			const filename = args.export === true ? undefined : args.export;
			const packageJSON = require('./package');
			const version = packageJSON.version;

			const ratingHistory = await main.getRatingHistory(netflix);
			const viewingHistory = await main.getViewingHistory(netflix);

			const dataToBeSaved = {
				version: version,
				ratingHistory: ratingHistory,
				viewingHistory: viewingHistory
			};

			main.writeToChosenOutput(dataToBeSaved, filename, args.spaces);
		} else {
			const filename = args.import === true ? undefined : args.import;
			const savedData = main.readDataFromChosenInput(filename);
			await main.setRatingHistory(netflix, savedData.ratingHistory);
		}

		console.log('Done');
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
		const result = await netflix.switchProfile(guid);
		console.log('Successfully switched profile!');
		return result;
	} catch (e) {
		console.error(e);
		throw new Error('Could not switch profiles. For more information, please see previous log statements.');
	}
};

/**
 * Gets rating history from current profile
 * @param {Netflix} netflix
 * @returns {Promise} Promise that is resolved with rating history once it has been fetched
 */
main.getRatingHistory = async function(netflix) {
	let ratings;

	try {
		console.log('Getting rating history...');
		ratings = await netflix.getRatingHistory();
		console.log('Finished getting rating history');
		return ratings;
	} catch (e) {
		console.error(e);
		throw new Error('Could not retrieve rating history. For more information, please see previous log statements.');
	}
};

/**
 * Gets viewing history from current profile
 * @param {Netflix} netflix
 * @returns {Promise} Promise that is resolved with viewing history once it has been fetched
 */
main.getViewingHistory = async function(netflix) {
	let viewingHistory;

	try {
		console.log('Getting viewing history...');
		viewingHistory = await netflix.getViewingHistory();
		console.log('Finished getting viewing history');
		return viewingHistory;
	} catch (e) {
		console.error(e);
		throw new Error('Could not retrieve viewing history. For more information, please see previous log satements.')
	}
};

/**
 * Writes a native Object's JSON representation either to a file, if the file name
 * is specified, or to process.stdout
 * @param {Object} data
 * @param {String} [fileName]
 * @param {Number | String} [numberOfSpaces]
 */
main.writeToChosenOutput = (data, fileName, numberOfSpaces) => {
	const dataJson = JSON.stringify(data, null, numberOfSpaces);

	if (fileName === undefined) {
		process.stdout.write(dataJson);
	} else {
		console.log('Writing results to ' + fileName);
		fs.writeFileSync(fileName, dataJson);
	}
};

/**
 * Reads data from a file (if filename is specified) or from
 * stdout and parses rating history and viewing history
 * @param {String} [fileName]
 */
main.readDataFromChosenInput = (fileName) => {
	let dataJSON;

	if (fileName === undefined) {
		console.log('Please enter your data:');
		dataJSON = process.stdin.read();
	} else {
		console.log('Reading data from ' + fileName);
		dataJSON = fs.readFileSync(fileName);
	}

	let data = JSON.parse(dataJSON);
	let result = {
		version: null,
		ratingHistory: null,
		viewingHistory: null
	};

	/*
	 * Ensure downwards compatibility for versions < 0.3.0
	 * In those versions, netflix-migrate used to only export
	 * the rating history as an array. So, if data is an array,
	 * we're only dealing with the ratingHistory
	 */
	if (Array.isArray(data)) {
		console.log('Found rating history');
		result.ratingHistory = data;
	} else if (data && data instanceof Object) {
		/*
		 * data is an object and should contain viewing history as well
		 * as rating history. If either is not found, throw an error.
		 */

		if (Array.isArray(data.ratingHistory)) {
			result.ratingHistory = data.ratingHistory;
		} else {
			throw new Error('Expected data.ratingHistory to be an Array, instead found ' + JSON.stringify(data.ratingHistory));
		}

		if (Array.isArray(data.viewingHistory)) {
			result.viewingHistory = data.viewingHistory;
		} else {
			throw new Error('Expected data.viewingHistory to be an Array, instead found ' + JSON.stringify(data.viewingHistory));
		}

		if (typeof data.version === 'string' && data.version.match(/^\d+\.\d+\.\d+(?:-(?:(?:alpha)|(?:beta))\.\d+)?$/)) {
			result.version = data.version;
		} else {
			throw new Error('Expected data.version to be a string like 1.2.3 or 1.2.3-beta.4, instead found ' + data.version);
		}

		console.log('Found rating history and viewing history');
	} else {
		throw new Error('An unexpected Error occurred while reading the data to be imported.');
	}

	return result;
};

/**
 * Writes rating history into current netflix profile. A 100 millisecond
 * timeout is added after each written rating in order to not annoy Netflix,
 * so this may take a while.
 * @param {Netflix} netflix
 * @param {Array} [ratings]
 * @returns {Promise} Promise that is resolved after setting the last rating
 */
main.setRatingHistory = async function(netflix, ratings) {
	return main.waterfall(ratings.map(rating => async () => {
		try {
			if (rating.ratingType === 'thumb') {
				console.log('Setting rating for ' + rating.title + ': thumbs ' + (rating.yourRating === 2 ? 'up' : 'down'));
				await netflix.setThumbRating(rating.movieID, rating.yourRating);
			} else {
				console.log('Setting rating for ' + rating.title + ': ' + rating.yourRating + ' star' +
								(rating.yourRating === 1 ? '' : 's'));
				await netflix.setStarRating(rating.movieID, rating.yourRating);
			}
		} catch (e) {
			console.error(e);
			throw new Error('Could not set ' + rating.ratingType + ' rating for ' + rating.title + '. For more' +
								' information, please see previous log statements.');
		}
		await sleep(100);
	}));
};

module.exports = main;
