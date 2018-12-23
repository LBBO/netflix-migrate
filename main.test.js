const chai = require('chai');
const {expect} = chai;
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

const main = require('./main');
const {waterfall, getProfileGuid, switchProfile, getRatingHistory, getViewingHistory, setRatingHistory, exitWithMessage, writeToChosenOutput} = main;
const Netflix = require('netflix2');
const fs = require('fs');

describe('exitWithMessage', () => {
	let processExit, consoleError;
	
	beforeEach(() => {
		processExit = sinon.stub(process, 'exit');
		consoleError = sinon.stub(console, 'error');
	});
	
	afterEach(() => {
		processExit.restore();
		consoleError.restore();
	});
	
	it('Should should print the provided error to the console via console.error', () => {
		const message = 'bla bla';
		exitWithMessage(message);
		
		expect(consoleError).to.have.been.calledOnceWithExactly(message);
	});
	
	it('Should should exit the process with exit code 1', () => {
		const message = 'bla bla';
		exitWithMessage(message);
		
		expect(processExit).to.have.been.calledOnceWithExactly(1);
	});
	
	it('Should should exit the process after printing the message to the console', () => {
		const message = 'bla bla';
		exitWithMessage(message);
		
		expect(processExit).to.have.been.calledImmediatelyAfter(consoleError);
	});
});

describe('waterfall', () => {
	let promises = [];
	
	beforeEach(() => {
		promises = [];
		
		for (let i = 0; i < 10; i++) {
			promises.push(
				sinon
					.stub()
					.callsFake(() => new Promise((resolve) => setTimeout(() => {
						resolve();
					}, 10)))
			);
		}
	});
	
	it('Should return a promise', () => {
		expect(waterfall([])).to.be.instanceOf(Promise);
	});
	
	it('Should execute all promises', async () => {
		await waterfall(promises);
		for (const promise of promises) {
			expect(promise).to.have.been.calledOnce;
		}
	});
	
	it('Should execute all promises in correct order', async () => {
		await waterfall(promises);
		for (let i = 1; i < promises.length; i++) {
			expect(promises[i - 1]).to.have.been.calledBefore(promises[i]);
		}
	});
});

describe('getProfileGuid', () => {
	let netflixGetProfiles, consoleError;
	let netflix;
	const profiles = [
		{firstName: 'Michael', guid: '0'},
		{firstName: 'Klaus', guid: '1'},
		{firstName: 'Carsten', guid: '2'},
		{firstName: 'Yannic', guid: '3'},
		{firstName: 'Franziska', guid: '4'},
		{firstName: 'Anna', guid: '5'},
		{firstName: 'Hanna', guid: '6'},
		{firstName: 'Marcel', guid: '7'},
		{firstName: '1234567890', guid: '8'},
		{firstName: 'What\'s wrong with you?', guid: '9'}
	];
	
	beforeEach(() => {
		netflix = new Netflix();
		netflixGetProfiles = sinon.stub(netflix, 'getProfiles')
			.resolves([{firstName: ''}]);
		consoleError = sinon.stub(console, 'error');
	});
	
	afterEach(() => {
		netflixGetProfiles.restore();
		consoleError.restore();
	});
	
	it('Should return a Promise', () => {
		expect(getProfileGuid(netflix, '')).to.be.instanceOf(Promise);
	});
	
	it('Should resolve promise with correct profile guid', async () => {
		netflixGetProfiles.resolves(profiles);
		
		for (const profile of profiles) {
			const result = getProfileGuid(netflix, profile.firstName);
			
			await expect(result).to.eventually.be.fulfilled;
			await expect(result).to.eventually.become(profile.guid);
		}
	});
	
	it('Should reject promise when no matching profile is found', async () => {
		netflixGetProfiles.resolves(profiles);
		
		const result = getProfileGuid(netflix, 'Non-existent name');
		
		await expect(result).to.eventually.be.rejected;
	});
	
	it('Should log any error thrown by netflix.getProfiles', async () => {
		const error = new Error('Error thrown by test');
		netflixGetProfiles.rejects(error);
		
		try {
			await getProfileGuid(netflix, '');
		} catch (e) {
		
		} finally {
			expect(consoleError).to.have.been.calledOnce;
			expect(consoleError).to.have.been.calledWithExactly(error);
		}
	});
	
	it('Should throw an error when netflix.getProfiles throws an error', async () => {
		netflixGetProfiles.rejects(new Error());
		
		await expect(getProfileGuid(netflix, '')).to.eventually.be.rejected;
	});
});

