const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

const main = require('./main');
const { waterfall, getProfileGuid, switchProfile, getRatingHistory, setRatingHistory } = main;
const Netflix = require('netflix2');
const fs = require('fs');

describe('waterfall', () => {
	let promises = [];

	beforeEach(() => {
		promises = [];

		for (let i = 0; i < 10; i++) {
			promises.push(
				sinon
					.stub()
					.callsFake(() => new Promise((resolve) => setTimeout(() => { resolve(); }, 10)))
			);
		}
	});

	it('Should return a promise', () => {
		expect(waterfall([])).to.be.instanceOf(Promise);
	});

	it('Should execute all promises', async () => {
		await waterfall(promises);
		promises.forEach(promise => {
			expect(promise).to.have.been.calledOnce;
		});
	});

	it('Should execute all promises in correct order', async () => {
		await waterfall(promises);
		for (let i = 1; i < promises.length; i++) {
			expect(promises[i - 1]).to.have.been.calledBefore(promises[i]);
		}
	});
});

describe('getProfileGuid', () => {
	let netflixGetProfiles;
	let netflix;
	const profiles = [
		{ firstName: 'Michael' },
		{ firstName: 'Klaus' },
		{ firstName: 'Carsten' },
		{ firstName: 'Yannic' },
		{ firstName: 'Franziska' },
		{ firstName: 'Anna' },
		{ firstName: 'Hanna' },
		{ firstName: 'Marcel' },
		{ firstName: '1234567890' },
		{ firstName: 'What\'s wrong with you?' }
	]

	beforeEach(() => {
		netflix = new Netflix();
		netflixGetProfiles = sinon.stub(netflix, 'getProfiles')
			.returns(Promise.resolve([{ firstName: '' }]));
	});

	it('Should return a Promise', () => {
		expect(getProfileGuid(netflix, '')).to.be.instanceOf(Promise);
	});

	it('Should resolve promise with correct profile', () => {
		netflixGetProfiles.returns(Promise.resolve(profiles));

		profiles.forEach(profile => {
			const result = getProfileGuid(netflix, profile.firstName);

			expect(result).to.be.fulfilled;
			expect(result).to.become(profile);
		});
	});

	it('Should reject promise when no matching profile is found', () => {
		netflixGetProfiles.returns(Promise.resolve(profiles));

		const result = getProfileGuid(netflix, 'Non-existent name');

		expect(result).to.be.rejected;
	});
});

describe('switchProfile', () => {
	let netflix, netflixSwitchProfile;
	const guid = { foo: 'bar' };
	const result = { so: 'amazing' };

	beforeEach(() => {
		netflix = new Netflix();
		netflixSwitchProfile = sinon.stub(netflix, 'switchProfile')
			.returns(Promise.resolve(result));
	});

	it('Should return a promise', () => {
		expect(switchProfile(netflix, guid)).to.be.instanceOf(Promise);
	});

	it('Should call netflix.switchProfile and return it\'s value', async () => {
		const res = await switchProfile(netflix, guid);
		expect(netflixSwitchProfile).to.have.been.calledWithExactly(guid);
		expect(res).to.deep.equal(result);
	});
});

