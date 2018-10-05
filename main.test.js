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

	it('Should execute all promises', (done) => {
		waterfall(promises)
			.then(() => {
				promises.forEach(promise => {
					expect(promise).to.have.been.calledOnce;
				});
			})
			.then(done)
			.catch(done);
	});

	it('Should execute all promises in correct order', (done) => {
		waterfall(promises)
			.then(() => {
				for (let i = 1; i < promises.length; i++) {
					expect(promises[i - 1]).to.have.been.calledBefore(promises[i]);
				}
				done();
			})
			.catch(done);
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
	const guid = {foo: 'bar'};
	const result = {so: 'amazing'};

	beforeEach(() => {
		netflix = new Netflix();
		netflixSwitchProfile = sinon.stub(netflix, 'switchProfile')
			.returns(Promise.resolve(result));
	});

	it('Should return a promise', () => {
		expect(switchProfile(netflix, guid)).to.be.instanceOf(Promise);
	});

	it('Should call netflix.switchProfile and return it\'s value', (done) => {
		switchProfile(netflix, guid)
			.then((res) => {
				expect(netflixSwitchProfile).to.have.been.calledWithExactly(guid);
				expect(res).to.deep.equal(result);
				done();
			});
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

	it('Should only print to process.stdout when filename is not specified', (done) => {
		getRatingHistory(netflix, undefined, null)
			.then(() => {
				expect(processStdoutWrite).to.have.been.calledOnce;
				expect(fsWriteFileSync).to.not.have.been.called;
				done();
			})
			.catch(done);
	});

	it('Should only print to file when filename is specified', (done) => {
		getRatingHistory(netflix, filename, null)
			.then(() => {
				expect(fsWriteFileSync).to.have.been.calledOnce;
				expect(processStdoutWrite).to.not.have.been.called;
				done();
			})
			.catch(done);
	});

	it('Should print correct JSON to process.stdout', (done) => {
		getRatingHistory(netflix, undefined, null)
			.then(() => {
				expect(processStdoutWrite).to.have.been.calledOnceWith(ratingsJSON);
				done();
			})
			.catch(done);
	});

	it('Should print correct JSON to file', (done) => {
		getRatingHistory(netflix, filename, null)
			.then(() => {
				expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, ratingsJSON);
				done();
			})
			.catch(done);
	});

	it('Should print correct JSON when spaces is specified', (done) => {
		getRatingHistory(netflix, filename, 4)
			.then(() => {
				expect(fsWriteFileSync).to.have.been.calledOnceWith(filename, ratingsJSONWith4Spaces);
				done();
			})
			.catch(done);
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

	it('Should read rating history from file when filename is specified', (done) => {
		setRatingHistory(netflix, filename)
			.then(() => {
				expect(fsReadFileSync).to.have.been.calledOnce;
				expect(fsReadFileSync).to.have.been.calledWithExactly(filename);
				expect(processStdinRead).to.not.have.been.calledOnce;
				done();
			})
			.catch(done);
	});

	it('Should read rating history from stdin when filename is not specified', (done) => {
		setRatingHistory(netflix)
			.then(() => {
				expect(processStdinRead).to.have.been.calledOnce;
				expect(fsReadFileSync).to.not.have.been.calledOnce;
				done();
			})
			.catch(done);
	});

	it('Should take about 100ms per rating due to timeout between requests', (done) => {
		const beginning = Date.now().valueOf();
		setRatingHistory(netflix)
			.then(() => {
				const end = Date.now().valueOf();
				expect(end - beginning).to.not.be.lessThan(ratings.length * 100);
				done();
			})
			.catch(done);
	});

	it('Should call netflix.setVideoRating once per rating', (done) => {
		setRatingHistory(netflix)
			.then(() => {
				expect(netflixSetVideoRating).to.have.callCount(ratings.length);

				ratings.forEach(rating => {
					expect(netflixSetVideoRating).to.have.been.calledWithExactly(rating.movieID, rating.yourRating);
				});

				done();
			})
			.catch(done);
	});

	it('Should call main.waterfall once with an array of functions', (done) => {
		const waterfallStub = sinon.stub(main, 'waterfall').returns(Promise.resolve());

		setRatingHistory(netflix)
			.then(() => {
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

				done();
			})
			.catch(done);
		
		waterfallStub.restore();
	});

	it('Should call netflix.setVideoRating in correct order', (done) => {
		setRatingHistory(netflix)
			.then(() => {
				for (let i = 0; i < ratings.length; i++) {
					expect(netflixSetVideoRating.getCall(i))
					.to.have.been.calledWithExactly(
						ratings[i].movieID, ratings[i].yourRating
					);
				}
				done();
			})
			.catch(done);
	});
});
