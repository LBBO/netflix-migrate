#!/usr/bin/env node
'use strict';

const program = require('commander');
const prompt = require('prompt');
const main = require('./main');

const cookieHelpInstructions = 'You must provide the cookie that Netflix sets in your browser after you log in. To do this, please' +
  ' log in manually, then press F12 and make sure you open a tab called "Console". In its input field, please' +
  ' enter "document.cookie" and hit enter. The value you receive then is what you should provide as this parameter.' +
  ' Make sure to wrap it in double quotes (i.e. --cookie "[cookie value]")!'

// Specify supported arguments
program
  .option('-c, --cookie <cookie>', cookieHelpInstructions)
  .option('-r, --profile <profile>')
  .option('-i, --import [file]')
  .option('-x, --export [file]')
  .option('-s, --spaces [spaces]')
  .parse(process.argv);

if (program.import && program.export) {
  main.exitWithMessage('Options `import` and `export` cannot be used together.');
}

const shouldExport = program.export !== undefined || program.import === undefined;

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
const prompts = [{
  name: 'cookie',
  description: cookieHelpInstructions
}, {
  name: 'profile',
  description: 'Profile name. Please pay special attention to spelling!'
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
    main({
      shouldExport,
      spaces: program.spaces,
      export: program.export,
      import: program.import,
      ...args
    });
  }
});
