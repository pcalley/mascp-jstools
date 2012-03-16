//"use strict";

/**
 *  @fileOverview   Basic classes and defitions for the MASCP services
 */

/** Convenience logging function. If there is no log function defined, add a log method that simply
 *  forwards the message on to the console.log.
 *  @function
 *  @param  {Object}    message Message to log
 */

/**
 *  @namespace MASCP namespace
 */
var MASCP = MASCP || {};


/** Default constructor for Services
 *  @class      Super-class for all MASCP services to retrieve data from
 *              proteomic databases. Sub-classes of this class override methods
 *              to change how requests are built, and how the data is parsed.
 *  @param      {String}    agi             AGI to retrieve data for
 *  @param      {String}    endpointURL     Endpoint for the service
 */
MASCP.Service = function(agi,endpointURL) {};


if (typeof module != 'undefined' && module.exports){
    var events = require('events');
    
    MASCP.Service.prototype = new events.EventEmitter();

    var singletonService = new MASCP.Service();

    MASCP.Service.emit = function(targ,args) {
        singletonService.emit(targ,args);
    };

    MASCP.Service.removeAllListeners = function(ev,cback) {
        if (cback) {
            singletonService.removeListeners(ev,cback);
        } else {
            singletonService.removeAllListeners(ev);
        }
    };

    MASCP.Service.addListener = function(ev,cback) {
        singletonService.addListener(ev,cback);
    };

    
    var bean = {
        'add' : function(targ,ev,cback) {
            if (ev == "error") {
                ev = "MASCP.error";
            }
            if (targ.addListener) {
                targ.addListener(ev,cback);
            }
        },
        'remove' : function(targ,ev,cback) {
            if (ev == "error") {
                ev = "MASCP.error";
            }
            if (cback && targ.removeListener) {
                targ.removeListener(ev,cback);
            } else if (targ.removeAllListeners && typeof cback == 'undefined') {
                targ.removeAllListeners(ev);
            }
        },
        'fire' : function(targ,ev,args) {
            if (ev == "error") {
                ev = "MASCP.error";
            }
            if (targ.emit) {
                targ.emit.apply(targ,[ev].concat(args));
            }
        }
    };
    
    MASCP.events = new events.EventEmitter();
    module.exports = MASCP;
    var parser = require('jsdom').jsdom;
    
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    XMLHttpRequest.prototype.__defineGetter__("responseXML", function() {
        return parser((this.responseText || '').replace(/&/g,'&amp;'));
    });
    XMLHttpRequest.prototype.__defineSetter__("responseXML",function() {});
    XMLHttpRequest.prototype.customUA = 'MASCP Gator crawler (+http://gator.masc-proteomics.org/)';
} else {
    window.MASCP = MASCP;
    var ie = (function(){

        var undef,
            v = 3,
            div = document.createElement('div'),
            all = div.getElementsByTagName('i');

            do {
                div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->';
            } while (all[0]);

        return v > 4 ? v : undef;

    }());
    if (ie) {
        if (ie === 7) {
            MASCP.IE = true;
            MASCP.IE7 = true;
        }
        if (ie === 8) {
            MASCP.IE = true;
            MASCP.IE8 = true;
        }
        MASCP.IE = true;
    }
}

/** Build a data retrieval class that uses the given function to extract result data.
 *  @static
 *  @param  {Function}  dataExtractor   Function to extract data from the resultant data (passed as an argument
 *                                      to the function), and then populate the result object. The function is
 *                                      bound to a hash to populate data in to. When no data is passed to the
 *                                      function, the hash should be populated with default values.
 */
MASCP.buildService = function(dataExtractor)
{
    var clazz = function(agi,endpointURL)
    {
        if (typeof endpointURL != 'undefined') {
            this._endpointURL = endpointURL;
        } else {
            this._endpointURL = clazz.SERVICE_URL;
        }
        this.agi = agi;
        return this;
    };

    clazz.Result = function(data)
    {
        dataExtractor.apply(this,[data]);
        return this;
    };
    
    
    clazz.prototype = MASCP.extend(new MASCP.Service(),{
        '__class__'       :       clazz,
        '__result_class'  :       clazz.Result,
        '_endpointURL'    :       null
    });
    
    clazz.Result.prototype = MASCP.extend(new MASCP.Service.Result(),{
       '__class__'        :       clazz.Result
    });

    clazz.Result.prototype = MASCP.extend(clazz.Result.prototype,dataExtractor.apply({},[]));
        
    clazz.toString = function() {
        for (var serv in MASCP) {
            if (this === MASCP[serv]) {
                return "MASCP."+serv;
            }
        }
    };
    
    return clazz;
};

MASCP.cloneService = function(service,name) {
    var new_service = MASCP.buildService(function() { return this; });
    new_service.Result = service.Result;
    new_service.prototype = new service();
    MASCP[name] = new_service;
    new_service.prototype['__class__'] = new_service;
    return new_service;
};

MASCP.extend = function(in_hsh,hsh) {
    for (var i in hsh) {
        if (true) {
            in_hsh[i] = hsh[i];
        }
    }
    return in_hsh;        
};

/**
 *  @lends MASCP.Service.prototype
 *  @property   {String}  agi               AGI to retrieve data for
 *  @property   {MASCP.Service.Result}  result  Result from the query
 *  @property   {Boolean} async             Flag for using asynchronous requests - defaults to true
 */
MASCP.extend(MASCP.Service.prototype,{
  'agi'     : null,
  'result'  : null, 
  '__result_class' : null,
  'async'   : true
});


/*
 * Internal callback for new data coming in from a XHR
 * @private
 */

MASCP.Service.prototype._dataReceived = function(data,status)
{
    if (! data ) {
        return false;
    }
    var clazz = this.__result_class;
    if (data && data.error && data.error != '' && data.error !== null ) {
        bean.fire(this,'error',[data.error]);
        return false;
    }
    if (Object.prototype.toString.call(data) === '[object Array]') {
        for (var i = 0; i < data.length; i++ ) {
            arguments.callee.call(this,data[i],status);
        }
        if (i === 0) {
            this.result = new clazz();
        }
        this.result._raw_data = { 'data' : data };
    } else if ( ! this.result ) {
        var result;
        try {
            result = new clazz(data);
        } catch(err2) {
            bean.fire(this,'error',[err2]);
            return false;
        }
        if ( ! result._raw_data ) {
            result._raw_data = data;
        }
        this.result = result;
    } else {
        // var new_result = {};
        try {
            clazz.call(this.result,data);
        } catch(err3) {
            bean.fire(this,'error',[err3]);
            return false;
        }
        // for(var field in new_result) {
        //     if (true && new_result.hasOwnProperty(field)) {
        //         this.result[field] = new_result[field];
        //     }
        // }
        if (! this.result._raw_data) {
            this.result._raw_data = data;
        }
        // this.result._raw_data = data;
    }

    if (data && data.retrieved) {
        this.result.retrieved = data.retrieved;
        this.result._raw_data.retrieved = data.retrieved;
    }

    this.result.agi = this.agi;
    
    
    
    return true;
};

MASCP.Service.prototype.gotResult = function()
{
    var self = this;
    
    var reader_cache = function(thing) {
        if ( ! thing.readers ) {
            thing.readers = [];
        }
        thing.readers.push(self.toString());
    };
    
    bean.add(MASCP,'layerRegistered', reader_cache);
    bean.add(MASCP,'groupRegistered', reader_cache);
    bean.fire(self,"resultReceived");
    try {
        bean.remove(MASCP,'layerRegistered',reader_cache);
        bean.remove(MASCP,'groupRegistered',reader_cache);
    } catch (e) {
    }

    bean.fire(MASCP.Service,"resultReceived");
};

MASCP.Service.prototype.requestComplete = function()
{
    bean.fire(this,'requestComplete');
    bean.fire(MASCP.Service,'requestComplete',[this]);
};

MASCP.Service.registeredLayers = function(service) {
    var result = [];
    for (var layname in MASCP.layers) {
        if (MASCP.layers.hasOwnProperty(layname)) {
            var layer = MASCP.layers[layname];
            if (layer.readers && layer.readers.indexOf(service.toString()) >= 0) {
                result.push(layer);
            }
        }
    }
    return result;
};

MASCP.Service.registeredGroups = function(service) {
    var result = [];
    for (var nm in MASCP.groups) {
        if (MASCP.groups.hasOwnProperty(nm)) {
            var group = MASCP.groups[nm];
            if (group.readers && group.readers.indexOf(service.toString()) >= 0) {
                result.push(group);
            }            
        }
    }
    return result;  
};

/**
 *  Binds a handler to one or more events. Returns a reference to self, so this method
 *  can be chained.
 *
 *  @param  {String}    type        Event type to bind
 *  @param  {Function}  function    Handler to execute on event
 */

MASCP.Service.prototype.bind = function(type,func)
{
    bean.add(this,type,func);
    return this;
};

/**
 *  Unbinds a handler from one or more events. Returns a reference to self, so this method
 *  can be chained.
 *
 *  @param  {String}    type        Event type to unbind
 *  @param  {Function}  function    Handler to unbind from event
 */
MASCP.Service.prototype.unbind = function(type,func)
{
    bean.remove(this,type,func);
    return this;    
};

/**
 * @name    MASCP.Service#resultReceived
 * @event
 * @param   {Object}    e
 */

/**
 * @name    MASCP.Service#error
 * @event
 * @param   {Object}    e
 */

/**
 *  Asynchronously retrieves data from the remote source. When data is received, a 
 *  resultReceived.mascp event is triggered upon this service, while an error.mascp
 *  event is triggered when an error occurs. This method returns a reference to self
 *  so it can be chained.
 */
(function(base) {

var make_params = function(params) {
    var qpoints = [];
    for(var fieldname in params) {
        if (params.hasOwnProperty(fieldname)) {
            qpoints.push(fieldname +'='+params[fieldname]);
        }
    }
    return qpoints.join('&');
};

var do_request = function(request_data) {
    
    
    var datablock = null;
    
    if ( ! request_data.url ) {
        request_data.success.call(null,null);
        return;
    }

    var request = new XMLHttpRequest();
    
    if (request_data.type == 'GET' && request_data.data) {
        var index_of_quest = request_data.url.indexOf('?');

        if (index_of_quest == (request_data.url.length - 1)) {
            request_data.url = request_data.url.slice(0,-1);
            index_of_quest = -1;
        }
        var has_question =  (index_of_quest >= 0) ? '&' : '?';
        request_data.url = request_data.url.replace(/\?$/,'') + has_question + make_params(request_data.data);
    }
    request.open(request_data.type,request_data.url,request_data.async);
    if (request_data.type == 'POST') {
        request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
        datablock = make_params(request_data.data);
    }

    if (request.customUA) {
        request.setRequestHeader('User-Agent',request.customUA);
    }
    
    request.onreadystatechange = function(evt) {
        if (request.readyState == 4) {
            if (request.status == 200) {
                var data_block;
                if (request_data.dataType == 'xml') {
                    data_block = typeof(document) !== 'undefined' ? document.implementation.createDocument(null, "nodata", null) : { 'getElementsByTagName' : function() { return []; } };
                } else {
                    data_block = {};
                }
                try {
                    var text = request.responseText;
                    data_block = request_data.dataType == 'xml' ? request.responseXML || MASCP.importNode(request.responseText) : JSON.parse(request.responseText);
                } catch (e) {
                    if (e.type == 'unexpected_eos') {
                        request_data.success.call(null,{},request.status,request);
                        return;
                    } else {
                        request_data.error.call(null,{'error' : e.type || e.message, 'stack' : e });
                        return;
                    }
                }
                request_data.success.call(null,data_block,request.status,request);
                data_block = null;
            } else {
                request_data.error.call(null,request.responseText,request,request.status);
            }
        }
    };
    request.send(datablock);
};

/**
 * Private method for performing a cross-domain request using Internet Explorer 8 and up. Adapts the 
 * parameters passed, and builds an XDR object. There is no support for a locking
 * synchronous method to do these requests (that is required for Unit testing) so an alert box is used
 * to provide the locking.
 * @private
 * @param {Object} dataHash Hash with the data and settings used to build the query.
 */


var do_request_ie = function(dataHash)
{
    // Use XDR
    var xdr = new XDomainRequest();
    var loaded = false;
    var counter = 0;
    xdr.onerror = dataHash.error;
    xdr.onprogress = function() { };
    xdr.open("GET",dataHash.url+"?"+make_params(dataHash.data));
    xdr.onload = function() {
        loaded = true;
        if (dataHash.dataType == 'xml') {
            var dom = new ActiveXObject("Microsoft.XMLDOM");
            dom.async = false;
            dom.loadXML(xdr.responseText);
            dataHash.success(dom, 'success',xdr);
        } else if (dataHash.dataType == 'json') {
            var parsed = null;
            try {
                parsed = JSON.parse(xdr.responseText);
            } catch(err) {
                dataHash.error(xdr,xdr,{});           
            }
            if (parsed) {
                dataHash.success(parsed,'success',xdr);
            }
        } else {
            dataHash.success(xdr.responseText, 'success', xdr);
        }
    };
    // We can't set the content-type on the parameters here to url-encoded form data.
    setTimeout(function () {
        xdr.send();
    }, 0);
    while (! dataHash.async && ! loaded && counter < 3) {
        alert("This browser does not support synchronous requests, click OK while we're waiting for data");
        counter += 1;
    }
    if ( ! dataHash.async && ! loaded ) {
        alert("No data");
    }
};

base.retrieve = function(agi,callback)
{
    var self = this;

    MASCP.Service._current_reqs = MASCP.Service._current_reqs || 0;
    MASCP.Service._waiting_reqs = MASCP.Service._waiting_reqs || 0;
    
    if (MASCP.Service.MAX_REQUESTS) {
        var my_func = arguments.callee;
        if (MASCP.Service._current_reqs > MASCP.Service.MAX_REQUESTS) {
            MASCP.Service._waiting_reqs += 1;
            bean.add(MASCP.Service,'requestComplete',function() {
                bean.remove(this,'requestComplete',arguments.callee);
                setTimeout(function() {
                    MASCP.Service._waiting_reqs -= 1;
                    my_func.call(self,agi,callback);
                },0);
            });
            return this;
        }
    }
    if (agi) {
        this.agi = agi;
    }

    if (agi && callback) {
        this.agi = agi;
        var done_result = false;
        var done_func = function(err) {
            bean.remove(self,"resultReceived",done_func);
            bean.remove(self,"error",done_func);
            bean.remove(self,"requestComplete",done_func);
            if ( ! done_result ) {
                if (err) {
                    callback.call(self,err);
                } else {
                    callback.call(self);
                }
            }
            done_result = true;
        };
        bean.add(self,"resultReceived",done_func);
        bean.add(self,"error",done_func);
        bean.add(self,"requestComplete",done_func);
    }
    var request_data = this.requestData();
    if (! request_data ) {
        return this;
    }
        
    var default_params = {
    async:      this.async,
    url:        request_data.url || this._endpointURL,
    timeout:    5000,
    error:      function(response,req,status) {
                    MASCP.Service._current_reqs -= 1;
                    if (typeof status == 'string') {
                        status = { 'error' : status , 'request' : req };
                    }
                    bean.fire(self,"error",[status]);
                    bean.fire(MASCP.Service,'requestComplete');
                    self.requestComplete();
                    //throw "Error occurred retrieving data for service "+self._endpointURL;
                },
    success:    function(data,status,xhr) {
                    MASCP.Service._current_reqs -= 1;
                    if ( xhr && xhr.status !== null && xhr.status === 0 ) {
                        bean.fire(self,"error",[{"error": "Zero return status from request "}]);
                        self.requestComplete();
                        return;
                    }
                    if (self._dataReceived(data,status)) {
                        self.gotResult();
                    }
                    self.requestComplete();
                }
    };
    MASCP.extend(default_params,request_data);
    if (MASCP.IE) {
        do_request_ie(default_params);
    } else {
        do_request(default_params);
    }
    
    MASCP.Service._current_reqs += 1;

    return this;
};

})(MASCP.Service.prototype);