describe('switchProfile', () => {
	let netflix, netflixSwitchProfile, consoleError;
	const guid = {foo: 'bar'};
	const result = {so: 'amazing'};
	
	beforeEach(() => {
		netflix = new Netflix();
		netflixSwitchProfile = sinon.stub(netflix, 'switchProfile')
			.resolves(result);
		consoleError = sinon.stub(console, 'error');
	});
	
	afterEach(() => {
		netflixSwitchProfile.restore();
		consoleError.restore();
	});
	
	it('Should return a promise', () => {
		expect(switchProfile(netflix, guid)).to.be.instanceOf(Promise);
	});
	
	it('Should call netflix.switchProfile and return it\'s value', async () => {
		const res = await switchProfile(netflix, guid);
		expect(netflixSwitchProfile).to.have.been.calledWithExactly(guid);
		expect(res).to.deep.equal(result);
	});
	
	it('Should log any error thrown by netflix.switchProfile', async () => {
		const error = new Error('Error thrown by test');
		netflixSwitchProfile.rejects(error);
		
		try {
			await switchProfile(netflix, guid);
		} catch (e) {
		
		} finally {
			expect(consoleError).to.have.been.calledOnce;
			expect(consoleError).to.have.been.calledWithExactly(error);
		}
	});
	
	it('Should throw an error when netflix.switchProfile throws an error', async () => {
		netflixSwitchProfile.rejects(new Error());
		
		await expect(switchProfile(netflix, guid)).to.eventually.be.rejected;
	});
});

describe('writeToChosenOutput', () => {
	let fsWriteFileSync, processStdoutWrite, jsonStringify;
	
	const data = [
		{
			'ratingType': 'star',
			'title': 'Some movie',
			'movieID': 12345678,
			'yourRating': 5,
			'intRating': 50,
			'date': '01/02/2016',
			'timestamp': 1234567890123,
			'comparableDate': 1234567890
		},
		{
			'ratingType': 'thumb',
			'title': 'Amazing Show',
			'movieID': 87654321,
			'yourRating': 2,
			'date': '02/02/2018',
			'timestamp': 2234567890123,
			'comparableDate': 2234567890
		}
	];

	// JSON representations are hard coded into this test in order to notice when JSON.stringify changes
	const dataJSON = '[{"ratingType":"star","title":"Some movie","movieID":12345678,"yourRating":5,"intRating":50,"date":"01/02/2016","timestamp":1234567890123,"comparableDate":1234567890},{"ratingType":"thumb","title":"Amazing Show","movieID":87654321,"yourRating":2,"date":"02/02/2018","timestamp":2234567890123,"comparableDate":2234567890}]';
	const dataJSONWith4Spaces = '[\n    {\n        "ratingType": "star",\n        "title": "Some movie",\n        "movieID": 12345678,\n        "yourRating": 5,\n        "intRating": 50,\n        "date": "01/02/2016",\n        "timestamp": 1234567890123,\n        "comparableDate": 1234567890\n    },\n    {\n        "ratingType": "thumb",\n        "title": "Amazing Show",\n        "movieID": 87654321,\n        "yourRating": 2,\n        "date": "02/02/2018",\n        "timestamp": 2234567890123,\n        "comparableDate": 2234567890\n    }\n]';
	const dataJSONWith3Spaces = '[\n   {\n      "ratingType": "star",\n      "title": "Some movie",\n      "movieID": 12345678,\n      "yourRating": 5,\n      "intRating": 50,\n      "date": "01/02/2016",\n      "timestamp": 1234567890123,\n      "comparableDate": 1234567890\n   },\n   {\n      "ratingType": "thumb",\n      "title": "Amazing Show",\n      "movieID": 87654321,\n      "yourRating": 2,\n      "date": "02/02/2018",\n      "timestamp": 2234567890123,\n      "comparableDate": 2234567890\n   }\n]';

	const filename = 'test.json';
	const numberOfSpaces = 3;

	beforeEach(() => {
		processStdoutWrite = sinon.stub(process.stdout, 'write');
		fsWriteFileSync = sinon.stub(fs, 'writeFileSync');
		jsonStringify = sinon.stub(JSON, 'stringify').callThrough();
	});

	afterEach(() => {
		processStdoutWrite.restore();
		fsWriteFileSync.restore();
		jsonStringify.restore();
	});

	it('Should call JSON.stringify to convert data to JSON', () => {
		writeToChosenOutput(data);
		expect(jsonStringify).to.have.been.calledOnce;
		expect(jsonStringify).to.have.been.calledWithExactly(data, null, undefined);
	});

	it('Should pass spaces along, if specified', () => {
		writeToChosenOutput(data, undefined, numberOfSpaces);
		expect(jsonStringify).to.have.been.calledWithExactly(data, null, numberOfSpaces);
	})

	it('Should only print to process.stdout when filename is not specified', () => {
		writeToChosenOutput(data, undefined);
		expect(processStdoutWrite).to.have.been.calledOnce;
		expect(fsWriteFileSync).to.not.have.been.called;
	});
	
	it('Should only print to file when filename is specified', async () => {
		writeToChosenOutput(data, filename);
		expect(fsWriteFileSync).to.have.been.calledOnce;
		expect(processStdoutWrite).to.not.have.been.called;
	});
	
	it('Should print correct JSON to process.stdout', async () => {
		writeToChosenOutput(data, undefined, null);
		expect(processStdoutWrite).to.have.been.calledWithExactly(dataJSON);
	});
	
	it('Should print correct JSON to file', async () => {
		writeToChosenOutput(data, filename, null);
		expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, dataJSON);
	});
	
	it('Should print correct JSON when spaces is set to 4', async () => {
		writeToChosenOutput(data, filename, 4);
		expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, dataJSONWith4Spaces);
	});
	
	it('Should print correct JSON when spaces is set to 3', async () => {
		writeToChosenOutput(data, filename, 3);
		expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, dataJSONWith3Spaces);
	});
});

