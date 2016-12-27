/* eslint-disable new-cap */
'use strict';

const _       = require('lodash');
const bunyan  = require('bunyan');
const express = require('express');
const msglib  = require('../lib/message');
const router  = express.Router();

const log = bunyan.createLogger({
    name: 'message',
    streams: [
        {
            stream: process.stdout
        },
        {
            type: 'file',
            path: 'navy-search.log'
        }
    ]
});

const NUM_FORMAT = '###';
const NUM_FORMAT_LENGTH = NUM_FORMAT.length;
const BAD_REQUEST = 400;

const isValidMessageId = msglib.isValidMessageId;
const parseMessageId = msglib.parseMessageId;
const getMessage = msglib.getMessage;

function isValid(req, res, next) {
    if (isValidMessageId(_.get(req, 'params.id', ''))) {
        next();
    } else {
        var errorResponse = {
            errors: [{
                title: 'Invalid Message ID',
                code: 'INVALID_MESSAGE_ID',
                description: 'Message ID must include type, year, and number. Message ID format is "(NAVADMIN|ALNAV)YY###"'
            }]
        };
        log.error(errorResponse);
        res.status(BAD_REQUEST);
        res.json(errorResponse);
    }
}

function isValidYear(val) {
    var FORMAT = 'YY';
    var len = FORMAT.length;
    var valLen = val.length;
    var year = String(new Date().getFullYear()).substring(valLen);
    return (valLen === len) && (Number(val) <= Number(year));
}

function isValidNum(val) {
    return val.length === NUM_FORMAT_LENGTH;
}

function hasValidParameters(req, res, next) {
    var validYear = isValidYear(_.get(req, 'params.year', ''));
    var validNum = isValidNum(_.get(req, 'params.num', ''));
    if (validYear && validNum) {
        next();
    } else {
        var errorResponse = {errors: []};
        errorResponse.errors = []
            .concat(validYear ? [] : {
                title: 'Invalid Message "year" Parameter',
                code: 'INVALID_MESSAGE_YEAR',
                description: 'Message year must be a present or past date in "YY" format'
            })
            .concat(validNum ? [] : {
                title: 'Invalid Message "num" Parameter',
                code: 'INVALID_MESSAGE_NUM',
                description: 'Message number must be in "###" format (ex: "2" --> "002")'
            });
        log.error(errorResponse);
        res.status(BAD_REQUEST);
        res.json(errorResponse);
    }
}

function parseMessageDetails(req, res, next) {
    res.locals.msgDetails = parseMessageId(req.params.id);
    next();
}

var NO_MESSAGE = 'intentionally left blank';
/**
 * @api {get} /message Get message
 * @apiGroup Message
 * @apiVersion 1.0.0
 * @apiDescription Gets a single message via attribute query
 * @apiParam {string="NAVADMIN", "ALNAV"} type Message type
 * @apiParam {string{2}} year Year in YY format (15, 16, etc...)
 * @apiParam {string{3}} num Message number (004, 052, 213, etc...)
 * @apiExample {json} Example usage:
 * curl -i https://api.navysearch.org/v1.0/message?type=NAVADMIN&year=16&num=042
 * @apiSampleRequest /message
**/
router.get('/', function(req, res) {
    var options = _.pick(req.query, 'type', 'year', 'num');
    res.type('text/plain');
    getMessage(options).then(
        message => res.send(_.get(message, 'text', NO_MESSAGE))
    );
});
/**
 * @api {get} /message/:id Get message from ID
 * @apiGroup Message
 * @apiVersion 1.0.0
 * @apiDescription Gets a single message based on message ID
 * @apiSampleRequest /message/NAVADMIN16123
**/
router.get('/:id', [isValid, parseMessageDetails], function(req, res) {
    var options = _.pick(res.locals.msgDetails, 'type', 'year', 'num');
    res.type('text/plain');
    getMessage(options).then(
        message => res.send(_.get(message, 'text', NO_MESSAGE))
    );
});
/**
 * @api {get} /message/NAVADMIN/:year/:number Get message from year and number
 * @apiGroup NAVADMIN
 * @apiVersion 1.0.0
 * @apiDescription Gets a single message based on message year and number
 * @apiSampleRequest /message/NAVADMIN/15/213
**/
router.get('/NAVADMIN/:year/:num', [hasValidParameters], function(req, res) {
    var options = _.pick(req.params, 'year', 'num');
    res.type('text/plain');
    getMessage(_.extend(options, {type: 'NAVADMIN'})).then(
        message => res.send(_.get(message, 'text', NO_MESSAGE))
    );
});
/**
 * @api {get} /message/ALNAV/:year/:number Get message from year and number
 * @apiGroup ALNAV
 * @apiVersion 1.0.0
 * @apiDescription Gets a single message based on message year and number
 * @apiSampleRequest /message/ALNAV/16/042
**/
router.get('/ALNAV/:year/:num', [hasValidParameters], function(req, res) {
    var options = _.pick(req.params, 'year', 'num');
    res.type('text/plain');
    getMessage(_.extend(options, {type: 'ALNAV'})).then(
        message => res.send(_.get(message, 'text', NO_MESSAGE))
    );
});

module.exports = router;