(function(clazz) {

    var get_db_data, store_db_data, search_service, clear_service, find_latest_data, data_timestamps, sweep_cache, cached_accessions, begin_transaction, end_transaction;
    
    var max_age = 0, min_age = 0;

    clazz.BeginCaching = function() {
        clazz.CacheService(clazz.prototype);
    };

    // To do 7 days ago, you do
    // var date = new Date();
    // date.setDate(date.getDate() - 1);
    // MASCP.Service.SetMinimumFreshnessAge(date);
    
    // Set the minimum age if you want nothing OLDER than this date
    clazz.SetMinimumAge = function(date) {
        if (date === 0) {
            min_age = 0;
        } else {
            min_age = date.getTime();
        }
    };

    // Set the maximum age if you want nothing NEWER than this date
    clazz.SetMaximumAge = function(date) {
        if (date === 0) {
            max_age = 0;
        } else {
            max_age = date.getTime();
        }
    };

    clazz.SweepCache = function(date) {
        if (! date) {
            date = date.getTime();
        }
        sweep_cache(date.getTime());
    };

    clazz.CacheService = function(reader) {
        if (reader.retrieve.caching) {
            return;
        }
        var _oldRetrieve = reader.retrieve;
        
        reader.retrieve = function(agi,cback) {
            var self = this;
            var id = agi ? agi : self.agi;
            if ( ! id ) {
                _oldRetrieve.call(self,id,cback);
                return self;
            }

            id = id.toLowerCase();
            self.agi = id;

            get_db_data(id,self.toString(),function(err,data) {
                if (data) {
                    if (cback) {
                        bean.add(self,"resultReceived",function() {
                            bean.remove(self,"resultReceived",arguments.callee);
                            cback.call(self);
                        });
                    }
                    if (self._dataReceived(data,"db")) {
                        self.gotResult();
                    }
                    self.requestComplete();
                } else {
                    var old_received = self._dataReceived;
                    self._dataReceived = (function() { return function(dat) {
                        var res = old_received.call(this,dat);
                        if (res && this.result && this.result._raw_data !== null) {
                            store_db_data(id,this.toString(),this.result._raw_data || {});
                        }
                        this._dataReceived = null;
                        this._dataReceived = old_received;
                        dat = {};
                        return res;
                    };})();
                    var old_url = self._endpointURL;
                    // If we have a maximum age, i.e. we don't want anything newer than a date
                    // we should not actually do a request that won't respect that.
                    // We can set a minimum age, since the latest data will be, by definition be the latest!
                    if ((max_age !== 0)) {
                        self._endpointURL = null;
                    }
                    _oldRetrieve.call(self,id,cback);
                    self._endpointURL = old_url;
                }             
            });
            return self;
        };
        reader.retrieve.caching = true;
    };

    clazz.FindCachedService = function(service,cback) {
        var serviceString = service.toString();
        search_service(serviceString,cback);
        return true;
    };

    clazz.CachedAgis = function(service,cback) {
        var serviceString = service.toString();
        cached_accessions(serviceString,cback);
        return true;
    };

    clazz.ClearCache = function(service,agi) {
        var serviceString = service.toString();
        clear_service(serviceString,agi);
        return true;
    };

    clazz.HistoryForService = function(service,cback) {
        var serviceString = service.toString();
        data_timestamps(serviceString,null,cback);
    };

    clazz.BulkOperation = function() {
        begin_transaction();
        return function() {
            end_transaction();
        };
    };

    var db;

    if (typeof module != 'undefined' && module.exports) {
        var sqlite = require('sqlite3');
        db = new sqlite.Database("cached.db");
        //db.open("cached.db",function() {});
    } else if ("openDatabase" in window) {
        try {
            db = openDatabase("cached","","MASCP Gator cache",1024*1024);
        } catch (err) {
            throw err;
        }
        db.all = function(sql,args,callback) {
            this.exec(sql,args,callback);
        };
        db.exec = function(sql,args,callback) {
            var self = this;
            var sqlargs = args;
            var cback = callback;
            if (typeof cback == 'undefined' && sqlargs && Object.prototype.toString.call(sqlargs) != '[object Array]') {
                cback = args;
                sqlargs = null;
            }
            self.transaction(function(tx) {
                tx.executeSql(sql,sqlargs,function(tx,result) {
                    var res = [];
                    for (var i = 0; i < result.rows.length; i++) {
                        res.push(result.rows.item(i));
                    }
                    if (cback) {
                        cback.call(db,null,res);
                    }
                },function(tx,err) {
                    if (cback) {
                        cback.call(db,err);
                    }
                });
            });
        };
        
    }
        
    if (typeof db != 'undefined') {

        db.all('SELECT version from versions where tablename = "datacache"',function(err,rows) { 
            var version = rows ? rows[0].version : null;
            if (version == 1.3) {
                if (MASCP.events) {
                    MASCP.events.emit('ready');            
                }
                return;                
            }
            
            if (! version || version == "" || version < 1.0 ) {
                db.exec('CREATE TABLE if not exists versions (version REAL, tablename TEXT);');
                db.exec('CREATE TABLE if not exists "datacache" (agi TEXT,service TEXT,retrieved REAL,data TEXT);',function(err) { if (err && err != "Error: not an error") { throw err; } });
                db.exec('DELETE FROM versions where tablename = "datacache"');
                db.exec('INSERT INTO versions(version,tablename) VALUES(1.1,"datacache");',function(err,rows) {
                    if ( ! err ) {
//                        console.log("Upgrade to 1.1 completed");
                    }
                });
                version = 1.1;
            }
            if (version < 1.2) {
                db.exec('DROP TABLE if exists datacache_tmp;');
                db.exec('CREATE TABLE if not exists datacache_tmp (acc TEXT,service TEXT,retrieved REAL,data TEXT);');
                db.exec('INSERT INTO datacache_tmp(acc,service,retrieved,data) SELECT agi,service,retrieved,data FROM datacache;');
                db.exec('DROP TABLE datacache;');
                db.exec('ALTER TABLE datacache_tmp RENAME TO datacache;');
                db.exec('CREATE INDEX accessions on datacache(acc);');
                db.exec('CREATE INDEX accessions_service on datacache(acc,service);');
                db.exec('DELETE FROM versions where tablename = "datacache"');
                db.exec('INSERT INTO versions(version,tablename) VALUES(1.2,"datacache");',function(err,rows) {
                    if ( ! err ) {
//                          console.log("Upgrade to 1.2 completed");
                    }
                });
                version = 1.2;
            }
            if (version < 1.3) {
                db.exec('CREATE INDEX if not exists services on datacache(service);');
                db.exec('DELETE FROM versions where tablename = "datacache"');
                db.exec('INSERT INTO versions(version,tablename) VALUES(1.3,"datacache");',function(err,rows) {
                    if ( ! err ) {
                        if (MASCP.events) {
                            MASCP.events.emit('ready');            
                        }                        
                    }
                });
                version = 1.3;                
            }
        });

        var old_get_db_data = get_db_data;
        
        begin_transaction = function() {
            get_db_data = function(id,clazz,cback) {
                 setTimeout(function() {
                     cback.call(null,null);
                 },0);
            };
            db.exec("BEGIN TRANSACTION;",function() {});
        };
        
        end_transaction = function() {
            get_db_data = old_get_db_data;
            db.exec("END TRANSACTION;",function() {});
        };
        
        sweep_cache = function(timestamp) {
            db.all("DELETE from datacache where retrieved <= ? ",[timestamp],function() {});
        };
        
        clear_service = function(service,acc) {
            var servicename = service;
            servicename += "%";
            if ( ! acc ) {
                db.all("DELETE from datacache where service like ? ",[servicename],function() {});
            } else {
                db.all("DELETE from datacache where service like ? and acc = ?",[servicename,acc.toLowerCase()],function() {});
            }
            
        };
        
        search_service = function(service,cback) {
            db.all("SELECT distinct service from datacache where service like ? ",[service+"%"],function(err,records) {
                var results = {};
                if (records && records.length > 0) {
                    records.forEach(function(record) {
                        results[record.service] = true;
                    });
                }
                var uniques = [];
                for (var k in results) {
                    if (results.hasOwnProperty(k)) {                    
                        uniques.push(k);
                    }
                }
                cback.call(MASCP.Service,uniques);
                return uniques;
            });
        };
        
        cached_accessions = function(service,cback) {
            db.all("SELECT distinct acc from datacache where service = ?",[service],function(err,records) {
                var results = [];
                for (var i = 0; i < records.length; i++ ){
                    results.push(records[i].acc);
                }
                cback.call(MASCP.Service,results);
            });
        };
        
        get_db_data = function(acc,service,cback) {
            var timestamps = max_age ? [min_age,max_age] : [min_age, (new Date()).getTime()];
            return find_latest_data(acc,service,timestamps,cback);
        };

        var insert_report_func = function(acc,service) {
            return function(err,rows) {
                if ( ! err && rows) {
//                    console.log("Caching result for "+acc+" in "+service);
                }
            };
        };

        store_db_data = function(acc,service,data) {
            if (typeof data != 'object' || (((typeof Document) != 'undefined') && data instanceof Document)) {
                return;
            }
            var str_rep;
            try {
                str_rep = JSON.stringify(data);
            } catch (err) {
                return;
            }
            var dateobj = data.retrieved ? data.retrieved : (new Date());
            if (typeof dateobj == 'string') {
                dateobj = new Date();
            }
            dateobj.setUTCHours(0);
            dateobj.setUTCMinutes(0);
            dateobj.setUTCSeconds(0);
            dateobj.setUTCMilliseconds(0);
            var datetime = dateobj.getTime();
            data = {};
            db.all("INSERT INTO datacache(acc,service,retrieved,data) VALUES(?,?,?,?)",[acc,service,datetime,str_rep],insert_report_func(acc,service));
        };
        find_latest_data = function(acc,service,timestamps,cback) {
            var sql = "SELECT * from datacache where acc=? and service=? and retrieved >= ? and retrieved <= ? ORDER BY retrieved DESC LIMIT 1";
            var args = [acc,service,timestamps[0],timestamps[1]];            
            db.all(sql,args,function(err,records) {
                if (records && records.length > 0 && typeof records[0] != "undefined") {
                    var data = typeof records[0].data === 'string' ? JSON.parse(records[0].data) : records[0].data;
                    if (data) {
                        data.retrieved = new Date(records[0].retrieved);
                    }
                    cback.call(null,null,data);
                } else {
                    cback.call(null,null,null);
                }
            });
        };
        
        data_timestamps = function(service,timestamps,cback) {
            if (! timestamps || typeof timestamps != 'object' || ! timestamps.length ) {
                timestamps = [0,(new Date()).getTime()];
            }
            var sql = "SELECT distinct retrieved from datacache where service=? and retrieved >= ? and retrieved <= ? ORDER BY retrieved ASC";
            var args = [service,timestamps[0],timestamps[1]];
            db.all(sql,args,function(err,records) {
                var result = [];
                if (records && records.length > 0 && typeof records[0] != "undefined") {
                    for (var i = records.length - 1; i >= 0; i--) {
                        result.push(new Date(records[i].retrieved));
                    }
                }
                cback.call(null,result);
            });            
        };
        
    } else if ("localStorage" in window) {
        
        sweep_cache = function(timestamp) {
            if ("localStorage" in window) {
                var keys = [];
                for (var i = 0, len = localStorage.length; i < len; i++) {
                    keys.push(localStorage.key(i));
                }
                var key = keys.shift();
                while (key) {
                    if (new RegExp("^MASCP.*").test(key)) {
                        var data = localStorage[key];
                        if (data && typeof data === 'string') {
                            var datablock = JSON.parse(data);
                            datablock.retrieved = timestamp;
                            localStorage.removeItem(key);
                        }
                    }
                    key = keys.shift();
                }
            }
        };
        
        clear_service = function(service,acc) {
            if ("localStorage" in window) {
                var keys = [];
                for (var i = 0, len = localStorage.length; i < len; i++) {
                    keys.push(localStorage.key(i));
                }
                var key = keys.shift();
                while (key) {
                    if ((new RegExp("^"+service+".*"+(acc?"#"+acc.toLowerCase()+"$" : ""))).test(key)) {
                        localStorage.removeItem(key);
                        if (acc) {
                            return;
                        }
                    }
                    key = keys.shift();
                }
            }            
        };
        
        search_service = function(service,cback) {
            var results = {};
            if ("localStorage" in window) {
                var key;
                var re = new RegExp("^"+service+".*");
                for (var i = 0, len = localStorage.length; i < len; i++){
                    key = localStorage.key(i);
                    if (re.test(key)) {                        
                        results[key.replace(/\.#.*$/g,'')] = true;
                    }
                }
            }

            var uniques = [];
            for (var k in results) {
                if (results.hasOwnProperty(k)) {
                    uniques.push(k);
                }
            }

            cback.call(clazz,uniques);

            return uniques;
        };

        cached_accessions = function(service,cback) {
            if ("localStorage" in window) {
                var key;
                var re = new RegExp("^"+service);
                for (var i = 0, len = localStorage.length; i < len; i++){
                    key = localStorage.key(i);
                    if (re.test(key)) {
                        key = key.replace(service,'');
                        results[key] = true;
                    }
                }
            }

            var uniques = [];
            for (var k in results) {
                if (results.hasOwnProperty(k)) {
                    uniques.push(k);
                }
            }

            cback.call(clazz,uniques);
        };

        get_db_data = function(acc,service,cback) {
            var data = localStorage[service.toString()+".#"+(acc || '').toLowerCase()];
            if (data && typeof data === 'string') {
                var datablock = JSON.parse(data);
                datablock.retrieved = new Date(datablock.retrieved);
                cback.call(null,null,datablock);
            } else {
                cback.call(null,null,null);
            }
            
        };
        
        store_db_data = function(acc,service,data) {
            if (data && (typeof data !== 'object' || data instanceof Document || data.nodeName)){
                return;
            }
            data.retrieved = (new Date()).getTime();
            localStorage[service.toString()+".#"+(acc || '').toLowerCase()] = JSON.stringify(data);
        };

        find_latest_data = function(acc,service,timestamp,cback) {
            // We don't actually retrieve historical data for this
            return get_db_data(acc,service,cback);
        };

        data_timestamps = function(service,timestamp,cback) {
            cback.call(null,[]);
        };
        
        begin_transaction = function() {
            // No support for transactions here. Do nothing.
        };
        end_transaction = function() {
            // No support for transactions here. Do nothing.
        };
    } else {
        sweep_cache = function(timestamp) {
        };
        
        clear_service = function(service,acc) {
        };
        
        search_service = function(service,cback) {
        };

        cached_accessions = function(service,cback) {
            cback.call(clazz,[]);
        };

        get_db_data = function(acc,service,cback) {
            cback.call(null,null,null);
        };
        
        store_db_data = function(acc,service,data) {
        };

        find_latest_data = function(acc,service,timestamp,cback) {
            // We don't actually retrieve historical data for this
            cback.call(null,[]);
        };

        data_timestamps = function(service,timestamp,cback) {
            cback.call(null,[]);
        };
        
        begin_transaction = function() {
            // No support for transactions here. Do nothing.
        };
        end_transaction = function() {
            // No support for transactions here. Do nothing.
        };
    }
    
    
    

})(MASCP.Service);

/**
 * Set the async parameter for this service.
 * @param {Boolean} asyncFlag   Asynchronous flag - true for asynchronous action, false for asynchronous
 * @returns Reference to self
 * @type MASCP.Service.prototype
 */
MASCP.Service.prototype.setAsync = function(asyncFlag)
{
    this.async = asyncFlag;
    return this;
};

/**
 *  Get the parameters that will be used to build this request. Implementations of services will
 *  override this method, returning the parameters to be used to build the XHR.
 */

MASCP.Service.prototype.requestData = function()
{
    
};

MASCP.Service.prototype.toString = function()
{
    for (var clazz in MASCP) {
        if (this.__class__ == MASCP[clazz]) {
            return "MASCP."+clazz;
        }
    }
};

/**
 * For this service, register a sequence rendering view so that the results can be marked up directly
 * on to a sequence. This method will do nothing if the service does not know how to render the 
 * results onto the sequence.
 * @param {MASCP.SequenceRenderer} sequenceRenderer Sequence renderer object to render results upon
 */
MASCP.Service.prototype.registerSequenceRenderer = function(sequenceRenderer)
{
    if (this.setupSequenceRenderer) {
        this.renderers = this.renderers || [];
        this.setupSequenceRenderer(sequenceRenderer);        
        this.renderers.push(sequenceRenderer);
    }
    return this;
};

/**
 * For this service, set up a sequence renderer so that the events are connected up with receiving data.
 * This method should be overridden to wire up the sequence renderer to the service.
 * @param {MASCP.SequenceRenderer} sequenceRenderer Sequence renderer object to render results upon
 */
MASCP.Service.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    return this;
};


/**
 *  Move a node from an externally retrieved document into this current document.
 *  @static
 *  @param  {Node}  externalNode    Node from XHR data source that is to be imported into the current document.
 */
MASCP.Service.importNode = function(external_node)
{
    if (typeof document == 'undefined') {
        return external_node;
    }
    var new_data;    
    if (typeof external_node == 'string') {
        new_data = document.createElement('div');
        new_data.innerHTML = external_node;
        return new_data.firstChild;        
    }
    
    if ( document.importNode ) {
        return document.importNode(external_node,true);
    } else {
        new_data = document.createElement('div');
        new_data.innerHTML = external_node.xml;
        return new_data.firstChild;
    }    
};

/** Default constructor
 *  @class  Super-class for all results from MASCP services.
 */
MASCP.Service.Result = function()
{  
};

MASCP.Service.Result.prototype = {
    agi     :   null,
    reader  :   null
};


MASCP.Service.Result.prototype.render = function() {
//    return window.jQuery('<span>Result received for '+this.agi+'</span>');
};
/**
 * @fileOverview    Classes for reading data from TAIR database
 */

if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}