describe('getRatingHistory', () => {
	let netflix, netflixGetRatingHistory, consoleError;
	const ratings = [
		{
			'ratingType': 'star',
			'title': 'Some movie',
			'movieID': 12345678,
			'yourRating': 5,
			'intRating': 50,
			'date': '01/02/2016',
			'timestamp': 1234567890123,
			'comparableDate': 1234567890
		},
		{
			'ratingType': 'thumb',
			'title': 'Amazing Show',
			'movieID': 87654321,
			'yourRating': 2,
			'date': '02/02/2018',
			'timestamp': 2234567890123,
			'comparableDate': 2234567890
		}
	];
	
	beforeEach(() => {
		netflix = new Netflix();
		netflixGetRatingHistory = sinon.stub(netflix, 'getRatingHistory')
			.resolves(ratings);
		consoleError = sinon.stub(console, 'error');
	});
	
	afterEach(() => {
		netflixGetRatingHistory.restore();
		consoleError.restore();
	});
	
	it('Should return a promise', () => {
		expect(getRatingHistory(netflix)).to.be.instanceOf(Promise);
	});
	
	it('Should call netflix.getRatingsHistory()', async () => {
		await getRatingHistory(netflix);
		
		expect(netflixGetRatingHistory).to.have.been.calledOnce;
		expect(netflixGetRatingHistory).to.have.been.calledWithExactly();
	});
	
	it('Should resolve with the result of netflix.getRatingHistory', async () => {
		await expect(getRatingHistory(netflix)).to.eventually.deep.equal(ratings);
	});
	
	it('Should log any error thrown by netflix.getRatingHistory', async () => {
		const error = new Error('Error thrown by test');
		netflixGetRatingHistory.rejects(error);
		
		try {
			await getRatingHistory(netflix);
		} catch (e) {
		
		} finally {
			expect(consoleError).to.have.been.calledOnce;
			expect(consoleError).to.have.been.calledWithExactly(error);
		}
	});
	
	it('Should throw an error when netflix.getRatingHistory throws an error', async () => {
		netflixGetRatingHistory.rejects(new Error());
		
		await expect(getRatingHistory(netflix)).to.eventually.be.rejected;
	});
});

