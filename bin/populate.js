// Load .env (if available)
process.env.VERSION || require('dotenv').config();

const _              = require('lodash');
const chalk          = require('chalk');
const Bluebird       = require('bluebird');
const request        = require('request-promise');
const mongoose       = require('mongoose');
const Message        = require('../web/data/schema/message');
const msglib         = require('../web/lib/message');
const uniqWithAttr   = require('../web/lib/common').uniqWithAttr;
const scrapeItems    = msglib.scrapeMessageData;
const maybeRequest   = msglib.maybeRequest;
const attemptRequest = msglib.attemptRequest;
const isRequestFail  = msglib.isRequestFail;

const argv = require('yargs')
    .default('type', 'NAVADMIN')
    .default('year', '16')
    .array('year')
    .argv;

const type = argv.type;
const year = argv.year;
const opts = argv._;

const CHUNK_SIZE = 200;
const CHUNK_DELAY = 1000;
const FAIL_TEXT = 'intentionally left blank';

mongoose.Promise = Bluebird;
mongoose.connect(process.env.MONGODB_URI);

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    Bluebird.resolve()
        .then(() => populateMessages(type))
        .finally(() => db.close());
});

function processError(err) {
    let ERROR_MESSAGE = chalk.red.bold('ERROR') + '\n\n';
    process.stdout.write(ERROR_MESSAGE);
    console.log(err);
}

function printStartMessage(items) {
    let type = _(items).flatten().head().type;
    return console.log(chalk.cyan(`\nStarted ${chalk.bold(type)} data populate\n`));
}

function printDoneMessage(items) {
    process.stdout.write(`${chalk.green.bold('COMPLETE')} ~ ${chalk.bold(items.length)} messages added\n\n`);
}

function printNumberOfFails(items) {
    let NUMBER_OF_FAILS = items.filter(isRequestFail).length;
    console.log(chalk[(NUMBER_OF_FAILS > 0) ? 'red' : 'dim'](`Retry: ${NUMBER_OF_FAILS}`));
}

function populateMessages(type) {
    let years = _(year).concat(opts)
        .filter(_.flow(Number, _.negate(isNaN)))
        .map(String)
        .uniq().value();
    return Bluebird.all(years.map((year) => Message.remove({type, year})))
        .then(() => Bluebird.all(years.map((year) => scrapeItems(type, year))))
        .reduce((allItems, items) => allItems.concat(items))
        .tap(printStartMessage)
        .then((items) => {
            var messageItems = uniqWithAttr(items, 'id');
            var chunks = _.chunk(messageItems, CHUNK_SIZE);
            return Bluebird.all(chunks.map(function(chunk, index) {
                return Bluebird.all(chunk.map((item) => attemptRequest(item)))
                    .delay(CHUNK_DELAY * index)
                    .tap(() => console.log('chunk: ' + (index + 1) + chalk.dim('/' + chunks.length)));
            }));
        })
        .reduce((allItems, items) => allItems.concat(items))
        .tap(printNumberOfFails)
        .map(maybeRequest).tap(printNumberOfFails)
        .map(maybeRequest).tap(printNumberOfFails)
        .map(maybeRequest).tap(printNumberOfFails)
        .map(maybeRequest).tap(printNumberOfFails)
        .then((items) => Message.create(items))
        .then(printDoneMessage)
        .catch(processError);
}