/** Default class constructor
 *  @class      Service class that will retrieve sequence data for a given AGI from a given ecotype
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.AccessionReader = MASCP.buildService(function(data) {
                        this._data = data || { 'data' : ['',''] };
                        return this;
                    });

MASCP.AccessionReader.SERVICE_URL = 'http://gator.masc-proteomics.org/tair.pl';

MASCP.AccessionReader.prototype.requestData = function()
{
    var self = this;
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'   : this.agi,
                'accession' : this.accession,
                'service' : 'tair' 
        }
    };
};

MASCP.AccessionReader.Result.prototype.getDeletions = function() {
    /* This doesn't work any more */
    return [];
    /*
    var old_sequence = this.reader.reference;

    var new_sequence = this.getSequence();

    var diffs = (new diff_match_patch()).diff_main(old_sequence,new_sequence);
    var deletions = [];
    var last_index = 1;
    for (var i = 0; i < diffs.length; i++ ){
        if (i > 0 && diffs[i-1][0] <= 0) {
            last_index += diffs[i-1][1].length;
        }
        if (diffs[i][0] == -1) {
            deletions.push(last_index);
            var length = diffs[i][1].length - 1;
            while (length > 0) {
                deletions.push(last_index + length);
                length -= 1;
            }
        }
    }
    return deletions;
    */
};

MASCP.AccessionReader.prototype.setupSequenceRenderer = function(renderer) {
    var reader = this;
    this.bind('resultReceived', function() {

        var accessions = reader.accession.split(',');
        
        
        var an_accession = accessions.shift();
        var a_result = reader.result.length ? reader.result.shift() : reader.result;

        MASCP.registerGroup('all_insertions');
        MASCP.registerGroup('all_deletions');
        renderer.registerLayer('insertions',{'fullname' : 'Accession','color' : '#ff0000'});

        if (renderer.createGroupController) {
            renderer.createGroupController('insertions','all_insertions');
        }
        console.log(a_result);
        
        while(a_result) {
            var old_sequence = renderer.sequence;
            var new_sequence = a_result.getSequence();

            var diffs = (new diff_match_patch()).diff_main(old_sequence,new_sequence);
            var last_index = 1;
            var ins = [];
            var outs = [];

            if (diffs.length <= 1) {
                a_result = reader.result.length ? reader.result.shift() : null;
                an_accession = accessions.shift();
                continue;
            }


            var in_layer = 'all_'+an_accession;

            renderer.registerLayer(in_layer, {'fullname' : an_accession, 'group' : 'all_insertions' });

            var i;
            for (i = diffs.length - 1; i >= 0; i-- ){
                if (i > 0 && diffs[i-1][0] <= 0) {
                    last_index += diffs[i-1][1].length;
                    if (last_index > renderer.sequence.length) {
                        last_index = renderer.sequence.length;
                    }
                }
                if (diffs[i][0] == -1) {
                    outs.push( { 'index' : last_index, 'delta' : diffs[i][1] });
                }
                if (diffs[i][0] == 1) {
                    ins.push( { 'insertBefore' : last_index, 'delta' : diffs[i][1] });
                }
            }
            for (i = ins.length - 1; i >= 0; i-- ) {
                renderer.getAA(ins[i].insertBefore - 1).addAnnotation(in_layer,1, { 'border' : 'rgb(150,0,0)', 'content' : ins[i].delta });
                renderer.getAA(ins[i].insertBefore - 1).addAnnotation('insertions',1, { 'border' : 'rgb(150,0,0)', 'content' : ins[i].delta });
            }
        
            for (i = outs.length - 1; i >= 0; i--) {
                renderer.getAA(outs[i].index).addAnnotation(in_layer,1, {'angle' : 90, 'border' : 'rgb(0,0,150)', 'content' : outs[i].delta });
                renderer.getAA(outs[i].index).addAnnotation('insertions',1, {'angle' : 90, 'border' : 'rgb(0,0,150)', 'content' : outs[i].delta });
            }
            
            a_result = reader.result.length ? reader.result.shift() : null;
            an_accession = accessions.shift();            
        }
        
    });
};

MASCP.AccessionReader.Result.prototype.getDescription = function() {
    return this._data.data[1];
};

MASCP.AccessionReader.Result.prototype.getSequence = function() {    
    return (typeof(this._data) == 'object' && this._data.length) ? this._data[0].data[2] : this._data.data[2];
};

/** @fileOverview   Classes for reading data from the ArbitraryData database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from ArbitraryData for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.ArbitraryDataReader = MASCP.buildService(function(data) {
                        this._raw_data = data;
                        return this;
                    });

MASCP.ArbitraryDataReader.SERVICE_URL = 'http://gator.masc-proteomics.org/datasets.pl?';

MASCP.ArbitraryDataReader.prototype.requestData = function()
{
    var agi = this.agi;
    var dataset = this._dataset();
    if (dataset) {
        return {
            type: "GET",
            dataType: "json",
            data: { 'agi'       : agi,
                    'dataset'   : dataset,
                    'service'   : 'ArbitraryData' 
            }
        };
    } else {
        return {
            type: "GET",
            dataType: "json",
            data: {'service' : 'ArbitraryData'}
        };
    }
};

MASCP.ArbitraryDataReader.prototype._extend = function(setName)
{
    if (this === null || typeof(this) != 'object' || typeof(setName) === 'undefined' || ! setName ) {
        return this;
    }

    var temp = new MASCP.ArbitraryDataReader(); // changed

    temp._endpointURL = this._endpointURL;
    temp.agi = this.agi;
    
    temp.toString = function() {
        var curr_name = MASCP.Service.prototype.toString.call(temp);
        return curr_name+"."+setName;
    };
    
    temp._dataset = function() {
        return setName;
    };
    temp.layer = function() {
        return "arbitrary_"+setName;
    };
    
    return temp;
};

MASCP.ArbitraryDataReader.prototype._dataset = function()
{
    return null;
};

MASCP.ArbitraryDataReader.prototype.retrieve = function(in_agi,cback)
{
    var self = this;
    var agi = this.agi || in_agi;
    
    
    if (agi && this._dataset()) {
        MASCP.Service.prototype.retrieve.call(self,in_agi,cback);
        return;        
    }
    
    // If we are just doing a call, defer the rest of the retrieve
    // until the server datasets are loaded.
    
    if ((! this._SERVER_DATASETS) && agi && agi != "dummy") {
        var read = new MASCP.ArbitraryDataReader("",self._endpointURL);
        read.retrieve("dummy",function() {
            if (this.result) {
                self._SERVER_DATASETS = this.result._raw_data.data;
            } else {
                self._SERVER_DATASETS = [];
            }
            self.retrieve(in_agi,cback);
        });
        return;
    }
    
    // Populate the server datasets if there is no accession given and
    // we don't have the server datasets retrieved already for this object
    
    if ( ! this._SERVER_DATASETS ) {
        MASCP.Service.FindCachedService(self.toString(),function(services) {
            // If we're on the server side, we should have the list
            // of services cached.
            if (services.length >= 0) {
                var datasets = [];
                services.forEach(function(service) {
                    datasets.push(service.replace(self.toString()+".",""))
                });
                self._SERVER_DATASETS = datasets;
                self.result = {};
                self.result._raw_data = { 'data' : datasets };
            }
            
            //If we are requesting from a remote source, remove the current
            //cached results
            if (self._endpointURL && self._endpointURL.length) {
                MASCP.Service.ClearCache(self);
            }
            //Make the request to the server to get the datasets
            //Put a dummy agi in so that the callback is called if
            //this is being run on a server with no datasets.
            //This will trigger the execution of the callback.
            MASCP.Service.prototype.retrieve.call(self,"dummy",cback);
        });
        return;
    }
    if (this._SERVER_DATASETS.length == 0){
        MASCP.Service.prototype.retrieve.call(self,"dummy",cback);
        (self.renderers || []).forEach(function(rrend) {
            jQuery(rrend).trigger('resultsRendered',[self]);
        });
        return;
    }
    this._SERVER_DATASETS.forEach(function(set) {
        var reader = self._extend(set);
        (self.renderers || []).forEach(function(rrend) {
            reader.setupSequenceRenderer(rrend);
            rrend.bind('resultsRendered',function(e,rdr) {
                if (rdr == reader) {
                    jQuery(rrend).trigger('resultsRendered',[self]);
                }
            });
        });
        reader.bind('resultReceived',function() {
            self.gotResult();
        })
        reader.bind('requestComplete',function() {
            self.requestComplete();
        });
        reader.retrieve(agi,cback);
    });
};

/**
 *  @class   Container class for results from the ArbitraryData service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.ArbitraryDataReader.Result = MASCP.ArbitraryDataReader.Result;

/** Retrieve the peptides for this particular entry from the ArbitraryData service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.ArbitraryDataReader.Result.prototype.getPeptides = function()
{
    var content = null;

    if (this._peptides) {
        return this._peptides;
    }

    if (! this._raw_data || ! this._raw_data.data ) {
        return [];
    }

    return this._raw_data.data;
};

MASCP.ArbitraryDataReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;


    if (! this._dataset()) {
        return;
    }

    var css_block = '.active .overlay { background: #ff5533; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';


    this.bind('resultReceived', function() {
                
        var peps = this.result.getPeptides();
        if (peps.length <= 0) {
            jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
            return;
        }
        MASCP.registerGroup('arbitrary_datasets', {'fullname' : 'Other data', 'color' : '#ff5533' });
        MASCP.registerLayer('arbitrary_controller',{ 'fullname' : 'Other data', 'color' : '#ff5533', 'css' : css_block });

        var overlay_name = this.layer();
        MASCP.registerLayer(overlay_name,{ 'group' : 'arbitrary_datasets', 'fullname' : this._dataset(), 'color' : this.result._raw_data.color || '#ff5533', 'css' : css_block });
        
        if (this.result._raw_data.url) {
            MASCP.getLayer(overlay_name).href = this.result._raw_data.url;
        }
        
        for(var i = 0; i < peps.length; i++) {
            var peptide = peps[i], peptide_bits;
            if (typeof peptide == 'string') {
                peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);                
                peptide_bits.addToLayer(overlay_name);
            } else if (peptide.length == 2) {
                sequenceRenderer.getAA(peptide[0]).addBoxOverlay(overlay_name,peptide[1]-peptide[0]);
            }
        }
        
        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('arbitrary_controller','arbitrary_datasets');
        }
        
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.ArbitraryDataReader.Result.prototype.render = function()
{
};/** @fileOverview   Classes for reading data from the AtChloro database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from AtChloro for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.AtChloroReader = MASCP.buildService(function(data) {
                        this._raw_data = data;                        
                        return this;
                    });

MASCP.AtChloroReader.SERVICE_URL = 'http://prabi2.inrialpes.fr/at_chloro/annotation/';

MASCP.AtChloroReader.prototype.requestData = function()
{
    var agi = this.agi;
    
    return {
        type: "GET",
        url: this._endpointURL + agi.toUpperCase(),
        dataType: "json",
        data: { 'agi'       : agi.toUpperCase(),
                'service'   : 'atchloro' 
        }
    };
};


/**
 *  @class   Container class for results from the AtChloro service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.AtChloroReader.Result = MASCP.AtChloroReader.Result;

/** Retrieve the peptides for this particular entry from the AtChloro service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.AtChloroReader.Result.prototype.getPeptides = function()
{
    var content = null;

    if (this._peptides) {
        return this._peptides;
    }

    this._long_name_map = {};
    
    if (! this._raw_data || ! this._raw_data.peptides ) {
        return [];
    }

        
    var peptides = [];
    
    for (var i = 0; i < this._raw_data.peptides.length; i++ ) {
        var a_peptide = this._raw_data.peptides[i];
        var the_pep = { 'sequence' : this._cleanSequence(a_peptide.sequence) };
        peptides.push(the_pep);
    }
    this._peptides = peptides;
    return peptides;
};

MASCP.AtChloroReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.AtChloroReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    var css_block = '.active .overlay { background: #55ff33; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';
    

    this.bind('resultReceived', function() {
        var peps = this.result.getPeptides();
        if (peps.length > 0) {
            MASCP.registerLayer('atchloro_experimental',{ 'fullname' : 'AT_CHLORO MS/MS', 'color' : '#55ff33', 'css' : css_block });
            MASCP.getLayer('atchloro_experimental').href = 'http://prabi2.inrialpes.fr/at_chloro/protein/'+reader.agi.toUpperCase();
        }
        for(var i = 0; i < peps.length; i++) {
            var peptide = peps[i].sequence;
            var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
            peptide_bits.addToLayer('atchloro_experimental');
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.AtChloroReader.Result.prototype.render = function()
{
    if (this.getPeptides().length > 0) {
        var a_container = jQuery('<div>MS/MS spectra <input class="group_toggle" type="checkbox"/>AtChloro</div>');
        jQuery(this.reader.renderers).each(function(i){
            this.createGroupCheckbox('atchloro_experimental',jQuery('input.group_toggle',a_container));
        });
        return a_container;
    } else {
        return null;
    }
};/** @fileOverview   Classes for reading data from the AtPeptide database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from AtPeptide for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.AtPeptideReader = MASCP.buildService(function(data) {
                        this._raw_data = data;                        
                        return this;
                    });

MASCP.AtPeptideReader.SERVICE_URL = 'http://gator.masc-proteomics.org/atpeptide.pl?';

MASCP.AtPeptideReader.prototype.requestData = function()
{
    var agi = this.agi;
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'atpeptide' 
        }
    };
};

/**
 * The list of tissue names that are used by AtPeptide for this particular AGI
 *  @returns {[String]} Tissue names
 */
MASCP.AtPeptideReader.Result.prototype.tissues = function()
{
    return this._tissues;
};