describe('getViewingHistory', () => {
	let netflix, netflixGetViewingHistory, consoleError;
	const viewingHistory = [
		{
			'ratingType': 'star',
			'title': 'Some movie',
			'movieID': 12345678,
			'yourRating': 5,
			'intRating': 50,
			'date': '01/02/2016',
			'timestamp': 1234567890123,
			'comparableDate': 1234567890
		},
		{
			'ratingType': 'thumb',
			'title': 'Amazing Show',
			'movieID': 87654321,
			'yourRating': 2,
			'date': '02/02/2018',
			'timestamp': 2234567890123,
			'comparableDate': 2234567890
		}
	];
	
	beforeEach(() => {
		netflix = new Netflix();
		netflixGetViewingHistory = sinon.stub(netflix, 'getViewingHistory')
			.resolves(viewingHistory);
		consoleError = sinon.stub(console, 'error');
	});
	
	afterEach(() => {
		netflixGetViewingHistory.restore();
		consoleError.restore();
	});
	
	it('Should return a promise', () => {
		expect(getViewingHistory(netflix)).to.be.instanceOf(Promise);
	});

	it('Should call netflix.getRatingsHistory()', async () => {
		await getViewingHistory(netflix);

		expect(netflixGetViewingHistory).to.have.been.calledOnce;
		expect(netflixGetViewingHistory).to.have.been.calledWithExactly();
	});

	it('Should resolve with the result of netflix.getViewingHistory', async () => {
		await expect(getViewingHistory(netflix)).to.eventually.deep.equal(viewingHistory);
	});
	
	it('Should log any error thrown by netflix.getViewingHistory', async () => {
		const error = new Error('Error thrown by test');
		netflixGetViewingHistory.rejects(error);
		
		try {
			await getViewingHistory(netflix);
		} catch (e) {
		
		} finally {
			expect(consoleError).to.have.been.calledOnce;
			expect(consoleError).to.have.been.calledWithExactly(error);
		}
	});
	
	it('Should throw an error when netflix.getViewingHistory throws an error', async () => {
		netflixGetViewingHistory.rejects(new Error());
		
		await expect(getViewingHistory(netflix)).to.eventually.be.rejected;
	});
});

