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