/**
 *  @class   Container class for results from the AtPeptide service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.AtPeptideReader.Result = MASCP.AtPeptideReader.Result;

/** Retrieve the peptides for this particular entry from the AtPeptide service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.AtPeptideReader.Result.prototype.getPeptides = function()
{
    var content = null;

    if (this._peptides) {
        return this._peptides;
    }

    this._tissues = [];
    this.spectra = {};
    this._long_name_map = {};
    
    if (! this._raw_data || ! this._raw_data.peptides ) {
        return [];
    }

        
    var peptides = [];
    var toString = function() {
        return this.sequence;
    };
    
    for (var i = this._raw_data.peptides.length - 1; i >= 0; i-- ) {
        var a_peptide = this._raw_data.peptides[i];
        var the_pep = { 'sequence' : this._cleanSequence(a_peptide.sequence), 'tissues' : [] };
        the_pep.toString = toString;
        peptides.push(the_pep);
        for (var j = a_peptide.tissues.length - 1; j >= 0 ; j-- ) {
            var a_tissue = a_peptide.tissues[j];
            if ( this._tissues.indexOf(a_tissue['PO:tissue']) < 0 ) {
                var some_tiss = a_tissue['PO:tissue'];
                this._tissues.push(some_tiss);
                some_tiss.long_name = a_tissue.tissue;
                this._long_name_map[some_tiss] = a_tissue.tissue;
            }
            the_pep.tissues.push(a_tissue['PO:tissue']);
            if ( ! this.spectra[a_tissue['PO:tissue']]) {
                this.spectra[a_tissue['PO:tissue']] = 0;
            }
            this.spectra[a_tissue['PO:tissue']] += 1;
        }

    }
    this._peptides = peptides;
    return peptides;
};

MASCP.AtPeptideReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.AtPeptideReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    this.bind('resultReceived', function() {

        MASCP.registerGroup('atpeptide_experimental', {'fullname' : 'AtPeptide MS/MS', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#ff5533' });

        var overlay_name = 'atpeptide_controller';

        var css_block = '.active .overlay { background: #ff5533; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';

        MASCP.registerLayer(overlay_name,{ 'fullname' : 'AtPeptide MS/MS', 'color' : '#ff5533', 'css' : css_block });

        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('atpeptide_controller','atpeptide_experimental');
        }
                
        var peps = this.result.getPeptides();
        for (var j = 0; j < this.result.tissues().length; j++ ) {
            var a_tissue = this.result.tissues()[j];
            MASCP.registerLayer('atpeptide_peptide_'+a_tissue, { 'fullname': this.result._long_name_map[a_tissue], 'group' : 'atpeptide_experimental', 'color' : '#ff5533', 'css' : css_block });
            for(var i = 0; i < peps.length; i++) {
                var peptide = peps[i].sequence;
                if ( peps[i].tissues.indexOf(a_tissue+'') < 0 ) {
                    continue;
                }
                var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
                var layer_name = 'atpeptide_peptide_'+a_tissue;
                peptide_bits.addToLayer(layer_name);
                peptide_bits.addToLayer(overlay_name);
            }
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.AtPeptideReader.Result.prototype.render = function()
{
    if (this.getPeptides().length > 0) {
        var a_container = jQuery('<div>MS/MS spectra <input class="group_toggle" type="checkbox"/>AtPeptide</div>');
        jQuery(this.reader.renderers).each(function(i){
            this.createGroupCheckbox('atpeptide_experimental',jQuery('input.group_toggle',a_container));
        });
        return a_container;
    } else {
        return null;
    }
};/** @fileOverview   Classes for reading data from the AtPeptide database
 */
if ( typeof MASCP === 'undefined' || typeof MASCP.Service === 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from AtPeptide for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.GelMapReader = MASCP.buildService(function(data) {
                        this._raw_data = data;
                        if (! data) {
                            return this;
                        }
                        if ( ! data.Maps ) {
                            return this;
                        }
                        var maps = [];
                        for (var i = data.Maps.length - 1; i >= 0; i--) {
                            var map = data.Maps[i];
                            map.sequence = "";
                            maps.push(map);
                        }
                        this.maps = maps;
                        return this;
                    });

MASCP.GelMapReader.SERVICE_URL = 'http://gelmap.de/gator2.php?';

MASCP.GelMapReader.prototype.requestData = function()
{
    var agi = this.agi.toUpperCase();
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'gelmap' 
        }
    };
};

/**
 *  @class   Container class for results from the service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.GelMapReader.Result = MASCP.GelMapReader.Result;

/** Retrieve the peptides for this particular entry from the service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.GelMapReader.Result.prototype.getPeptides = function()
{
    var content = null;

    if (this._peptides) {
        return this._peptides;
    }
    
    
    this._peptides = peptides;
    
    return peptides;
};

MASCP.GelMapReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.GelMapReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;
    MASCP.registerGroup('gelmap_experimental', {'fullname' : 'GelMap', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#aaaaff' });

    var controller_name = 'gelmap_controller';

    var css_block = '.active .overlay { background: #ff5533; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';
    
    MASCP.registerLayer(controller_name,{ 'fullname' : 'GelMap', 'color' : '#aaaaff', 'css' : css_block });

    if (sequenceRenderer.createGroupController) {
        sequenceRenderer.createGroupController('gelmap_controller','gelmap_experimental');
    }

    var sort_unique = function(arr) {
        arr = arr.sort(function (a, b) { return a*1 - b*1; });
        var ret = [arr[0]];
        for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
            if (arr[i-1] !== arr[i]) {
                ret.push(arr[i]);
            }
        }
        return ret;
    };

    this.bind('resultReceived', function() {
        for (var maps = this.result.maps, j = maps.length - 1; j >= 0; j--) {
            var a_map = maps[j];
            MASCP.registerLayer('gelmap_map_'+a_map.id, { 'fullname': a_map.title, 'group' : 'gelmap_experimental', 'color' : '#aaaaff', 'css' : css_block });
            MASCP.getLayer('gelmap_map_'+a_map.id).href = a_map.url;
            var peps = sort_unique(maps[j].peptides);

            for(var i = peps.length - 1; i >= 0; i--) {
                var peptide = peps[i];
                var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
                var layer_name = 'gelmap_map_'+a_map.id;
                peptide_bits.addToLayer(layer_name);
                peptide_bits.addToLayer(controller_name);
            }
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.GelMapReader.Result.prototype.render = function()
{
};
/** @fileOverview   Classes for reading domains from Interpro 
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from Interpro for a given AGI.
 *              Data is transferred using XML.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.InterproReader = MASCP.buildService(function(data) {
                        if (data) {
                            if (! this._raw_data && ! data.data ) {
                                this._raw_data = { 'data' : [] };
                                this._raw_data.data.push(data);
                            } else {
                                this._raw_data = data;
                            }
                        }
                        return this;
                    });

MASCP.InterproReader.SERVICE_URL = 'http://gator.masc-proteomics.org/interpro.pl?';

MASCP.InterproReader.prototype.requestData = function()
{    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : this.agi,
                'service'   : 'interpro' 
        }
    };
};

/* We need to ensure that the sequence is populated before the retrieve */

(function() {
var old_retrieve = MASCP.InterproReader.prototype.retrieve;
MASCP.InterproReader.prototype.retrieve = function(agi,func) {
    var self = this;
    if ( ! this.agi ) {
        this.agi = agi;
    }
    var self_func = arguments.callee;
    var cback = func;
    if ( this.sequence === null || typeof this.sequence == 'undefined' ) {
        (new MASCP.TairReader(self.agi)).bind('resultReceived',function() {
            self.sequence = this.result.getSequence() || '';
            self_func.call(self,self.agi,cback);
        }).bind('error',function(err) { self.trigger('error',[err]); }).retrieve();
        return this;
    }
    if (old_retrieve !== MASCP.Service.prototype.retrieve) {
        old_retrieve = MASCP.Service.prototype.retrieve;
    }
    old_retrieve.call(self,self.agi,cback);
    return this;
};
})();

/**
 *  @class   Container class for results from the Interpro service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.InterproReader.Result = MASCP.InterproReader.Result;


/** Retrieve the peptides for this particular entry from the Interpro service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.InterproReader.Result.prototype.getDomains = function()
{
    var content = null;
    
    if (! this._raw_data || this._raw_data.data.length === 0 ) {
        return {};
    }    
    
    if (this._peptides_by_domain) {
        return this._peptides_by_domain;
    }
    
    var peptides_by_domain = {};
    var domain_descriptions = {};
    var datablock = this._raw_data.data;
    for (var i = 0; i < datablock.length; i++ ) {
        var peptides = peptides_by_domain[datablock[i].interpro] || [];
        peptides.push(this.sequence.substring(datablock[i].start, datablock[i].end));
        domain_descriptions[datablock[i].interpro] = datablock[i].description;
        peptides_by_domain[datablock[i].interpro] = peptides;
    }
    
    this._peptides_by_domain = peptides_by_domain;
    return peptides_by_domain;
};

MASCP.InterproReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    this.bind('resultReceived', function() {
        var agi = this.agi;
        
        MASCP.registerGroup('interpro_domains', {'fullname' : 'Interpro domains', 'color' : '#000000' });

        var overlay_name = 'interpro_controller';

        var css_block = '.active .overlay { background: #000000; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';

        MASCP.registerLayer(overlay_name,{ 'fullname' : 'Interpro domains', 'color' : '#000000', 'css' : css_block });

        MASCP.getLayer('interpro_controller').href = '';
        this.result.sequence = sequenceRenderer.sequence;
        var domains = this.result.getDomains();
        for (var dom in domains) {            
            if (domains.hasOwnProperty(dom)) {
                var domain = null;
                domain = dom;
                var lay = MASCP.registerLayer('interpro_domain_'+domain, { 'fullname': domain, 'group' : 'interpro_domains', 'color' : '#000000', 'css' : css_block });
                lay.href = "http://www.ebi.ac.uk/interpro/IEntry?ac="+domain;
                var peptides = domains[domain];
                for(var i = 0; i < peptides.length; i++ ) {
                    var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptides[i]);
                    var layer_name = 'interpro_domain_'+domain;
                    peptide_bits.addToLayer(layer_name);
                    peptide_bits.addToLayer(overlay_name);
                }
            }
        }
        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('interpro_controller','interpro_domains');
        }

        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);        

    });
    return this;
};

MASCP.InterproReader.Result.prototype.render = function()
{
};/** @fileOverview   Classes for reading data from the P3db database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from P3DB for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.P3dbReader = MASCP.buildService(function(data) {
                        this._raw_data = data;                        
                        return this;
                    });

MASCP.P3dbReader.SERVICE_URL = 'http://p3db.org/gator.php?';

MASCP.P3dbReader.prototype.requestData = function()
{
    var agi = this.agi.toLowerCase();
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'p3db' 
        }
    };
};


/**
 *  @class   Container class for results from the P3DB service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.P3dbReader.Result = MASCP.P3dbReader.Result;

/** Retrieve the peptides for this particular entry from the P3db service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.P3dbReader.Result.prototype.getPeptides = function()
{
    if (this._peptides) {
        return this._peptides;
    }

    this._long_name_map = {};
    
    if (! this._raw_data || ! this._raw_data.peptides ) {
        return [];
    }

        
    var peptides = [];
    
    for (var i = 0; i < this._raw_data.peptides.length; i++ ) {
        var a_peptide = this._raw_data.peptides[i];
        var the_pep = { 'sequence' : this._cleanSequence(a_peptide) };
        peptides.push(the_pep);
    }
    this._peptides = peptides;
    return peptides;
};

MASCP.P3dbReader.Result.prototype.getOrthologousPeptides = function(organism)
{
    var self = this;
    if ( ! this._raw_data.orthologs) {
        return [];
    }
    var peptides = [];
    this._raw_data.orthologs.forEach(function(orth) {
        if (orth.organism === organism && orth.peptides) {
            for (var i = 0; i < orth.peptides.length; i++ ) {
                var a_peptide = orth.peptides[i];
                var the_pep = { 'sequence' : self._cleanSequence(a_peptide) };
                peptides.push(the_pep);
            }
        }
    });
    return peptides;
};

MASCP.P3dbReader.Result.prototype.getOrganisms = function()
{
    var self = this;
    if ( ! this._raw_data.orthologs) {
        return [];
    }
    var organisms = [];
    this._raw_data.orthologs.forEach(function(orth) {
        organisms.push({ 'id' : orth.organism, 'name' : orth.name });
    });
    return organisms;
};


MASCP.P3dbReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.P3dbReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    var color = '#5533ff';
    
    MASCP.registerGroup('p3db_experimental', {'fullname' : 'P3DB (mod)', 'color' : color });

    this.bind('resultReceived', function() {
        var res = this.result;
        var peps = res.getPeptides();
        if (peps.length > 0) {
            MASCP.registerLayer('p3db_controller',{ 'fullname' : 'P3DB (mod)', 'color' : color });
        }
        for(var i = 0; i < peps.length; i++) {
            var peptide = peps[i].sequence;
            var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
            peptide_bits.addToLayer('p3db_controller');
        }
        res.getOrganisms().forEach(function(organism) {
            if (organism.id === 3702) {
                return;
            }
            var layer_name = 'p3db_tax_'+organism.id;
            var peps = res.getOrthologousPeptides(organism.id);
            if (peps.length > 0) {
                MASCP.registerLayer(layer_name,{ 'fullname' : organism.name, 'group' : 'p3db_experimental', 'color' : color });
            }
            for(var i = 0; i < peps.length; i++) {
                var peptide = peps[i].sequence;
                var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
                peptide_bits.addToLayer(layer_name);
            }
        });
        
        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('p3db_controller','p3db_experimental');
        }        
        
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.P3dbReader.Result.prototype.render = function()
{
};/**
 *  @fileOverview Classes for reading data from the Pep2Pro database using JSON data
 */

/**
 * @class   Service class that will retrieve Pep2Pro data for this entry given an AGI.
 *          Data is received in JSON format.
 * @description Default class constructor
 * @param   {String} agi            Agi to look up
 * @param   {String} endpointURL    Endpoint URL for this service
 * @extends MASCP.Service
 */
 
/*
+------------+-----------------+
| poid       | pocv            |
+------------+-----------------+
| PO:0000005 | cell suspension |
| PO:0009046 | flower          |
| PO:0000056 | floral bud      |
| PO:0020030 | cotyledon       |
| PO:0006339 | juvenile leaf   |
| PO:0009010 | seed            |
| PO:0009005 | root            |
| PO:0009030 | carpel          |
| PO:0009001 | silique         |
| PO:0009006 | shoot           |
| PO:0020091 | pollen          |
| PO:0009025 | leaf            |
+------------+-----------------+
*/ 
MASCP.Pep2ProReader = MASCP.buildService(function(data) {
                        this._raw_data = data;
                        if (data) {
                            this._populate_spectra(data);
                            this._populate_peptides(data);
                        }
                        return this;
                    });

MASCP.Pep2ProReader.prototype.requestData = function()
{
    var self = this;
    var agi = this.agi;
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'pep2pro' 
        }
    };
};


MASCP.Pep2ProReader.SERVICE_URL = 'http://fgcz-pep2pro.uzh.ch/mascp_gator.php?';

/**
 * @class   Container class for results from the Pep2Pro service
 * @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.Pep2ProReader.Result = MASCP.Pep2ProReader.Result;

/**
 * The list of tissue names that are used by Pep2Pro for this particular AGI
 *  @returns {[String]} Tissue names
 */
MASCP.Pep2ProReader.Result.prototype.tissues = function()
{
    return this._tissues;
};

MASCP.Pep2ProReader.Result.prototype.getPeptides = function()
{
    return this._peptides;
};