describe('setRatingHistory', () => {
	let netflix, netflixSetStarRating, netflixSetThumbRating, processStdinRead, fsReadFileSync, consoleError;
	const filename = 'test.json';
	const ratings = [
		{
			'ratingType': 'star',
			'title': 'Some movie',
			'movieID': 12345678,
			'yourRating': 5,
			'intRating': 50,
			'date': '01/02/2016',
			'timestamp': 1234567890123,
			'comparableDate': 1234567890
		},
		{
			'ratingType': 'thumb',
			'title': 'Amazing Show',
			'movieID': 87654321,
			'yourRating': 2,
			'date': '02/02/2018',
			'timestamp': 2234567890123,
			'comparableDate': 2234567890
		}
	];
	const starRatings = ratings.filter(rating => rating.ratingType === 'star');
	const thumbRatings = ratings.filter(rating => rating.ratingType === 'thumb');
	
	// JSON representation is hard coded into this test in order to notice when JSON.stringify changes
	const ratingsJSON = '[{"ratingType":"star","title":"Some movie","movieID":12345678,"yourRating":5,"intRating":50,"date":"01/02/2016","timestamp":1234567890123,"comparableDate":1234567890},{"ratingType":"thumb","title":"Amazing Show","movieID":87654321,"yourRating":2,"date":"02/02/2018","timestamp":2234567890123,"comparableDate":2234567890}]';
	
	beforeEach(() => {
		netflix = new Netflix();
		netflixSetStarRating = sinon.stub(netflix, 'setStarRating')
			.resolves();
		netflixSetThumbRating = sinon.stub(netflix, 'setThumbRating')
			.resolves();
		processStdinRead = sinon.stub(process.stdin, 'read')
			.returns(ratingsJSON);
		fsReadFileSync = sinon.stub(fs, 'readFileSync')
			.returns(ratingsJSON);
		
		consoleError = sinon.stub(console, 'error');
	});
	
	afterEach(() => {
		netflixSetStarRating.restore();
		netflixSetThumbRating.restore();
		processStdinRead.restore();
		fsReadFileSync.restore();
		consoleError.restore();
	});
	
	it('Should return a promise', () => {
		processStdinRead.returns('[]');
		expect(setRatingHistory(netflix)).to.be.instanceOf(Promise);
	});
	
	it('Should read rating history from file when filename is specified', async () => {
		await setRatingHistory(netflix, filename);
		expect(fsReadFileSync).to.have.been.calledOnce;
		expect(fsReadFileSync).to.have.been.calledWithExactly(filename);
		expect(processStdinRead).to.not.have.been.calledOnce;
	});
	
	it('Should read rating history from stdin when filename is not specified', async () => {
		await setRatingHistory(netflix);
		expect(processStdinRead).to.have.been.calledOnce;
		expect(fsReadFileSync).to.not.have.been.calledOnce;
	});
	
	it('Should take about 100ms per rating due to timeout between requests', async () => {
		const beginning = Date.now().valueOf();
		await setRatingHistory(netflix);
		const end = Date.now().valueOf();
		expect(end - beginning).to.not.be.lessThan(ratings.length * 100);
	});
	
	it('Should call netflix.setStarRating once per star rating', async () => {
		await setRatingHistory(netflix);
		expect(netflixSetStarRating).to.have.callCount(starRatings.length);
		
		for (const rating of starRatings) {
			expect(netflixSetStarRating).to.have.been.calledWithExactly(rating.movieID, rating.yourRating);
		}
	});
	
	it('Should call netflix.setThumbRating once per thumb rating', async () => {
		await setRatingHistory(netflix);
		expect(netflixSetThumbRating).to.have.callCount(thumbRatings.length);
		
		for (const rating of thumbRatings) {
			expect(netflixSetThumbRating).to.have.been.calledWithExactly(rating.movieID, rating.yourRating);
		}
	});
	
	it('Should call main.waterfall once with an array of functions that return promises', async () => {
		const waterfallStub = sinon.stub(main, 'waterfall').resolves();
		
		await setRatingHistory(netflix);
		
		expect(waterfallStub).to.have.been.calledOnce;
		const functions = waterfallStub.args[0][0];
		expect(functions).to.have.lengthOf(ratings.length);
		
		for (const func of functions) {
			expect(func).to.be.instanceOf(Function);
			expect(func()).to.be.instanceOf(Promise);
		}
		
		waterfallStub.restore();
	});
	
	it('Should call main.waterfall once with an array of functions', async () => {
		const waterfallStub = sinon.stub(main, 'waterfall').resolves();
		
		await setRatingHistory(netflix);
		
		expect(waterfallStub).to.have.been.calledOnce;
		const functions = waterfallStub.args[0][0];
		
		for (const func of functions) {
			netflixSetStarRating.resolves();
			netflixSetThumbRating.resolves();
			await expect(func()).to.eventually.be.fulfilled;
			
			netflixSetStarRating.rejects(new Error());
			netflixSetThumbRating.rejects(new Error());
			await expect(func()).to.eventually.be.rejected;
		}
		
		waterfallStub.restore();
	});
	
	it('Should call netflix.setStarRating in correct order', async () => {
		await setRatingHistory(netflix);
		for (let i = 0; i < starRatings.length; i++) {
			expect(netflixSetStarRating.getCall(i))
				.to.have.been.calledWithExactly(
				starRatings[i].movieID, starRatings[i].yourRating
			);
		}
	});
	
	it('Should call netflix.setThumbRating in correct order', async () => {
		await setRatingHistory(netflix);
		for (let i = 0; i < thumbRatings.length; i++) {
			expect(netflixSetThumbRating.getCall(i))
				.to.have.been.calledWithExactly(
				thumbRatings[i].movieID, thumbRatings[i].yourRating
			);
		}
	});
});