describe('getRatingHistory', () => {
	let netflix, netflixGetRatingHistory, processStdoutWrite, fsWriteFileSync;
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

	// JSON representations are hard coded into this test in order to notice when JSON.stringify changes
	const ratingsJSON = '[{"ratingType":"star","title":"Some movie","movieID":12345678,"yourRating":5,"intRating":50,"date":"01/02/2016","timestamp":1234567890123,"comparableDate":1234567890},{"ratingType":"thumb","title":"Amazing Show","movieID":87654321,"yourRating":2,"date":"02/02/2018","timestamp":2234567890123,"comparableDate":2234567890}]';
	const ratingsJSONWith4Spaces = '[\n    {\n        "ratingType": "star",\n        "title": "Some movie",\n        "movieID": 12345678,\n        "yourRating": 5,\n        "intRating": 50,\n        "date": "01/02/2016",\n        "timestamp": 1234567890123,\n        "comparableDate": 1234567890\n    },\n    {\n        "ratingType": "thumb",\n        "title": "Amazing Show",\n        "movieID": 87654321,\n        "yourRating": 2,\n        "date": "02/02/2018",\n        "timestamp": 2234567890123,\n        "comparableDate": 2234567890\n    }\n]';

	beforeEach(() => {
		netflix = new Netflix();
		netflixGetRatingHistory = sinon.stub(netflix, 'getRatingHistory')
			.returns(Promise.resolve(ratings));
		processStdoutWrite = sinon.stub(process.stdout, 'write');
		fsWriteFileSync = sinon.stub(fs, 'writeFileSync');
	});

	afterEach(() => {
		netflixGetRatingHistory.restore();
		processStdoutWrite.restore();
		fsWriteFileSync.restore();
	});

	it('Should return a promise', () => {
		expect(getRatingHistory(netflix, filename, null)).to.be.instanceOf(Promise);
	});

	it('Should only print to process.stdout when filename is not specified', async () => {
		await getRatingHistory(netflix, undefined, null);
		expect(processStdoutWrite).to.have.been.calledOnce;
		expect(fsWriteFileSync).to.not.have.been.called;
	});

	it('Should only print to file when filename is specified', async () => {
		await getRatingHistory(netflix, filename, null);
		expect(fsWriteFileSync).to.have.been.calledOnce;
		expect(processStdoutWrite).to.not.have.been.called;
	});

	it('Should print correct JSON to process.stdout', async () => {
		await getRatingHistory(netflix, undefined, null);
		expect(processStdoutWrite).to.have.been.calledOnceWith(ratingsJSON);
	});

	it('Should print correct JSON to file', async () => {
		await getRatingHistory(netflix, filename, null);
		expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, ratingsJSON);
	});

	it('Should print correct JSON when spaces is specified', async () => {
		await getRatingHistory(netflix, filename, 4);
		expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, ratingsJSONWith4Spaces);
	});
});