MASCP.Pep2ProReader.Result.prototype = MASCP.extend(MASCP.Pep2ProReader.Result.prototype,
/** @lends MASCP.Pep2ProReader.Result.prototype */
{
    /** @field 
     *  @description Hash keyed by tissue name containing the number of spectra for each tissue for this AGI */
    spectra :   null,
    /** @field
     *  @description Hash keyed by the Plant Ontology ID containing the number of spectra for each peptide (keyed by "start-end" position) */
    peptide_counts_by_tissue : null,
    /** @field
     *  @description String containing the sequence for the retrieved AGI */
    sequence : null
});

MASCP.Pep2ProReader.Result.prototype._populate_spectra = function(data)
{
    this.spectra = {};
    this._tissues = [];
    this._long_name_map = {};
    if ( ! data || ! data.tissues ) {
        return;
    }
    for (var i = 0; i < data.tissues.length; i++ ) {
        this._tissues[i] = data.tissues[i]['PO:tissue'] || {};
        this._tissues[i].long_name = data.tissues[i].tissue;
        this._long_name_map[this._tissues[i]] = data.tissues[i].tissue;
        
        this.spectra[data.tissues[i]['PO:tissue']] = parseInt(data.tissues[i].qty_spectra,10);
    }
};

MASCP.Pep2ProReader.Result.prototype._populate_peptides = function(data)
{
    this.peptide_counts_by_tissue = {};
    if ( ! data || ! data.peptides ) {
        return;
    }
        
    this.sequence = data.sequence;
    this._peptides = [];
    
    for (var i = 0; i < data.peptides.length; i++ ) {
        var a_peptide = data.peptides[i];
        this._peptides.push(a_peptide.sequence);
        var peptide_position = a_peptide.position+'-'+(parseInt(a_peptide.position,10)+parseInt(a_peptide.sequence.length,10));
        for (var j = 0; j < a_peptide.tissues.length; j++ ) {
            var a_tissue = a_peptide.tissues[j];
            if (! this.peptide_counts_by_tissue[a_tissue['PO:tissue']]) {
                this.peptide_counts_by_tissue[a_tissue['PO:tissue']] = {};
            }
            this.peptide_counts_by_tissue[a_tissue['PO:tissue']][peptide_position] = parseInt(a_tissue.qty_spectra,10);
        }
    }
};

MASCP.Pep2ProReader.Result.prototype.render = function()
{
    var params = jQuery.param(this.reader.requestData().data);
    var total = 0;
    for (var i in this.spectra) {
        if (this.spectra.hasOwnProperty(i)) {
            total += parseInt(this.spectra[i],10);
        }
    }
    var a_container = jQuery('<div>MS/MS spectra <input type="checkbox" class="group_toggle"/><a style="display: block; float: right;" href="http://fgcz-pep2pro.unizh.ch/index.php?'+params+'">Pep2Pro</a></div>');
    jQuery(this.reader.renderers).each ( function(i){
        this.createGroupCheckbox('pep2pro',jQuery('input.group_toggle',a_container));
    });
    return a_container;
};

MASCP.Pep2ProReader.prototype._rendererRunner = function(sequenceRenderer) {
    var tissues = this.result? this.result.tissues() : [];
    for (var i = (tissues.length - 1); i >= 0; i-- ) {
        var tissue = tissues[i];
        if (this.result.spectra[tissue] < 1) {
            continue;
        }
        var peptide_counts = this.result.peptide_counts_by_tissue[tissue];

        var overlay_name = 'pep2pro_by_tissue_'+tissue;
    
        // var css_block = ' .overlay { display: none; } .active .overlay { display: block; top: 0px; background: #000099; } ';
    
        var css_block = ' .overlay { display: none; } .tracks .active { fill: #000099; } .inactive { display: none; } .active .overlay { display: block; top: 0px; background: #000099; } ';
    
        MASCP.registerLayer(overlay_name,{ 'fullname' : this.result._long_name_map[tissue], 'group' : 'pep2pro', 'color' : '#000099', 'css' : css_block, 'data' : { 'po' : tissue, 'count' : peptide_counts } });
            
        var positions = this._normalise(this._mergeCounts(peptide_counts));
        var index = 1;
        var last_start = null;
        while (index <= positions.length) {
            if ( last_start !== null ) {
                if ((typeof positions[index] === 'undefined') || (index == positions.length)) {
                    sequenceRenderer.getAminoAcidsByPosition([last_start])[0].addBoxOverlay(overlay_name,index-1-last_start);
                    last_start = null;                    
                }
            }
            if (positions[index] > 0 && last_start === null) {
                last_start = index;
            }
            index += 1;
        }
    }
};

MASCP.Pep2ProReader.prototype._groupSummary = function(sequenceRenderer)
{
    var tissues = this.result? this.result.tissues() : [];
    var positions = [];
    
    var tissue_func = function() {
        var tissues = [];
        for (var tiss in this) {
            if (this.hasOwnProperty(tiss)) {
                tissues.push(tiss);
            }
        }
        return tissues.sort().join(',');
    };
    
    for (var tiss in tissues) {
        if (tissues.hasOwnProperty(tiss)) {
            var tissue = tissues[tiss];
            if (this.result.spectra[tissue] < 1) {
                continue;
            }

            var peptide_counts = this._mergeCounts(this.result.peptide_counts_by_tissue[tissue]);

            for (var i = 0; i < peptide_counts.length; i++ ) {
                if ( peptide_counts[i] > 0 ) {
                    if (! positions[i]) {
                        positions[i] = {};
                        positions[i].tissue = tissue_func;
                    }
                    positions[i][tissue] = true;              
                }
            }
        }
    }    

    var index = 0;
    var last_start = null;
    var last_tissue = null;
    
    var overlay_name = 'pep2pro_controller';

    var css_block = ' .overlay { display: none; } .tracks .active { fill: #000099; } .inactive { display: none; } .active .overlay { display: block; top: 0px; background: #000099; } ';
    
    MASCP.registerLayer(overlay_name,{ 'fullname' : 'Pep2Pro MS/MS', 'color' : '#000099', 'css' : css_block });


    var an_agi = this.result.agi;
    var a_locus = an_agi.replace(/\.\d/,'');

    MASCP.getLayer('pep2pro_controller').href = 'http://fgcz-pep2pro.uzh.ch/locus.php?'+a_locus;
    while (index <= positions.length) {
        if ( index <= 0 ) {
            index += 1;
            continue;
        }
        if ((! positions[index] || positions[index].tissue() != last_tissue || (index == positions.length) ) && last_start !== null) {
            var endpoint = index - last_start;
            if ( ! positions[index] ) {
                endpoint -= 1;
            }
            sequenceRenderer.getAminoAcidsByPosition([last_start])[0].addBoxOverlay(overlay_name,endpoint);
            last_start = null;
        }
        if (positions[index] && last_start === null) {
            last_tissue = positions[index].tissue();
            last_start = index;
        }
        index += 1;
    }
    
    if (sequenceRenderer.createGroupController) {
        sequenceRenderer.createGroupController('pep2pro_controller','pep2pro');
    }
};

MASCP.Pep2ProReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{

    var reader = this;

    this.bind('resultReceived', function() {
        MASCP.registerGroup('pep2pro',{ 'fullname' : 'Pep2Pro data','hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#000099' });

        if ( sequenceRenderer.sequence != this.result.sequence && this.result.sequence != '' ) {
            jQuery(sequenceRenderer).bind('sequenceChange',function() {
                jQuery(sequenceRenderer).unbind('sequenceChange',arguments.callee);
                reader._groupSummary(sequenceRenderer);
                reader._rendererRunner(sequenceRenderer);
                jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
            });
            sequenceRenderer.setSequence(this.result.sequence);
            return;
        } else {
            reader._groupSummary(sequenceRenderer);
            reader._rendererRunner(sequenceRenderer);
            jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
        }
    });

    return this;
};

MASCP.Pep2ProReader.prototype._normalise = function(array)
{
    var max_val = 0, i = 0;
    for (i = 0; i < array.length; i++)
    {
        if (array[i] && array[i] > max_val) {
            max_val = array[i];
        }
    }
    for (i = 0; i < array.length; i++)
    {
        if (array[i] && array[i] > 0) {
            array[i] = (array[i] * 1.0) / max_val;
        }
    }
    return array;
};

MASCP.Pep2ProReader.prototype._mergeCounts = function(hash)
{
    var counts = [];
    for (var position in hash) {
        if (hash.hasOwnProperty(position)) {        
            var ends = position.split('-');
            var start = parseInt(ends[0],10);
            var end = parseInt(ends[1],10);
            for (var i = start; i <= end; i++) {
                if ( ! counts[i] ) {
                    counts[i] = 0;
                }
                counts[i] += hash[position];
            }
        }
    }
    return counts;
};/** @fileOverview   Classes for reading data from the Phosphat database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/* http://phosphat.mpimp-golm.mpg.de/PhosPhAtHost30/productive/views/Prediction.php?start=0&limit=50&id=IAMINURDBHACKING&method=getRelatives&sort=sequence&dir=ASC&params=%5B%22atcg00480.1%22%5D */


/** Default class constructor
 *  @class      Service class that will retrieve data from Phosphat for a given AGI.
 *              Data is transferred using the JSON format.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */

MASCP.PhosphatReader =  MASCP.buildService(function(data) {
                            if (data && data.result && ! this._sequence) {
                                for (var i = 0; i < data.result.length; i++) {
                                    if (data.result[i].prot_sequence == 'Imported protein - no info') {
                                        var agi = data.result[i].code;
                                        agi = agi.replace(/\s+$/,'');
                                        this._sequence = MASCP.getSequence(agi);
                                        break;
                                    }
                                }
                            }

                            if (data && data.experimental && data.relatives && data.predicted ) {
                                this._raw_data = data;
                                return this;
                            }


                            if (data && data.request_method == 'getPredictedAa') {
                                if (! this._raw_data ) {
                                    this._raw_data = {};
                                }
                                this._raw_data.predicted = data;
                            }
                            if (data && data.request_method == 'getExperimentsModAa') {
                                if (! this._raw_data ) {
                                    this._raw_data = {};
                                }
                                this._raw_data.experimental = data;
                            }
                            if (data && data.request_method == 'getRelatives') {
                                if (! this._raw_data ) {
                                    this._raw_data = {};
                                }
                                this._raw_data.relatives = data;
                            }


                            return this;
                        });

MASCP.PhosphatReader.SERVICE_URL = 'http://gator.masc-proteomics.org/proxy.pl?';

MASCP.PhosphatReader.prototype.requestData = function()
{
    var data = [null,this.agi];

        
    if ( ! this.method && ! this._methods ) {
        this._methods = ['getPredictedAa','getExperimentsModAa','getRelatives'];
    }
    if (this.combine) {
        this._methods = [];
    }

    var method = this._methods[0];

    
    if (method == 'getRelatives') {
        data = [this.agi];
    }

    return {
        type: "POST",
        dataType: "json",
        data: { 'id'        : 1,
                'method'    : method,
                'agi'       : this.agi,
                'params'    : encodeURI(data.toJSON ? data.toJSON() : JSON.stringify(data)),
                'service'   : 'phosphat' 
        }
    };
};

(function(mpr) {
    var defaultDataReceived = mpr.prototype._dataReceived;

    mpr.prototype._dataReceived = function(data,status)
    {
        if (data === null) {
            return defaultDataReceived.call(this,null,status);
        }
        data.request_method = this._methods ? this._methods[0] : null;
        if (this._methods) {
            this._methods.shift();
        }

        if (data.error && data.error.indexOf('SELECT') === 0) {
            data.error = null;
        }
        var res = defaultDataReceived.call(this,data,status);
        if (this.result && this.result._raw_data && this.result._raw_data.experimental && this.result._raw_data.relatives && this.result._raw_data.predicted) {
            this._methods = null;
            return res;
        } else {
            if (res) {
                this.retrieve();
            }
        }
        return false;
    };
    
    // var oldToString = mpr.prototype.toString;
    // mpr.prototype.toString = function()
    // {
    //     if ( ! this._methods ) {
    //         this._methods = ['getPredictedAa','getExperimentsModAa','getRelatives'];
    //     }
    //     var string = oldToString.call(this);
    //     string += this._methods[0] ? "."+this._methods[0] : "";
    //     return string;
    // };
    
})(MASCP.PhosphatReader);

/**
 *  @class   Container class for results from the Phosphat service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.PhosphatReader.Result = MASCP.PhosphatReader.Result;


/** Retrieve an array of positions that phosphorylation has been predicted to occur upon
 *  @returns {Array}    Phosphorylation positions upon the full protein
 */
MASCP.PhosphatReader.Result.prototype.getAllPredictedPositions = function()
{
    var positions = [];
    var result = this._raw_data.predicted.result;
    for ( var prediction_idx in result ) {
        if (result.hasOwnProperty(prediction_idx)) {
            var prediction = this._raw_data.predicted.result[prediction_idx];
            if (prediction.prd_score > 0) {
                positions.push(prediction.prd_position);
            }
        }
    }
    return positions;
};

/** Retrieve an array of positions that phosphorylation has been experimentally verified to occur upon
 *  @returns {Array}    Phosphorylation positions upon the full protein
 */
MASCP.PhosphatReader.Result.prototype.getAllExperimentalPositions = function()
{
    var exp_sites = {};
    var result = this._raw_data.experimental.result;
    for ( var site_idx in result ) {
        if (result.hasOwnProperty(site_idx)) {
            var site = this._raw_data.experimental.result[site_idx];
            var pep_seq = site.pep_sequence || '';
            pep_seq = pep_seq.replace(/[^A-Z]/g,'');
            if (site.modificationType != 'phos') {
                continue;
            }
            var prot_seq = this._sequence || site.prot_sequence;
            var site_id = prot_seq.indexOf(pep_seq);
            if (site_id < 0) {
                continue;
            }
            site_id += site.position;
            exp_sites[site_id] = 1;
        }
    }
    var positions = [];
    for ( var i in exp_sites ) {
        if (exp_sites.hasOwnProperty(i)) {
            positions.push(parseInt(i,10));
        }
    }
    return positions;
};

MASCP.PhosphatReader.Result.prototype.getAllExperimentalPhosphoPeptides = function()
{
    var results = {};
    var result = this._raw_data.experimental.result;
    for ( var site_idx in result ) {
        if (result.hasOwnProperty(site_idx)) {
            var site = this._raw_data.experimental.result[site_idx];
            var pep_seq = site.pep_sequence || '';
            pep_seq = pep_seq.replace(/[^A-Z]/g,'');
        
            if (site.modificationType != 'phos') {
                continue;
            }
            var prot_seq = this._sequence || site.prot_sequence;
            var site_id = prot_seq.indexOf(pep_seq);
            if (site_id >= 0) {
                var id =''+site_id+"-"+pep_seq.length;
                results[id] = results[id] || [site_id,pep_seq.length];
                if (results[id].indexOf(site.position+site_id,2) <= 0) {
                    results[id].push(site.position+site_id);
                }
            }
        }
    }
    var results_arr = [];
    for (var a_site in results ) {
        if (results.hasOwnProperty(a_site)) {
            results_arr.push(results[a_site]);
        }
    }
    return results_arr;
};

MASCP.PhosphatReader.Result.prototype.getSpectra = function()
{
    if (! this._raw_data.relatives || ! this._raw_data.relatives.result) {
        return {};
    }
    var results = {};
    var experiments = this._raw_data.relatives.result;
    for (var i = 0; i < experiments.length; i++ ) {
        var tiss = experiments[i].Tissue;
        if ( ! results[tiss] ) {
            results[tiss] = 0;
        }
        results[tiss] += 1;
    }
    return results;
};

MASCP.PhosphatReader.Result.prototype.render = function()
{
    return null;
};

