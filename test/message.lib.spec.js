const _        = require('lodash');
const mocha    = require('mocha');
const chai     = require('chai');
const readFile = require('../web/lib/common').readFile;
const msglib   = require('../web/lib/message');
const parser   = require('navy-message-parser');
const expect   = chai.expect;

const TEST_ID = 'NAVADMIN16042';
const TEST_URI = '/bupers-npc/reference/messages/Documents/NAVADMINS/NAV2016/NAV16042.txt';
const TEST_OBJ = {
    type: 'NAVADMIN',
    year: '16',
    num: '042'
};

const isValidId = msglib.isValidMessageId;
const parseId = msglib.parseMessageId;
const parseUri = msglib.parseMessageUri;

describe('Message Utilities', function() {
    it('can validate message IDs', function() {
        var VALID_IDS = [
            'NAVADMIN16042',
            'NAVADMIN15132',
            'ALNAV15088',
            'ALNAV16033'
        ];
        var INVALID_IDS = [
            'NAVADMIN201642', // four-character year
            'NAVADMIN1642',   // two-character num
            'NAVADMIN150T9',  // invalid num
            'NAV15123'        // invalid type
        ];
        VALID_IDS.forEach(function(val) {
            expect(isValidId(val)).to.be.true;
        });
        INVALID_IDS.forEach(function(val) {
            expect(isValidId(val)).to.be.false;
        });
    });
    it('can parse message IDs', function() {
        var obj = parseId(TEST_ID);
        expect(obj).to.deep.equal({
            type: 'navadmin',
            year: '16',
            num: '042'
        });
    });
    it('can parse message URIs', function() {
        var obj = parseUri(TEST_URI);
        expect(_.pick(obj, 'type', 'year', 'num')).to.deep.equal(TEST_OBJ);
    });
    it('can parse message section data with navy-message-parser', function() {
        var txt = readFile('../../test/data/NAVADMIN16215.txt').toString();
        var message = parser
            .input(txt)
            .parse()
            .output();
        expect(message.SUBJ).to.equal('NAVY RESERVE PROMOTIONS TO THE PERMANENT GRADES OF CAPTAIN, COMMANDER,\nAND LIEUTENANT COMMANDER IN THE LINE AND STAFF CORPS');
    });
});