describe('main', () => {
	let netflix, netflixLogin, mainGetProfileGuid, mainSwitchProfile, mainGetRatingHistory, mainGetViewingHistory,
		mainSetRatingHistory, mainExitWithMessage, mainWriteToChosenOutput, stubs, args;
	const profile = {guid: 1234567890, firstName: 'Foo'};
	const ratings = [
		{
			'ratingType': 'star',
			'title': 'Some movie',
			'movieID': 12345678,
			'yourRating': 5,
			'intRating': 50,
			'date': '01/02/2016',
			'timestamp': 1234567890123,
			'comparableDate': 1234567890
		},
		{
			'ratingType': 'thumb',
			'title': 'Amazing Show',
			'movieID': 87654321,
			'yourRating': 2,
			'date': '02/02/2018',
			'timestamp': 2234567890123,
			'comparableDate': 2234567890
		}
	];
	const views = ratings;
	
	beforeEach(() => {
		netflix = new Netflix();
		args = {};
		
		netflixLogin = sinon.stub(netflix, 'login')
			.resolves();
		
		mainExitWithMessage = sinon.stub(main, 'exitWithMessage');
		
		mainGetProfileGuid = sinon.stub(main, 'getProfileGuid')
			.resolves(profile);
		
		mainSwitchProfile = sinon.stub(main, 'switchProfile')
			.resolves();
		
		mainGetRatingHistory = sinon.stub(main, 'getRatingHistory')
			.resolves(ratings);
		
		mainGetViewingHistory = sinon.stub(main, 'getViewingHistory')
			.resolves(views);
		
		mainSetRatingHistory = sinon.stub(main, 'setRatingHistory')
			.resolves();
		
		mainWriteToChosenOutput = sinon.stub(main, 'writeToChosenOutput');
		
		stubs = [
			netflixLogin, mainExitWithMessage, mainGetProfileGuid, mainSwitchProfile,
			mainGetRatingHistory, mainGetViewingHistory, mainSetRatingHistory, mainWriteToChosenOutput
		];
	});
	
	afterEach(() => {
		stubs.forEach(stub => stub.restore());
	});
	
	it('Should return a promise', () => {
		expect(main(args, netflix)).to.be.instanceOf(Promise);
	});
	
	it('Should call netflix.login with args.email and args.password', async () => {
		args.email = {foo: 'bar'};
		args.password = {bar: 'foo'};
		
		await main(args, netflix);
		expect(netflixLogin).to.have.been.calledOnceWithExactly({
																	email: args.email,
																	password: args.password
																})
	});
	
	it('Should call main.getProfileGuid after netflix.login', async () => {
		await main(args, netflix);
		expect(mainGetProfileGuid).to.have.been.calledAfter(netflixLogin);
	});
	
	it('Should call main.getProfileGuid with args.profile', async () => {
		args.profile = {foo: 'bar'};
		
		await main(args, netflix);
		expect(mainGetProfileGuid).to.have.been.calledOnceWithExactly(netflix, args.profile);
	});
	
	it('Should call main.switchProfile after main.getProfileGuid', async () => {
		await main(args, netflix);
		expect(mainSwitchProfile).to.have.been.calledAfter(mainGetProfileGuid);
	});
	
	it('Should call main.switchProfile with the result of main.getProfileGuid', async () => {
		await main(args, netflix);
		expect(mainSwitchProfile).to.have.been.calledOnceWithExactly(netflix, profile);
	});
	
	describe('Should call main.getRatingHistory', () => {
		beforeEach(() => {
			args.shouldExport = true;
		});
		
		it('if args.shouldExport is true', async () => {
			await main(args, netflix);
			expect(mainGetRatingHistory).to.have.been.calledOnce;
			expect(mainSetRatingHistory).to.not.have.been.called;
		});
		
		it('after main.switchProfile', async () => {
			await main(args, netflix);
			expect(mainGetRatingHistory).to.have.been.calledAfter(mainSwitchProfile);
		});
	});
	
	describe('Should call main.getViewingHistory', () => {
		beforeEach(() => {
			args.shouldExport = true;
		});
		
		it('if args.shouldExport is true', async () => {
			await main(args, netflix);
			expect(mainGetViewingHistory).to.have.been.calledOnce;
			expect(mainSetRatingHistory).to.not.have.been.called;
		});
		
		it('after main.getRatingHistory', async () => {
			await main(args, netflix);
			expect(mainGetViewingHistory).to.have.been.calledAfter(mainGetRatingHistory);
		});
	});

	describe('Should call main.writeToChosenOutput', () => {
		beforeEach(() => {
			args.shouldExport = true;
		});
		
		it('with an undefined filename if args.export is true', async () => {
			args.export = true;
			await main(args, netflix);
			expect(mainWriteToChosenOutput.getCall(0).args[1]).to.be.undefined;
		});
		
		it('with filename provided in args.export', async () => {
			args.export = {foo: 'bar'};
			await main(args, netflix);
			expect(mainWriteToChosenOutput.getCall(0).args[1]).to.equal(args.export);
		});
		
		it('with args.spaces', async () => {
			args.export = true;
			args.spaces = {foo: 'bar'};
			await main(args, netflix);
			expect(mainWriteToChosenOutput.getCall(0).args[2]).to.equal(args.spaces);
		});

		it('after main.getViewingHistory', async () => {
			await main(args, netflix);
			expect(mainWriteToChosenOutput).to.have.been.calledAfter(mainGetViewingHistory);
		});
		
		it('with an object containing a viewingHistory and a ratingHistory', async () => {
			await main(args, netflix);
			const firstCallArg = mainWriteToChosenOutput.getCall(0).args[0];
			expect(firstCallArg).to.be.instanceOf(Object);
			expect(firstCallArg).to.haveOwnProperty('viewingHistory');
			expect(firstCallArg).to.haveOwnProperty('ratingHistory');
		});
		
		it('with an object containing the results of main.getRatingHistory and main.getViewingHistory', async () => {
			await main(args, netflix);
			const firstCallArg = mainWriteToChosenOutput.getCall(0).args[0];
			expect(firstCallArg).to.be.instanceOf(Object);
			expect(firstCallArg.ratingHistory).to.deep.equal(ratings);
			expect(firstCallArg.viewingHistory).to.deep.equal(views);
		});
	});
	
	describe('Should call main.setRatingHistory', () => {
		beforeEach(() => {
			args.shouldExport = false;
		});
		
		it('if args.shouldExport is false', async () => {
			await main(args, netflix);
			expect(mainSetRatingHistory).to.have.been.calledOnce;
			expect(mainGetRatingHistory).to.not.have.been.called;
		});
		
		it('with an undefined filename if args.import is true', async () => {
			args.import = true;
			await main(args, netflix);
			expect(mainSetRatingHistory).to.have.been.calledOnceWithExactly(netflix, undefined);
		});
		
		it('with filename provided in args.import', async () => {
			args.import = {foo: 'bar'};
			await main(args, netflix);
			expect(mainSetRatingHistory).to.have.been.calledOnceWithExactly(netflix, args.import);
		});
		
		it('after main.switchProfile', async () => {
			await main(args, netflix);
			expect(mainSetRatingHistory).to.have.been.calledAfter(mainSwitchProfile);
		});
	});
	
	describe('Should call main.exitWithMessage immediately when an error is thrown', () => {
		it('by netflix.login', async () => {
			const err = new Error();
			netflix.login.rejects(err);
			await main(args, netflix);
			expect(mainExitWithMessage).to.have.been.calledOnceWithExactly(err);
		});
		
		const functionsToTest = [
			// @todo make this work with netflix
			// { name: 'netflix.login', parent: netflix },
			{name: 'main.getProfileGuid', parent: main, args: {}},
			{name: 'main.switchProfile', parent: main, args: {}},
			{name: 'main.getRatingHistory', parent: main, args: {shouldExport: true}},
			{name: 'main.setRatingHistory', parent: main, args: {shouldExport: false}}
		];
		
		for (let i = 0; i < functionsToTest.length; i++) {
			let func = functionsToTest[i];
			
			it(`by ${func.name}`, async () => {
				const err = new Error();
				const parts = func.name.split('.');
				func.parent[parts[1]].rejects(err);
				await main(func.args, netflix);
				expect(mainExitWithMessage).to.have.been.calledOnce;
				expect(mainExitWithMessage).to.have.been.calledOnceWithExactly(err);
				
				for (let j = i + 1; j < functionsToTest.length; j++) {
					const laterFunctionName = functionsToTest[j].name.split('.')[1];
					const laterFunction = functionsToTest[j].parent[laterFunctionName];
					expect(laterFunction).to.not.have.been.called;
				}
			});
		}
	});
});