MASCP.PhosphatReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;
    
    this.bind('resultReceived', function() {
        var icons = [];

        var exp_peptides = this.result.getAllExperimentalPhosphoPeptides();
        if (exp_peptides.length === 0) {
            jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
            return;         
        }

        MASCP.registerLayer('phosphat_experimental', { 'fullname': 'PhosPhAt (mod)', 'color' : '#000000', 'css' : '.active { background: #999999; color: #000000; font-weight: bolder; } .tracks .active { background: #000000; fill: #000000; } .inactive { display: none; }' });
        MASCP.registerGroup('phosphat_peptides', { 'fullname' : 'PhosPhAt peptides' });

        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('phosphat_experimental','phosphat_peptides');
        }
        jQuery(exp_peptides).each(function(i) {
            MASCP.registerLayer('phosphat_peptide_'+i, { 'fullname': 'PhosPhAt MS/MS', 'group':'phosphat_peptides', 'color' : '#000000', 'css' : '.active { background: #999999; color: #000000; } .tracks .active { background: #000000; fill: #000000; } .inactive { display: none; }' });

            var start = this.shift();
            var end = this.shift();
            var aa = sequenceRenderer.getAminoAcidsByPosition([start+1])[0];
            if (aa) {
                aa.addBoxOverlay('phosphat_peptide_'+i,end,0.5);
                icons.push(aa.addBoxOverlay('phosphat_experimental',end,0.5));
            }
	        jQuery(sequenceRenderer.getAminoAcidsByPosition(this)).each(function() {
	            this.addToLayer('phosphat_peptide_'+i);
	            icons = icons.concat(this.addToLayer('phosphat_experimental'));
	        });
        });


        jQuery(MASCP.getGroup('phosphat_peptides')).bind('visibilityChange',function(e,rend,vis) {
            if (rend != sequenceRenderer) {
                return;
            }
            icons.forEach(function(el) {
                if (! el.style ) {
                    el.setAttribute('style','');
                }
                el.style.display = vis ? 'none' : 'inline';
            });
        });
        
        if (MASCP.getLayer('phosphat_experimental')) {
            MASCP.getLayer('phosphat_experimental').href = 'http://phosphat.mpimp-golm.mpg.de/app.html?agi='+this.result.agi;        
        }
        
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};
/**
 *  @fileOverview Classes for reading data from the PlantsP database using XML data
 */

/**
 * @class   Service class that will retrieve PlantsP data for this entry given an AGI.
 * @description Default class constructor
 * @param   {String} agi            Agi to look up
 * @param   {String} endpointURL    Endpoint URL for this service
 * @extends MASCP.Service
 */
 
MASCP.PpdbReader = MASCP.buildService(function(data) {
                        if (! data ) {
                            return this;
                        }
                        var extractData = function()
                        {
                            var features = this._raw_data.getElementsByTagName('FEATURE');

                            var peptides = [];

                            var peps_by_seq = {};
                            var all_experiments = {};
                            for (var i = 0 ; i < features.length; i++ ) {
                                var type = features[i].getElementsByTagName('TYPE')[0];
                                var textcontent = type.textContent || type.text || type.nodeValue;
                                if ( textcontent == 'Peptide') {
                                    var seq = features[i].getAttribute('label');
                                    if ( ! peps_by_seq[seq] ) {
                                        peps_by_seq[seq] = { 'experiments' : [] };
                                    }
                                    var exp_id = parseInt(features[i].getElementsByTagName('GROUP')[0].getAttribute('id'),10);
                                    peps_by_seq[seq].experiments.push(exp_id);
                                    all_experiments[exp_id] = true;            
                                }
                            }
                            for (var pep in peps_by_seq) {
                                if (peps_by_seq.hasOwnProperty(pep)) {
                                    var pep_obj =  { 'sequence' : pep , 'experiments' : peps_by_seq[pep].experiments };
                                    peptides.push(pep_obj);
                                }
                            }

                            this._experiments = [];
                            for (var expid in all_experiments) {
                                if (all_experiments.hasOwnProperty(expid)) {
                                    this._experiments.push(parseInt(expid,10));
                                }
                            }

                            return peptides;
                        };
                        this._raw_data = data;
                        if (data.getElementsByTagName) {
                            var peps = extractData.call(this);
                            this._raw_data = {
                                'experiments' : this._experiments,
                                'peptides'    : peps
                            };
                        }
                        this._experiments = this._raw_data.experiments;
                        this._peptides    = this._raw_data.peptides;
                        return this;
                    });

MASCP.PpdbReader.prototype.requestData = function()
{
    var self = this;
    var agi = (this.agi+"").replace(/\..*$/,'');
    var dataType = 'json';
    if ((this._endpointURL || '').indexOf('xml') >= 0) {
        dataType = 'xml';
    }
    return {
        type: "GET",
        dataType: dataType,
        data: { 'segment'   : agi,
                'agi'       : this.agi,
                'service'   : 'ppdb'
        }
    };
};


MASCP.PpdbReader.SERVICE_URL = 'http://ppdb.tc.cornell.edu/das/arabidopsis/features/?output=xml'; /* ?segment=locusnumber */

/**
 * @class   Container class for results from the Ppdb service
 * @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.PpdbReader.Result = MASCP.PpdbReader.Result;

MASCP.PpdbReader.Result.prototype = MASCP.extend(MASCP.PpdbReader.Result.prototype,
/** @lends MASCP.PpdbReader.Result.prototype */
{
    /** @field 
     *  @description Hash keyed by tissue name containing the number of spectra for each tissue for this AGI */
    spectra :   null,
    /** @field
     *  @description Hash keyed by the Plant Ontology ID containing the number of spectra for each peptide (keyed by "start-end" position) */
    peptide_counts_by_tissue : null,
    /** @field
     *  @description String containing the sequence for the retrieved AGI */
    sequence : null
});

MASCP.PpdbReader.Result.prototype.render = function()
{
    return null;
};

MASCP.PpdbReader.Result.prototype.getExperiments = function()
{
    return this._experiments || [];
};

MASCP.PpdbReader.Result.prototype.getPeptides = function()
{
    var peps = this._peptides || [];
    peps.forEach(function(pep_obj) {
        pep_obj.toString = function(p) {
            return function() {
                return p.sequence;
            };
        }(pep_obj);
    });
    return peps;
};


MASCP.PpdbReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;
    
    this.bind('resultReceived', function() {
        
//        
        MASCP.registerGroup('ppdb', {'fullname' : 'PPDB spectra data', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#aa9900' });

        var overlay_name = 'ppdb_controller';

        var css_block = '.active .overlay { background: #aa9900; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';

        MASCP.registerLayer(overlay_name,{ 'fullname' : 'PPDB MS/MS', 'color' : '#aa9900', 'css' : css_block });

        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('ppdb_controller','ppdb');
        }
        
        var peps = this.result.getPeptides();
        var experiments = this.result.getExperiments();
        for(var i = 0; i < experiments.length; i++) {
            var layer_name = 'ppdb_experiment'+experiments[i];
            MASCP.registerLayer(layer_name, { 'fullname': 'Experiment '+experiments[i], 'group' : 'ppdb', 'color' : '#aa9900', 'css' : css_block });
            MASCP.getLayer(layer_name).href = 'http://ppdb.tc.cornell.edu/dbsearch/searchsample.aspx?exprid='+experiments[i];
            for (var j = 0 ; j < peps.length; j++) {
                var peptide = peps[j];
                if (peps[j].experiments.indexOf(experiments[i]) < 0) {
                    continue;
                }
                var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide.sequence);
                peptide_bits.addToLayer(layer_name);
                peptide_bits.addToLayer(overlay_name);
            }
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);        



    });
    return this;
};
/** @fileOverview   Classes for reading data from the Processing data
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from the Processing data for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.ProcessingReader = MASCP.buildService(function(data) {
                        this._raw_data = data;
                        return this;
                    });

MASCP.ProcessingReader.SERVICE_URL = '?';

MASCP.ProcessingReader.prototype.requestData = function()
{
    var agi = this.agi;
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'processing' 
        }
    };
};

/**
 *  @class   Container class for results from the Processing service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.ProcessingReader.Result = MASCP.ProcessingReader.Result;

/** Retrieve the peptides for this particular entry from the Processing service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.ProcessingReader.Result.prototype.getProcessing = function()
{
    var content = null;
    if (! this._raw_data || ! this._raw_data.data || ! this._raw_data.data.processing ) {
        return [];
    }

    return this._raw_data.data.processing;
};

MASCP.ProcessingReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.ProcessingReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    var css_block = '.active .overlay { background: #666666; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';
    
    this.bind('resultReceived', function() {
        var pep = this.result.getProcessing();
        var pos = sequenceRenderer.sequence.indexOf(pep);
        if (pos < 0) {
            return;
        }
        MASCP.registerLayer('processing',{ 'fullname' : 'N-Terminal (mod)', 'color' : '#ffEEEE', 'css' : css_block });
        var aa = sequenceRenderer.getAA(pos+1+pep.length);
        if (aa) {
            aa.addAnnotation('processing',1, { 'border' : 'rgb(150,0,0)', 'content' : 'Mat', 'angle': 0 });
        }

        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.ProcessingReader.Result.prototype.render = function()
{
};/** @fileOverview   Classes for reading data from the Promex database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from Promex for a given AGI.
 *              Data is transferred using XML.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.PromexReader = MASCP.buildService(function(data) {
                        this._raw_data = data;                        
                        return this;
                    });

MASCP.PromexReader.SERVICE_URL = 'http://131.130.57.242/json/?';

MASCP.PromexReader.prototype.requestData = function()
{
    var agi = (this.agi+"").replace(/\..*$/,'');
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : this.agi,
                'ac'        : agi,
                'service'   : 'promex' 
        }
    };
};

/**
 *  @class   Container class for results from the Promex service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.PromexReader.Result = MASCP.PromexReader.Result;

/** Retrieve the peptides for this particular entry from the Promex service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.PromexReader.Result.prototype.getPeptides = function()
{
    var content = null;
    
    if (! this._raw_data || ! this._raw_data.peptides ) {
        return [];
    }    
    var peptides = [];
    for (var i = 0; i < this._raw_data.peptides.length; i++ ) {
        peptides.push(this._cleanSequence(this._raw_data.peptides[i].sequence));
    }
    return peptides;
};

MASCP.PromexReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.PromexReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;
    MASCP.registerGroup('promex_experimental', {'fullname' : 'ProMex spectra data', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#ff9900' });

    var overlay_name = 'promex_controller';

    var css_block = '.active .overlay { background: #ff9900; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';
    
    MASCP.registerLayer(overlay_name,{ 'fullname' : 'ProMEX MS/MS', 'color' : '#ff9900', 'css' : css_block });


    this.bind('resultReceived', function() {
        var agi = (this.result.agi+"").replace(/\..*$/,'');
        
        MASCP.getLayer('promex_controller').href = 'http://promex.pph.univie.ac.at/promex/?ac='+agi;
        
        // var css_block = '.active { background: #ff9900; color: #ffffff;} :indeterminate { background: #ff0000; } .active a:hover { background: transparent !important; } .inactive { }';
        var peps = this.result.getPeptides();
        for(var i = 0; i < peps.length; i++) {
            MASCP.registerLayer('promex_experimental_spectrum_'+i, { 'fullname': 'Spectrum', 'group' : 'promex_experimental', 'color' : '#ff9900', 'css' : css_block });
            var peptide = peps[i];
            var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
            if ( ! peptide_bits || peptide_bits.length === 0 ) {
                continue;
            }
            var layer_name = 'promex_experimental_spectrum_'+i;
            peptide_bits.addToLayer(layer_name);
            peptide_bits.addToLayer(overlay_name);
            // jQuery(MASCP.getLayer('promex_experimental_spectrum_'+i)).bind('click',function() {
            //     window.open(a_spectra);
            // });
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);        

        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('promex_controller','promex_experimental');
        }


    });
    return this;
};

MASCP.PromexReader.Result.prototype.render = function()
{
};/** @fileOverview   Classes for reading data from the Rippdb database
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from Rippdb for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.RippdbReader = MASCP.buildService(function(data) {
                        this._raw_data = data;                        
                        return this;
                    });

MASCP.RippdbReader.SERVICE_URL = 'http://gator.masc-proteomics.org/rippdb.pl?';

MASCP.RippdbReader.prototype.requestData = function()
{
    var agi = this.agi;
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'rippdb' 
        }
    };
};

/**
 *  @class   Container class for results from the Rippdb service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.RippdbReader.Result = MASCP.RippdbReader.Result;

/** Retrieve the peptides for this particular entry from the Rippdb service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.RippdbReader.Result.prototype.getSpectra = function()
{
    var content = null;

    if (this._spectra) {
        return this._spectra;
    }

    if (! this._raw_data || ! this._raw_data.spectra ) {
        return [];
    }


    this._spectra = this._raw_data.spectra;
    
    return this._spectra;
};

MASCP.RippdbReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.RippdbReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    var css_block = '.active .overlay { background: #666666; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';
    
    this.bind('resultReceived', function() {
        var specs = this.result.getSpectra();

        var overlay_name = 'prippdb_experimental';
        var icons = [];
        
        if (specs.length > 0) {
            MASCP.registerLayer(overlay_name,{ 'fullname' : 'RIPP-DB (mod)', 'color' : '#666666', 'css' : css_block });

            MASCP.registerGroup('prippdb_peptides', {'fullname' : 'Phosphorylation Rippdb', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#666666' });
            if (sequenceRenderer.createGroupController) {
                sequenceRenderer.createGroupController('prippdb_experimental','prippdb_peptides');
            }
            
            jQuery(MASCP.getGroup('prippdb_peptides')).bind('visibilityChange',function(e,rend,vis) {
                if (rend != sequenceRenderer) {
                    return;
                }
                icons.forEach(function(el) {
                    el.style.display = vis ? 'none' : 'inline';
                });
            });
            
            
        }

        for (var j = 0; j < specs.length; j++ ) {
            var spec = specs[j];
            
            var peps = spec.peptides;
            if (peps.length === 0) {
                continue;
            }
            var layer_name = 'prippdb_spectrum_'+spec.spectrum_id;
            MASCP.registerLayer(layer_name, { 'fullname': 'Spectrum '+spec.spectrum_id, 'group' : 'prippdb_peptides', 'color' : '#666666', 'css' : css_block });
            for(var i = 0; i < peps.length; i++) {
                var peptide = peps[i].sequence;
                var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
                if (peptide_bits.length === 0){
                    continue;
                }
                peptide_bits.addToLayer(layer_name);
                icons.push(peptide_bits.addToLayer('prippdb_experimental'));

                for (var k = 0; k < peps[i].positions.length; k++ ) {
                    icons = icons.concat(peptide_bits[peps[i].positions[k] - 1].addToLayer('prippdb_experimental'));
                    peptide_bits[peps[i].positions[k] - 1].addToLayer(layer_name);
                }

            }
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};
/** Retrieve an array of positions that phosphorylation has been experimentally verified to occur upon
 *  @returns {Array}    Phosphorylation positions upon the full protein
 */
MASCP.RippdbReader.Result.prototype.getAllExperimentalPositions = function()
{
    var specs = this.getSpectra();
    var results = [];
    var seen = {};
    specs.forEach(function(spec) {
        var peps = spec.peptides;
        peps.forEach(function(pep) {
            pep.positions.forEach(function(pos) {
                if ( ! seen[pos] ) {
                    results.push(pos);
                    seen[pos] = true;
                }
            });
        });
    });
    return results;
}
MASCP.RippdbReader.Result.prototype.render = function()
{
};/**
 * @fileOverview    Classes for reading SNP data
 */

if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}



