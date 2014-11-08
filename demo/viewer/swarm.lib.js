!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.swarm=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";


module.exports = {

    /**
     * Subscribe on collections entries' events
     * @param {function(Spec|string, Object, {deliver: function()})} callback
     * @this Set|Vector
     */
    onObjectEvent: function (callback) {
        this._proxy.owner = this;
        this._proxy.on(callback);
    },

    /**
     * Unsubscribe from collections entries' events
     * @param {function(*)} callback
     * @this Set|Vector
     */
    offObjectEvent: function (callback) {
        this._proxy.off(callback);
    },

    /**
     * Waits for collection to receive state from cache or uplink and then invokes passed callback
     *
     * @param {function()} callback
     * @this Set|Vector
     */
    onObjectStateReady: function (callback) { // TODO timeout ?
        var self = this;
        function checker() {
            var notInitedYet = self.filter(function (entry) {
                return !entry._version;
            });
            if (!notInitedYet.length) {
                // all entries are inited
                callback();
            } else {
                // wait for some entry not ready yet
                var randomIdx = (Math.random() * (notInitedYet.length - 1)) | 0;
                notInitedYet[randomIdx].once('init', checker);
            }
        }
        if (this._version) {
            checker();
        } else {
            this.once('init', checker);
        }
    }
};
},{}],2:[function(_dereq_,module,exports){
"use strict";

var env = _dereq_('./env');
var Spec = _dereq_('./Spec');
var Syncable = _dereq_('./Syncable');
var Pipe = _dereq_('./Pipe');
var SecondPreciseClock = _dereq_('./SecondPreciseClock');

/**
 * Host is (normally) a singleton object registering/coordinating
 * all the local Swarm objects, connecting them to appropriate
 * external uplinks, maintaining clocks, etc.
 * Host itself is not fully synchronized like a Model but still
 * does some event gossiping with peer Hosts.
 * @constructor
 */
function Host(id, ms, storage) {
    this.objects = {};
    this.sources = {};
    this.storage = storage;
    this._host = this; // :)
    this._lstn = [','];
    this._id = id;
    this._server = /^swarm~.*/.test(id);
    var clock_fn = env.clockType || SecondPreciseClock;
    this.clock = new clock_fn(this._id, ms||0);

    if (this.storage) {
        this.sources[this._id] = this.storage;
        this.storage._host = this;
    }
    delete this.objects[this.spec()];

    if (!env.multihost) {
        if (env.localhost) {
            throw new Error('use multihost mode');
        }
        env.localhost = this;
    }
}

Host.MAX_INT = 9007199254740992;
Host.MAX_SYNC_TIME = 60 * 60000; // 1 hour (milliseconds)
Host.HASH_POINTS = 3;

Host.hashDistance = function hashDistance(peer, obj) {
    if ((obj).constructor !== Number) {
        if (obj._id) {
            obj = obj._id;
        }
        obj = env.hashfn(obj);
    }
    if (peer._id) {
        peer = peer._id;
    }
    var dist = 4294967295;
    for (var i = 0; i < Host.HASH_POINTS; i++) {
        var hash = env.hashfn(peer._id + ':' + i);
        dist = Math.min(dist, hash ^ obj);
    }
    return dist;
};

module.exports = Syncable.extend(Host, {

    deliver: function (spec, val, repl) {
        if (spec.type() !== 'Host') {
            var typeid = spec.filter('/#');
            var obj = this.get(typeid);
            if (obj) {
                // TODO seeTimestamp()
                obj.deliver(spec, val, repl);
            }
        } else {
            this._super.deliver.apply(this, arguments);
        }
    },

    init: function (spec, val, repl) {

    },

    get: function (spec, callback) {
        if (spec && spec.constructor === Function && spec.prototype._type) {
            spec = '/' + spec.prototype._type;
        }
        spec = new Spec(spec);
        var typeid = spec.filter('/#');
        if (!typeid.has('/')) {
            throw new Error('invalid spec');
        }
        var o = typeid.has('#') && this.objects[typeid];
        if (!o) {
            var t = Syncable.types[spec.type()];
            if (!t) {
                throw new Error('type unknown: ' + spec);
            }
            o = new t(typeid, undefined, this);
            if (typeof(callback) === 'function') {
                o.on('.init', callback);
            }
        }
        return o;
    },

    addSource: function hostAddPeer(spec, peer) {
        //FIXME when their time is off so tell them so
        // if (false) { this.clockOffset; }
        var old = this.sources[peer._id];
        if (old) {
            old.deliver(this.newEventSpec('off'), '', this);
        }

        this.sources[peer._id] = peer;
        if (spec.op() === 'on') {
            peer.deliver(this.newEventSpec('reon'), this.clock.ms(), this);
        }
        for (var sp in this.objects) {
            this.objects[sp].checkUplink();
        }
    },

    neutrals: {
        /**
         * Host forwards on() calls to local objects to support some
         * shortcut notations, like
         *          host.on('/Mouse',callback)
         *          host.on('/Mouse.init',callback)
         *          host.on('/Mouse#Mickey',callback)
         *          host.on('/Mouse#Mickey.init',callback)
         *          host.on('/Mouse#Mickey!baseVersion',repl)
         *          host.on('/Mouse#Mickey!base.x',trackfn)
         * The target object may not exist beforehand.
         * Note that the specifier is actually the second 3sig parameter
         * (value). The 1st (spec) reflects this /Host.on invocation only.
         */
        on: function hostOn(spec, filter, lstn) {
            if (!filter) {
                // the subscriber needs "all the events"
                return this.addSource(spec, lstn);
            }

            if (filter.constructor === Function && filter.id) {
                filter = new Spec(filter.id, '/');
            } else if (filter.constructor === String) {
                filter = new Spec(filter, '.');
            }
            // either suscribe to this Host or to some other object
            if (!filter.has('/') || filter.type() === 'Host') {
                this._super._neutrals.on.call(this, spec, filter, lstn);
            } else {
                var objSpec = new Spec(filter);
                if (!objSpec.has('#')) {
                    throw new Error('no id to listen');
                }
                objSpec = objSpec.set('.on').set(spec.version(), '!');
                this.deliver(objSpec, filter, lstn);
            }
        },

        reon: function hostReOn(spec, ms, host) {
            if (spec.type() !== 'Host') {
                throw new Error('Host.reon(/NotHost.reon)');
            }
            this.clock.adjustTime(ms);
            this.addSource(spec, host);
        },

        off: function (spec, nothing, peer) {
            peer.deliver(peer.spec().add(this.time(), '!').add('.reoff'), '', this);
            this.removeSource(spec, peer);
        },

        reoff: function hostReOff(spec, nothing, peer) {
            this.removeSource(spec, peer);
        }

    }, // neutrals

    removeSource: function (spec, peer) {
        if (spec.type() !== 'Host') {
            throw new Error('Host.removeSource(/NoHost)');
        }

        if (this.sources[peer._id] !== peer) {
            console.error('peer unknown', peer._id); //throw new Error
            return;
        }
        delete this.sources[peer._id];
        for (var sp in this.objects) {
            var obj = this.objects[sp];
            if (obj.getListenerIndex(peer, true) > -1) {
                obj.off(sp, '', peer);
                obj.checkUplink(sp);
            }
        }
    },


    /**
     * Returns an unique Lamport timestamp on every invocation.
     * Swarm employs 30bit integer Unix-like timestamps starting epoch at
     * 1 Jan 2010. Timestamps are encoded as 5-char base64 tokens; in case
     * several events are generated by the same process at the same second
     * then sequence number is added so a timestamp may be more than 5
     * chars. The id of the Host (+user~session) is appended to the ts.
     */
    time: function () {
        var ts = this.clock.issueTimestamp();
        this._version = ts;
        return ts;
    },

    /**
     * Returns an array of sources (caches,storages,uplinks,peers)
     * a given replica should be subscribed to. This default
     * implementation uses a simple consistent hashing scheme.
     * Note that a client may be connected to many servers
     * (peers), so the uplink selection logic is shared.
     * @param {Spec} spec some object specifier
     * @returns {Array} array of currently available uplinks for specified object
     */
    getSources: function (spec) {
        var self = this,
            uplinks = [],
            mindist = 4294967295,
            rePeer = /^swarm~/, // peers, not clients
            target = env.hashfn(spec),
            closestPeer = null;

        if (rePeer.test(this._id)) {
            mindist = Host.hashDistance(this._id, target);
            closestPeer = this.storage;
        } else {
            uplinks.push(self.storage); // client-side cache
        }

        for (var id in this.sources) {
            if (!rePeer.test(id)) {
                continue;
            }
            var dist = Host.hashDistance(id, target);
            if (dist < mindist) {
                closestPeer = this.sources[id];
                mindist = dist;
            }
        }
        if (closestPeer) {
            uplinks.push(closestPeer);
        }
        return uplinks;
    },

    isUplinked: function () {
        for (var id in this.sources) {
            if (/^swarm~.*/.test(id)) {
                return true;
            }
        }
        return false;
    },

    isServer: function () {
        return this._server;
    },

    register: function (obj) {
        var spec = obj.spec();
        if (spec in this.objects) {
            return this.objects[spec];
        }
        this.objects[spec] = obj;
        return obj;
    },

    unregister: function (obj) {
        var spec = obj.spec();
        // TODO unsubscribe from the uplink - swarm-scale gc
        if (spec in this.objects) {
            delete this.objects[spec];
        }
    },

    // waits for handshake from stream
    accept: function (stream_or_url, pipe_env) {
        new Pipe(this, stream_or_url, pipe_env);
    },

    // initiate handshake with peer
    connect: function (stream_or_url, pipe_env) {
        var pipe = new Pipe(this, stream_or_url, pipe_env);
        pipe.deliver(new Spec('/Host#'+this._id+'!0.on'), '', this); //this.newEventSpec
        return pipe;
    },

    disconnect: function (id) {
        for (var peer_id in this.sources) {
            if (id && peer_id != id) {
                continue;
            }
            if (peer_id === this._id) {
                // storage
                continue;
            }
            var peer = this.sources[peer_id];
            // normally, .off is sent by a downlink
            peer.deliver(peer.spec().add(this.time(), '!').add('.off'));
        }
    },

    close: function (cb) {
        for(var id in this.sources) {
            if (id===this._id) {continue;}
            this.disconnect(id);
        }
        if (this.storage) {
            this.storage.close(cb);
        } else if (cb) {
            cb();
        }
    },

    checkUplink: function (spec) {
        //  TBD Host event relay + PEX
    }

});

},{"./Pipe":7,"./SecondPreciseClock":10,"./Spec":13,"./Syncable":15,"./env":19}],3:[function(_dereq_,module,exports){
"use strict";

var Swarm = module.exports = window.Swarm = {};

Swarm.env = _dereq_('./env');
Swarm.Spec = _dereq_('./Spec');
Swarm.LongSpec = _dereq_('./LongSpec');
Swarm.Syncable = _dereq_('./Syncable');
Swarm.Model = _dereq_('./Model');
Swarm.Set = _dereq_('./Set');
Swarm.Vector = _dereq_('./Vector');
Swarm.Host = _dereq_('./Host');
Swarm.Pipe = _dereq_('./Pipe');
Swarm.Storage = _dereq_('./Storage');
Swarm.SharedWebStorage = _dereq_('./SharedWebStorage');
Swarm.LevelStorage = _dereq_('./LevelStorage');
Swarm.WebSocketStream = _dereq_('./WebSocketStream');
Swarm.ReactMixin = _dereq_('./ReactMixin');

Swarm.get = function (spec) {
    return Swarm.env.localhost.get(spec);
};

var env = Swarm.env;

if (env.isWebKit || env.isGecko) {
    env.log = function css_log(spec, value, replica, host) {
        if (!host && replica && replica._host) {
            host = replica._host;
        }
        if (value && value.constructor.name === 'Spec') {
            value = value.toString();
        }
        console.log(
                "%c%s  %c%s  %c%O  %c%s @%c%s",
                "color: #888",
                env.multihost ? host && host._id : '',
                "color: #024; font-style: italic",
                spec.toString(),
                "font-style: normal; color: #042",
                value,
                "color: #88a",
                (replica && ((replica.spec && replica.spec().toString()) || replica._id)) ||
                (replica ? 'no id' : 'undef'),
                "color: #ccd",
                replica && replica._host && replica._host._id
                //replica&&replica.spec&&(replica.spec()+
                //    (this._host===replica._host?'':' @'+replica._host._id)
        );
    };
}

},{"./Host":2,"./LevelStorage":4,"./LongSpec":5,"./Model":6,"./Pipe":7,"./ReactMixin":9,"./Set":11,"./SharedWebStorage":12,"./Spec":13,"./Storage":14,"./Syncable":15,"./Vector":17,"./WebSocketStream":18,"./env":19}],4:[function(_dereq_,module,exports){
"use strict";
var env = _dereq_('./env');
var Spec = _dereq_('./Spec');
var Storage = _dereq_('./Storage');
var SecondPreciseClock = _dereq_('./SecondPreciseClock');

/** LevelDB is a perfect local storage: string-indexed, alphanumerically
  * sorted, stores JSON with minimal overhead. Last but not least, has
  * the same interface as IndexedDB. */
function LevelStorage (id, options, callback) {
    Storage.call(this);
    this.options = options;
    this._host = null; // will be set by the Host
    this.db = options.db;
    this._id = id;
    this.filename = null;
    if (this.db.constructor===Function) {
        this.db = this.db(options.path||id);
    }
    this.logtails = {};
    var clock_fn = env.clock || SecondPreciseClock;
    this.clock = new clock_fn(this._id);
}
LevelStorage.prototype = new Storage();
module.exports = LevelStorage;
LevelStorage.prototype.isRoot = env.isServer;

LevelStorage.prototype.open = function (callback) {
    this.db.open(this.options.dbOptions||{}, callback);
};

LevelStorage.prototype.writeState = function (spec, state, cb) {
    console.log('>STATE',state);
    var self = this;
    var ti = spec.filter('/#');
    //var save = JSON.stringify(state, undefined, 2);
    if (!self.db) {
        console.warn('the storage is not open', this._host&&this._host._id);
        return;
    }

    var json = JSON.stringify(state);
    var cleanup = [], key;
    if (ti in this.logtails) {
        while (key = this.logtails[ti].pop()) {
            cleanup.push({
                key: key,
                type: 'del'
            });
        }
        delete this.logtails[ti];
    }
    console.log('>FLUSH',json,cleanup.length);
    self.db.put(ti, json, function onSave(err) {
        if (!err && cleanup.length && self.db) {
            console.log('>CLEAN',cleanup);
            self.db.batch(cleanup, function(err){
                err && console.error('log trimming failed',err);
            });
        }
        err && console.error("state write error", err);
        cb(err);
    });

};

LevelStorage.prototype.writeOp = function (spec, value, cb) {
    var json = JSON.stringify(value);
    var ti = spec.filter('/#');
    if (!this.logtails[ti]) {
        this.logtails[ti] = [];
    }
    this.logtails[ti].push(spec);
    console.log('>OP',spec.toString(),json);
    this.db.put(spec.toString(), json, function (err){
        err && console.error('op write error',err);
        cb(err);
    });
};


LevelStorage.prototype.readState = function (ti, callback) {
    var self = this;
    ti = ti.toString();
    this.db.get(ti, {asBuffer:false}, function(err,value){

        var notFound = err && /^NotFound/.test(err.message);
        if (err && !notFound) { return callback(err); }

        if ((err && notFound) || !value) {
            err = null;
            value = {_version: '!0'};
        } else {
            value = JSON.parse(value);
        }

        console.log('<STATE',self._host && self._host._id,value);
        callback(err, value);
    });
};


LevelStorage.prototype.readOps = function (ti, callback) {
    var self = this;
    var tail = {}, log = [];
    var i = this.db.iterator({
        gt: ti+' ',
        lt: ti+'0'
    });
    i.next(function recv(err,key,value){
        if (err) {
            callback(err);
            i.end(function(err){});
        } else if (key) {
            var spec = new Spec(key);
            var vo = spec.filter('!.');
            tail[vo] = JSON.parse(value.toString());
            log.push(vo);
            i.next(recv);
        } else {
            console.log('<TAIL',self._host && self._host._id,tail);
            self.logtails[ti] = ti in self.logtails ?
                self.logtails[ti].concat(log) : log;
            callback(null, tail);
            i.end(function(err){
                err && console.error("can't close an iter",err);
            });
        }
    });
};

LevelStorage.prototype.off = function (spec,val,src) {
    var ti = spec.filter('/#');
    delete this.logtails[ti];
    Storage.prototype.off.call(this,spec,val,src);
};

LevelStorage.prototype.close = function (callback,error) { // FIXME
    if (error) {
        console.log("fatal IO error", error);
    }
    if (this.db) {
        this.db.close(callback);
        this.db = null;
    } else {
        callback(); // closed already
    }
};

/*
process.on('uncaughtException', function(err) {
    CLOSE ALL DATABASES
});
*/

},{"./SecondPreciseClock":10,"./Spec":13,"./Storage":14,"./env":19}],5:[function(_dereq_,module,exports){
"use strict";

var Spec = _dereq_('./Spec');

/**LongSpec is a Long Specifier, i.e. a string of quant+id tokens that may be
 * indeed very (many megabytes) long.  Ids are compressed using
 * dynamic dictionaries (codebooks) or "unicode numbers" (base-32768
 * encoding utilizing Unicode symbols as quasi-binary).  Unicode
 * numbers are particularly handy for encoding timestamps.  LongSpecs
 * may be assigned shared codebooks (2nd parameter); a codebook is an
 * object containing encode/decode tables and some stats, e.g.
 * {en:{'/Type':'/T'}, de:{'/T':'/Type'}}. It is OK to pass an empty object as
 * a codebook; it gets initialized automatically).  */
var LongSpec = function (spec, codeBook) {
    var cb = this.codeBook = codeBook || {en:{},de:{}};
    if (!cb.en) { cb.en = {}; }
    if (!cb.de) { // revert en to make de
        cb.de = {};
        for(var tok in cb.en) {
            cb.de[cb.en[tok]] = tok;
        }
    }
    if (!cb.lastCodes) {
        cb.lastCodes = {'/':0x30,'#':0x30,'!':0x30,'.':0x30,'+':0x30};
    }
    // For a larger document, a single LongSpec may be some megabytes long.
    // As we don't want to rewrite those megabytes on every keypress, we
    // divide data into chunks.
    this.chunks = [];
    this.chunkLengths = [];
    if (spec) {
        this.append(spec);
    }
};

LongSpec.reQTokEn = /([/#\!\.\+])([0-\u802f]+)/g;
LongSpec.reQTok = new RegExp('([/#\\.!\\*\\+])(=)'.replace(/=/g, Spec.rT), 'g');
LongSpec.rTEn = '[0-\\u802f]+';
LongSpec.reQTokExtEn = new RegExp
    ('([/#\\.!\\*])((=)(?:\\+(=))?)'.replace(/=/g, LongSpec.rTEn), 'g');

/** Well, for many-MB LongSpecs this may take some time. */
LongSpec.prototype.toString = function () {
    var ret = [];
    for(var i = this.iterator(); !i.end(); i.next()){
        ret.push(i.decode());
    }
    return ret.join('');
};

LongSpec.prototype.length = function () { // TODO .length ?
    var len = 0;
    for(var i=0; i<this.chunks.length; i++) {
        len += this.chunkLengths[i];
    }
    return len;
};

LongSpec.prototype.charLength = function () {
    var len = 0;
    for(var i=0; i<this.chunks.length; i++) {
        len += this.chunks[i].length;
    }
    return len;
};

//   T O K E N  C O M P R E S S I O N

LongSpec.prototype.allocateCode = function (tok) {
    var quant = tok.charAt(0);
    //if (Spec.quants.indexOf(quant)===-1) {throw new Error('invalid token');}
    var en, cb = this.codeBook, lc = cb.lastCodes;
    if (lc[quant]<'z'.charCodeAt(0)) { // pick a nice letter
        for(var i=1; !en && i<tok.length; i++) {
            var x = tok.charAt(i), e = quant+x;
            if (!cb.de[e]) {  en = e;  }
        }
    }
    while (!en && lc[quant]<0x802f) {
        var y = String.fromCharCode(lc[quant]++);
        var mayUse = quant + y;
        if ( ! cb.en[mayUse] ) {  en = mayUse;  }
    }
    if (!en) {
        if (tok.length<=3) {
            throw new Error("out of codes");
        }
        en = tok;
    }
    cb.en[tok] = en;
    cb.de[en] = tok;
    return en;
};

//  F O R M A T  C O N V E R S I O N


/** Always 2-char base2^15 coding for an int (0...2^30-1) */
LongSpec.int2uni = function (i) {
    if (i<0 || i>0x7fffffff) { throw new Error('int is out of range'); }
    return String.fromCharCode( 0x30+(i>>15), 0x30+(i&0x7fff) );
};

LongSpec.uni2int = function (uni) {
    if (!/^[0-\u802f]{2}$/.test(uni)) {
        throw new Error('invalid unicode number') ;
    }
    return ((uni.charCodeAt(0)-0x30)<<15) | (uni.charCodeAt(1)-0x30);
};

//  I T E R A T O R S

/*  Unfortunately, LongSpec cannot be made a simple array because tokens are
    not fixed-width in the general case. Some tokens are dictionary-encoded
    into two-symbol segments, e.g. ".on" --> ".o". Other tokens may need 6
    symbols to encode, e.g. "!timstse+author~ssn" -> "!tss+a".
    Also, iterators opportuniatically use sequential compression. Namely,
    tokens that differ by +1 are collapsed into quant-only sequences:
    "!abc+s!abd+s" -> "!abc+s!"
    So, locating and iterating becomes less-than-trivial. Raw string offsets
    better not be exposed in the external interface; hence, we need iterators.

    {
        offset:5,       // char offset in the string (chunk)
        index:1,        // index of the entry (token)
        en: "!",        // the actual matched token (encoded)
        chunk:0,        // index of the chunk
        de: "!timst00+author~ssn", // decoded token
        seqstart: "!ts0+a", // first token of the sequence (encoded)
        seqoffset: 3    // offset in the sequence
    }
*/
LongSpec.Iterator = function Iterator (owner, index) {
    this.owner = owner;         // our LongSpec
    /*this.chunk = 0;             // the chunk we are in
    this.index = -1;            // token index (position "before the 1st token")
    this.chunkIndex = -1;       // token index within the chunk
    this.prevFull = undefined;  // previous full (non-collapsed) token
    //  seqStart IS the previous match or prev match is trivial
    this.prevCollapsed = 0;
    this.match = null;
    //this.next();*/
    this.skip2chunk(0);
    if (index) {
        if (index.constructor===LongSpec.Iterator) {
            index = index.index;
        }
        this.skip(index);
    }
};


// also matches collapsed quant-only tokens
LongSpec.Iterator.reTok = new RegExp
    ('([/#\\.!\\*])((=)(?:\\+(=))?)?'.replace(/=/g, LongSpec.rTEn), 'g');


/* The method converts a (relatively) verbose Base64 specifier into an
 * internal compressed format.  Compressed tokens are also
 * variable-length; the length of the token depends on the encoding
 * method used.
 * 1 unicode symbol: dictionary-encoded (up to 2^15 entries for each quant),
 * 2 symbols: simple timestamp base-2^15 encoded,
 * 3 symbols: timestamp+seq base-2^15,
 * 4 symbols: long-number base-2^15,
 * 5 symbols and more: unencoded original (fallback).
 * As long as two sequential unicoded entries differ by +1 in the body
 * of the token (quant and extension being the same), we use sequential
 * compression. The token is collapsed (only the quant is left).
 * */
LongSpec.Iterator.prototype.encode = function encode (de) {
    var re = Spec.reQTokExt;
    re.lastIndex = 0;
    var m=re.exec(de); // this one is de
    if (!m || m[0].length!==de.length) {throw new Error('malformed token: '+de);}
    var tok=m[0], quant=m[1], body=m[3], ext=m[4];
    var pm = this.prevFull; // this one is en
    var prevTok, prevQuant, prevBody, prevExt;
    var enBody, enExt;
    if (pm) {
        prevTok=pm[0], prevQuant=pm[1], prevBody=pm[3], prevExt=pm[4]?'+'+pm[4]:undefined;
    }
    if (ext) {
        enExt = this.owner.codeBook.en['+'+ext] || this.owner.allocateCode('+'+ext);
    }
    var maySeq = pm && quant===prevQuant && enExt===prevExt;
    var haveSeq=false, seqBody = '';
    var int1, int2, uni1, uni2;
    //var expected = head + (counter===-1?'':Spec.int2base(counter+inc,1)) + tail;
    if ( body.length<=4 ||          // TODO make it a switch
         (quant in LongSpec.quants2code) ||
         (tok in this.owner.codeBook.en) ) {  // 1 symbol by the codebook

        enBody = this.owner.codeBook.en[quant+body] ||
                 this.owner.allocateCode(quant+body);
        enBody = enBody.substr(1); // FIXME separate codebooks 4 quants
        if (maySeq) {// seq coding for dictionary-coded
            seqBody = enBody;
        }
    } else if (body.length===5) { // 2-symbol base-2^15
        var int = Spec.base2int(body);
        enBody = LongSpec.int2uni(int);
        if (maySeq && prevBody.length===2) {
            seqBody = LongSpec.int2uni(int-this.prevCollapsed-1);
        }
    } else if (body.length===7) { // 3-symbol base-2^15
        int1 = Spec.base2int(body.substr(0,5));
        int2 = Spec.base2int(body.substr(5,2));
        uni1 = LongSpec.int2uni(int1);
        uni2 = LongSpec.int2uni(int2).charAt(1);
        enBody = uni1 + uni2;
        if (maySeq && prevBody.length===3) {
            seqBody = uni1 + LongSpec.int2uni(int2-this.prevCollapsed-1).charAt(1);
        }
    } else if (body.length===10) { // 4-symbol 60-bit long number
        int1 = Spec.base2int(body.substr(0,5));
        int2 = Spec.base2int(body.substr(5,5));
        uni1 = LongSpec.int2uni(int1);
        uni2 = LongSpec.int2uni(int2);
        enBody = uni1 + uni2;
        if (maySeq && prevBody.length===4) {
            seqBody = uni1+LongSpec.int2uni(int2-this.prevCollapsed-1);
        }
    } else { // verbatim
        enBody = body;
        seqBody = enBody;
    }
    haveSeq = seqBody===prevBody;
    return haveSeq ? quant : quant+enBody+(enExt||'');
};
LongSpec.quants2code = {'/':1,'.':1};

/** Decode a compressed specifier back into base64. */
LongSpec.Iterator.prototype.decode = function decode () {
    if (this.match===null) { return undefined; }
    var quant = this.match[1];
    var body = this.match[3];
    var ext = this.match[4];
    var pm=this.prevFull, prevTok, prevQuant, prevBody, prevExt;
    var int1, int2, base1, base2;
    var de = quant;
    if (pm) {
        prevTok=pm[0], prevQuant=pm[1], prevBody=pm[3], prevExt=pm[4];
    }
    if (!body) {
        if (prevBody.length===1) {
            body = prevBody;
        } else {
            var l_1 = prevBody.length-1;
            var int = prevBody.charCodeAt(l_1);
            body = prevBody.substr(0,l_1) + String.fromCharCode(int+this.prevCollapsed+1);
        }
        ext = prevExt;
    }
    switch (body.length) {
        case 1:
            de += this.owner.codeBook.de[quant+body].substr(1); // TODO sep codebooks
            break;
        case 2:
            int1 = LongSpec.uni2int(body);
            base1 = Spec.int2base(int1,5);
            de += base1;
            break;
        case 3:
            int1 = LongSpec.uni2int(body.substr(0,2));
            int2 = LongSpec.uni2int('0'+body.charAt(2));
            base1 = Spec.int2base(int1,5);
            base2 = Spec.int2base(int2,2);
            de += base1 + base2;
            break;
        case 4:
            int1 = LongSpec.uni2int(body.substr(0,2));
            int2 = LongSpec.uni2int(body.substr(2,2));
            base1 = Spec.int2base(int1,5);
            base2 = Spec.int2base(int2,5);
            de += base1 + base2;
            break;
        default:
            de += body;
            break;
    }
    if (ext) {
        var deExt = this.owner.codeBook.de['+'+ext];
        de += deExt;
    }
    return de;
};


LongSpec.Iterator.prototype.next = function ( ) {

    if (this.end()) {return;}

    var re = LongSpec.Iterator.reTok;
    re.lastIndex = this.match ? this.match.index+this.match[0].length : 0;
    var chunk = this.owner.chunks[this.chunk];

    if (chunk.length===re.lastIndex) {
        this.chunk++;
        this.chunkIndex = 0;
        if (this.match && this.match[0].length>0) {
            this.prevFull = this.match;
            this.prevCollapsed = 0;
        } else if (this.match) {
            this.prevCollapsed++;
        } else { // empty
            this.prevFull = undefined;
            this.prevCollapsed = 0;
        }
        this.match = null;
        this.index ++;
        if (this.end()) {return;}
    }

    if (this.match[0].length>1) {
        this.prevFull = this.match;
        this.prevCollapsed = 0;
    } else {
        this.prevCollapsed++;
    }

    this.match = re.exec(chunk);
    this.index++;
    this.chunkIndex++;

    return this.match[0];
};


LongSpec.Iterator.prototype.end = function () {
    return this.match===null && this.chunk===this.owner.chunks.length;
};


LongSpec.Iterator.prototype.skip = function ( count ) {
    // TODO may implement fast-skip of seq-compressed spans
    var lengths = this.owner.chunkLengths, chunks = this.owner.chunks;
    count = count || 1;
    var left = count;
    var leftInChunk = lengths[this.chunk]-this.chunkIndex;
    if ( leftInChunk <= count ) { // skip chunks
        left -= leftInChunk; // skip the current chunk
        var c=this.chunk+1;    // how many extra chunks to skip
        while (left>chunks[c] && c<chunks.length) {
            left-=chunks[++c];
        }
        this.skip2chunk(c);
    }
    if (this.chunk<chunks.length) {
        while (left>0) {
            this.next();
            left--;
        }
    }
    return count - left;
};

/** Irrespectively of the current state of the iterator moves it to the
  * first token in the chunk specified; chunk===undefined moves it to
  * the end() position (one after the last token). */
LongSpec.Iterator.prototype.skip2chunk = function ( chunk ) {
    var chunks = this.owner.chunks;
    if (chunk===undefined) {chunk=chunks.length;}
    this.index = 0;
    for(var c=0; c<chunk; c++) { // TODO perf pick the current value
        this.index += this.owner.chunkLengths[c];
    }
    this.chunkIndex = 0;
    this.chunk = chunk;
    var re = LongSpec.Iterator.reTok;
    if ( chunk < chunks.length ) {
        re.lastIndex = 0;
        this.match = re.exec(chunks[this.chunk]);
    } else {
        this.match = null;
    }
    if (chunk>0) { // (1) chunks must not be empty; (2) a chunk starts with a full token
        var prev = chunks[chunk-1];
        var j = 0;
        while (Spec.quants.indexOf(prev.charAt(prev.length-1-j)) !== -1) { j++; }
        this.prevCollapsed = j;
        var k = 0;
        while (Spec.quants.indexOf(prev.charAt(prev.length-1-j-k))===-1) { k++; }
        re.lastIndex = prev.length-1-j-k;
        this.prevFull = re.exec(prev);
    } else {
        this.prevFull = undefined;
        this.prevCollapsed = 0;
    }
};

LongSpec.Iterator.prototype.token = function () {
    return this.decode();
};

/*LongSpec.Iterator.prototype.de = function () {
    if (this.match===null) {return undefined;}
    return this.owner.decode(this.match[0],this.prevFull?this.prevFull[0]:undefined,this.prevCollapsed);
};*/

/*LongSpec.Iterator.prototype.insertDe = function (de) {
    var en = this.owner.encode(de,this.prevFull?this.prevFull[0]:undefined,this.prevCollapsed);
    this.insert(en);
};*/


/** As sequential coding is incapsulated in LongSpec.Iterator, inserts are
  * done by Iterator as well. */
LongSpec.Iterator.prototype.insert = function (de) { // insertBefore

    var insStr = this.encode(de);

    var brokenSeq = this.match && this.match[0].length===1;

    var re = LongSpec.Iterator.reTok;
    var chunks = this.owner.chunks, lengths = this.owner.chunkLengths;
    if (this.chunk==chunks.length) { // end(), append
        if (chunks.length>0) {
            var ind = this.chunk - 1;
            chunks[ind] += insStr;
            lengths[ind] ++;
        } else {
            chunks.push(insStr);
            lengths.push(1);
            this.chunk++;
        }
    } else {
        var chunkStr = chunks[this.chunk];
        var preEq = chunkStr.substr(0, this.match.index);
        var postEq = chunkStr.substr(this.match.index);
        if (brokenSeq) {
            var me = this.token();
            this.prevFull = undefined;
            var en = this.encode(me);
            chunks[this.chunk] = preEq + insStr + en + postEq.substr(1);
            re.lastIndex = preEq.length + insStr.length;
            this.match = re.exec(chunks[this.chunk]);
        } else {
            chunks[this.chunk] = preEq + insStr + /**/ postEq;
            this.match.index += insStr.length;
        }
        lengths[this.chunk] ++;
        this.chunkIndex ++;
    }
    this.index ++;
    if (insStr.length>1) {
        re.lastIndex = 0;
        this.prevFull = re.exec(insStr);
        this.prevCollapsed = 0;
    } else {
        this.prevCollapsed++;
    }

    // may split chunks
    // may join chunks
};

LongSpec.Iterator.prototype.insertBlock = function (de) { // insertBefore
    var re = Spec.reQTokExt;
    var toks = de.match(re).reverse(), tok;
    while (tok=toks.pop()) {
        this.insert(tok);
    }
};

LongSpec.Iterator.prototype.erase = function (count) {
    if (this.end()) {return;}
    count = count || 1;
    var chunks = this.owner.chunks;
    var lengths = this.owner.chunkLengths;
    // remember offsets
    var fromChunk = this.chunk;
    var fromOffset = this.match.index;
    var fromChunkIndex = this.chunkIndex; // TODO clone USE 2 iterators or i+c

    count = this.skip(count); // checked for runaway skip()
    // the iterator now is at the first-after-erased pos

    var tillChunk = this.chunk;
    var tillOffset = this.match ? this.match.index : 0; // end()

    var collapsed = this.match && this.match[0].length===1;

    // splice strings, adjust indexes
    if (fromChunk===tillChunk) {
        var chunk = chunks[this.chunk];
        var pre = chunk.substr(0,fromOffset);
        var post = chunk.substr(tillOffset);
        if (collapsed) { // sequence is broken now; needs expansion
            post = this.token() + post.substr(1);
        }
        chunks[this.chunk] = pre + post;
        lengths[this.chunk] -= count;
        this.chunkIndex -= count;
    } else {  // FIXME refac, more tests (+wear)
        if (fromOffset===0) {
            fromChunk--;
        } else {
            chunks[fromChunk] = chunks[fromChunk].substr(0,fromOffset);
            lengths[fromChunk] = fromChunkIndex;
        }
        var midChunks = tillChunk - fromChunk - 1;
        if (midChunks) { // wipe'em out
            //for(var c=fromChunk+1; c<tillChunk; c++) ;
            chunks.splice(fromChunk+1,midChunks);
            lengths.splice(fromChunk+1,midChunks);
        }
        if (tillChunk<chunks.length && tillOffset>0) {
            chunks[tillChunk] = chunks[tillChunk].substr(this.match.index);
            lengths[tillChunk] -= this.chunkIndex;
            this.chunkIndex = 0;
        }
    }
    this.index -= count;

};


LongSpec.Iterator.prototype.clone = function () {
    var copy = new LongSpec.Iterator(this.owner);
    copy.chunk = this.chunk;
    copy.match = this.match;
    copy.index = this.index;
};

//  L O N G S P E C  A P I

LongSpec.prototype.iterator = function (index) {
    return new LongSpec.Iterator(this,index);
};

LongSpec.prototype.end = function () {
    var e = new LongSpec.Iterator(this);
    e.skip2chunk(this.chunks.length);
    return e;
};

/** Insert a token at a given position. */
LongSpec.prototype.insert = function (tok, i) {
    var iter = i.constructor===LongSpec.Iterator ? i : this.iterator(i);
    iter.insertBlock(tok);
};

LongSpec.prototype.tokenAt = function (pos) {
    var iter = this.iterator(pos);
    return iter.token();
};

LongSpec.prototype.indexOf = function (tok, startAt) {
    var iter = this.find(tok,startAt);
    return iter.end() ? -1 : iter.index;
};

/*LongSpec.prototype.insertAfter = function (tok, i) {
    LongSpec.reQTokExtEn.lastIndex = i;
    var m = LongSpec.reQTokExtEn.exec(this.value);
    if (m.index!==i) { throw new Error('incorrect position'); }
    var splitAt = i+m[0].length;
    this.insertBefore(tok,splitAt);
};*/

LongSpec.prototype.add = function ls_add (spec) {
    var pos = this.end();
    pos.insertBlock(spec);
};
LongSpec.prototype.append = LongSpec.prototype.add;

/** The method finds the first occurence of a token, returns an
 * iterator.  While the internal format of an iterator is kind of
 * opaque, and generally is not recommended to rely on, that is
 * actually a regex match array. Note that it contains encoded tokens.
 * The second parameter is the position to start scanning from, passed
 * either as an iterator or an offset. */
LongSpec.prototype.find = function (tok, startIndex) {
    //var en = this.encode(tok).toString(); // don't split on +
    var i = this.iterator(startIndex);
    while (!i.end()) {
        if (i.token()===tok) {
            return i;
        }
        i.next();
    }
    return i;
};

module.exports = LongSpec;

},{"./Spec":13}],6:[function(_dereq_,module,exports){
"use strict";

var Spec = _dereq_('./Spec');
var Syncable = _dereq_('./Syncable');

/**
 * Model (LWW key-value object)
 * @param idOrState
 * @constructor
 */
function Model(idOrState) {
    var ret = Model._super.apply(this, arguments);
    /// TODO: combine with state push, make clean
    if (ret === this && idOrState && idOrState.constructor !== String && !Spec.is(idOrState)) {
        this.deliver(this.spec().add(this._id, '!').add('.set'), idOrState);
    }
}

module.exports = Syncable.extend(Model, {
    defaults: {
        _oplog: Object
    },
    /**  init modes:
     *    1  fresh id, fresh object
     *    2  known id, stateless object
     *    3  known id, state boot
     */
    neutrals: {
        on: function (spec, base, repl) {
            //  support the model.on('field',callback_fn) pattern
            if (typeof(repl) === 'function' &&
                    typeof(base) === 'string' &&
                    (base in this.constructor.defaults)) {
                var stub = {
                    fn: repl,
                    key: base,
                    self: this,
                    _op: 'set',
                    deliver: function (spec, val, src) {
                        if (this.key in val) {
                            this.fn.call(this.self, spec, val, src);
                        }
                    }
                };
                repl = stub;
                base = '';
            }
            // this will delay response if we have no state yet
            Syncable._pt._neutrals.on.call(this, spec, base, repl);
        },

        off: function (spec, base, repl) {
            var ls = this._lstn;
            if (typeof(repl) === 'function') { // TODO ugly
                for (var i = 0; i < ls.length; i++) {
                    if (ls[i] && ls[i].fn === repl && ls[i].key === base) {
                        repl = ls[i];
                        break;
                    }
                }
            }
            Syncable._pt._neutrals.off.apply(this, arguments);
        }

    },

    // TODO remove unnecessary value duplication
    packState: function (state) {
    },
    unpackState: function (state) {
    },
    /**
     * Removes redundant information from the log; as we carry a copy
     * of the log in every replica we do everythin to obtain the minimal
     * necessary subset of it.
     * As a side effect, distillLog allows up to handle some partial
     * order issues (see _ops.set).
     * @see Model.ops.set
     * @returns {*} distilled log {spec:true}
     */
    distillLog: function () {
        // explain
        var sets = [],
            cumul = {},
            heads = {},
            spec;
        for (var s in this._oplog) {
            spec = new Spec(s);
            //if (spec.op() === 'set') {
            sets.push(spec);
            //}
        }
        sets.sort();
        for (var i = sets.length - 1; i >= 0; i--) {
            spec = sets[i];
            var val = this._oplog[spec],
                notempty = false;
            for (var field in val) {
                if (field in cumul) {
                    delete val[field];
                } else {
                    notempty = cumul[field] = val[field]; //store last value of the field
                }
            }
            var source = spec.source();
            notempty || (heads[source] && delete this._oplog[spec]);
            heads[source] = true;
        }
        return cumul;
    },

    ops: {
        /**
         * This barebones Model class implements just one kind of an op:
         * set({key:value}). To implment your own ops you need to understand
         * implications of partial order as ops may be applied in slightly
         * different orders at different replicas. This implementation
         * may resort to distillLog() to linearize ops.
         */
        set: function (spec, value, repl) {
            var version = spec.version(),
                vermet = spec.filter('!.').toString();
            if (version < this._version.substr(1)) {
                this._oplog[vermet] = value;
                this.distillLog(); // may amend the value
                value = this._oplog[vermet];
            }
            value && this.apply(value);
        }
    },

    fill: function (key) { // TODO goes to Model to support references
        if (!this.hasOwnProperty(key)) {
            throw new Error('no such entry');
        }

        //if (!Spec.is(this[key]))
        //    throw new Error('not a specifier');
        var spec = new Spec(this[key]).filter('/#');
        if (spec.pattern() !== '/#') {
            throw new Error('incomplete spec');
        }

        this[key] = this._host.get(spec);
        /* TODO new this.refType(id) || new Swarm.types[type](id);
         on('init', function(){
         self.emit('fill',key,this)
         self.emit('full',key,this)
         });*/
    },

    /**
     * Generate .set operation after some of the model fields were changed
     * TODO write test for Model.save()
     */
    save: function () {
        var cumul = this.distillLog(),
            changes = {},
            pojo = this.pojo(),
            field;
        for (field in pojo) {
            if (this[field] !== cumul[field]) {// TODO nesteds
                changes[field] = this[field];
            }
        }
        for (field in cumul) {
            if (!(field in pojo)) {
                changes[field] = null; // JSON has no undefined
            }
        }
        this.set(changes);
    },

    validate: function (spec, val) {
        if (spec.op() !== 'set') {
            return '';
        } // no idea
        for (var key in val) {
            if (!Syncable.reFieldName.test(key)) {
                return 'bad field name';
            }
        }
        return '';
    }

});

// Model may have reactions for field changes as well as for 'real' ops/events
// (a field change is a .set operation accepting a {field:newValue} map)
module.exports.addReaction = function (methodOrField, fn) {
    var proto = this.prototype;
    if (typeof (proto[methodOrField]) === 'function') { // it is a field name
        return Syncable.addReaction.call(this, methodOrField, fn);
    } else {
        var wrapper = function (spec, val) {
            if (methodOrField in val) {
                fn.apply(this, arguments);
            }
        };
        wrapper._rwrap = true;
        return Syncable.addReaction.call(this, 'set', wrapper);
    }
};

},{"./Spec":13,"./Syncable":15}],7:[function(_dereq_,module,exports){
"use strict";

var env = _dereq_('./env');
var Spec = _dereq_('./Spec');

/**
 * A "pipe" is a channel to a remote Swarm Host. Pipe's interface
 * mocks a Host except all calls are serialized and sent to the
 * *stream*; any arriving data is parsed and delivered to the
 * local host. The *stream* must support an interface of write(),
 * end() and on('open'|'data'|'close'|'error',fn).  Instead of a
 * *stream*, the caller may supply an *uri*, so the Pipe will
 * create a stream and connect/reconnect as necessary.
 */

function Pipe(host, stream, opts) {
    var self = this;
    self.opts = opts || {};
    if (!stream || !host) {
        throw new Error('new Pipe(host,stream[,opts])');
    }
    self._id = null;
    self.host = host;
    // uplink/downlink state flag;
    //  true: this side initiated handshake >.on <.reon
    //  false: this side received handshake <.on >.reon
    //  undefined: nothing sent/received OR had a .reoff
    this.isOnSent = undefined;
    this.reconnectDelay = self.opts.reconnectDelay || 1000;
    self.serializer = self.opts.serializer || JSON;
    self.katimer = null;
    self.send_timer = null;
    self.lastSendTS = self.lastRecvTS = self.time();
    self.bundle = {};
    // don't send immediately, delay to bundle more messages
    self.delay = self.opts.delay || -1;
    //self.reconnectDelay = self.opts.reconnectDelay || 1000;
    if (typeof(stream.write) !== 'function') { // TODO nicer
        var url = stream.toString();
        var m = url.match(/(\w+):.*/);
        if (!m) {
            throw new Error('invalid url ' + url);
        }
        var proto = m[1].toLowerCase();
        var fn = env.streams[proto];
        if (!fn) {
            throw new Error('protocol not supported: ' + proto);
        }
        self.url = url;
        stream = new fn(url);
    }
    self.connect(stream);
}

module.exports = Pipe;
//env.streams = {};
Pipe.TIMEOUT = 60000; //ms

Pipe.prototype.connect = function pc(stream) {
    var self = this;
    self.stream = stream;

    self.stream.on('data', function onMsg(data) {
        data = data.toString();
        env.trace && env.log(dotIn, data, this, this.host);
        self.lastRecvTS = self.time();
        var json = self.serializer.parse(data);
        try {
            self._id ? self.parseBundle(json) : self.parseHandshake(json);
        } catch (ex) {
            console.error('error processing message', ex, ex.stack);
            //this.deliver(this.host.newEventSpec('error'), ex.message);
            this.close();
        }
        self.reconnectDelay = self.opts.reconnectDelay || 1000;
    });

    self.stream.on('close', function onConnectionClosed(reason) {
        self.stream = null; // needs no further attention
        self.close("stream closed");
    });

    self.stream.on('error', function (err) {
        self.close('stream error event: ' + err);
    });

    self.katimer = setInterval(self.keepAliveFn.bind(self), (Pipe.TIMEOUT / 4 + Math.random() * 100) | 0);

    // NOPE client only finally, initiate handshake
    // self.host.connect(self);

};

Pipe.prototype.keepAliveFn = function () {
    var now = this.time(),
        sinceRecv = now - this.lastRecvTS,
        sinceSend = now - this.lastSendTS;
    if (sinceSend > Pipe.TIMEOUT / 2) {
        this.sendBundle();
    }
    if (sinceRecv > Pipe.TIMEOUT) {
        this.close("stream timeout");
    }
};

Pipe.prototype.parseHandshake = function ph(handshake) {
    var spec, value, key;
    for (key in handshake) {
        spec = new Spec(key);
        value = handshake[key];
        break; // 8)-
    }
    if (!spec) {
        throw new Error('handshake has no spec');
    }
    if (spec.type() !== 'Host') {
        env.warn("non-Host handshake");
    }
    if (spec.id() === this.host._id) {
        throw new Error('self hs');
    }
    this._id = spec.id();
    var op = spec.op();
    var evspec = spec.set(this.host._id, '#');

    if (op in {on: 1, reon: 1, off: 1, reoff: 1}) {// access denied TODO
        this.host.deliver(evspec, value, this);
    } else {
        throw new Error('invalid handshake');
    }
};

/**
 * Close the underlying stream.
 * Schedule new Pipe creation (when error passed).
 * note: may be invoked multiple times
 * @param {Error|string} error
 */
Pipe.prototype.close = function pc(error) {
    env.log(dotClose, error ? 'error: ' + error : 'correct', this, this.host);
    if (error && this.host && this.url) {
        var uplink_uri = this.url,
            host = this.host,
            pipe_opts = this.opts;
        //reconnect delay for next disconnection
        pipe_opts.reconnectDelay = Math.min(30000, this.reconnectDelay << 1);
        // schedule a retry
        setTimeout(function () {
            host.connect(uplink_uri, pipe_opts);
        }, this.reconnectDelay);

        this.url = null; //to prevent second reconnection timer
    }
    if (this.host) {
        if (this.isOnSent !== undefined && this._id) {
            // emulate normal off
            var offspec = this.host.newEventSpec(this.isOnSent ? 'off' : 'reoff');
            this.host.deliver(offspec, '', this);
        }
        this.host = null; // can't pass any more messages
    }
    if (this.katimer) {
        clearInterval(this.katimer);
        this.katimer = null;
    }
    if (this.stream) {
        try {
            this.stream.close();
        } catch (ex) {}
        this.stream = null;
    }
    this._id = null;
};

/**
 * Sends operation to remote
 */
Pipe.prototype.deliver = function pd(spec, val, src) {
    var self = this;
    val && val.constructor === Spec && (val = val.toString());
    if (spec.type() === 'Host') {
        switch (spec.op()) {
        case 'reoff':
            setTimeout(function itsOverReally() {
                self.isOnSent = undefined;
                self.close();
            }, 1);
            break;
        case 'off':
            setTimeout(function tickingBomb() {
                self.close();
            }, 5000);
            break;
        case 'on':
            this.isOnSent = true;
        case 'reon':
            this.isOnSent = false;
        }
    }
    this.bundle[spec] = val === undefined ? null : val; // TODO aggregation
    if (this.delay === -1) {
        this.sendBundle();
    } else if (!this.send_timer) {
        var now = this.time(),
            gap = now - this.lastSendTS,
            timeout = gap > this.delay ? this.delay : this.delay - gap;
        this.send_timer = setTimeout(this.sendBundle.bind(this), timeout); // hmmm...
    } // else {} // just wait
};

/** @returns {number} milliseconds as an int */
Pipe.prototype.time = function () { return new Date().getTime(); };

/**
 * @returns {Spec|string} remote host spec "/Host#peer_id" or empty string (when not handshaken yet)
 */
Pipe.prototype.spec = function () {
    return this._id ? new Spec('/Host#' + this._id) : '';
};
/**
 * @param {*} bundle is a bunch of operations in a form {operation_spec: operation_params_object}
 * @private
 */
Pipe.prototype.parseBundle = function pb(bundle) {
    var spec_list = [], spec, self = this;
    //parse specifiers
    for (spec in bundle) { spec && spec_list.push(new Spec(spec)); }
    spec_list.sort().reverse();
    while (spec = spec_list.pop()) {
        spec = Spec.as(spec);
        this.host.deliver(spec, bundle[spec], this);
        if (spec.type() === 'Host' && spec.op() === 'reoff') { //TODO check #id
            setTimeout(function () {
                self.isOnSent = undefined;
                self.close();
            }, 1);
        }
    }
};

var dotIn = new Spec('/Pipe.in');
var dotOut = new Spec('/Pipe.out');
var dotClose = new Spec('/Pipe.close');
//var dotOpen = new Spec('/Pipe.open');

/**
 * Sends operations buffered in this.bundle as a bundle {operation_spec: operation_params_object}
 * @private
 */
Pipe.prototype.sendBundle = function pS() {
    var payload = this.serializer.stringify(this.bundle);
    this.bundle = {};
    if (!this.stream) {
        this.send_timer = null;
        return; // too late
    }

    try {
        env.trace && env.log(dotOut, payload, this, this.host);
        this.stream.write(payload);
        this.lastSendTS = this.time();
    } catch (ex) {
        env.error('stream error on write: ' + ex, ex.stack);
        if (this._id) {
            this.close('stream error', ex);
        }
    } finally {
        this.send_timer = null;
    }
};

},{"./Spec":13,"./env":19}],8:[function(_dereq_,module,exports){
"use strict";

function ProxyListener() {
    this.callbacks = null;
    this.owner = null;
}

ProxyListener.prototype.deliver = function (spec,value,src) {
    if (this.callbacks===null) { return; }
    var that = this.owner || src;
    for(var i=0; i<this.callbacks.length; i++) {
        var cb = this.callbacks[i];
        if (cb.constructor===Function) {
            cb.call(that,spec,value,src);
        } else {
            cb.deliver(spec,value,src);
        }
    }
};

ProxyListener.prototype.on = function (callback) {
    if (this.callbacks===null) { this.callbacks = []; }
    this.callbacks.push(callback);
};

ProxyListener.prototype.off = function (callback) {
    if (this.callbacks===null) { return; }
    var i = this.callbacks.indexOf(callback);
    if (i!==-1) {
        this.callbacks.splice(i,1);
    } else {
        console.warn('listener unknown', callback);
    }
};

module.exports = ProxyListener;

},{}],9:[function(_dereq_,module,exports){
"use strict";

var env = _dereq_('./env');
var Spec = _dereq_('./Spec');

module.exports = {

    deliver: function (spec,val,source) {
        var sync = this.sync;
        var version = sync._version;
        if (this.props.listenEntries) {
            var opId = '!' + spec.version();
            if (version !== opId) {
                version = opId;
            }
        }
        this.setState({version: version});
    },

    componentWillMount: function () {
        var spec = this.props.spec || this.props.key;
        if (!Spec.is(spec)) {
            if (spec && this.constructor.modelType) {
                var id = spec;
                spec = new Spec(this.constructor.modelType,'/'); // TODO fn!!!
                spec = spec.add(id,'#');
            } else {
                throw new Error('not a specifier: '+spec+' at '+this._rootNodeID);
            }
        }
        this.sync = env.localhost.get(spec);
        this.setState({version:''});
        if (!env.isServer) {
            var sync = this.sync;
            sync.on('init', this); // TODO single listener
            sync.on(this);
            if (this.props.listenEntries) {
                sync.onObjectEvent(this);
            }
        }
    },

    componentWillUnmount: function () {
        if (!env.isServer) {
            var sync = this.sync;
            sync.off(this);
            sync.off(this); // FIXME: remove after TODO: prevent second subscription
            if (this.props.listenEntries) {
                sync.offObjectEvent(this);
            }
        }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
        return this.props !== nextProps || this.state.version !== nextState.version;
    }

};

},{"./Spec":13,"./env":19}],10:[function(_dereq_,module,exports){
"use strict";

var Spec = _dereq_('./Spec');

/** Swarm is based on the Lamport model of time and events in a
  * distributed system, so Lamport timestamps are essential to
  * its functioning. In most of the cases, it is useful to
  * use actuall wall clock time to create timestamps. This
  * class creates second-precise Lamport timestamps.
  * Timestamp ordering is alphanumeric, length may vary.
  *
  * @param processId id of the process/clock to add to every
  *        timestamp (like !timeseq+gritzko~ssn, where gritzko
  *        is the user and ssn is a session id, so processId
  *        is "gritzko~ssn").
  * @param initTime normally, that is server-supplied timestamp
  *        to init our time offset; there is no guarantee about
  *        clock correctness on the client side
  */
var SecondPreciseClock = function (processId, timeOffsetMs) {
    if (!Spec.reTok.test(processId)) {
        throw new Error('invalid process id: '+processId);
    }
    this.id = processId;
    // sometimes we assume our local clock has some offset
    this.clockOffsetMs = 0;
    this.lastTimestamp = '';
    // although we try hard to use wall clock time, we must
    // obey Lamport logical clock rules, in particular our
    // timestamps must be greater than any other timestamps
    // previously seen
    this.lastTimeSeen = 0;
    this.lastSeqSeen = 0;
    if (timeOffsetMs) {
        this.clockOffsetMs = timeOffsetMs;
    }
};

var epochDate = new Date("Wed, 01 Jan 2014 00:00:00 GMT");
SecondPreciseClock.EPOCH = epochDate.getTime();

SecondPreciseClock.prototype.adjustTime = function (trueMs) {
    var localTime = this.ms();
    var clockOffsetMs = trueMs - localTime;
    this.clockOffsetMs = clockOffsetMs;
    var lastTS = this.lastTimeSeen;
    this.lastTimeSeen = 0;
    this.lastSeqSeen = 0;
    this.lastTimestamp = '';
    if ( this.seconds()+1 < lastTS ) {
        console.error("risky clock reset",this.lastTimestamp);
    }
};

SecondPreciseClock.prototype.ms = function () {
    var millis = new Date().getTime();
    millis -= SecondPreciseClock.EPOCH;
    return millis;
};

SecondPreciseClock.prototype.seconds = function () {
    var millis = this.ms();
    millis += this.clockOffsetMs;
    return (millis/1000) | 0;
};

SecondPreciseClock.prototype.issueTimestamp = function time () {
    var res = this.seconds();
    if (this.lastTimeSeen>res) { res = this.lastTimeSeen; }
    if (res>this.lastTimeSeen) { this.lastSeqSeen = -1; }
    this.lastTimeSeen = res;
    var seq = ++this.lastSeqSeen;
    if (seq>=(1<<12)) {throw new Error('max event freq is 4000Hz');}

    var baseTimeSeq = Spec.int2base(res, 5);
    if (seq>0) { baseTimeSeq+=Spec.int2base(seq, 2); }

    this.lastTimestamp = baseTimeSeq + '+' + this.id;
    return this.lastTimestamp;
};

//SecondPreciseClock.reQTokExt = new RegExp(Spec.rsTokExt); // no 'g'

SecondPreciseClock.prototype.parseTimestamp = function parse (ts) {
    var m = ts.match(Spec.reTokExt);
    if (!m) {throw new Error('malformed timestamp: '+ts);}
    var timeseq=m[1]; //, process=m[2];
    var time = timeseq.substr(0,5), seq = timeseq.substr(5);
    if (seq&&seq.length!==2) {
        throw new Error('malformed timestamp value: '+timeseq);
    }
    return {
        time: Spec.base2int(time),
        seq: seq ? Spec.base2int(seq) : 0
    };
};

/** Freshly issued Lamport logical tiemstamps must be greater than
    any timestamps previously seen. */
SecondPreciseClock.prototype.checkTimestamp = function see (ts) {
    if (ts<this.lastTimestamp) { return true; }
    var parsed = this.parseTimestamp(ts);
    if (parsed.time<this.lastTimeSeen) { return true; }
    var sec = this.seconds();
    if (parsed.time>sec+1) {
        return false; // back to the future
    }
    this.lastTimeSeen = parsed.time;
    this.lastSeqSeen = parsed.seq;
    return true;
};

SecondPreciseClock.prototype.timestamp2date = function (ts) {
    var parsed = this.parseTimestamp(ts);
    var millis = parsed.time * 1000 + SecondPreciseClock.EPOCH;
    return new Date(millis);
};


module.exports = SecondPreciseClock;

},{"./Spec":13}],11:[function(_dereq_,module,exports){
"use strict";

var env = _dereq_('./env');
var Spec = _dereq_('./Spec');
var Syncable = _dereq_('./Syncable');
var Model = _dereq_('./Model'); // TODO
var ProxyListener = _dereq_('./ProxyListener');
var CollectionMethodsMixin = _dereq_('./CollectionMethodsMixin');

/**
 * Backbone's Collection is essentially an array and arrays behave poorly
 * under concurrent writes (see OT). Hence, our primary collection type
 * is a {id:Model} Set. One may obtain a linearized version by sorting
 * them by keys or otherwise.
 * This basic Set implementation can only store objects of the same type.
 * @constructor
 */
module.exports = Syncable.extend('Set', {

    defaults: {
        objects: Object,
        _oplog: Object,
        _proxy: ProxyListener
    },

    mixins: [
        CollectionMethodsMixin
    ],

    reactions: {
        init: function (spec,val,src) {
            this.forEach(function (obj) {
                obj.on(this._proxy);
            }, this);
        }
    },

    ops: {
        /**
         * Both Model and Set are oplog-only; they never pass the state on the wire,
         * only the oplog; new replicas are booted with distilled oplog as well.
         * So, this is the only point in the code that mutates the state of a Set.
         */
        change: function (spec, value, repl) {
            value = this.distillOp(spec, value);
            var key_spec;
            for (key_spec in value) {
                if (value[key_spec] === 1) {
                    if (!this.objects[key_spec]) { // only if object not in the set
                        this.objects[key_spec] = this._host.get(key_spec);
                        this.objects[key_spec].on(this._proxy);
                    }
                } else if (value[key_spec] === 0) {
                    if (this.objects[key_spec]) {
                        this.objects[key_spec].off(this._proxy);
                        delete this.objects[key_spec];
                    }
                } else {
                    env.log(this.spec(), 'unexpected val', JSON.stringify(value));
                }
            }
        }
    },

    validate: function (spec, val, src) {
        if (spec.op() !== 'change') {
            return '';
        }

        for (var key_spec in val) {
            // member spec validity
            if (Spec.pattern(key_spec) !== '/#') {
                return 'invalid spec: ' + key_spec;
            }
        }
        return '';
    },

    distillOp: function (spec, val) {
        if (spec.version() > this._version) {
            return val; // no concurrent op
        }
        var opkey = spec.filter('!.');
        this._oplog[opkey] = val;
        this.distillLog(); // may amend the value
        return this._oplog[opkey] || {};
    },

    distillLog: Model.prototype.distillLog,

    /**
     * Adds an object to the set.
     * @param {Syncable} obj the object  //TODO , its id or its specifier.
     */
    addObject: function (obj) {
        var specs = {};
        specs[obj.spec()] = 1;
        this.change(specs);
    },
    // FIXME reactions to emit .add, .remove

    removeObject: function (obj) {
        var spec = obj._id ? obj.spec() : new Spec(obj).filter('/#');
        if (spec.pattern() !== '/#') {
            throw new Error('invalid spec: ' + spec);
        }
        var specs = {};
        specs[spec] = 0;
        this.change(specs);
    },

    /**
     * @param {Spec|string} key_spec key (specifier)
     * @returns {Syncable} object by key
     */
    get: function (key_spec) {
        key_spec = new Spec(key_spec).filter('/#');
        if (key_spec.pattern() !== '/#') {
            throw new Error("invalid spec");
        }
        return this.objects[key_spec];
    },

    /**
     * @param {function?} order
     * @returns {Array} sorted list of objects currently in set
     */
    list: function (order) {
        var ret = [];
        for (var key in this.objects) {
            ret.push(this.objects[key]);
        }
        ret.sort(order);
        return ret;
    },

    forEach: function (cb, thisArg) {
        var index = 0;
        for (var spec in this.objects) {
            cb.call(thisArg, this.objects[spec], index++);
        }
    },

    every: function (cb, thisArg) {
        var index = 0;
        for (var spec in this.objects) {
            if (!cb.call(thisArg, this.objects[spec], index++)) {
                return false;
            }
        }
        return true;
    },

    filter: function (cb, thisArg) {
        var res = [];
        this.forEach(function (entry, idx) {
            if (cb.call(thisArg, entry, idx)) {
                res.push(entry);
            }
        });
        return res;
    }

});

},{"./CollectionMethodsMixin":1,"./Model":6,"./ProxyListener":8,"./Spec":13,"./Syncable":15,"./env":19}],12:[function(_dereq_,module,exports){
"use strict";
var Spec = _dereq_('./Spec');
var Storage = _dereq_('./Storage');


/** SharedWebStorage may use localStorage or sessionStorage
 *  to cache data. The role of ShWS is dual: it may also
 *  bridge ops from one browser tab/window to another using
 *  HTML5 onstorage events. */
function SharedWebStorage(id, options) {
    this.options = options || {};
    this.lstn = {};
    this._id = id;
    this.tails = {};
    this.store = this.options.persistent ?
        window.localStorage : window.sessionStorage;

    this.loadLog();
    this.installListeners();
}

SharedWebStorage.prototype = new Storage();
SharedWebStorage.prototype.isRoot = false;
module.exports = SharedWebStorage;


SharedWebStorage.prototype.onOp = function (spec, value) {
    var ti = spec.filter('/#');
    var vo = spec.filter('!.');
    if (!vo.toString()) {
        return; // state, not an op
    }
    var tail = this.tails[ti];
    if (!tail) {
        tail = this.tails[ti] = [];
    } else if (tail.indexOf(vo)!==-1) {
        return; // replay
    }
    tail.push(vo);
    this.emit(spec,value);
};


SharedWebStorage.prototype.installListeners = function () {
    var self = this;
    function onStorageChange(ev) {
        if (Spec.is(ev.key) && ev.newValue) {
            self.onOp(new Spec(ev.key), JSON.parse(ev.newValue));
        }
    }
    window.addEventListener('storage', onStorageChange, false);
};


SharedWebStorage.prototype.loadLog = function () {
    // scan/sort specs for existing records
    var store = this.store;
    var ti;
    for (var i = 0; i < store.length; i++) {
        var key = store.key(i);
        if (!Spec.is(key)) { continue; }
        var spec = new Spec(key);
        if (spec.pattern() !== '/#!.') {
            continue; // ops only
        }
        ti = spec.filter('/#');
        var tail = this.tails[ti];
        if (!tail) {
            tail = this.tails[ti] = [];
        }
        tail.push(spec.filter('!.'));
    }
    for (ti in this.tails) {
        this.tails[ti].sort();
    }
};


SharedWebStorage.prototype.writeOp = function wsOp(spec, value, src) {
    var ti = spec.filter('/#');
    var vm = spec.filter('!.');
    var tail = this.tails[ti] || (this.tails[ti] = []);
    tail.push(vm);
    var json = JSON.stringify(value);
    this.store.setItem(spec, json);
    if (this.options.trigger) {
        var otherStore = !this.options.persistent ?
            window.localStorage : window.sessionStorage;
        if (!otherStore.getItem(spec)) {
            otherStore.setItem(spec,json);
            otherStore.removeItem(spec,json);
        }
    }
};


SharedWebStorage.prototype.writeState = function wsPatch(spec, state, src) {
    var ti = spec.filter('/#');
    this.store.setItem(ti, JSON.stringify(state));
    var tail = this.tails[ti];
    if (tail) {
        for(var k=0; k<tail.length; k++) {
            this.store.removeItem(ti + tail[k]);
        }
        delete this.tails[ti];
    }
};

SharedWebStorage.prototype.readState = function (spec, callback) {
    spec = new Spec(spec);
    var ti = spec.filter('/#');
    var state = this.store.getItem(ti);
    callback(null, (state&&JSON.parse(state)) || null);
};

SharedWebStorage.prototype.readOps = function (ti, callback) {
    var tail = this.tails[ti];
    var parsed = null;
    for(var k=0; tail && k<tail.length; k++) {
        var spec = tail[k];
        var value = this.store.getItem(ti+spec);
        if (!value) {continue;} // it happens
        parsed = parsed || {};
        parsed[spec] = JSON.parse(value);
    }
    callback(null, parsed);
};

},{"./Spec":13,"./Storage":14}],13:[function(_dereq_,module,exports){
"use strict";

//  S P E C I F I E R
//
//  The Swarm aims to switch fully from the classic HTTP
//  request-response client-server interaction pattern to continuous
//  real-time synchronization (WebSocket), possibly involving
//  client-to-client interaction (WebRTC) and client-side storage
//  (WebStorage). That demands (a) unification of transfer and storage
//  where possible and (b) transferring, processing and storing of
//  fine-grained changes.
//
//  That's why we use compound event identifiers named *specifiers*
//  instead of just regular "plain" object ids everyone is so used to.
//  Our ids have to fully describe the context of every small change as
//  it is likely to be delivered, processed and stored separately from
//  the rest of the related state.  For every atomic operation, be it a
//  field mutation or a method invocation, a specifier contains its
//  class, object id, a method name and, most importantly, its
//  version id.
//
//  A serialized specifier is a sequence of Base64 tokens each prefixed
//  with a "quant". A quant for a class name is '/', an object id is
//  prefixed with '#', a method with '.' and a version id with '!'.  A
//  special quant '+' separates parts of each token.  For example, a
//  typical version id looks like "!7AMTc+gritzko" which corresponds to
//  a version created on Tue Oct 22 2013 08:05:59 GMT by @gritzko (see
//  Host.time()).
//
//  A full serialized specifier looks like
//        /TodoItem#7AM0f+gritzko.done!7AMTc+gritzko
//  (a todo item created by @gritzko was marked 'done' by himself)
//
//  Specifiers are stored in strings, but we use a lightweight wrapper
//  class Spec to parse them easily. A wrapper is immutable as we pass
//  specifiers around a lot.

function Spec(str, quant) {
    if (str && str.constructor === Spec) {
        str = str.value;
    } else { // later we assume value has valid format
        str = (str || '').toString();
        if (quant && str.charAt(0) >= '0') {
            str = quant + str;
        }
        if (str.replace(Spec.reQTokExt, '')) {
            throw new Error('malformed specifier: ' + str);
        }
    }
    this.value = str;
    this.index = 0;
}
module.exports = Spec;

Spec.prototype.filter = function (quants) {
    var filterfn = //typeof(quants)==='function' ? quants :
                function (token, quant) {
                    return quants.indexOf(quant) !== -1 ? token : '';
                };
    return new Spec(this.value.replace(Spec.reQTokExt, filterfn));
};
Spec.pattern = function (spec) {
    return spec.toString().replace(Spec.reQTokExt, '$1');
};
Spec.prototype.isEmpty = function () {
    return this.value==='';
};
Spec.prototype.pattern = function () {
    return Spec.pattern(this.value);
};
Spec.prototype.token = function (quant) {
    var at = quant ? this.value.indexOf(quant, this.index) : this.index;
    if (at === -1) {
        return undefined;
    }
    Spec.reQTokExt.lastIndex = at;
    var m = Spec.reQTokExt.exec(this.value);
    this.index = Spec.reQTokExt.lastIndex;
    if (!m) {
        return undefined;
    }
    return {quant: m[1], body: m[2], bare: m[3], ext: m[4]};
};
Spec.prototype.get = function specGet(quant) {
    var i = this.value.indexOf(quant);
    if (i === -1) {
        return '';
    }
    Spec.reQTokExt.lastIndex = i;
    var m = Spec.reQTokExt.exec(this.value);
    return m && m[2];
};
Spec.prototype.tok = function specGet(quant) {
    var i = this.value.indexOf(quant);
    if (i === -1) { return ''; }
    Spec.reQTokExt.lastIndex = i;
    var m = Spec.reQTokExt.exec(this.value);
    return m && m[0];
};
Spec.prototype.has = function specHas(quant) {
    if (quant.length===1) {
        return this.value.indexOf(quant) !== -1;
    } else {
        var toks = this.value.match(Spec.reQTokExt);
        return toks.indexOf(quant) !== -1;
    }
};
Spec.prototype.set = function specSet(spec, quant) {
    var ret = new Spec(spec, quant);
    var m;
    Spec.reQTokExt.lastIndex = 0;
    while (null !== (m = Spec.reQTokExt.exec(this.value))) {
        if (!ret.has(m[1])) {
            ret = ret.add(m[0]);
        }
    }
    return ret.sort();
};
Spec.prototype.version = function () { return this.get('!'); };
Spec.prototype.op = function () { return this.get('.'); };
Spec.prototype.type = function () { return this.get('/'); };
Spec.prototype.id = function () { return this.get('#'); };
Spec.prototype.typeid = function () { return this.filter('/#'); };
Spec.prototype.source = function () { return this.token('!').ext; };

Spec.prototype.sort = function () {
    function Q(a, b) {
        var qa = a.charAt(0), qb = b.charAt(0), q = Spec.quants;
        return (q.indexOf(qa) - q.indexOf(qb)) || (a < b);
    }

    var split = this.value.match(Spec.reQTokExt);
    return new Spec(split ? split.sort(Q).join('') : '');
};

Spec.prototype.add = function (spec, quant) {
    if (spec.constructor !== Spec) {
        spec = new Spec(spec, quant);
    }
    return new Spec(this.value + spec.value);
};
Spec.prototype.toString = function () { return this.value; };


Spec.int2base = function (i, padlen) {
    if (i < 0 || i >= (1 << 30)) {
        throw new Error('out of range');
    }
    var ret = '', togo = padlen || 5;
    for (; i || (togo > 0); i >>= 6, togo--) {
        ret = Spec.base64.charAt(i & 63) + ret;
    }
    return ret;
};

Spec.prototype.fits = function (specFilter) {
    var myToks = this.value.match(Spec.reQTokExt);
    var filterToks = specFilter.match(Spec.reQTokExt), tok;
    while (tok=filterToks.pop()) {
        if (myToks.indexOf(tok) === -1) {
            return false;
        }
    }
    return true;
};

Spec.base2int = function (base) {
    var ret = 0, l = base.match(Spec.re64l);
    for (var shift = 0; l.length; shift += 6) {
        ret += Spec.base64.indexOf(l.pop()) << shift;
    }
    return ret;
};
Spec.parseToken = function (token_body) {
    Spec.reTokExt.lastIndex = -1;
    var m = Spec.reTokExt.exec(token_body);
    if (!m) {
        return null;
    }
    return {bare: m[1], ext: m[2] || 'swarm'}; // FIXME not generic
};

Spec.base64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~';
Spec.rT = '[0-9A-Za-z_~]{1,80}'; // 60*8 bits is enough for everyone
Spec.reTok = new RegExp('^'+Spec.rT+'$'); // plain no-extension token
Spec.re64l = new RegExp('[0-9A-Za-z_~]', 'g');
Spec.quants = ['/', '#', '!', '.'];
Spec.rsTokExt = '^(=)(?:\\+(=))?$'.replace(/=/g, Spec.rT);
Spec.reTokExt = new RegExp(Spec.rsTokExt);
Spec.rsQTokExt = '([/#\\.!\\*])((=)(?:\\+(=))?)'.replace(/=/g, Spec.rT);
Spec.reQTokExt = new RegExp(Spec.rsQTokExt, 'g');
Spec.is = function (str) {
    if (str === null || str === undefined) {
        return false;
    }
    return str.constructor === Spec || '' === str.toString().replace(Spec.reQTokExt, '');
};
Spec.as = function (spec) {
    if (!spec) {
        return new Spec('');
    } else {
        return spec.constructor === Spec ? spec : new Spec(spec);
    }
};

Spec.Map = function VersionVectorAsAMap(vec) {
    this.map = {};
    if (vec) {
        this.add(vec);
    }
};
Spec.Map.prototype.add = function (versionVector) {
    var vec = new Spec(versionVector, '!'), tok;
    while (undefined !== (tok = vec.token('!'))) {
        var time = tok.bare, source = tok.ext || 'swarm';
        if (time > (this.map[source] || '')) {
            this.map[source] = time;
        }
    }
};
Spec.Map.prototype.covers = function (version) {
    Spec.reTokExt.lastIndex = 0;
    var m = Spec.reTokExt.exec(version);
    var ts = m[1], src = m[2] || 'swarm';
    return ts <= (this.map[src] || '');
};
Spec.Map.prototype.maxTs = function () {
    var ts = null,
        map = this.map;
    for (var src in map) {
        if (!ts || ts < map[src]) {
            ts = map[src];
        }
    }
    return ts;
};
Spec.Map.prototype.toString = function (trim) {
    trim = trim || {top: 10, rot: '0'};
    var top = trim.top || 10,
        rot = '!' + (trim.rot || '0'),
        ret = [],
        map = this.map;
    for (var src in map) {
        ret.push('!' + map[src] + (src === 'swarm' ? '' : '+' + src));
    }
    ret.sort().reverse();
    while (ret.length > top || ret[ret.length - 1] <= rot) {
        ret.pop();
    }
    return ret.join('') || '!0';
};

},{}],14:[function(_dereq_,module,exports){
"use strict";

var Syncable = _dereq_('./Syncable');

function Storage(async) {
    this.async = !!async || false;
    this.states = {};
    this.tails = {};
    this.counts = {};
    this._host = null;
    // many implementations do not push changes
    // so there are no listeners
    this.lstn = null;
    this._id = 'some_storage';
}
module.exports = Storage;
Storage.prototype.MAX_LOG_SIZE = 10;
Storage.prototype.isRoot = true; // may create global objects

Storage.prototype.deliver = function (spec, value, src) {
    var ret;
    switch (spec.op()) {
        // A storage is always an "uplink" so it never receives reon, reoff.
    case 'on':
        ret = this.on(spec, value, src); break;
    case 'off':
        ret = this.off(spec, value, src); break;
    case 'init':
        if (value._version) { // state
            ret = this.init(spec, value, src);
        } else { // patch
            var ti = spec.filter('/#');
            var specs = [], s;
            for(s in value._tail) {  specs.push(s);  }
            specs.sort();
            while (s=specs.pop()) {
                ret = this.anyOp( ti.add(s), value._tail[s], src);
            }
        }
        break;
    default:
        ret = this.anyOp(spec, value, src);
    }
    return ret;
};

Storage.prototype.on = function storageOn (spec, base, src) {
    var ti = spec.filter('/#');

    if (this.lstn) {
        var ls = this.lstn[ti];
        if (ls === undefined) {
            ls = src;
        } else if (ls !== src) {
            if (ls.constructor !== Array) {
                ls = [ls];
            }
            ls.push(src);
        }
        this.lstn[ti] = ls;
    }

    var self = this;
    var state;
    var tail;

    function sendResponse() {
        if (!state) {
            if (self.isRoot) {// && !spec.token('#').ext) {
                // make 0 state for a global object TODO move to Host
                state = {_version: '!0'};
            }
        }
        if (tail) {
            if (!state) {state={};}
            state._tail = state._tail || {};
            for (var s in tail) {
                state._tail[s] = tail[s];
            }
        }
        var tiv = ti.add(spec.version(), '!');
        if (state) {
            src.deliver(tiv.add('.init'), state, self);
            src.deliver(tiv.add('.reon'), Syncable.stateVersionVector(state), self); // TODO and the tail
        } else {
            src.deliver(tiv.add('.reon'), '!0', self); // state unknown
        }
    }

    this.readState(ti, function (err, s) {
        state = s || null;
        if (tail !== undefined) {
            sendResponse();
        }
    });

    this.readOps(ti, function (err, t) {
        tail = t || null;
        if (state !== undefined) {
            sendResponse();
        }
    });
};


Storage.prototype.off = function (spec, value, src) {
    if (!this.lstn) {
        return;
    }
    var ti = spec.filter('/#');
    var ls = this.lstn[ti];
    if (ls === src) {
        delete this.lstn[ti];
    } else if (ls && ls.constructor === Array) {
        var cleared = ls.filter(function (v) {return v !== src;});
        if (cleared.length) {
            this.lstn[ti] = cleared;
        } else {
            delete this.lstn[ti];
        }
    }
};

Storage.prototype.init = function (spec, state, src) {
    var ti = spec.filter('/#'), self=this;
    var saveops = this.tails[ti];
    this.writeState(spec, state, function (err) {
        if (err) {
            console.error('state dump error:', err);
        } else {
            var tail = self.tails[ti] || (self.tails[ti] = {});
            for(var op in saveops) { // OK, let's keep that in the log
                tail[op] = saveops[op];
            }
        }
    });
};


Storage.prototype.anyOp = function (spec, value, src) {
    var self = this;
    var ti = spec.filter('/#');
    this.writeOp(spec, value, function (err) {
        if (err) {
            this.close(err); // the log is sacred
        }
    });
    self.counts[ti] = self.counts[ti] || 0;
    if (++self.counts[ti]>self.MAX_LOG_SIZE) {
        // The storage piggybacks on the object's state/log handling logic
        // First, it adds an op to the log tail unless the log is too long...
        // ...otherwise it sends back a subscription effectively requesting
        // the state, on state arrival zeroes the tail.
        delete self.counts[ti];
        src.deliver(spec.set('.reon'), '!0.init', self);
    }
};


// In a real storage implementation, state and log often go into
// different backends, e.g. the state is saved to SQL/NoSQL db,
// while the log may live in a key-value storage.
// As long as the state has sufficient versioning info saved with
// it (like a version vector), we may purge the log lazily, once
// we are sure that the state is reliably saved. So, the log may
// overlap with the state (some ops are already applied). That
// provides some necessary resilience to workaround the lack of
// transactions across backends.
// In case third parties may write to the backend, go figure
// some way to deal with it (e.g. make a retrofit operation).
Storage.prototype.writeState = function (spec, state, cb) {
    var ti = spec.filter('/#');
    this.states[ti] = JSON.stringify(state);
    // tail is zeroed on state flush
    delete this.tails[ti];
    // callback is mandatory
    cb();
};

Storage.prototype.writeOp = function (spec, value, cb) {
    var ti = spec.filter('/#');
    var vm = spec.filter('!.');
    var tail = this.tails[ti] || (this.tails[ti] = {});
    if (tail[vm]) {
        console.error('op replay @storage'+vm+new Error().stack);
    }
    tail[vm] = JSON.stringify(value);
    cb();
};

Storage.prototype.readState = function (ti, callback) {
    var state = JSON.parse(this.states[ti] || null);

    function sendResponse() {
        callback(null, state);
    }

    // may force async behavior
    this.async ? setTimeout(sendResponse, 1) : sendResponse();
};

Storage.prototype.readOps = function (ti, callback) {
    var tail = JSON.parse(this.tails[ti] || null);
    callback(null, tail);
};

Storage.prototype.close = function (callback) {
    if (callback) { callback(); }
};

Storage.prototype.emit = function (spec,value) {
    var ti = spec.filter('/#');
    var ln = this.lstn[ti];
    if (!ln) {return;}
    if (ln && ln.constructor===Array) {
        for(var i=0; ln && i<ln.length; i++) {
            var l = ln[i];
            if (l && l.constructor===Function) {
                l(spec,value,this);
            } else if (l && l.deliver) {
                l.deliver(spec,value,this);
            }
        }
    } else if (ln && ln.deliver) {
        ln.deliver(spec,value,this);
    } else if (ln && ln.constructor===Function) {
        ln(spec,value,this);
    }
};

},{"./Syncable":15}],15:[function(_dereq_,module,exports){
"use strict";

var Spec = _dereq_('./Spec');
var env = _dereq_('./env');

/**
 * Syncable: an oplog-synchronized object
 * @constructor
 */
function Syncable() {
    // listeners represented as objects that have deliver() method
    this._lstn = [',']; // we unshift() uplink listeners and push() downlinks
    // ...so _lstn is like [server1, server2, storage, ',', view, listener]
    // The most correct way to specify a version is the version vector,
    // but that one may consume more space than the data itself in some cases.
    // Hence, _version is not a fully specified version vector (see version()
    // instead). _version is essentially is the greatest operation timestamp
    // (Lamport-like, i.e. "time+source"), sometimes amended with additional
    // timestamps. Its main features:
    // (1) changes once the object's state changes
    // (2) does it monotonically (in the alphanum order sense)
    this._version = '';
    // make sense of arguments
    var args = Array.prototype.slice.call(arguments);
    this._host = (args.length && args[args.length - 1]._type === 'Host') ?
            args.pop() : env.localhost;
    if (Spec.is(args[0])) {
        this._id = new Spec(args.shift()).id() || this._host.time();
    } else if (typeof(args[0]) === 'string') {
        this._id = args.shift(); // TODO format
    } else {
        this._id = this._host.time();
        this._version = '!0'; // may apply state in the constructor, see Model
    }
    //var state = args.length ? args.pop() : (fresh?{}:undefined);
    // register with the host
    var doubl = this._host.register(this);
    if (doubl !== this) { return doubl; }
    // locally created objects get state immediately
    // (while external-id objects need to query uplinks)
    /*if (fresh && state) {
     state._version = '!'+this._id;
     var pspec = this.spec().add(state._version).add('.init');
     this.deliver(pspec,state,this._host);
     }*/
    this.reset();
    // find uplinks, subscribe
    this.checkUplink();
    // TODO inplement state push
    return this;
}
module.exports = Syncable;

Syncable.types = {};
Syncable.isOpSink = function (obj) {
    if (!obj) { return false; }
    if (obj.constructor === Function) { return true; }
    if (obj.deliver && obj.deliver.constructor === Function) { return true; }
    return false;
};
Syncable.reMethodName = /^[a-z][a-z0-9]*([A-Z][a-z0-9]*)*$/;
Syncable.memberClasses = {ops:1,neutrals:1,remotes:1,defaults:1,reactions:1,mixins:1};
Syncable._default = {};

function fnname(fn) {
    if (fn.name) { return fn.name; }
    return fn.toString().match(/^function\s*([^\s(]+)/)[1];
}


/**
 * All CRDT model classes must extend syncable directly or indirectly. Syncable
 * provides all the necessary oplog- and state-related primitives and methods.
 * Every state-mutating method should be explicitly declared to be wrapped
 * by extend() (see 'ops', 'neutrals', 'remotes' sections in class declaration).
 * @param {function|string} fn
 * @param {{ops:object, neutrals:object, remotes:object}} own
 */
Syncable.extend = function (fn, own) {
    var parent = this, fnid;
    if (fn.constructor !== Function) {
        var id = fn.toString();
        fn = function SomeSyncable() {
            return parent.apply(this, arguments);
        };
        fnid = id; // if only it worked
    } else { // please call Syncable.constructor.apply(this,args) in your constructor
        fnid = fnname(fn);
    }

    // inheritance trick from backbone.js
    var SyncProto = function () {
        this.constructor = fn;
        this._neutrals = {};
        this._ops = {};
        this._reactions = {};

        var event,
            name;
        if (parent._pt) {
            //copy _neutrals & _ops from parent
            for (event in parent._pt._neutrals) {
                this._neutrals[event] = parent._pt._neutrals[event];
            }
            for (event in parent._pt._ops) {
                this._ops[event] = parent._pt._ops[event];
            }
        }

        // "Methods" are serialized, logged and delivered to replicas
        for (name in own.ops || {}) {
            if (Syncable.reMethodName.test(name)) {
                this._ops[name] = own.ops[name];
                this[name] = wrapCall(name);
            } else {
                console.warn('invalid op name:',name);
            }
        }

        // "Neutrals" don't change the state
        for (name in own.neutrals || {}) {
            if (Syncable.reMethodName.test(name)) {
                this._neutrals[name] = own.neutrals[name];
                this[name] = wrapCall(name);
            } else {
                console.warn('invalid neutral op name:',name);
            }
        }

        // "Remotes" are serialized and sent upstream (like RPC calls)
        for (name in own.remotes || {}) {
            if (Syncable.reMethodName.test(name)) {
                this[name] = wrapCall(name);
            } else {
                console.warn('invalid rpc name:',name);
            }
        }

        // add mixins
        (own.mixins || []).forEach(function (mixin) {
            for (var name in mixin) {
                this[name] = mixin[name];
            }
        }, this);

        // add other members
        for (name in own) {
            if (Syncable.reMethodName.test(name)) {
                var memberType = own[name].constructor;
                if (memberType === Function) { // non-op method
                    // these must change state ONLY by invoking ops
                    this[name] = own[name];
                } else if (memberType===String || memberType===Number) {
                    this[name] = own[name]; // some static constant, OK
                } else if (name in Syncable.memberClasses) {
                    // see above
                    continue;
                } else {
                    console.warn('invalid member:',name,memberType);
                }
            } else {
                console.warn('invalid member name:',name);
            }
        }

        // add reactions
        for (name in own.reactions || {}) {
            var reaction = own.reactions[name];
            if (!reaction) { continue; }

            switch (typeof reaction) {
            case 'function':
                // handler-function
                this._reactions[name] = [reaction];
                break;
            case 'string':
                // handler-method name
                this._reactions[name] = [this[name]];
                break;
            default:
                if (reaction.constructor === Array) {
                    // array of handlers
                    this._reactions[name] = reaction.map(function (item) {
                        switch (typeof item) {
                        case 'function':
                            return item;
                        case 'string':
                            return this[item];
                        default:
                            throw new Error('unexpected reaction type');
                        }
                    }, this);
                } else {
                    throw new Error('unexpected reaction type');
                }
            }
        }

        var syncProto = this;
        this.callReactions = function (spec, value, src) {
            var superReactions = syncProto._super.callReactions;
            if ('function' === typeof superReactions) {
                superReactions.call(this, spec, value, src);
            }
            var r = syncProto._reactions[spec.op()];
            if (r) {
                r.constructor !== Array && (r = [r]);
                for (var i = 0; i < r.length; i++) {
                    r[i] && r[i].call(this, spec, value, src);
                }
            }
        };

        this._super = parent.prototype;
        this._type = fnid;
    };

    SyncProto.prototype = parent.prototype;
    fn.prototype = new SyncProto();
    fn._pt = fn.prototype; // just a shortcut

    // default field values
    var key;
    var defs = fn.defaults = {};
    for (key in (parent.defaults || {})) {
        defs[key] = normalizeDefault(parent.defaults[key]);
    }
    for (key in (own.defaults || {})) {
        defs[key] = normalizeDefault(own.defaults[key]);
    }

    function normalizeDefault(val) {
        if (val && val.type) {
            return val;
        }
        if (val && val.constructor === Function) {
            return {type: val, value: undefined};
        }
        return {type:null, value: val};
    }

    // signature normalization for logged/remote/local method calls;
    function wrapCall(name) {
        return function wrapper() {
            // assign a Lamport timestamp
            var spec = this.newEventSpec(name);
            var args = Array.prototype.slice.apply(arguments), lstn;
            // find the callback if any
            Syncable.isOpSink(args[args.length - 1]) && (lstn = args.pop());
            // prettify the rest of the arguments
            if (!args.length) {  // FIXME isn't it confusing?
                args = ''; // used as 'empty'
            } else if (args.length === 1) {
                args = args[0]; // {key:val}
            }
            // TODO log 'initiated'
            return this.deliver(spec, args, lstn);
        };
    }

    // finishing touches
    fn._super = parent;
    fn.extend = this.extend;
    fn.addReaction = this.addReaction;
    fn.removeReaction = this.removeReaction;
    Syncable.types[fnid] = fn;
    return fn;
};

/**
 * A *reaction* is a hybrid of a listener and a method. It "reacts" on a
 * certain event for all objects of that type. The callback gets invoked
 * as a method, i.e. this===syncableObj. In an event-oriented architecture
 * reactions are rather handy, e.g. for creating mixins.
 * @param {string} op operation name
 * @param {function} fn callback
 * @returns {{op:string, fn:function}}
 */
Syncable.addReaction = function (op, fn) {
    var reactions = this.prototype._reactions;
    var list = reactions[op];
    list || (list = reactions[op] = []);
    list.push(fn);
    return {op: op, fn: fn};
};

/**
 *
 * @param handle
 */
Syncable.removeReaction = function (handle) {
    var op = handle.op,
        fn = handle.fn,
        list = this.prototype._reactions[op],
        i = list.indexOf(fn);
    if (i === -1) {
        throw new Error('reaction unknown');
    }
    list[i] = undefined; // such a peculiar pattern not to mess up out-of-callback removal
    while (list.length && !list[list.length - 1]) {
        list.pop();
    }
};

/**
 * compare two listeners
 * @param {{deliver:function, _src:*, sink:function}} ln listener from syncable._lstn
 * @param {function|{deliver:function}} other some other listener or function
 * @returns {boolean}
 */
Syncable.listenerEquals = function (ln, other) {
    return !!ln && ((ln === other) ||
        (ln._src && ln._src === other) ||
        (ln.fn && ln.fn === other) ||
        (ln.sink && ln.sink === other));
};

// Syncable includes all the oplog, change propagation and distributed
// garbage collection logix.
Syncable.extend(Syncable, {  // :P
    /**
     * @returns {Spec} specifier "/Type#objid"
     */
    spec: function () { return new Spec('/' + this._type + '#' + this._id); },

    /**
     * Generates new specifier with unique version
     * @param {string} op operation
     * @returns {Spec}
     */
    newEventSpec: function (op) {
        return this.spec().add(this._host.time(), '!').add(op, '.');
    },

    /**
     * Returns current object state specifier
     * @returns {string} specifier "/Type#objid!version+source[!version+source2...]"
     */
    stateSpec: function () {
        return this.spec() + (this._version || ''); //?
    },

    /**
     * Applies a serialized operation (or a batch thereof) to this replica
     */
    deliver: function (spec, value, lstn) {
        spec = Spec.as(spec);
        var opver = '!' + spec.version();
        var error;

        function fail(msg, ex) {
            console.error(msg, spec, value, (ex && ex.stack) || ex || new Error(msg));
            if (typeof(lstn) === 'function') {
                lstn(spec.set('.fail'), msg);
            } else if (lstn && typeof(lstn.error) === 'function') {
                lstn.error(spec, msg);
            } // else { } no callback provided
        }

        // sanity checks
        if (spec.pattern() !== '/#!.') {
            return fail('malformed spec', spec);
        }
        if (!this._id) {
            return fail('undead object invoked');
        }
        if (error = this.validate(spec, value)) {
            return fail('invalid input, ' + error, value);
        }
        if (!this.acl(spec, value, lstn)) {
            return fail('access violation', spec);
        }

        env.debug && env.log(spec, value, lstn);

        try {
            var call = spec.op();
            if (this._ops[call]) {  // FIXME name=>impl table
                if (this.isReplay(spec)) { // it happens
                    console.warn('replay', spec);
                    return;
                }
                // invoke the implementation
                this._ops[call].call(this, spec, value, lstn); // NOTE: no return value
                // once applied, may remember in the log...
                if (spec.op() !== 'init') {
                    this._oplog && (this._oplog[spec.filter('!.')] = value);
                    // this._version is practically a label that lets you know whether
                    // the state has changed. Also, it allows to detect some cases of
                    // concurrent change, as it is always set to the maximum version id
                    // received by this object. Still, only the full version vector may
                    // precisely and uniquely specify the current version (see version()).
                    this._version = (opver > this._version) ? opver : this._version + opver;
                } else {
                    value = this.diff('!0');
                }
                // ...and relay further to downstream replicas and various listeners
                this.emit(spec, value, lstn);
            } else if (this._neutrals[call]) {
                // invoke the implementation
                this._neutrals[call].call(this, spec, value, lstn);
                // and relay to listeners
                this.emit(spec, value, lstn);
            } else {
                this.unimplemented(spec, value, lstn);
            }
        } catch (ex) { // log and rethrow; don't relay further; don't log
            return fail("method execution failed", ex);
        }

        // to force async signatures we eat the returned value silently
        return spec;
    },

    /**
     * Notify all the listeners of a state change (i.e. the operation applied).
     */
    emit: function (spec, value, src) {
        var ls = this._lstn,
            op = spec.op(),
            is_neutrals = op in this._neutrals;
        if (ls) {
            var notify = [];
            for (var i = 0; i < ls.length; i++) {
                var l = ls[i];
                // skip empties, deferreds and the source
                if (!l || l === ',' || l === src) { continue; }
                if (is_neutrals && l._op !== op) { continue; }
                if (l._op && l._op !== op) { continue; }
                notify.push(l);
            }
            for (i = 0; i < notify.length; i++) { // screw it I want my 'this'
                try {
                    notify[i].deliver(spec, value, this);
                } catch (ex) {
                    console.error(ex.message, ex.stack);
                }
            }
        }
        this.callReactions(spec, value, src);
    },

    trigger: function (event, params) {
        var spec = this.newEventSpec(event);
        this.deliver(spec, params);
    },

    /**
     * Blindly applies a JSON changeset to this model.
     * @param {*} values
     */
    apply: function (values) {
        for (var key in values) {
            if (Syncable.reFieldName.test(key)) { // skip special fields
                var def = this.constructor.defaults[key];
                this[key] = def && def.type ?
                    new def.type(values[key]) : values[key];
            }
        }
    },

    /**
     * @returns {Spec.Map} the version vector for this object
     */
    version: function () {
        // distillLog() may drop some operations; still, those need to be counted
        // in the version vector; so, their Lamport ids must be saved in this._vector
        var map = new Spec.Map(this._version + (this._vector || ''));
        if (this._oplog) {
            for (var op in this._oplog) {
                map.add(op);
            }
        }
        return map; // TODO return the object, let the consumer trim it to taste
    },

    /**
     * Produce the entire state or probably the necessary difference
     * to synchronize a replica which is at version *base*.
     * The format of a state/patch object is:
     * {
     *   // A version label, see Syncable(). Presence of the label means
     *   // that this object has a snapshot of the state. No version
     *   // means it is a diff (log tail).
     *   _version: Spec,
     *   // Some parts of the version vector that can not be derived from
     *   // _oplog or _version.
     *   _vector: Spec,
     *   // Some ops that were already applied. See distillLog()
     *   _oplog: { spec: value },
     *   // Pending ops that need to be applied.
     *   _tail: { spec: value }
     * }
     *
     * The state object must survive JSON.parse(JSON.stringify(obj))
     *
     * In many cases, the size of a distilled log is small enough to
     * use it for state transfer (i.e. no snapshots needed).
     */
    diff: function (base) {
        //var vid = new Spec(this._version).get('!'); // first !token
        //var spec = vid + '.patch';
        if (!this._version) { return undefined; }
        this.distillLog(); // TODO optimize?
        var patch, spec;
        if (base && base != '!0' && base != '0') { // FIXME ugly
            var map = new Spec.Map(base || '');
            for (spec in this._oplog) {
                if (!map.covers(new Spec(spec).version())) {
                    patch = patch || {_tail: {}}; // NOTE: no _version
                    patch._tail[spec] = this._oplog[spec];
                }
            }
        } else {
            patch = {_version: '!0', _tail: {}}; // zero state plus the tail
            for (spec in this._oplog) {
                patch._tail[spec] = this._oplog[spec];
            }
        }
        return patch;
    },

    distillLog: function () {
    },

    /**
     * The method must decide whether the source of the operation has
     * the rights to perform it. The method may check both the nearest
     * source and the original author of the op.
     * If this method ever mentions 'this', that is a really bad sign.
     * @returns {boolean}
     */
    acl: function (spec, val, src) {
        return true;
    },

    /**
     * Check operation format/validity (recommendation: don't check against the current state)
     * @returns {string} '' if OK, error message otherwise.
     */
    validate: function (spec, val, src) {
        if (spec.pattern() !== '/#!.') {
            return 'incomplete event spec';
        }
        if (this.clock && spec.type()!=='Host' && !this.clock.checkTimestamp(spec.version())) {
            return 'invalid timestamp '+spec;
        }
    },

    /**
     * whether this op was already applied in the past
     * @returns {boolean}
     */
    isReplay: function (spec) {
        if (!this._version) { return false; }
        if (spec.op() === 'init') { return false; } // these are .on !vids
        var opver = spec.version();
        if (opver > this._version.substr(1)) { return false; }
        if (spec.filter('!.').toString() in this._oplog) { return true; }// TODO log trimming, vvectors?
        return this.version().covers(opver); // heavyweight
    },

    /**
     * External objects (those you create by supplying an id) need first to query
     * the uplink for their state. Before the state arrives they are stateless.
     * @return {boolean}
     */
    hasState: function () {
        return !!this._version;
    },

    getListenerIndex: function (search_for, uplinks_only) {
        var i = this._lstn.indexOf(search_for),
            l;
        if (i > -1) { return i; }

        for (i = 0, l = this._lstn.length; i < l; i++) {
            var ln = this._lstn[i];
            if (uplinks_only && ln === ',') {
                return -1;
            }
            if (Syncable.listenerEquals(ln, search_for)) {
                return i;
            }
        }
        return -1;
    },

    reset: function () {
        var defs = this.constructor.defaults;
        for (var name in defs) {
            var def = defs[name];
            if (def.type) {
                this[name] = def.value ? new def.type(def.value) : new def.type();
            } else {
                this[name] = def.value;
            }
        }
    },


    neutrals: {
        /**
         * Subscribe to the object's operations;
         * the upstream part of the two-way subscription
         *  on() with a full filter:
         *  @param {Spec} spec /Mouse#Mickey!now.on
         *  @param {Spec|string} filter !since.event
         *  @param {{deliver:function}|function} repl callback
         *  @this {Syncable}
         *
         * TODO: prevent second subscription
         */
        on: function (spec, filter, repl) {   // WELL  on() is not an op, right?
            // if no listener is supplied then the object is only
            // guaranteed to exist till the next Host.gc() run
            if (!repl) { return; }

            var self = this;
            // stateless objects fire no events; essentially, on() is deferred
            if (!this._version && filter) { // TODO solidify
                this._lstn.push({
                    _op: 'reon',
                    _src: repl,
                    deliver: function () {
                        var i = self._lstn.indexOf(this);
                        self._lstn.splice(i, 1);
                        self.deliver(spec, filter, repl);
                    }
                });
                return; // defer this call till uplinks are ready
            }
            // make all listeners uniform objects
            if (repl.constructor === Function) {
                repl = {
                    sink: repl,
                    that: this,
                    deliver: function () { // .deliver is invoked on an event
                        this.sink.apply(this.that, arguments);
                    }
                };
            }

            if (filter) {
                filter = new Spec(filter, '.');
                var baseVersion = filter.filter('!'),
                    filter_by_op = filter.get('.');

                if (filter_by_op === 'init') {
                    var diff_if_needed = baseVersion ? this.diff(baseVersion) : '';
                    repl.deliver(spec.set('.init'), diff_if_needed, this); //??
                    // FIXME use once()
                    return;
                }
                if (filter_by_op) {
                    repl = {
                        sink: repl,
                        _op: filter_by_op,
                        deliver: function deliverWithFilter(spec, val, src) {
                            if (spec.op() === filter_by_op) {
                                this.sink.deliver(spec, val, src);
                            }
                        }
                    };
                }

                if (!baseVersion.isEmpty()) {
                    var diff = this.diff(baseVersion);
                    diff && repl.deliver(spec.set('.init'), diff, this); // 2downlink
                    repl.deliver(spec.set('.reon'), this.version().toString(), this);
                }
            }

            this._lstn.push(repl);
            // TODO repeated subscriptions: send a diff, otherwise ignore
        },

        /**
         * downstream reciprocal subscription
         */
        reon: function (spec, filter, repl) {
            if (filter) {  // a diff is requested
                var base = Spec.as(filter).tok('!');
                var diff = this.diff(base);
                if (diff) {
                    repl.deliver(spec.set('.init'), diff, this);
                }
            }
        },

        /** Unsubscribe */
        off: function (spec, val, repl) {
            var idx = this.getListenerIndex(repl); //TODO ??? uplinks_only?
            if (idx > -1) {
                this._lstn.splice(idx, 1);
            }
        },

        /** Reciprocal unsubscription */
        reoff: function (spec, val, repl) {
            var idx = this.getListenerIndex(repl); //TODO ??? uplinks_only?
            if (idx > -1) {
                this._lstn.splice(idx, 1);
            }
            if (this._id) {
                this.checkUplink();
            }
        },

        /**
         * As all the event/operation processing is asynchronous, we
         * cannot simply throw/catch exceptions over the network.
         * This method allows to send errors back asynchronously.
         * Sort of an asynchronous complaint mailbox :)
         */
        error: function (spec, val, repl) {
            console.error('something failed:', spec, val, '@', (repl && repl._id));
        }

    }, // neutrals

    ops: {
        /**
         * A state of a Syncable CRDT object is transferred to a replica using
         * some combination of POJO state and oplog. For example, a simple LWW
         * object (Last Writer Wins, see Model.js) uses its distilled oplog
         * as the most concise form. A CT document (Causal Trees) has a highly
         * compressed state, its log being hundred times heavier. Hence, it
         * mainly uses its plain state, but sometimes its log tail as well. The
         * format of the state object is POJO plus (optionally) special fields:
         * _oplog, _tail, _vector, _version (the latter flags POJO presence).
         * In either case, .init is only produced by diff() (+ by storage).
         * Any real-time changes are transferred as individual events.
         * @this {Syncable}
         */
        init: function (spec, state, src) {

            var tail = {}, // ops to be applied on top of the received state
                typeid = spec.filter('/#'),
                lstn = this._lstn,
                a_spec;
            this._lstn = []; // prevent events from being fired

            if (state._version/* && state._version !== '!0'*/) {
                // local changes may need to be merged into the received state
                if (this._oplog) {
                    for (a_spec in this._oplog) {
                        tail[a_spec] = this._oplog[a_spec];
                    }
                    this._oplog = {};
                }
                this._vector && (this._vector = undefined);
                // zero everything
                for (var key in this) {
                    if (this.hasOwnProperty(key) && key.charAt(0) !== '_') {
                        this[key] = undefined;
                    }
                }
                // set default values
                this.reset();

                this.apply(state);
                this._version = state._version;

                state._oplog && (this._oplog = state._oplog); // FIXME copy
                state._vector && (this._vector = state._vector);
            }
            // add the received tail to the local one
            if (state._tail) {
                for (a_spec in state._tail) {
                    tail[a_spec] = state._tail[a_spec];
                }
            }
            // appply the combined tail to the new state
            var specs = [];
            for (a_spec in tail) {
                specs.push(a_spec);
            }
            specs.sort().reverse();
            // there will be some replays, but those will be ignored
            while (a_spec = specs.pop()) {
                this.deliver(typeid.add(a_spec), tail[a_spec], this);
            }

            this._lstn = lstn;

        }

    }, // ops


    /**
     * Uplink connections may be closed or reestablished so we need
     * to adjust every object's subscriptions time to time.
     * @this {Syncable}
     */
    checkUplink: function () {
        var new_uplinks = this._host.getSources(this.spec()).slice(),
            up, self = this;
        // the plan is to eliminate extra subscriptions and to
        // establish missing ones; that only affects outbound subs
        for (var i = 0; i < this._lstn.length && this._lstn[i] != ','; i++) {
            up = this._lstn[i];
            if (!up) {
                continue;
            }
            up._src && (up = up._src); // unready
            var up_idx = new_uplinks.indexOf(up);
            if (up_idx === -1) { // don't need this uplink anymore
                up.deliver(this.newEventSpec('off'), '', this);
            } else {
                new_uplinks[up_idx] = undefined;
            }
        }
        // subscribe to the new
        for (i = 0; i < new_uplinks.length; i++) {
            up = new_uplinks[i];
            if (!up) {
                continue;
            }
            var onspec = this.newEventSpec('on');
            this._lstn.unshift({
                _op: 'reon',
                _src: up,
                deliver: function (spec, base, src) {
                    if (spec.version() !== onspec.version()) {
                        return;
                    } // not mine

                    var i = self.getListenerIndex(this);
                    self._lstn[i] = up;
                }
            });
            up.deliver(onspec, this.version().toString(), this);
        }
    },

    /**
     * returns a Plain Javascript Object with the state
     * @this {Syncable}
     */
    pojo: function (addVersionInfo) {
        var pojo = {},
            defs = this.constructor.defaults;
        for (var key in this) {
            if (this.hasOwnProperty(key)) {
                if (Syncable.reFieldName.test(key) && this[key] !== undefined) {
                    var def = defs[key],
                        val = this[key];
                    pojo[key] = def && def.type ?
                    (val.toJSON && val.toJSON()) || val.toString() :
                            (val && val._id ? val._id : val); // TODO prettify
                }
            }
        }
        if (addVersionInfo) {
            pojo._id = this._id; // not necassary
            pojo._version = this._version;
            this._vector && (pojo._vector = this._vector);
            this._oplog && (pojo._oplog = this._oplog); //TODO copy
        }
        return pojo;
    },

    /**
     * Sometimes we get an operation we don't support; not normally
     * happens for a regular replica, but still needs to be caught
     */
    unimplemented: function (spec, val, repl) {
        console.warn("method not implemented:", spec);
    },

    /**
     * Deallocate everything, free all resources.
     */
    close: function () {
        var l = this._lstn,
            s = this.spec(),
            uplink;

        this._id = null; // no id - no object; prevent relinking
        while ((uplink = l.shift()) && uplink !== ',') {
            uplink.off(s, null, this);
        }
        while (l.length) {
            l.pop().deliver(s.set('.reoff'), null, this);
        }
        this._host.unregister(this);
    },

    /**
     * Once an object is not listened by anyone it is perfectly safe
     * to garbage collect it.
     */
    gc: function () {
        var l = this._lstn;
        if (!l.length || (l.length === 1 && !l[0])) {
            this.close();
        }
    },

    /**
     * @param {string} filter event filter for subscription
     * @param {function} cb callback (will be called once)
     * @see Syncable#on
     */
    once: function (filter, cb) {
        this.on(filter, function onceWrap(spec, val, src) {
            // "this" is the object (Syncable)
            if (cb.constructor === Function) {
                cb.call(this, spec, val, src);
            } else {
                cb.deliver(spec, val, src);
            }
            this.off(filter, onceWrap);
        });
    }
});


Syncable.reFieldName = /^[a-z][a-z0-9]*([A-Z][a-z0-9]*)*$/;

/**
 * Derive version vector from a state of a Syncable object.
 * This is not a method as it needs to be applied to a flat JSON object.
 * @see Syncable.version
 * @see Spec.Map
 * @returns {string} string representation of Spec.Map
 */
Syncable.stateVersionVector = function stateVersionVector(state) {
    var op,
        map = new Spec.Map( (state._version||'!0') + (state._vector || '') );
    if (state._oplog) {
        for (op in state._oplog) {
            map.add(op);
        }
    }
    if (state._tail) {
        for (op in state._tail) {
            map.add(op);
        }
    }
    return map.toString();
};

},{"./Spec":13,"./env":19}],16:[function(_dereq_,module,exports){
"use strict";

var Spec = _dereq_('./Spec');
var Syncable = _dereq_('./Syncable');

var Text = Syncable.extend('Text', {
    // naive uncompressed CT weave implementation
    defaults: {
        weave: '\n',
        ids: {type:Array, value:'00000+swarm'},
        text: '',
        _oplog: Object
    },

    neutrals: {
        state: function (spec, text, src) {
            console.log('what?');
        }
    },
    ops: {
        insert: function (spec, ins, src) {
            var w1 = [], w4 = [];
            var vt = spec.token('!'), v = vt.bare;
            var ts = v.substr(0, 5), seq = v.substr(5) || '00';
            var seqi = Spec.base2int(seq);
            for (var i = 0; i < this.weave.length; i++) {
                var id = this.ids[i];
                w1.push(this.weave.charAt(i));
                w4.push(id);
                if (id in ins) {
                    var str = ins[id].toString();
                    var k = i + 1;
                    while (k < this.weave.length && this.ids[k] > vt.body) {
                        k++;
                    }
                    if (k > i + 1) { // concurrent edits
                        var newid = this.ids[k - 1];
                        ins[newid] = ins[id];
                        delete ins[id];
                    } else {
                        for (var j = 0; j < str.length; j++) {
                            w1.push(str.charAt(j)); // FIXME overfill
                            var genTs = ts + (seqi ? Spec.int2base(seqi++, 2) : '') + '+' + vt.ext;
                            w4.push(genTs);
                            if (!seqi) {
                                seqi = 1; // FIXME repeat ids, double insert
                            }
                        }
                    }
                }
            }
            if (genTs) {
                this._host.clock.checkTimestamp(genTs);
            }
            this.weave = w1.join('');
            this.ids = w4;
            this.rebuild();
        },
        remove: function (spec, rm, src) {
            var w1 = [], w4 = [];
            var v = spec.version();
            for (var i = 0; i < this.weave.length; i++) {
                w1.push(this.weave.charAt(i));
                w4.push(this.ids[i]);
                if (this.ids[i] in rm) {
                    w1.push('\u0008');
                    w4.push(v);
                }
            }
            this.weave = w1.join('');
            this.ids = w4;
            this.rebuild();
        }
    },
    rebuild: function () {
        /*var re = /([^\u0008][\u0008]+)|([^\u0008])/g, m=[];
         var text = [], tids = [], pos = 0;
         while (m=re.exec(this.weave)) {
         if (m[2]) {
         text.push(m[2]);
         tids.push(this.ids[pos]);
         }
         pos += m[0].length;
         }

         this.tids = tids;*/
        this.text = this.weave.replace(/[^\u0008][\u0008]+/mg, '').substr(1);
    },
    set: function (newText) {
        var patch = Text.diff(this.text, newText);
        var rm = null, ins = null, weave = this.weave;
        var re_atom = /[^\u0008]([^\u0008][\u0008]+)*/mg;
        var atom;

        function skip(n) {
            for (n = n || 1; n > 0; n--) {
                atom = re_atom.exec(weave);
            }
        }

        skip(1); // \n #00000+swarm

        for (var i = 0; i < patch.length; i++) {
            var op = patch[i][0], val = patch[i][1];
            switch (op) {
            case '+':
                ins || (ins = {});
                ins[this.ids[atom.index]] = val;
                break;
            case '-':
                rm || (rm = {});
                for (var r = 0; r < val.length; r++) {
                    rm[this.ids[atom.index + atom[0].length]] = true;
                    skip();
                }
                break;
            case '=':
                skip(val.length);
            }
        }
        rm && this.remove(rm);
        ins && this.insert(ins);
    }
});

Text.diff = function diff(was, is) {
    var ret = [];
    // prefix suffix the rest is change
    var pre = 0;
    while (pre < was.length && pre < is.length && was.charAt(pre) === is.charAt(pre)) {
        pre++;
    }
    var post = 0;
    while (post < was.length - pre && post < is.length - pre &&
    was.charAt(was.length - post - 1) === is.charAt(is.length - post - 1)) {
        post++;
    }
    if (pre) {
        ret.push(['=', was.substr(0, pre)]);
    }
    var ins = is.length - pre - post;
    if (ins) {
        ret.push(['+', is.substr(pre, ins)]);
    }
    var rm = was.length - pre - post;
    if (rm) {
        ret.push(['-', was.substr(pre, rm)]);
    }
    if (post) {
        ret.push(['=', was.substr(pre + rm)]);
    }
    return ret;

};

module.exports = Text;

},{"./Spec":13,"./Syncable":15}],17:[function(_dereq_,module,exports){
"use strict";

var Spec = _dereq_('./Spec');
var LongSpec = _dereq_('./LongSpec');
var Syncable = _dereq_('./Syncable');
var ProxyListener = _dereq_('./ProxyListener');
var CollectionMethodsMixin = _dereq_('./CollectionMethodsMixin');

/** In distributed environments, linear structures are tricky. It is always
 *  recommended to use (sorted) Set as your default collection type. Still, in
 *  some cases we need precisely a Vector, so here it is. Note that a vector can
 *  not prune its mutation history for quite a while, so it is better not to
 *  sort (reorder) it repeatedly. The perfect usage pattern is a growing vector+
 *  insert sort or no sort at all. If you need to re-shuffle a vector
 *  differently or replace its contents, you'd better create a new vector.
 *  So, you've been warned.
 *  Vector is implemented on top of a LongSpec, so the API is very much alike.
 *  The replication/convergence/correctness algorithm is Causal Trees.
 *
 *  TODO support JSON types (as a part of ref-gen-refac)
 */
module.exports = Syncable.extend('Vector', {

    defaults: {
        _oplog: Object,
        objects: Array,
        _order: LongSpec,
        _proxy: ProxyListener
    },

    mixins: [
        CollectionMethodsMixin
    ],

    ops: {  // operations is our assembly language

        // insert an object
        in: function (spec, value, src) {
            // we misuse specifiers to express the operation in
            // a compact non-ambiguous way
            value = new Spec(value);
            var opid = spec.tok('!');
            var at = value.tok('!');
            if (opid<=at) {
                throw new Error('timestamps are messed up');
            }
            var what = value.tok('#');
            if (!what) { throw new Error('object #id not specified'); }
            var type = value.get('/');
            if (!type && this.objectType) {
                type = this.objectType.prototype._type;
            }
            if (!type) {
                throw new Error('object /type not specified');
            }
            type = '/' + type;

            var pos = this.findPositionFor(opid, at?at:'!0');
            var obj = this._host.get(type+what);

            this.objects.splice(pos.index,0,obj);
            this._order.insert(opid,pos);

            obj.on(this._proxy);
        },

        // remove an object
        rm: function (spec, value, src) {
            value = Spec.as(value);
            var target = value.tok('!');
            var hint = value.has('.') ? Spec.base2int(value.get('.')) : 0;
            var at = this._order.find(target, Math.max(0,hint-5));
            if (at.end()) {
                at = this._order.find(target, 0);
            }
            if (at.end()) {
                // this can only be explained by concurrent deletion
                // partial order can't break cause-and-effect ordering
                return;
            }
            var obj = this.objects[at.index];
            this.objects.splice(at.index,1);
            at.erase(1);

            obj.off(this._proxy);
        }

        /** Either thombstones or log  before HORIZON
        patch: function (spec, value, src) {

        }*/

    },

    distillLog: function () {
        // TODO HORIZON
    },

    reactions: {

        'init': function fillAll (spec,val,src) { // TODO: reactions, state init tests
            for(var i=this._order.iterator(); !i.end(); i.next()) {
                var op = i.token() + '.in';
                var value = this._oplog[op];
                var obj = this.getObject(value);
                this.objects[i.index] = obj;
                obj.on(this._proxy);
            }
        }

    },

    getObject: function (spec) {
        spec = new Spec(spec,'#');
        if (!spec.has('/')) {
            if (this.objectType) {
                spec = spec.add(this.objectType.prototype._type,'/').sort();
            } else {
                throw new Error("type not specified"); // TODO is it necessary at all?
            }
        }
        var obj = this._host.get(spec);
        return obj;
    },

    length: function () {
        return this.objects.length;
    },

    //  C A U S A L  T R E E S  M A G I C

    findPositionFor: function (id, parentId) { // FIXME protected methods && statics (entryType)
        if (!parentId) {
            parentId = this.getParentOf(id);
        }
        var next;
        if (parentId!=='!0') {
            next = this._order.find(parentId);
            if (next.end()) {
                next = this.findPositionFor(parentId);
            }
            next.next();
        } else {
            next = this._order.iterator();
        }
        // skip "younger" concurrent siblings
        while (!next.end()) {
            var nextId = next.token();
            if (nextId<id) {
                break;
            }
            var subtreeId = this.inSubtreeOf(nextId,parentId);
            if (!subtreeId || subtreeId<id) {
                break;
            }
            this.skipSubtree(next,subtreeId);
        }
        return next; // insert before
    },

    getParentOf: function (id) {
        var spec = this._oplog[id+'.in'];
        if (!spec) {
            throw new Error('operation unknown: '+id);
        }
        var parentId = Spec.as(spec).tok('!') || '!0';
        return parentId;
    },

    /** returns the immediate child of the root node that is an ancestor
      * of the given node. */
    inSubtreeOf: function (nodeId, rootId) {
        var id=nodeId, p=id;
        while (id>rootId) {
            p=id;
            id=this.getParentOf(id);
        }
        return id===rootId && p;
    },

    isDescendantOf: function (nodeId, rootId) {
        var i=nodeId;
        while (i>rootId) {
            i=this.getParentOf(i);
        }
        return i===rootId;
    },

    skipSubtree: function (iter, root) {
        root = root || iter.token();
        do {
            iter.next();
        } while (!iter.end() && this.isDescendantOf(iter.token(),root));
        return iter;
    },

    validate: function (spec, val, source) {
        // ref op is known
    },

    //  A R R A Y - L I K E  A P I
    //  wrapper methods that convert into op calls above

    indexOf: function (obj, startAt) {
        if (!obj._id) {
            obj = this.getObject(obj);
        }
        return this.objects.indexOf(obj,startAt);
    },

    /*splice: function (offset, removeCount, insert) {
        var ref = offset===-1 ? '' : this.objects[offset];
        var del = [];
        var hint;
        for (var rm=1; rm<=removeCount; rm++) {
            del.push(this._order.entryAt(offset+rm));
        }
        for(var a=3; a<this.arguments.length; a++) {
            var arg = this.arguments[a];
            arg = _id in arg ? arg._id : arg;
            if (!Spec.isId(arg)) { throw new Error('malformed id: '+arg); }
            ins.push(arg);
        }
        while (rmid=del.pop()) {
            this.del(rmid+hint);
        }
        while (insid=ins.pop()) {
            this.ins(ref+insid+hint);
        }
    },*/

    normalizePos: function (pos) {
        if (pos && pos._id) {
            pos=pos._id;
        }
        var spec = new Spec(pos,'#');
        var type = spec.type();
        var id = spec.id();
        for(var i=0; i<this.objects.length; i++) {
            var obj = this.objects[i];
            if (obj && obj._id===id && (!type || obj._type===type)) {
                break;
            }
        }
        return i;
    },

    /** Assuming position 0 on the "left" and left-to-right writing, the
      * logic of causal tree insertion is
      * insert(newEntry, parentWhichIsOnTheLeftSide). */
    insert: function (spec, pos) {
        // TODO bulk insert: make'em siblings
        if (pos===undefined) {
            pos = -1; // TODO ? this._order.length()
        }
        if (pos.constructor!==Number) {
            pos = this.normalizePos(pos);
        }
        if (spec && spec._id) {
            spec = spec.spec();
        } else /*if (spec.constructor===String)*/ {
            spec = new Spec(spec,'#');
        }
        // TODO new object
        var opid = pos===-1 ? '!0' : this._order.tokenAt(pos);
        // TODO hint pos
        return this.in(spec+opid);
    },

    insertAfter: function (obj, pos) {
        this.insert (obj,pos);
    },

    insertBefore: function (spec, pos) {
        if (pos===undefined) {
            pos = this._order.length();
        }
        if (pos.constructor!==Number) {
            pos = this.normalizePos(pos);
        }
        this.insert(spec,pos-1);
    },

    append: function append (spec) {
        this.insert(spec,this._order.length()-1);
    },

    remove: function remove (pos) {
        if (pos.constructor!==Number) {
            pos = this.normalizePos(pos);
        }
        var hint = Spec.int2base(pos,0);
        var op = this._order.tokenAt(pos);
        this.rm(op+'.'+hint); // TODO generic spec quants
    },

    // Set-compatible, in a sense
    addObject: function (obj) {
        this.append(obj);
    },

    removeObject: function (pos) {
        this.remove(pos);
    },

    objectAt: function (i) {
        return this.objects[i];
    },

    insertSorted: function (obj, cmp) {
    },

    setOrder: function (fn) {
    },

    forEach: function (cb, thisArg) {
        this.objects.forEach(cb, thisArg);
    },

    every: function (cb, thisArg) {
        return this.objects.every(cb, thisArg);
    },

    filter: function (cb, thisArg) {
        return this.objects.filter(cb, thisArg);
    }

});

},{"./CollectionMethodsMixin":1,"./LongSpec":5,"./ProxyListener":8,"./Spec":13,"./Syncable":15}],18:[function(_dereq_,module,exports){
"use strict";

var env = _dereq_('./env');

function WebSocketStream(url) {
    var self = this;
    var ln = this.lstn = {};
    this.url = url;
    var ws = this.ws = new WebSocket(url);
    var buf = this.buf = [];
    ws.onopen = function () {
        buf.reverse();
        self.buf = null;
        while (buf.length) {
            self.write(buf.pop());
        }

    };
    ws.onclose = function () { ln.close && ln.close(); };
    ws.onmessage = function (msg) {
        ln.data && ln.data(msg.data);
    };
    ws.onerror = function (err) { ln.error && ln.error(err); };
}

WebSocketStream.prototype.on = function (evname, fn) {
    if (evname in this.lstn) {
        var self = this,
            prev_fn = this.lstn[evname];
        this.lstn[evname] = function () {
            prev_fn.apply(self, arguments);
            fn.apply(self, arguments);
        };
    } else {
        this.lstn[evname] = fn;
    }
};

WebSocketStream.prototype.write = function (data) {
    if (this.buf) {
        this.buf.push(data);
    } else {
        this.ws.send(data);
    }
};

env.streams.ws = env.streams.wss = WebSocketStream;
module.exports = WebSocketStream;

},{"./env":19}],19:[function(_dereq_,module,exports){
"use strict";

/** a really simplistic default hash function */
function djb2Hash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash;
}

var env = module.exports = {
    // maps URI schemes to stream implementations
    streams: {},
    // the default host
    localhost: undefined,
    // whether multiple hosts are allowed in one process
    // (that is mostly useful for testing)
    multihost: false,
    // hash function used for consistent hashing
    hashfn: djb2Hash,

    log: plain_log,
    debug: false,
    trace: false,

    isServer: typeof(navigator) === 'undefined',
    isBrowser: typeof(navigator) === 'object',
    isWebKit: false,
    isGecko: false,
    isIE: false,
    clockType: undefined // default
};

if (typeof(navigator) === 'object') {
    var agent = navigator.userAgent;
    env.isWebKit = /AppleWebKit\/(\S+)/.test(agent);
    env.isIE = /MSIE ([^;]+)/.test(agent);
    env.isGecko = /rv:.* Gecko\/\d{8}/.test(agent);
}

function plain_log(spec, val, object) {
    var method = 'log';
    switch (spec.op()) {
    case 'error':
        method = 'error';
        break;
    case 'warn':
        method = 'warn';
        break;
    }
    console[method](spec.toString(), val, object && object._id,
            '@' + ((object && object._host && object._host._id) || ''));
}

},{}],20:[function(_dereq_,module,exports){

module.exports = {
  Swarm: _dereq_('swarm'),
  Text: _dereq_('swarm/lib/Text'),
}


},{"swarm":3,"swarm/lib/Text":16}]},{},[20])
(20)
});