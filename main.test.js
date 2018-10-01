const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);
// chai.use(sinon);
const main = require('./main');
const { waterfall, getProfileGuid } = main;
const Netflix = require('netflix2');

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

	it('Should execute all promises', (done, fail) => {
		waterfall(promises)
			.then(() => {
				promises.forEach(promise => {
					expect(promise).to.have.been.calledOnce;
				});
			})
			.then(done)
			.catch(fail);
	});

	it('Should execute all promises in correct order', (done, fail) => {
		waterfall(promises)
			.then(() => {
				for (let i = 1; i < promises.length; i++) {
					expect(promises[i - 1]).to.have.been.calledBefore(promises[i]);
				}
				done();
			})
			.catch(fail);
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

describe('', () => {

});

describe('', () => {

});

describe('', () => {

});