/** Default class constructor
 *  @class      Service class that will retrieve sequence data for a given AGI from a given ecotype
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.SnpReader = MASCP.buildService(function(data) {
                        this._raw_data = data || {};
                        return this;
                    });

MASCP.SnpReader.SERVICE_URL = 'http://gator.masc-proteomics.org/snps.pl?';

MASCP.SnpReader.prototype.requestData = function()
{
    var self = this;
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'   : this.agi,
                'service' : 'nssnps' 
        }
    };
};

MASCP.SnpReader.prototype.showSnp = function(renderer,acc) {
    var diffs = this.result.getSnp(acc);
    if (diffs.length < 1) {
        return;
    }


    var in_layer = 'all'+acc;

    var ins = [];
    var outs = [];

//    renderer.registerLayer(in_layer, {'fullname' : acc, 'group' : 'all_insertions' });

    var i;
    for (i = diffs.length - 1 ; i >= 0 ; i-- ){
        outs.push( { 'index' : diffs[i][0], 'delta' : diffs[i][1] });
        ins.push( { 'insertBefore' : diffs[i][0] + 1, 'delta' : diffs[i][2] });
    }

    for (i = ins.length - 1; i >= 0 ; i-- ) {
        renderer.getAA(ins[i].insertBefore - 1).addAnnotation(in_layer,1, { 'border' : 'rgb(150,0,0)', 'content' : ins[i].delta });
    }

    // for (var i = 0; i < outs.length; i++) {
    //     renderer.getAA(outs[i].index).addAnnotation(in_layer,1, {'angle' : 90, 'border' : 'rgb(0,0,150)', 'content' : outs[i].delta });
    // }
    
};

MASCP.SnpReader.ALL_ACCESSIONS = ["AGU","BAK2","BAY","BUR0","CDM0","COL0","DEL10","DOG4","DON0","EY152","FEI0","HKT24","ICE1","ICE102","ICE104","ICE106","ICE107","ICE111","ICE112","ICE119","ICE120","ICE127","ICE130","ICE134","ICE138","ICE150","ICE152","ICE153","ICE163","ICE169","ICE173","ICE181","ICE21","ICE212","ICE213","ICE216","ICE226","ICE228","ICE29","ICE33","ICE36","ICE49","ICE50","ICE60","ICE61","ICE63","ICE7","ICE70","ICE71","ICE72","ICE73","ICE75","ICE79","ICE91","ICE92","ICE93","ICE97","ICE98","ISTISU1","KASTEL1","KOCH1","KRO0","LAG22","LEO1","LER1","LERIK13","MER6","NEMRUT1","NIE12","PED0","PRA6","QUI0","RI0","RUE3131","SHA","STAR8","TUESB303","TUESCHA9","TUEV13","TUEWA12","VASH1","VIE0","WALHAESB4","XAN1"];


MASCP.SnpReader.prototype.setupSequenceRenderer = function(renderer) {
    var reader = this;
    
    reader.bind('resultReceived', function() {
        var a_result = reader.result;

        MASCP.registerGroup('insertions');
        MASCP.registerGroup('deletions');

        renderer.withoutRefresh(function() {        
        var insertions_layer;

        var accessions = a_result.getAccessions();
        
        while (accessions.length > 0) {

            var acc = accessions.shift();
            var acc_fullname = acc;

            var diffs = a_result.getSnp(acc);

            if (diffs.length < 1) {
                continue;
            }
            if ( ! insertions_layer ) {
                insertions_layer = renderer.registerLayer('insertions_controller',{'fullname' : 'nsSNPs','color' : '#ff0000'});                
            }


            var in_layer = 'all'+acc;
            var group_layer = acc.indexOf('_') >= 0 ? (acc.split('_')[0]).toUpperCase() : null;

            if (['SALK','MPICAO','GMI','MPISCHNEE','MPICOLLAB', 'JGI'].indexOf(group_layer) < 0) {
                group_layer = null;
            } else {
                if (group_layer.match(/^MPI/)) {
                    group_layer = 'MPI';
                }
                acc_fullname = acc.replace(/^[^_]+_/,'');
            }

            var ins = [];
            var outs = [];

            if (group_layer) {
                MASCP.registerGroup(group_layer, {'group' : 'insertions'});
                renderer.registerLayer(group_layer+'_controller', {'fullname' : group_layer, 'group' : 'insertions' , 'color' : '#ff0000'});
                if (renderer.createGroupController && group_layer) {
                    renderer.createGroupController(group_layer+'_controller',group_layer);
                }
                
            }

            var acc_layer = renderer.registerLayer(in_layer, {'fullname' : acc_fullname, 'group' : group_layer || 'insertions' });
            
            (function(this_acc) {
                return function() {
                    var visible = false;
                    var tempname = in_layer;
                    acc_layer.href = function(is_visible) {
                        visible = (typeof is_visible == 'boolean') ? is_visible : ! visible;
                        if (visible) {
                            MASCP.getLayer(tempname).icon = '#minus_icon';
                            reader.showSnp(MASCP.renderer,this_acc);
                        } else {
                            MASCP.getLayer(tempname).icon = '#plus_icon';
                            MASCP.renderer.removeAnnotations(tempname);
                            MASCP.renderer.redrawAnnotations();
                        }
                        MASCP.renderer.refresh();
                        return false;
                    };
                };
            }(acc))();
            
            MASCP.getLayer(in_layer).icon = null;
            var i;
            for (i = diffs.length - 1; i >= 0 ; i-- ){
                outs.push( { 'index' : diffs[i][0] + 1, 'delta' : diffs[i][1] });
                ins.push( { 'insertBefore' : diffs[i][0] + 1, 'delta' : diffs[i][2] });
            }

            for (i = ins.length - 1; i >= 0 ; i-- ) {
                var pos = ins[i].insertBefore - 1;
                if (pos > renderer.sequence.length) {
                    pos = renderer.sequence.length;
                }
                var ann = renderer.getAA(pos).addAnnotation('insertions_controller',1, { 'border' : 'rgb(150,0,0)', 'content' : ins[i].delta, 'angle': 'auto' });
                if (! ann._click) {
                    ann.addEventListener('click',(function(posn) {
                        var visible = false;
                        return function() {
                            visible = ! visible;
                            renderer.withoutRefresh(function() {
                                reader.result.getSnpsForPosition(posn).forEach(function(an_acc) {
                                    reader.showSnp(MASCP.renderer,an_acc);
                                    MASCP.getLayer('all'+an_acc).href(visible);
                                });
                            });
                            renderer.refresh();
                        };
                    })(pos),false);
                    ann.style.cursor = 'pointer';
                    ann._click = true;
                }
            }
        
        }
        
        if (MASCP.getGroup('insertions').size() > 0) {
        
            if (renderer.createGroupController) {
                renderer.createGroupController('insertions_controller','insertions');
            }
        }
        });
        renderer.redrawAnnotations('insertions_controller');
        jQuery(renderer).trigger('resultsRendered',[reader]);
        
    });
};

MASCP.SnpReader.Result.prototype.getAccessions = function() {
    var snps_data = this._raw_data.data;
    var results = [];
    for (var acc in snps_data) {
        if (snps_data.hasOwnProperty(acc)) {
            results.push(acc);
        }
    }
    return results;
};

MASCP.SnpReader.Result.prototype.getSnp = function(accession) {
    var snps_data = this._raw_data.data[accession];
    var results = [];
    for (var pos in snps_data) {
        if (snps_data.hasOwnProperty(pos)) {
            var position = parseInt(pos,10)+1;
            var changes = snps_data[pos];
            var a_result = [ position, changes.charAt(0), changes.charAt(1)];
            results.push(a_result);
        }
    }
    return results;
};

MASCP.SnpReader.Result.prototype.getSnpsForPosition = function(position) {
    var self = this;
    this._cached = this._cached || {};
    if (this._cached[position]) {
        return this._cached[position];
    }
    var results = [];
    this.getAccessions().forEach(function(acc) {
        self.getSnp(acc).forEach(function(snp) {
            if (snp[0] == position) {
                results.push(acc);
                return;
            }
        });
    });
    this._cached[position] = results;
    return results;
};

MASCP.cloneService(MASCP.SnpReader,"RnaEditReader");

MASCP.RnaEditReader.SERVICE_URL = '?';

MASCP.RnaEditReader.prototype.requestData = function()
{
    var self = this;
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'   : this.agi,
                'service' : 'rnaedit' 
        }
    };
};

MASCP.RnaEditReader.prototype.setupSequenceRenderer = function(renderer) {
    var reader = this;
    
    reader.bind('resultReceived', function() {
        var a_result = reader.result;
        renderer.withoutRefresh(function() {        
        var insertions_layer;

        var accessions = a_result.getAccessions();
        while (accessions.length > 0) {

            var acc = accessions.shift();
            var acc_fullname = acc;

            var diffs = a_result.getSnp(acc);

            if (diffs.length < 1) {
                continue;
            }

            var in_layer = 'rnaedit';

            var ins = [];
            var outs = [];
            var acc_layer = renderer.registerLayer(in_layer, {'fullname' : 'RNA Edit (mod)' });

            MASCP.getLayer(in_layer).icon = null;
            var i;

            for (i = diffs.length - 1; i >= 0 ; i-- ){
                outs.push( { 'index' : diffs[i][0] + 1, 'delta' : diffs[i][1] });
                ins.push( { 'insertBefore' : diffs[i][0] + 1, 'delta' : diffs[i][2] });
            }
            
            for (i = ins.length - 1; i >= 0 ; i-- ) {
                var pos = ins[i].insertBefore - 1;
                if (pos > renderer.sequence.length) {
                    pos = renderer.sequence.length;
                }
                renderer.getAA(pos).addAnnotation('rnaedit',1, { 'border' : 'rgb(150,0,0)', 'content' : ins[i].delta, 'angle': 'auto' });
            }
        }
        
        });
        jQuery(renderer).trigger('resultsRendered',[reader]);
    });
};

/**
 * @fileOverview    Classes for reading data from the Suba database
 */

if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}


/** Default class constructor
 *  @class      Service class that will retrieve data from SUBA for a given AGI.
 *              Data is transferred using JSON.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.SubaReader = MASCP.buildService(function(data) {
                        this._raw_data = data;
                        return this;
                    });

MASCP.SubaReader.SERVICE_URL = 'http://suba.plantenergy.uwa.edu.au/services/byAGI.php?';

MASCP.SubaReader.prototype.requestData = function()
{
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : this.agi,
                'service'   : 'suba' 
        }
    };
};

/**
 *  @class   Container class for results from the Promex service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.SubaReader.Result = MASCP.SubaReader.Result;

/**#@+
 * @memberOf MASCP.SubaReader.Result.prototype
 */
MASCP.SUBA_FIELDS =
{
    /** @name location_gfp */
    location_gfp        :   null,
    /** @name location_ipsort */
    location_ipsort     :   null,
    /** @name location_loctree */
    location_loctree    :   null,
    /** @name location_mitopred */
    location_mitopred   :   null,
    /** @name location_mitoprot2 */
    location_mitoprot2  :   null,
    /** @name location_ms */
    location_ms         :   null,
    /** @name location_multiloc */
    location_multiloc   :   null,
    /** @name location_preoxp */
    location_preoxp     :   null,
    /** @name location_predotar */
    location_predotar   :   null,
    /** @name location_subloc */
    location_subloc     :   null,
    /** @name location_swissprot */
    location_swissprot  :   null,
    /** @name location_targetp */
    location_targetp    :   null,
    /** @name location_wolfpsort */
    location_wolfpsort  :   null
};

/**#@-*/


MASCP.SubaReader.Result.prototype._getLocalisation = function(localisation)
{
    var results = {};
    var any_data = false;
    for (var i = 0; i < this._raw_data.observed.length; i++) {
        var obs = this._raw_data.observed[i];
        if (obs[2] == localisation) {
            if (! results[obs[0]]) {
                results[obs[0]] = [];
            }
            results[obs[0]].push(obs[1]);
            any_data = true;
        }
    }
    if ( ! any_data ) {
        return null;
    }
    return results;
};

MASCP.SubaReader.Result.prototype._parseLocalisation = function(localisation)
{
    if (localisation === null || localisation.length === 0 )
    {
        return null;
    }
    var experiments = localisation.split(';');
    var tissues = {};
    var i;
    for (i = experiments.length - 1; i >= 0; i--) {
        var data = experiments[i].split(':');
        tissues[data[0]] = tissues[data[0]] || [];
        tissues[data[0]].push(data[1]);
    }
    return tissues;
};

MASCP.SubaReader.Result.prototype._sortLocalisation = function(loc_data)
{
    var loc_keys = [];
    for (var i in loc_data) {
        if (loc_data.hasOwnProperty(i)) {
            loc_keys.push(i);
        }
    }
    loc_keys = loc_keys.sort(function(a,b) {
        return loc_data[a].length - loc_data[b].length;
    });
    
    return loc_keys;    
};

/** Retrieve the mass spec localisation for this AGI
 *  @returns [ { String : [String] } ]   Mass Spec localisation and array of Pubmed IDs
 */
MASCP.SubaReader.Result.prototype.getMassSpecLocalisation = function()
{
    return this._getLocalisation('ms');
};


/** Retrieve the GFP localisation for this AGI
 *  @returns [ {String : [String] }  ]   GFP localisation and array of Pubmed IDs
 */
MASCP.SubaReader.Result.prototype.getGfpLocalisation = function()
{
    return this._getLocalisation('gfp');
};

MASCP.SubaReader.Result.prototype.getWinnerTakesAllGfp = function()
{
    var vals = this.getGfpLocalisation();
    var locs = (this._sortLocalisation(vals));
    var results = [];
    var last_val = -1;
    var i;
    for ( i = locs.length - 1; i >= 0; i-- ) {
        if (last_val && vals[locs[i]] == last_val) {
            results.push(locs[i]);
        } else if (last_val < 0) {
            last_val = vals[locs[i]];
            results.push(locs[i]);
        } else {
            break;
        }
    }
    results._values = [];
    for (i = results.length - 1; i >= 0; i-- ) {
        results._values.push(vals[results[i]].length);
    }
    return results;
};

MASCP.SubaReader.Result.prototype.getWinnerTakesAllMassSpec = function()
{
    var vals = this.getMassSpecLocalisation();
    var locs = (this._sortLocalisation(vals));
    var results = [];
    var last_val = -1;
    var i;
    for (i = locs.length - 1; i >= 0; i-- ) {
        if (last_val && vals[locs[i]] == last_val) {
            results.push(locs[i]);
        } else if (last_val < 0) {
            last_val = vals[locs[i]];
            results.push(locs[i]);
        } else {
            break;
        }
    }
    results._values = [];
    for ( i = results.length - 1; i >= 0; i-- ) {
        results._values.push(vals[results[i]].length);
    }
    return results;
};

/** Retrieve the set of predicted localisations for this AGI
 *  @returns [ { String : [String] } ]   Predicted localisation and array of methods
 */
MASCP.SubaReader.Result.prototype.getPredictedLocalisations = function()
{
    var results = {};
    for (var i = 0; i < this._raw_data.predicted.length; i++) {
        if ( ! results[this._raw_data.predicted[i][0]]) {
            results[this._raw_data.predicted[i][0]] = [];
        }
        results[this._raw_data.predicted[i][0]].push(this._raw_data.predicted[i][1]);        
    }
    return results;    
};

MASCP.SubaReader.Result.prototype.mapController = function(inputElement)
{
    if ( ! this._map ) {
        return null;
    }
    var map = this._map;
    inputElement = inputElement ? jQuery(inputElement) : jQuery('<ul><li class="ms"><div style="position: relative; left: 0px; top: 0px; float: left; background-color: #ff0000; width: 1em; height: 1em;"></div><input class="ms" type="checkbox"/> MS</li><li class="gfp"><div style="position: relative; left: 0px; top: 0px; float: left; background-color: #00ff00; width: 1em; height: 1em;"></div><input class="gfp" type="checkbox"/> GFP</li></ul>');
    
    if ( ! this.getMassSpecLocalisation() )  {
        jQuery('li.ms', inputElement).css({ 'display': 'none' });
    } else {
        var ms_loc = this._sortLocalisation(this.getMassSpecLocalisation());
        jQuery('input.ms', inputElement).unbind('change').bind('change', function() {
            var i;
            for ( i = ms_loc.length - 1; i >= 0; i--) {
                if (this.checked) {
                    map.showKeyword(ms_loc[i], '#ff0000');
                } else {
                    map.hideKeyword(ms_loc[i], '#ff0000');                    
                }
            }                            
        }).attr('checked', (ms_loc.length > 0));
    }
    if ( ! this.getGfpLocalisation() )  {
        jQuery('li.gfp', inputElement).css({ 'display': 'none' });
    } else {
        var gfp_loc = this._sortLocalisation(this.getGfpLocalisation());
        jQuery('input.gfp', inputElement).unbind('change').bind('change', function() {
            var i;
            for ( i = gfp_loc.length - 1; i >= 0; i--) {
                if (this.checked) {
                    map.showKeyword(gfp_loc[i], '#00ff00');
                } else {
                    map.hideKeyword(gfp_loc[i], '#00ff00');                    
                }
            }                            
        }).attr('checked', (gfp_loc.length > 0));
    }

    return inputElement[0];
};

