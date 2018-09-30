#!/usr/bin/env node
'use strict'

require('array.prototype.find').shim()
var async = require('async')
var fs = require('fs')
var Netflix = require('netflix2')
var program = require('commander')
var prompt = require('prompt')
var util = require('util')

function delayCallback (callback, ms) {
  return function (error, result) {
    if (error) {
      return callback(error)
    }
    setTimeout(callback, ms)
  }
}

function exitWithMessage (message) {
  console.error(message)
  process.exit(1)
}

function login(netflix, args) {
  return function(callback) {
    var credentials = {
      email: args.email,
      password: args.password
    }
  
    netflix.login(credentials, callback)
  }
}

function getProfileGuid (netflix, args) {
  return function(callback) {
    netflix.getProfiles(function (error, profiles) {
      if (error) {
        return callback(error)
      }
      var profile = profiles.find(function (profile) {
        return profile.firstName === args.profile
      })
      if (profile === undefined) {
        return callback(
          new Error(util.format('No profile with name "%s"', args.profile))
        )
      }
      callback(null, profile.guid)
    })
  }
}

function switchProfile (netflix) {
  return function (guid, callback) {
    netflix.switchProfile(guid, callback)
  }
}

function getRatingHistory (netflix) {
  return function (callback) {
    netflix.getRatingHistory(function (error, ratings) {
      if (error) {
        return callback(error)
      }
      var jsonRatings = JSON.stringify(ratings, null, program.spaces)
      if (program.export === true) {
        process.stdout.write(jsonRatings)
      } else {
        fs.writeFileSync(program.export, jsonRatings)
      }
      callback()
    })
  }
}

function setRatingHistory (netflix) {
  return function (callback) {
    var jsonRatings
    if (program.import === true) {
      jsonRatings = process.stdin.read()
    } else {
      jsonRatings = fs.readFileSync(program.import)
    }
    var ratings
    try {
      ratings = JSON.parse(jsonRatings)
    } catch (error) {
      callback(error)
    }
    async.eachSeries(ratings, function (rating, callback) {
      console.log('Importing ' + rating.title)
      // use a delay so we don't make Netflix angry
      netflix.setVideoRating(rating.movieID, rating.yourRating,
        delayCallback(callback, 100))
    },
    function (error) {
      if (error) {
        exitWithMessage(error)
      }
      console.log('Import complete')
    })
  }
}

function main (args) {
  var netflix = new Netflix()

  async.waterfall([
    login(netflix, args),
    getProfileGuid(netflix, args),
    switchProfile(netflix),
    program.export ? getRatingHistory(netflix) : setRatingHistory(netflix)
  ],
  function (error) {
    if (error) {
      exitWithMessage(error)
    }
  })
}

program
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('-r, --profile <profile>')
  .option('-i, --import [file]')
  .option('-x, --export [file]')
  .option('-s, --spaces [spaces]')
  .parse(process.argv)

if (program.import && program.export) {
  exitWithMessage('Options `import` and `export` cannot be used together.')
}

program.export = program.export || !program.import

if (program.spaces === true) {
  program.spaces = 4
}
program.spaces = parseInt(program.spaces) || null

prompt.override = program
prompt.message = ''
prompt.colors = false

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
}]

prompt.get(prompts, function (error, args) {
  if (error) {
    if (error.message === 'canceled') {
      console.log() // new line
    } else {
      process.statusCode = 1
      console.error(error)
    }
  } else {
    main(args)
  }
})