describe('setRatingHistory', () => {
	let netflix, netflixSetVideoRating, processStdinRead, fsReadFileSync;
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

	// JSON representation is hard coded into this test in order to notice when JSON.stringify changes
	const ratingsJSON = '[{"ratingType":"star","title":"Some movie","movieID":12345678,"yourRating":5,"intRating":50,"date":"01/02/2016","timestamp":1234567890123,"comparableDate":1234567890},{"ratingType":"thumb","title":"Amazing Show","movieID":87654321,"yourRating":2,"date":"02/02/2018","timestamp":2234567890123,"comparableDate":2234567890}]';

	beforeEach(() => {
		netflix = new Netflix();
		netflixSetVideoRating = sinon.stub(netflix, 'setVideoRating')
			.returns(Promise.resolve());
		processStdinRead = sinon.stub(process.stdin, 'read')
			.returns(ratingsJSON);
		fsReadFileSync = sinon.stub(fs, 'readFileSync')
			.returns(ratingsJSON);
	});

	afterEach(() => {
		netflixSetVideoRating.restore();
		processStdinRead.restore();
		fsReadFileSync.restore();
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

	it('Should call netflix.setVideoRating once per rating', async () => {
		await setRatingHistory(netflix);
		expect(netflixSetVideoRating).to.have.callCount(ratings.length);

		ratings.forEach(rating => {
			expect(netflixSetVideoRating).to.have.been.calledWithExactly(rating.movieID, rating.yourRating);
		});
	});

	it('Should call main.waterfall once with an array of functions', async () => {
		const waterfallStub = sinon.stub(main, 'waterfall').returns(Promise.resolve());

		await setRatingHistory(netflix);

		expect(waterfallStub).to.have.been.calledOnce;
		const functions = waterfallStub.args[0][0];
		expect(functions).to.have.lengthOf(ratings.length);

		functions.forEach(func => {
			expect(func).to.be.instanceOf(Function);
			expect(func()).to.be.instanceOf(Promise);

			netflixSetVideoRating.returns(Promise.resolve());
			expect(func()).to.eventually.be.fulfilled;

			netflixSetVideoRating.returns(Promise.reject());
			expect(func()).to.eventually.be.rejected;
		});

		waterfallStub.restore();
	});

	it('Should call netflix.setVideoRating in correct order', async () => {
		await setRatingHistory(netflix);
		for (let i = 0; i < ratings.length; i++) {
			expect(netflixSetVideoRating.getCall(i))
				.to.have.been.calledWithExactly(
					ratings[i].movieID, ratings[i].yourRating
				);
		}
	});
});

describe('main', () => {
	let netflix, netflixLogin, mainGetProfileGuid, mainSwitchProfile, mainGetRatingHistory,
		mainSetRatingHistory, mainExitWithMessage, stubs, args;
	const profile = { guid: 1234567890, firstName: 'Foo' };

	beforeEach(() => {
		netflix = new Netflix();
		args = {};

		netflixLogin = sinon.stub(netflix, 'login')
			.returns(Promise.resolve());

		mainExitWithMessage = sinon.stub(main, 'exitWithMessage');

		mainGetProfileGuid = sinon.stub(main, 'getProfileGuid')
			.returns(Promise.resolve(profile));

		mainSwitchProfile = sinon.stub(main, 'switchProfile')
			.returns(Promise.resolve());

		mainGetRatingHistory = sinon.stub(main, 'getRatingHistory')
			.returns(Promise.resolve());

		mainSetRatingHistory = sinon.stub(main, 'setRatingHistory')
			.returns(Promise.resolve());

		stubs = [
			netflixLogin, mainExitWithMessage, mainGetProfileGuid, mainSwitchProfile,
			mainGetRatingHistory, mainSetRatingHistory
		];
	});

	afterEach(() => {
		stubs.forEach(stub => stub.restore());
	});

	it('Should return a promise', () => {
		expect(main(args, netflix)).to.be.instanceOf(Promise);
	});

	it('Should call netflix.login with args.email and args.password', async () => {
		args.email = { foo: 'bar' };
		args.password = { bar: 'foo' };

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
		args.profile = { foo: 'bar' };

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
		});

		it('with an undefined filename if args.export is true', async () => {
			args.export = true;
			await main(args, netflix);
			expect(mainGetRatingHistory).to.have.been.calledOnceWithExactly(netflix, undefined, undefined);
		});

		it('with filename provided in args.export', async () => {
			args.export = { foo: 'bar' };
			await main(args, netflix);
			expect(mainGetRatingHistory).to.have.been.calledOnceWithExactly(netflix, args.export, undefined);
		});

		it('with args.spaces', async () => {
			args.export = true;
			args.spaces = { foo: 'bar' };
			await main(args, netflix);
			expect(mainGetRatingHistory).to.have.been.calledOnceWithExactly(netflix, undefined, args.spaces);
		});

		it('after main.switchProfile', async () => {
			await main(args, netflix);
			expect(mainGetRatingHistory).to.have.been.calledAfter(mainSwitchProfile);
		});
	});

	describe('Should call main.setRatingHistory', () => {
		beforeEach(() => {
			args.shouldExport = false;
		});

		it('if args.shouldExport is false', async () => {
			await main(args, netflix);
			expect(mainSetRatingHistory).to.have.been.calledOnce;
		});

		it('with an undefined filename if args.import is true', async () => {
			args.import = true;
			await main(args, netflix);
			expect(mainSetRatingHistory).to.have.been.calledOnceWithExactly(netflix, undefined);
		});

		it('with filename provided in args.import', async () => {
			args.import = { foo: 'bar' };
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
			netflix.login.returns(Promise.reject(err));
			await main(args, netflix);
			expect(mainExitWithMessage).to.have.been.calledOnceWithExactly(err);
		});

		const functionsToTest = [
			// @todo make this work with netflix
			// { name: 'netflix.login', parent: netflix },
			{ name: 'main.getProfileGuid', parent: main, args: {} },
			{ name: 'main.switchProfile', parent: main, args: {} },
			{ name: 'main.getRatingHistory', parent: main, args: { shouldExport: true } },
			{ name: 'main.setRatingHistory', parent: main, args: { shouldExport: false } }
		];

		for (let i = 0; i < functionsToTest.length; i++) {
			let func = functionsToTest[i];

			it(`by ${func.name}`, async () => {
				const err = new Error();
				const parts = func.name.split('.');
				func.parent[parts[1]].returns(Promise.reject(err));
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