MASCP.SubaReader.Result.prototype.render = function()
{
    return null;
};/**
 * @fileOverview    Classes for reading data from TAIR database
 */

if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}



/** Default class constructor
 *  @class      Service class that will retrieve data from TAIR for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.TairReader = MASCP.buildService(function(data) {
                        this._data = data || {};
                        if ( ! this._data.data ) {
                            this._data = { 'data' : ['',''] };
                        }
                        return this;
                    });

MASCP.TairReader.SERVICE_URL = 'http://gator.masc-proteomics.org/tair.pl?';

MASCP.TairReader.prototype.requestData = function()
{
    var self = this;
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'   : this.agi,
                'service' : 'tair' 
        }
    };
};

MASCP.TairReader.Result.prototype.getDescription = function() {
    return this._data.data[1];
};

MASCP.TairReader.Result.prototype.getSequence = function() {
    return this._data.data[2];
};

MASCP.getSequence = function(agi) {
    var self = arguments.callee;
    if (! self._reader ) {
        self._reader = new MASCP.TairReader();
        self._reader.async = false;
    }
    self._reader.result = null;
    self._reader.agi = agi;
    self._reader.retrieve();
    if ( ! self._reader.result ) {
        return "";
    }
    return self._reader.result.getSequence(); 
};
/** @fileOverview   Classes for reading data from the Ubiquitin data
 */
if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve data from the Ubiquitin data for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.UbiquitinReader = MASCP.buildService(function(data) {
                        this._raw_data = data;
                        return this;
                    });

MASCP.UbiquitinReader.SERVICE_URL = '?';

MASCP.UbiquitinReader.prototype.requestData = function()
{
    var agi = this.agi;
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'ubiquitin' 
        }
    };
};

/**
 *  @class   Container class for results from the Ubiquitin service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.UbiquitinReader.Result = MASCP.UbiquitinReader.Result;

/** Retrieve the peptides for this particular entry from the Ubiquitin service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.UbiquitinReader.Result.prototype.getPeptides = function()
{
    var content = null;
    if (! this._raw_data || ! this._raw_data.data  || ! this._raw_data.data.peptides ) {
        return [];
    }

    return this._raw_data.data.peptides;
};

MASCP.UbiquitinReader.Result.prototype._cleanSequence = function(sequence)
{
    return sequence.replace(/[^A-Z]/g,'');
};

MASCP.UbiquitinReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    var css_block = '.active .overlay { background: #666666; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';
    
    this.bind('resultReceived', function() {
        var peps = this.result.getPeptides();

        var overlay_name = 'ubiquitin_experimental';
        var group_name = 'ubiquitin_peptides';
        var icons = [];
        
        if (peps.length > 0) {
            MASCP.registerLayer(overlay_name,{ 'fullname' : 'UBQ (mod)', 'color' : '#666666', 'css' : css_block });

            MASCP.registerGroup(group_name, {'fullname' : 'UBQ', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#666666' });
            if (sequenceRenderer.createGroupController) {
                sequenceRenderer.createGroupController(overlay_name,group_name);
            }
            
            jQuery(MASCP.getGroup(group_name)).bind('visibilityChange',function(e,rend,vis) {
                if (rend != sequenceRenderer) {
                    return;
                }
                icons.forEach(function(el) {
                    el.style.display = vis ? 'none' : 'inline';
                });
            });
            
            
        }

        for (var i = 0; i < peps.length; i++) {
            var layer_name = 'ubiquitin_peptide_'+i;
            MASCP.registerLayer(layer_name, { 'fullname': 'Peptide', 'group' : group_name, 'color' : '#666666', 'css' : css_block });
            var peptide = peps[i].sequence;
            var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
            if (peptide_bits.length === 0){
                continue;
            }
            peptide_bits.addToLayer(layer_name);
            icons.push(peptide_bits.addToLayer(layer_name));

            for (var k = 0; k < peps[i].positions.length; k++ ) {
                icons = icons.concat(peptide_bits[peps[i].positions[k] - 1].addToLayer(overlay_name));
                peptide_bits[peps[i].positions[k] - 1].addToLayer(layer_name);
            }
        }
        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};
/** Retrieve an array of positions that ubiquitin has been experimentally verified to occur upon
 *  @returns {Array}    Ubiquitin positions upon the full protein
 */
MASCP.UbiquitinReader.Result.prototype.getAllExperimentalPositions = function()
{
    var peps = this.getPeptides();
    var results = [];
    var seen = {};
    peps.forEach(function(pep) {
        pep.positions.forEach(function(pos) {
            if ( ! seen[pos] ) {
                results.push(pos);
                seen[pos] = true;
            }
        });
    });
    return results;
}
MASCP.UbiquitinReader.Result.prototype.render = function()
{
};/**
 * @fileOverview    Classes for getting arbitrary user data onto the GATOR
 */

if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

/** Default class constructor
 *  @class      Service class that will retrieve sequence data for a given AGI from a given ecotype
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.UserdataReader = MASCP.buildService(function(data) {
                        if ( ! data ) {
                            return this;
                        }
                        this.data = data ? data.data : data;
                        (function(self) {
                            self.getPeptides = function() {
                                return data.data;
                            };
                        })(this);
                        return this;
                    });

/* File formats

ATXXXXXX.XX,123-456
ATXXXXXX.XX,PSDFFDGFDGFDG
ATXXXXXX.XX,123,456

*/

MASCP.UserdataReader.prototype.toString = function() {
    return 'MASCP.UserdataReader.'+this.datasetname;
};

MASCP.UserdataReader.prototype.setupSequenceRenderer = function(renderer) {
    var reader = this;
    
    var is_array = function(arr) {
        return Object.prototype.toString.call(arr) == '[object Array]';
    };
    
    reader.bind('resultReceived',function() {
        var results = [].concat(this.result.data);
        while(results.length > 0) {
            var my_data = results.shift();
            if ( ! my_data ) {
                continue;
            }
            MASCP.registerLayer(reader.datasetname,{'fullname' : reader.datasetname,'color' : '#00ff00'});
            var data_func = function() { return function(row) {
                renderer.getAminoAcidsByPeptide(row).addToLayer(reader.datasetname);
            }; }();
            if (is_array(my_data) && (! (is_array(my_data[0])))) {
                data_func = function() { return function(row) {
                    var start = parseInt(row[0],10);
                    var end = parseInt(row[1],10);
                    if (! isNaN(start) && ! isNaN(end)) {
                        renderer.getAA(start).addBoxOverlay(reader.datasetname,end-start);
                    } else {
                        row.forEach(function(cell) {
                            renderer.getAminoAcidsByPeptide(cell).addToLayer(reader.datasetname);                            
                        });
                    }
                }; }();
            } else if (is_array(my_data) && ( is_array(my_data[0]) )) {
                data_func = function() { return function(peps) {
                    peps.forEach(function(row) {
                        var start = parseInt(row[0],10);
                        var end = parseInt(row[1],10);
                        renderer.getAA(start).addBoxOverlay(reader.datasetname,end-start);
                    });
                }; }();                
            } else if (my_data === parseInt(my_data[0],10)) {
                data_func = function() { return function(row) {
                    var pos = row;
                    renderer.getAA(pos).addAnnotation(reader.datasetname,1);
                }; }();
            }
            data_func.call(this,my_data);
        }
        jQuery(renderer).trigger('resultsRendered',[reader]);        
    });
};

(function() {
var filter_agis = function(data_matrix,agi) {
    if (! data_matrix || data_matrix.length < 1) {
        return [];
    }
    var id_col = -1,i;
    
    for (i = 0; i < data_matrix[0].length; i++) {
        if ((data_matrix[0][i] || '').toString().toLowerCase().match(/at[\dA-Z]g\d+/)) {
            id_col = i;
            break;
        }
    }
    if (id_col == -1) {
        return data_matrix;
    }
    var results = [];
    for (i = 0; i < data_matrix.length; i++ ) {
        if ( ! agi ) {
            results.push(data_matrix[i][id_col].toLowerCase());
        }
        if (agi && (data_matrix[i][id_col].toLowerCase() === agi.toLowerCase())) {
            results.push(data_matrix[i]);
        }
    }
    return results;
};

var find_peptide_cols = function(data_matrix) {
    if (data_matrix.length < 1) {
        return [];
    }
    var retriever = null, i;
    for (i = 0; i < data_matrix[0].length; i++) {
        var cell = data_matrix[0][i];
        var col = i;
        if (cell.toString().match(/\d+-\d+/)) {
            retriever = function() { return function(row) {
                var results = [];
                row[col].split(/,/).forEach(function(data) {
                    results.push(data.split(/-/));
                });
                return results;
            };}(i);
        }
        if (cell.toString().match(/^\d+$/)) {
            if (data_matrix[0][i+1] && data_matrix[0][i+1].toString().match(/^\d+$/)) {
                retriever = function() { return function(row) {
                    return [ row[col], row[col+1] ];
                };}(i);
            } else {
                retriever = function() { return function(row) {
                    return row[col];
                };}(i);
            }
            break;
        }
        if (cell.toString().match(/^[A-Z]+$/)) {
            retriever = function() { return function(row) {
                return row[col];
            };}(i);
        }
    }
    if (! retriever) {
        return [];
    }
    var results = [];
    for (i = 0; i < data_matrix.length; i++) {
        results.push(retriever.call(this,data_matrix[i]));
    }
    return results;
};

MASCP.UserdataReader.prototype.setData = function(name,data) {
    
    if ( ! data ) {
        return;
    }

    var self = this;
    
    MASCP.Service.CacheService(this);
    
    this.datasetname = name;
    this.data = data;
    
    var inserter = new MASCP.UserdataReader();
    inserter.datasetname = name;
    inserter.data = data;
    
    inserter.retrieve = function(agi,cback) {
        this.agi = agi;
        this._dataReceived(find_peptide_cols(filter_agis(this.data,this.agi)));
        cback.call(this);
    };
    
    MASCP.Service.CacheService(inserter);
    
    var agis = filter_agis(data);

    var retrieve = this.retrieve;

    this.retrieve = function(agi,cback) {
        console.log("Data not ready! Waiting for ready state");
        var self = this;        
        bean.add(self,'ready',function() {
            bend.remove(self,'ready',arguments.callee);
            self.retrieve(agi,cback);
        });
    };

    (function() {
        if (agis.length === 0) {
            self.retrieve = retrieve;
            bean.fire(self,'ready');
            return;
        }
        var agi = agis.shift();     
        inserter.retrieve(agi,arguments.callee);
    })();

};

MASCP.UserdataReader.datasets = function(cback) {
    MASCP.Service.FindCachedService(this,function(services) {
        var result = [];
        for (var i = 0, len = services.length; i < len; i++){
            result.push(services[i].replace(/MASCP.UserdataReader./,''));
        }
        if (result.forEach) {
            result.forEach(cback);
        }
    });
};

})();MascotToJSON = function() {
};

(function() {

var mascot_params = {
    /** Parameters that can be changed */
    'file'          : '',

    /** Required parameters */

    'do_export'     : '1',
    'export_format' : 'CSV',
    'protein_master': '1',
    'peptide_master': '1',
    'pep_seq'       : '1',
    'pep_score'     : '0',
    'REPORT'        : 'AUTO',
    'show_same_sets': '1',
    '_requireboldred': '1',
    '_ignoreionsscorebelow':'0.05',
    
    /** optional parameters */
    
    'prot_hit_num'  : '0',
    'pep_end'       : '0',
    'pep_miss'      : '0',
    'pep_homol'     : '0',
    'pep_ident'     : '0',
    'pep_frame'     : '0',
    'pep_var_mod'   : '0',
    'pep_num_match' : '0',
    'pep_scan_title': '0',
    'pep_query'     : '0',
    'pep_rank'      : "0",
    'pep_isbold'    : '0',
    'pep_exp_mz'    : '0',
    'pep_calc_mr'   : '0',
    'pep_exp_z'     : '0',
    'pep_exp_mr'    : '0',
    'pep_delta'     : '0',
    '_sigthreshold' : '0.05',
    '_showallfromerrortolerant':'0',
    '_onlyerrortolerant':'0',
    '_noerrortolerant':'0',
    '_show_decoy_report':'0',
    '_showsubsets'  : '0',
    '_server_mudpit_switch':'0.000000001'
};

var clone = function(obj){
    if(obj === null || typeof(obj) != 'object') {
        return obj;
    }

    var temp = obj.constructor(); // changed

    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            temp[key] = clone(obj[key]);
        }
    }
    return temp;
};

var params_to_url = function(params) {
    var result = [];
    for (var nam in params) {
        if (params.hasOwnProperty(nam)) {
            result.push(nam +'='+params[nam]);
        }
    }
    return result.join('&');
};

var CSVToArray = function( strData, strDelimiter ){
    strDelimiter = (strDelimiter || ",");

    var objPattern = new RegExp(
    (
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    "([^\"\\" + strDelimiter + "\\r\\n]*))"
    ),
    "gi"
    );

    var arrData = [[]];
    var arrMatches = null;
    while ((arrMatches = objPattern.exec( strData )) !== null){
        var strMatchedDelimiter = arrMatches[ 1 ];
        if (
        strMatchedDelimiter.length &&
        (strMatchedDelimiter != strDelimiter)
        ){
            arrData.push( [] );
        }
        var strMatchedValue;
        if (arrMatches[ 2 ]){
            strMatchedValue = arrMatches[ 2 ].replace(
            new RegExp( "\"\"", "g" ),
            "\""
            );
        } else {
            strMatchedValue = arrMatches[ 3 ];
        }
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }
    return( arrData );
};

var data_matrix_to_summary = function(data) {
    var results = [];
    var agi = null;
    var seen = {};
    data.forEach(function(row) {
        if (row[1] && row[1] !== '') {
            agi = row[1];
        }
        var pep_seq = row[6]+row[7]+row[8];
        if ( pep_seq && ! seen[agi+pep_seq]) {
            results.push([agi,pep_seq]);            
        }
        seen[agi+pep_seq] = 1;
    });
    return results;
};


MascotToJSON.prototype.convertReport = function(report,callback) {
    var self = this;
    var xhr = new window.XMLHttpRequest();
    var report_base = report.replace(/master_results(_2)?.pl.*/,'export_dat_2.pl');
    var file_url = (/file=([^&]*)/.exec(report) || []).shift();
    var params = clone(mascot_params);
    params.file = file_url;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if(xhr.status == 200) {
                var response = xhr.responseText;
                // Remove the header lines from the mascot response
                response = response.replace(/(.+\n)+\n.*\n/m,'');
                if (callback) {
                    callback.call(self,data_matrix_to_summary(CSVToArray(response)));
                }
            } else if (xhr.status === 0) {
                if (callback) {
                    callback.call(self,[],new Error("Could not load page"));
                }
            }
        }        
    };
    xhr.open("GET", report_base+'?'+params_to_url(params), true);
    xhr.send(null);
};

})();


if (typeof module != 'undefined' && module.exports){
    module.exports.MascotToJSON = MascotToJSON;
}