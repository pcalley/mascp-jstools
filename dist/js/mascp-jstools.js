/*!
  * bean.js - copyright Jacob Thornton 2011
  * https://github.com/fat/bean
  * MIT License
  * special thanks to:
  * dean edwards: http://dean.edwards.name/
  * dperini: https://github.com/dperini/nwevents
  * the entire mootools team: github.com/mootools/mootools-core
  */
!function (context) {
  var __uid = 1,
      registry = {},
      collected = {},
      overOut = /over|out/,
      namespace = /[^\.]*(?=\..*)\.|.*/,
      stripName = /\..*/,
      addEvent = 'addEventListener',
      attachEvent = 'attachEvent',
      removeEvent = 'removeEventListener',
      detachEvent = 'detachEvent',
      doc = context.document || {},
      root = doc.documentElement || {},
      W3C_MODEL = root[addEvent],
      eventSupport = W3C_MODEL ? addEvent : attachEvent,

  isDescendant = function (parent, child) {
    var node = child.parentNode;
    while (node !== null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
  },

  retrieveUid = function (obj, uid) {
    return (obj.__uid = uid && (uid + '::' + __uid++) || obj.__uid || __uid++);
  },

  retrieveEvents = function (element) {
    var uid = retrieveUid(element);
    return (registry[uid] = registry[uid] || {});
  },

  listener = W3C_MODEL ? function (element, type, fn, add) {
    element[add ? addEvent : removeEvent](type, fn, false);
  } : function (element, type, fn, add, custom) {
    custom && add && (element['_on' + custom] = element['_on' + custom] || 0);
    element[add ? attachEvent : detachEvent]('on' + type, fn);
  },

  nativeHandler = function (element, fn,args) {
    return function (event,arg) {
      event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || context).event);
      return fn.apply(element, [event].concat(args).concat(arg));
    };
  },

  customHandler = function (element, fn, type, condition, args) {
    return function (e) {
      if (condition ? condition.apply(this, arguments) : W3C_MODEL ? true : e && e.propertyName == '_on' + type || !e) {
        fn.apply(element, Array.prototype.slice.call(arguments, e ? 0 : 1).concat(args));
      }
    };
  },

  addListener = function (element, orgType, fn, args) {
    var type = orgType.replace(stripName, ''),
        events = retrieveEvents(element),
        handlers = events[type] || (events[type] = {}),
        originalFn = fn,
        uid = retrieveUid(fn, orgType.replace(namespace, ''));
    if (handlers[uid]) {
      return element;
    }
    var custom = customEvents[type];
    if (custom) {
      fn = custom.condition ? customHandler(element, fn, type, custom.condition) : fn;
      type = custom.base || type;
    }
    var isNative = nativeEvents[type];
    fn = isNative ? nativeHandler(element, fn, args) : customHandler(element, fn, type, false, args);
    isNative = W3C_MODEL || isNative;
    if (type == 'unload') {
      var org = fn;
      fn = function () {
        removeListener(element, type, fn) && org();
      };
    }
    element[eventSupport] && listener(element, isNative ? type : 'propertychange', fn, true, !isNative && type);
    handlers[uid] = fn;
    fn.__uid = uid;
    fn.__originalFn = originalFn;
    return type == 'unload' ? element : (collected[retrieveUid(element)] = element);
  },

  removeListener = function (element, orgType, handler) {
    var uid, names, uids, i, events = retrieveEvents(element), type = orgType.replace(stripName, '');
    if (!events || !events[type]) {
      return element;
    }
    names = orgType.replace(namespace, '');
    uids = names ? names.split('.') : [handler.__uid];

    function destroyHandler(uid) {
      handler = events[type][uid];
      if (!handler) {
        return;
      }
      delete events[type][uid];
      if (element[eventSupport]) {
        type = customEvents[type] ? customEvents[type].base : type;
        var isNative = W3C_MODEL || nativeEvents[type];
        listener(element, isNative ? type : 'propertychange', handler, false, !isNative && type);
      }
    }

    destroyHandler(names); //get combos
    for (i = uids.length; i--; destroyHandler(uids[i])) {} //get singles

    return element;
  },

  del = function (selector, fn, $) {
    return function (e) {
      var array = typeof selector == 'string' ? $(selector, this) : selector;
      for (var target = e.target; target && target != this; target = target.parentNode) {
        for (var i = array.length; i--;) {
          if (array[i] == target) {
            return fn.apply(target, arguments);
          }
        }
      }
    };
  },

  add = function (element, events, fn, delfn, $) {
    if (typeof events == 'object' && !fn) {
      for (var type in events) {
        events.hasOwnProperty(type) && add(element, type, events[type]);
      }
    } else {
      var isDel = typeof fn == 'string', types = (isDel ? fn : events).split(' ');
      fn = isDel ? del(events, delfn, $) : fn;
      for (var i = types.length; i--;) {
        addListener(element, types[i], fn, Array.prototype.slice.call(arguments, isDel ? 4 : 3));
      }
    }
    return element;
  },

  remove = function (element, orgEvents, fn) {
    var k, m, type, events, i,
        isString = typeof(orgEvents) == 'string',
        names = isString && orgEvents.replace(namespace, ''),
        names = names && names.split('.'),
        rm = removeListener,
        attached = retrieveEvents(element);
    if (isString && /\s/.test(orgEvents)) {
      orgEvents = orgEvents.split(' ');
      i = orgEvents.length - 1;
      while (remove(element, orgEvents[i]) && i--) {}
      return element;
    }
    events = isString ? orgEvents.replace(stripName, '') : orgEvents;
    if (!attached || names || (isString && !attached[events])) {
      for (k in attached) {
        if (attached.hasOwnProperty(k)) {
          for (i in attached[k]) {
            for (m = names.length; m--;) {
              attached[k].hasOwnProperty(i) && new RegExp('^' + names[m] + '::\\d*(\\..*)?$').test(i) && rm(element, [k, i].join('.'));
            }
          }
        }
      }
      return element;
    }
    if (typeof fn == 'function') {
      rm(element, events, fn);
    } else if (names) {
      rm(element, orgEvents);
    } else {
      rm = events ? rm : remove;
      type = isString && events;
      events = events ? (fn || attached[events] || events) : attached;
      for (k in events) {
        if (events.hasOwnProperty(k)) {
          rm(element, type || k, events[k]);
          delete events[k]; // remove unused leaf keys
        }
      }
    }
    return element;
  },

  fire = function (element, type, args) {
    var evt, k, i, m, types = type.split(' ');
    for (i = types.length; i--;) {
      type = types[i].replace(stripName, '');
      var isNative = nativeEvents[type],
          isNamespace = types[i].replace(namespace, ''),
          handlers = retrieveEvents(element)[type];
      if (isNamespace) {
        isNamespace = isNamespace.split('.');
        for (k = isNamespace.length; k--;) {
          for (m in handlers) {
            handlers.hasOwnProperty(m) && new RegExp('^' + isNamespace[k] + '::\\d*(\\..*)?$').test(m) && handlers[m].apply(element, [false].concat(args));
          }
        }
      } else if (!args && element[eventSupport]) {
        fireListener(isNative, type, element);
      } else {
        for (k in handlers) {
          handlers.hasOwnProperty(k) && handlers[k].apply(element, [false].concat(args));
        }
      }
    }
    return element;
  },

  fireListener = W3C_MODEL ? function (isNative, type, element) {
    evt = document.createEvent(isNative ? "HTMLEvents" : "UIEvents");
    evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, context, 1);
    element.dispatchEvent(evt);
  } : function (isNative, type, element) {
    isNative ? element.fireEvent('on' + type, document.createEventObject()) : element['_on' + type]++;
  },

  clone = function (element, from, type) {
    var events = retrieveEvents(from), obj, k;
    var uid = retrieveUid(element);
    obj = type ? events[type] : events;
    for (k in obj) {
      obj.hasOwnProperty(k) && (type ? add : clone)(element, type || from, type ? obj[k].__originalFn : k);
    }
    return element;
  },

  fixEvent = function (e) {
    var result = {};
    if (!e) {
      return result;
    }
    var type = e.type, target = e.target || e.srcElement;
    result.preventDefault = fixEvent.preventDefault(e);
    result.stopPropagation = fixEvent.stopPropagation(e);
    result.target = target && target.nodeType == 3 ? target.parentNode : target;
    if (~type.indexOf('key')) {
      result.keyCode = e.which || e.keyCode;
    } else if ((/click|mouse|menu/i).test(type)) {
      result.rightClick = e.which == 3 || e.button == 2;
      result.pos = { x: 0, y: 0 };
      if (e.pageX || e.pageY) {
        result.clientX = e.pageX;
        result.clientY = e.pageY;
      } else if (e.clientX || e.clientY) {
        result.clientX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        result.clientY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      overOut.test(type) && (result.relatedTarget = e.relatedTarget || e[(type == 'mouseover' ? 'from' : 'to') + 'Element']);
    }
    for (var k in e) {
      if (!(k in result)) {
        result[k] = e[k];
      }
    }
    return result;
  };

  fixEvent.preventDefault = function (e) {
    return function () {
      if (e.preventDefault) {
        e.preventDefault();
      }
      else {
        e.returnValue = false;
      }
    };
  };

  fixEvent.stopPropagation = function (e) {
    return function () {
      if (e.stopPropagation) {
        e.stopPropagation();
      } else {
        e.cancelBubble = true;
      }
    };
  };

  var nativeEvents = { click: 1, dblclick: 1, mouseup: 1, mousedown: 1, contextmenu: 1, //mouse buttons
    mousewheel: 1, DOMMouseScroll: 1, //mouse wheel
    mouseover: 1, mouseout: 1, mousemove: 1, selectstart: 1, selectend: 1, //mouse movement
    keydown: 1, keypress: 1, keyup: 1, //keyboard
    orientationchange: 1, // mobile
    touchstart: 1, touchmove: 1, touchend: 1, touchcancel: 1, // touch
    gesturestart: 1, gesturechange: 1, gestureend: 1, // gesture
    focus: 1, blur: 1, change: 1, reset: 1, select: 1, submit: 1, //form elements
    load: 1, unload: 1, beforeunload: 1, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
    error: 1, abort: 1, scroll: 1 }; //misc

  function check(event) {
    var related = event.relatedTarget;
    if (!related) {
      return related === null;
    }
    return (related != this && related.prefix != 'xul' && !/document/.test(this.toString()) && !isDescendant(this, related));
  }

  var customEvents = {
    mouseenter: { base: 'mouseover', condition: check },
    mouseleave: { base: 'mouseout', condition: check }
//    mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
  };

  var bean = { add: add, remove: remove, clone: clone, fire: fire };

  var clean = function (el) {
    var uid = remove(el).__uid;
    if (uid) {
      delete collected[uid];
      delete registry[uid];
    }
  };

  if (context[attachEvent]) {
    add(context, 'unload', function () {
      for (var k in collected) {
        collected.hasOwnProperty(k) && clean(collected[k]);
      }
      context.CollectGarbage && CollectGarbage();
    });
  }

  var oldBean = context.bean;
  bean.noConflict = function () {
    context.bean = oldBean;
    return this;
  };

  (typeof module !== 'undefined' && module.exports) ?
    (module.exports = bean) :
    (context['bean'] = bean);

}(this);//"use strict";

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
}/**
 * @fileOverview    Read in sequences to be re-rendered in a block that can be easily annotated.
 */

if ( typeof MASCP == 'undefined' ) {
    MASCP = {};
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
    }
}


/**
 *  @lends MASCP.Group.prototype
 *  @property   {String}        name                        Name for this group to be used as an identifier
 *  @property   {String}        fullname                    The full (long) name for this group, that can be used in UI widgets for labelling
 *  @property   {String}        color                       Color string to apply to this group
 *  @property   {Boolean}       hide_member_controllers     For controllers for this group, do not show the layer controllers for this group
 *  @property   {Boolean}       hide_group_controller       For controllers for this group do not show the parent group controller
 */

/**
 * Register a group with metadata for all sequence renderers.
 * @static
 * @param {String} groupName    Name to give to this group
 * @param {Hash} options        Options to apply to this group - see MASCP.Group for all the fields
 * @returns New group object
 * @type MASCP.Group
 * @see MASCP.event:groupRegistered
 * @see MASCP.Group
 */
MASCP.registerGroup = function(groupName, options)
{
    if ( ! this.groups ) {
        this.groups = {};
    }
    if (this.groups[groupName]) {
        return;
    }
    
    var group = new MASCP.Group();
    
    group.name = groupName;
    
    options = options || {};
    
    if (options.hide_member_controllers) {
        group.hide_member_controllers = true;
    }

    if (options.hide_group_controller) {
        group.hide_group_controller = true;
    }

    if (options.fullname) {
        group.fullname = options.fullname;
    }
    
    if (options.color) {
        group.color = options.color;
    }

    if (options.group) {
        group.group = this.getGroup(options.group);
        if ( ! group.group ) {
            throw "Cannot register this layer with the given group - the group has not been registered yet";
        }
        group.group._layers.push(group);
    }

    group._layers = [];

    group.group_id = new Date().getMilliseconds();
    
    this.groups[groupName] = group;
    
    bean.fire(MASCP,'groupRegistered',[group]);
    
    return group;
};

/**
 *  @lends MASCP.Layer.prototype
 *  @property   {String}        name        Name for this layer to be used as an identifier
 *  @property   {String}        fullname    The full (long) name for this layer, that can be used in UI widgets for labelling
 *  @property   {String}        color       Color string to apply to this layer
 *  @property   {MASCP.Group}   group       Group that this layer is part of. Either a group object, or the name for the group.
 *  @property   {String}        css         CSS block for this layer. Active and inactive layers are children of the .active and .inactive classes respectively. To target a track-based rendering, use the .tracks class first, and to target overlays, use the .overlay class last
 *  @property   {Object}        data        Data for this layer
 */

/**
 * Register a layer with metadata for all sequence renderers.
 * @static
 * @param {String} layerName    Name to give to this layer
 * @param {Hash} options        Options to set field values for this layer - see the fields for MASCP.Layer.
 * @returns New layer object
 * @type MASCP.Layer
 * @see MASCP.Layer
 * @see MASCP.event:layerRegistered
 */
MASCP.registerLayer = function(layerName, options)
{
    if ( ! this.layers ) {
        this.layers = {};
    }
    if (this.layers[layerName]) {
        if (this.layers[layerName].disabled) {
            this.layers[layerName].disabled = false;
            bean.fire(MASCP,'layerRegistered',[this.layers[layerName]]);
        }
        return this.layers[layerName];
    }
    
    var layer = new MASCP.Layer();
    
    layer.name = layerName;
    
    options = options || {};
    
    if (options.fullname) {
        layer.fullname = options.fullname;
    }
    
    if (options.color) {
        layer.color = options.color;
    }
    
    if (options.group) {
        layer.group = this.getGroup(options.group);
        if ( ! layer.group ) {
            throw "Cannot register this layer with the given group - the group has not been registered yet";
        }
        layer.group._layers.push(layer);
    }
    
    if (options.data) {
        layer.data = options.data;
    }
    
    
    this.layers[layerName] = layer;
    
    if (options.css) {
        layerCss = options.css;
        layerCss = layerCss.replace(/\.inactive/g, '.'+layerName+'_inactive .'+layerName);
        layerCss = layerCss.replace(/\.tracks\s+\.active/g, '.'+layerName+'_active .track .'+layerName);
        layerCss = layerCss.replace(/\.active/g, '.'+layerName+'_active .'+layerName);
        layerCss = layerCss.replace(/\.overlay/g, '.'+layerName+'_overlay');
        jQuery('<style type="text/css">'+layerCss+'</style>').appendTo('head');
    }
    layer.layer_id = new Date().getMilliseconds();
    
    bean.fire(MASCP,'layerRegistered',[layer]);
    
    return layer;
};

/**
 * @class
 * Metadata for a group of layers to be rendered
 */
MASCP.Group = function() {
    return;
};

/**
 * Describe what this method does
 * @private
 * @param {String|Object|Array|Boolean|Number} paramName Describe this parameter
 * @returns Describe what it returns
 * @type String|Object|Array|Boolean|Number
 */
MASCP.Group.prototype.size = function() {
    var counter = 0;
    for (var i = 0 ; i < this._layers.length; i++ ) {
        if (! this._layers[i].disabled) {
            counter += 1;
        }
    }
    return counter;
};

MASCP.Group.prototype.eachLayer = function(func) {
    for (var i = 0 ; i < this._layers.length; i++ ) {
        if (! this._layers[i].disabled) {
            func.call(this._layers[i],this._layers[i]);
        }
    }    
};

/**
 * @class
 * Metadata for a single layer to be rendered
 */
MASCP.Layer = function() {
    return;
};

/**
 * @class   Reformatter for sequences in html pages. The object retrieves the amino acid sequence from the 
 *          given element, and then reformats the display of the sequence so that rendering layers can be
 *          applied to it. 
 * @author  hjjoshi
 * @param   {Element} sequenceContainer Container element that the sequence currently is found in, and also 
 *                                      the container that data will be re-inserted into.
 * @requires jQuery
 */
MASCP.SequenceRenderer = (function() {

    /**
     *  @lends MASCP.SequenceRenderer.prototype
     *  @property   {Array}     trackOrder  The order of tracks on the renderer, an array of layer/group names.
     */
    var setupTrackOrder = function(renderer) {
        var renderer_track_order = [];

        var accessors = {

            getTrackOrder: function() {
                return renderer_track_order;
            },

            setTrackOrder: function(in_order) {
                var track_order = [];
                var order = in_order;
                if ( ! order instanceof Array ) {
                    order = [ in_order ];
                }

                for (var i = 0; i < order.length; i++) {
                    var a_track = order[i];
                    if (MASCP.getLayer(a_track)) {
                        track_order.push(a_track);                        
                    } else if (MASCP.getGroup(a_track)) {
                        MASCP.getGroup(order[i]).eachLayer(function(grp_lay) {
                            order.splice(i+1,0,grp_lay.name);
                        });
                    }
                }

                for (i = ((renderer_track_order || []).length - 1); i >= 0; i--) {
                    if (track_order.indexOf(renderer_track_order[i]) < 0) {
                        this.hideLayer(renderer_track_order[i]);
                        this.hideGroup(renderer_track_order[i]);
                        jQuery(MASCP.getLayer(renderer_track_order[i])).trigger('removed');
                        jQuery(MASCP.getGroup(renderer_track_order[i])).trigger('removed');
                    }
                }
                renderer_track_order = track_order;
                if (this.refresh) {
                    this.refresh(true);
                }
            }
        };

        if (renderer.__defineSetter__) {    
            renderer.__defineSetter__("trackOrder", accessors.setTrackOrder);
            renderer.__defineGetter__("trackOrder", accessors.getTrackOrder);
        }

        if (MASCP.IE) {
            renderer.setTrackOrder = accessors.setTrackOrder;
        }

        if ((typeof Object.defineProperty == 'function') && MASCP.IE && ! MASCP.IE8 ) {
            Object.defineProperty(renderer,"trackOrder", {
                get : accessors.getTrackOrder,
                set : accessors.setTrackOrder
            });
        }
    };

    return function(sequenceContainer) {
        if (typeof sequenceContainer !== 'undefined') {
            this._container = sequenceContainer;
            this._container.style.position = 'relative';
    //        this._container.style.width = '100%';

            jQuery(this).bind('sequenceChange', function(e){
                jQuery(sequenceContainer).text("");
                jQuery(sequenceContainer).append(this._sequence_els);
                jQuery(sequenceContainer).append(jQuery('<div style="clear: both; float: none; height: 0px; width: 100%;"></div>'));
                sequenceContainer.style.width = (this._sequence_els.length)+'em';
    //            this.showRowNumbers();            
            });

            this.setSequence(jQuery(sequenceContainer).text());
        }
        
        setupTrackOrder(this);
        
        return this;
    };
})();

/**
 * Event fired when a layer is registered with the global layer registry
 * @name    MASCP.layerRegistered
 * @event
 * @param   {Object}    e
 * @param   {Object}    layer Layer just registered
 */

/**
 * Event fired when a group is registered with the global group registry
 * @name    MASCP.groupRegistered
 * @event
 * @param   {Object}    e
 * @param   {Object}    group Group just registered
 */

/**
 * Event fired when the sequence is changed in a sequence renderer
 * @name    MASCP.SequenceRenderer#sequenceChange
 * @event
 * @param   {Object}    e
 */

/**
 * Event fired when a result is rendered on this renderer
 * @name    MASCP.SequenceRenderer#resultsRendered
 * @event
 * @param   {Object}    e
 * @param   {MASCP.Service} reader  Reader that rendered the result.
 */

/**
 * @name    MASCP.Group#visibilityChange
 * @event
 * @param   {Object}    e
 * @param   {Object}    renderer
 * @param   {Boolean}   visibility
 */

/**
 * @name    MASCP.Layer#visibilityChange
 * @event
 * @param   {Object}    e
 * @param   {Object}    renderer
 * @param   {Boolean}   visibility
 */



/**
 *  @lends MASCP.SequenceRenderer.prototype
 *  @property   {String}  sequence  Sequence to mark up.
 */
MASCP.SequenceRenderer.prototype = {
    sequence: null 
};
 
if ( MASCP.IE ) {
    MASCP.SequenceRenderer.prototype.prototype = document.createElement('div');
}


/**
 * Set the sequence for this renderer. Fires the sequenceChange event when the sequence is set.
 * @param {String} sequence Sequence to render
 * @see MASCP.SequenceRenderer#event:sequenceChange
 */
MASCP.SequenceRenderer.prototype.setSequence = function(sequence)
{
    this.sequence = this._cleanSequence(sequence);
    var sequence_els = [];
    var renderer = this;
    if ( ! this.sequence ) {
        return;
    }
    var seq_chars = this.sequence.split('');
    for (var i =0; i < seq_chars.length; i++) {
        var aa = seq_chars[i];
        if (aa.match(/[A-Za-z]/)) {
            sequence_els.push(jQuery('<span>'+aa+'</span>')[0]);
        }
    }

    jQuery(sequence_els).each( function(i) {
        // if ( (i % 10) == 0 && i > 0 && ((i % 50) != 0)) {
        //     this.style.margin = '0px 0px 0px 1em';
        // }
        // if ( (i % 50) == 0 && i > 0 ) {
        //     if (MASCP.IE7) {
        //         sequence_els[i-1].style.styleFloat = 'none';
        //         sequence_els[i-1].style.width = '1em';
        //     }
        //     this.style.clear = 'both';
        // }
        
        this._index = i;
        
        this.style.display = 'block';
        this.style.cssFloat = 'left';
        this.style.styleFloat = 'left';
        this.style.height = '1.1em';
        this.style.position = 'relative';

        this.addToLayer = MASCP.SequenceRenderer.addElementToLayer;
        this.addBoxOverlay = MASCP.SequenceRenderer.addBoxOverlayToElement;
        this.addToLayerWithLink = MASCP.SequenceRenderer.addElementToLayerWithLink;
        this._renderer = renderer;
    });
    this._sequence_els = sequence_els;   
    jQuery(this).trigger('sequenceChange');
};

/**
 * Color some residues on this residue
 * @param {Array} indexes Indexes to apply the given color to
 * @param {String} color Color to use to highlight the residues
 * @returns ID for the layer that is created
 * @type String
 */
MASCP.SequenceRenderer.prototype.colorResidues = function(indexes, color) {
    var layer_id = Math.floor(Math.random()*1000).toString();
    MASCP.registerLayer(layer_id, { 'color' : (color || '#ff0000') });
    var aas = this.getAminoAcidsByPosition(indexes);
    for (var i = 0; i < aas.length; i++ ) {
        aas[i].addToLayer(layer_id);
    }
    return MASCP.getLayer(layer_id);
};


MASCP.SequenceRenderer.prototype._cleanSequence = function(sequence) {
    if ( ! sequence ) {
        return sequence;
    }
    var cleaned_sequence = sequence;
    cleaned_sequence = cleaned_sequence.replace(new RegExp(String.fromCharCode(160),"g"),'');
    cleaned_sequence = cleaned_sequence.replace(/[\n\t\s\d]+/mgi,'');
    cleaned_sequence = cleaned_sequence.replace(/\(.*\)/g,'');
    return cleaned_sequence;
};

/**
 * Retrieve the HTML Elements that contain the amino acids at the given positions. The first amino acid is found at position 1.
 * @param {Array} indexes Indexes to retrieve elements for
 * @returns Elements representing each amino acid at the given positions
 * @type Array
 */
MASCP.SequenceRenderer.prototype.getAminoAcidsByPosition = function(indexes) {
    var sequence_els = this._sequence_els;
    return jQuery.map(indexes, function(index) {
        return sequence_els[index-1];
    });
};

MASCP.SequenceRenderer.prototype.getAA = function(index) {
    return this.getAminoAcidsByPosition([index]).shift();
};


/**
 * Retrieve the HTML Elements that contain the amino acids contained in the given peptide sequence.
 * @param {String} peptideSequence Peptide sequence used to look up the amino acids
 * @returns Elements representing each amino acid at the given positions
 * @type Array
 */
MASCP.SequenceRenderer.prototype.getAminoAcidsByPeptide = function(peptideSequence) {
    var start = this.sequence.indexOf(peptideSequence);
    var results = [];

    if (start < 0) {
        results.addToLayer = function() {};
        return results;
    }
    results = results.concat(this._sequence_els.slice(start,start+(peptideSequence.length)));
    if (results.length) {
        results.addToLayer = function(layername, fraction) {
            return results[0].addBoxOverlay(layername,results.length,fraction);
        };
    } else {
        results.addToLayer = function() {};
    }
        
    return results;
};

/*
 * Show the row numbers on the display of the sequence.
 */
MASCP.SequenceRenderer.prototype.showRowNumbers = function() {
    var numbers = jQuery('<div style="position: absolute; top: 0px; left: 0px; width: 2em;"></div>');
    jQuery(this._sequence_els).each( function(i) {
        if ( (i % 50) === 0) {
            this.style.marginLeft = '3em';
            numbers.append(jQuery('<div style="text-align: right; height: 1.1em;">'+(i+1)+'</div>')[0]);
        }
    });
    jQuery(this._container).append(numbers);
    return this;
};

/**
 * Toggle the display of the given layer
 * @param {String|Object} layer Layer name, or layer object
 * @see MASCP.Layer#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.toggleLayer = function(layer,consumeChange) {
    var layerName = layer;
    if (typeof layer != 'string') {
        layerName = layer.name;
    } else {
        layer = MASCP.layers[layer];
    }
    jQuery(this._container).toggleClass(layerName+'_active');
    jQuery(this._container).toggleClass(layerName+'_inactive');
    if ( ! consumeChange ) {
        jQuery(layer).trigger('visibilityChange',[this,this.isLayerActive(layer)]);
    }
    return this;
};

/**
 * Show the given layer
 * @param {String|Object} layer Layer name, or layer object
 * @see MASCP.Layer#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.showLayer = function(lay,consumeChange) {
    var layer = MASCP.getLayer(lay);

    if (! layer || layer.disabled) {
        return;
    }
    jQuery(this._container).addClass(layer.name+'_active');
    jQuery(this._container).addClass('active_layer');    
    jQuery(this._container).removeClass(layer.name+'_inactive');
    if ( ! consumeChange ) {
        jQuery(layer).trigger('visibilityChange',[this,true]);
    }
    return this;
};

/**
 * Hide the given layer
 * @param {String|Object} layer Layer name, or layer object
 * @see MASCP.Layer#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.hideLayer = function(lay,consumeChange) {
    var layer = MASCP.getLayer(lay);

    if (! layer || layer.disabled) {
        return;
    }
        
    jQuery(this._container).removeClass(layer.name+'_active');
    jQuery(this._container).removeClass('active_layer');
    jQuery(this._container).addClass(layer.name+'_inactive');
    if (! consumeChange ) {
        jQuery(layer).trigger('visibilityChange',[this,false]);
    }
    return this;
};

/**
 * Register a layer with this renderer. Actually is a proxy on to the global registry method
 * @see MASCP#registerLayer
 */
MASCP.SequenceRenderer.prototype.registerLayer = function(layer,options) {
    return MASCP.registerLayer(layer,options);
};

/**
 * Hide or show a group. Fires an event when this method is called.
 * @param {Object} grp Group to set the visibility for
 * @param {Boolean} visibility True for visible, false for hidden
 * @see MASCP.Group#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.setGroupVisibility = function(grp,visibility,consumeChange) {
    var group = MASCP.getGroup(grp);
    if ( ! group ) {
        return;
    }
    var groupName = group.name;
    
    var renderer = this;

    group.eachLayer(function(layer) {
        if (MASCP.getGroup(layer) === layer) {
            // We can skip explicitly setting the visibility of groups here, since
            // any sub-groups should have a controller.
            return;
        }
        if (this.disabled && visibility) {
            renderer.hideLayer(layer.name);
            return;
        }
        if (visibility === true) {
            renderer.showLayer(layer.name);
        } else if (visibility === false) {
            renderer.hideLayer(layer.name);                
        } else {
            renderer.toggleLayer(layer.name);
        }
    });
    if (visibility !== null && ! consumeChange) {
        jQuery(group).trigger('visibilityChange',[renderer,visibility]);
    }
};

/**
 * Hide a group. Fires an event when this method is called.
 * @param {Object} grp Group to set the visibility for
 * @see MASCP.Group#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.hideGroup = function(group,consumeChange) {
    this.setGroupVisibility(group,false,consumeChange);
};

/**
 * Show a group. Fires an event when this method is called.
 * @param {Object} grp Group to set the visibility for
 * @see MASCP.Group#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.showGroup = function(group,consumeChange) {
    this.setGroupVisibility(group,true,consumeChange);
};

/**
 * Toggle the visibility for a group. Fires an event when this method is called.
 * @param {Object} grp Group to set the visibility for
 * @see MASCP.Group#event:visibilityChange
 */
MASCP.SequenceRenderer.prototype.toggleGroup = function(group,consumeChange) {
    this.setGroupVisibility(group,consumeChange);
};

/**
 * Check if the given layer is active
 * @param {String|Object} layer Layer name, or layer object
 * @returns Whether this layer is active on this renderer
 * @type Boolean
 */
MASCP.SequenceRenderer.prototype.isLayerActive = function(layer) {
    var layerName = layer;
    if (typeof layer != 'string') {
        layerName = layer.name;
    }
    return (! layer.disabled) && jQuery(this._container).hasClass(layerName+'_active');
};

/**
 * Deprecated until there's a better implementation for the CondensedSequenceRenderer
 * @private
 */

MASCP.SequenceRenderer.prototype._setHighlight = function(layer,isHighlighted) {
    return;
};

/**
 * Create a layer controller for this sequence renderer. Attach the controller to the containing box, and shift the box across 20px.
 */
MASCP.SequenceRenderer.prototype.createLayerController = function() {
    var controller_box = jQuery('<div style="position: absolute; top: 0px; font-family: Helvetica, Arial, Sans-serif; margin-left: 20px; left: 100%; width: 250px;"></div>');
    var container = jQuery(this._container);
    container.append(controller_box);

    if ( ! this._controllers ) {
        this._controllers = [];
    }
    this._controllers.push(controller_box);

    var renderer = this;
    
    jQuery(MASCP).bind('layerRegistered', function(e) {
		jQuery(controller_box).accordion('destroy');
		jQuery(controller_box).accordion({header : 'h3', collapsible : true, autoHeight: true, active: false });
	});
    
    
    controller_box.add_layer = function(layer) {
        var layer_controller = jQuery('<div><input type="checkbox"/>'+layer.fullname+'</div>');
        if (layer.group) {
            jQuery(layer.group._layer_container).append(layer_controller);
        } else {
            jQuery(this).append(layer_controller);
        }
        
        renderer.createLayerCheckbox(layer,jQuery('input',layer_controller)[0]);
    };

    controller_box.add_group = function(group) {
        var layer_controller = jQuery('<h3><input style="margin-left: 25px;" type="checkbox"/>'+group.fullname+'</h3>');
        jQuery(this).append(layer_controller);
        var children_container = jQuery('<div style="max-height: 200px; overflow: auto;"></div>');
        jQuery(this).append(children_container);
        
        group._layer_container = children_container[0];
        group._controller = layer_controller;
        
        group._check_intermediate = function() {
            var checked = 0;
            jQuery(group._layers).each(function(i) {
                if (renderer.isLayerActive(this.name)) {
                    checked++;
                }
            });
            var input_el = jQuery('input',layer_controller)[0];
            input_el.indeterminate = (checked !== 0 && checked != group._layers.length);
            if (! input_el.indeterminate ) {
                input_el.checked = (checked !== 0);
            }
        };
        
        jQuery(jQuery('input',layer_controller)[0]).bind('mouseup',function(e) {
            if (this.indeterminate) {
                jQuery(this).trigger('change');
            }
        });

        renderer.createGroupCheckbox(group,jQuery('input',layer_controller)[0]);
        
    };

    
    bean.add(MASCP,"layerRegistered",function(e,layer) {
        if (layer.group && layer.group.hide_member_controllers) {
            return;
        }
        controller_box.add_layer(layer);
    });

    bean.add(MASCP,"groupRegistered",function(e,group) {
        if (group.hide_group_controller) {
            return;
        }
        controller_box.add_group(group);
    });

    
    if (MASCP.layers) {
        for (var layerName in MASCP.layers) {
            if (MASCP.layers.hasOwnProperty(layerName)) {
                var layer = MASCP.layers[layerName];
                if (layer.group && layer.group.hide_member_controllers) {
                    continue;
                }
                controller_box.add_layer(layer);
            }
        }
    }
    return this;
};

/*
 * Create a hydropathy plot for this renderer
 * @returns Element with the hydropathy plot
 * @type Element
MASCP.SequenceRenderer.prototype.getHydropathyPlot = function() {
    var base_url = 'http://www.plantenergy.uwa.edu.au/applications/hydropathy/hydropathy.php?title=Hydropathy&amp;sequence=';
    return jQuery('<img style="width: '+(this.sequence.length * 2)+'px;" src="'+base_url+this.sequence+'"/>')[0];
};
*/

/**
 * Create a checkbox that is used to control the given layer
 * @param {String|Object} layer Layer name or layer object that a controller should be generated for
 * @param {Object} inputElement Optional input element to bind events to. If no element is given, a new one is created.
 * @returns Checkbox element that when checked will toggle on the layer, and toggle it off when unchecked
 * @type Object
 */
MASCP.SequenceRenderer.prototype.createLayerCheckbox = function(layer,inputElement,exclusive) {
    var renderer = this;

    if (! MASCP.layers[layer]) {
        return;
    }


    var layerObj = null;
    
    if (typeof layer == 'string' && MASCP.layers ) {
        layerObj = MASCP.layers[layer];
    } else if (typeof layer == 'object') {
        layerObj = layer;
    }

    if ( ! layerObj ) {
        return;
    }
    
    
    
    var the_input = inputElement || jQuery('<input type="checkbox" value="true"/>')[0];
    
    the_input._current_bindings = the_input._current_bindings || [];
    
    if (exclusive) {
        this._removeOtherBindings(layerObj,the_input);
    }
    
    for (var i = 0; i < the_input._current_bindings.length; i++) {
        if (    the_input._current_bindings[i].layer == layer && 
                the_input._current_bindings[i].renderer == renderer ) {
            return;
        }
    }
    
    the_input.removeAttribute('checked');
    the_input.checked = this.isLayerActive(layer);

    var layer_func = null;

    if (layerObj && the_input._current_bindings.length === 0) {
        layer_func = function(e,rend,visibility) {
            if (rend != renderer) {
                return;
            }
            if (visibility) {
                the_input.checked = visibility;
            } else {
                the_input.checked = false;
                the_input.removeAttribute('checked');
            }
        };
        jQuery(layerObj).bind("visibilityChange",layer_func);
        if (the_input.parentNode) {
            the_input.parentNode.insertBefore(jQuery('<div style="position: relative; left: 0px; top: 0px; float: left; background-color: '+layerObj.color+'; width: 1em; height: 1em;"></div>')[0],the_input);
        }
    }


    var input_func = function(e) {
        if (this.checked) {
            renderer.showLayer(layer,false);
        } else {
//            renderer.hideLayer(layer,false);
        }
        if (MASCP.getLayer(layer).group && MASCP.getLayer(layer).group._check_intermediate) {
            MASCP.getLayer(layer).group._check_intermediate();
        }
    };

    jQuery(the_input).bind( (MASCP.IE ? 'click' : 'change'),input_func);
    
    the_input._current_bindings.push({ 'layer' : layer , 'renderer' : renderer, 'input_function' : input_func, 'object_function' : layer_func });    
    
    return the_input;    
};

/**
 * Retrieve a layer object from the layer registry. If a layer object is passed to this method, the same layer is returned.
 * @param {String} layer    Layer name
 * @returns Layer object
 * @type Object
 * @see MASCP.Layer
 */
MASCP.getLayer = function(layer) {
    if ( ! MASCP.layers ) {
        return;
    }
    return (typeof layer == 'string') ? MASCP.layers[layer] : layer;    
};

/**
 * Retrieve a group object from the group registry. If a grop object is passed to this method, the same group is returned.
 * @param {String} group    Group name
 * @returns Group object
 * @type Object
 * @see MASCP.Group
 */
MASCP.getGroup = function(group) {
    if (typeof group == 'undefined') {
        return;
    }
    if ( ! MASCP.groups ) {
        return;
    }
    if (typeof group == 'string') {
        return MASCP.groups[group];
    }
    return (group == MASCP.groups[group.name]) ? group : null;
};

MASCP.SequenceRenderer.prototype._removeOtherBindings = function(object,inputElement) {
    var renderer = this;
    
    for (var i = 0; i < inputElement._current_bindings.length; i++) {
        if ( inputElement._current_bindings[i].renderer != renderer ) {
            continue;
        }
        var cb = inputElement._current_bindings[i];
        
        if ( cb.layer && cb.layer != object.name ) {
            jQuery(MASCP.getLayer(cb.layer)).unbind('visibilityChange',cb.object_function);
            jQuery(inputElement).unbind('change',cb.input_function);
        }
        
        if ( cb.group && cb.group != object.name ) {
            jQuery(MASCP.getGroup(cb.group)).unbind('visibilityChange',cb.object_function);
            jQuery(inputElement).unbind('change',cb.input_function);
        }
        cb.group = null;
        cb.layer = null;
    }
};

/**
 * Create a checkbox that is used to control the given group
 * @param {String|Object} group Group name or group object that a controller should be generated for
 * @param {Object} inputElement Optional input element to bind events to. If no element is given, a new one is created.
 * @returns Checkbox element that when checked will toggle on the group, and toggle it off when unchecked
 * @type Object
 */
MASCP.SequenceRenderer.prototype.createGroupCheckbox = function(group,inputElement,exclusive) {
    var renderer = this;
    var the_input = inputElement ? jQuery(inputElement) : jQuery('<input type="checkbox" value="true"/>');
    var groupObject = MASCP.getGroup(group);
    
    if (! groupObject ) {
        return;
    }

    the_input[0]._current_bindings = the_input[0]._current_bindings || [];

    if (exclusive) {
        this._removeOtherBindings(groupObject,the_input[0]);
    }
    
    for (var i = 0; i < the_input[0]._current_bindings.length; i++) {
        if (    the_input[0]._current_bindings[i].group == group && 
                the_input[0]._current_bindings[i].renderer == renderer ) {
            return;
        }
    }
    
    the_input[0].removeAttribute('checked');
    var input_func = function(e) {        
        group_obj = MASCP.getGroup(group);
        if (! group_obj ) {
            return;
        }
        if (this.checked) {
            jQuery(group_obj._layers).each(function(i) {
                renderer.showLayer(this.name,false);
            });
        } else {
            jQuery(group_obj._layers).each(function(i) {
//                renderer.hideLayer(this.name,false);
            });                
        }
    };
    
    the_input.bind((MASCP.IE ? 'click' : 'change'),input_func);

    var group_func = null;

    if (groupObject && the_input[0]._current_bindings.length === 0) {
        group_func = function(e,rend,visibility) {
            if (rend != renderer) {
                return;
            }
            the_input[0].checked = visibility;
            if ( ! visibility ) {
                the_input[0].removeAttribute('checked');
            }
        };
        jQuery(MASCP.getGroup(group)).bind('visibilityChange', group_func);
        
        if (the_input[0].parentNode) {
            the_input[0].parentNode.insertBefore(jQuery('<div style="position: relative; left: 0px; top: 0px; float: left; background-color: '+groupObject.color+'; width: 1em; height: 1em;"></div>')[0],the_input[0]);
        }
    }

    the_input[0]._current_bindings.push({ 'group' : group , 'renderer' : renderer, 'input_function' : input_func, 'object_function' : group_func });

    the_input.bind('click',function(e) {
        e.stopPropagation();
    });
    
    return the_input;
};

/**
 * Create a layer based controller for a group. This layer can act as a proxy for the other layers
 * @param {Object} lay Layer to turn into a group controller
 * @param {Object} grp Group to be controlled by this layer.
 */

MASCP.SequenceRenderer.prototype.createGroupController = function(lay,grp) {
    var layer = MASCP.getLayer(lay);
    var group = MASCP.getGroup(grp);

    var self = this;
    jQuery(layer).bind('visibilityChange',function(ev,rend,visible) {
        if (rend == self) {
            self.setGroupVisibility(group, visible);
            self.refresh();
        }
    });
};

/**
 * Function to be added to Amino acid elements to facilitate adding elements to layers
 * @private
 * @param {String} layerName The layer that this amino acid should be added to
 * @returns Itself
 * @type Element
 */
MASCP.SequenceRenderer.addElementToLayer = function(layerName)
{
    this.addBoxOverlay(layerName,1);
    return this;
};

/**
 * Function to be added to Amino acid elements to facilitate adding elements to layers with a link
 * @private
 * @param {String} layerName The layer that this amino acid should be added to
 * @param {String} url URL to link to
 * @returns Itself
 * @type Element
 */
MASCP.SequenceRenderer.addElementToLayerWithLink = function(layerName, url, width)
{
    jQuery(this).addClass(layerName);
    var new_el = jQuery(this).append(jQuery('<a href="'+url+'" class="'+layerName+'_overlay" style="display: box; left: 0px; top: 0px; width: 100%; position: absolute; height: 100%;">&nbsp;</a>'))[0];
    while (width && width > 0) {
        this._renderer._sequence_els[this._index + width].addToLayerWithLink(layerName,url);
        width -= 1;
    }
    if (this._z_indexes && this._z_indexes[layerName]) {
        new_el.style.zIndex = this._z_indexes[layerName];
    }
    return this;    
};

/**
 * Function to be added to Amino acid elements to facilitate adding box overlays to elements
 * @private
 * @param {String} layerName The layer that this amino acid should be added to, as well as the fraction opacity to use for this overlay
 * @returns Itself
 * @type Element
 */
MASCP.SequenceRenderer.addBoxOverlayToElement = function(layerName, width, fraction)
{
    if (typeof fraction == 'undefined') {
        fraction = 1;
    }
    jQuery(this).addClass(layerName);
    var new_el = jQuery(this).append(jQuery('<div class="'+layerName+'_overlay" style="top: 0px; width: 100%; position: absolute; height: 100%; opacity:'+fraction+';"></div>'))[0];
    while (width && width > 1) {
        this._renderer._sequence_els[this._index + width - 1].addBoxOverlay(layerName,0,fraction);
        width -= 1;
    }
    if (this._z_indexes && this._z_indexes[layerName]) {
        new_el.style.zIndex = this._z_indexes[layerName];
    }
    var event_names = ['mouseover','mousedown','mousemove','mouseout','click','dblclick','mouseup','mouseenter','mouseleave'];
    for (var i = 0 ; i < event_names.length; i++) {
        jQuery(new_el).bind(event_names[i],function() { return function(e) {
            jQuery(MASCP.getLayer(layerName)).trigger(e.type,[e,'SequenceRenderer']);
        };}(i));
    }    
    return this;
};


/**
 * Reset this renderer. Hide all groups and layers, disabling them in the registry.
 */
MASCP.SequenceRenderer.prototype.reset = function()
{
    jQuery(this._container).attr('class',null);
    for ( var group in MASCP.groups) {
        if (MASCP.groups.hasOwnProperty(group)) {
            this.hideGroup(group);
        }
    }    
    for ( var layer in MASCP.layers) {
        if (MASCP.layers.hasOwnProperty(layer)) {
            this.hideLayer(layer,true);
            MASCP.layers[layer].disabled = true;
        }
    }
    
    if (this.resetAnnotations) {
        this.resetAnnotations();
    }
    
};

/**
 * Execute the given block of code (in the renderer context) moving the refresh method away so that it is not called
 * @param {Function} func Function that contains operations to run without refreshing the renderer
 */
MASCP.SequenceRenderer.prototype.withoutRefresh = function(func)
{
    var curr_refresh = this.refresh;
    this.refresh = function() {};
    func.apply(this);
    this.refresh = curr_refresh;
};

/**
 * Refresh the display for this sequence renderer
 */
MASCP.SequenceRenderer.prototype.refresh = function()
{
    var z_index = -2;
    if ( ! this._z_indexes) {
        this._z_indexes = {};
    }
    for (var i = 0; i < (this.trackOrder || []).length; i++ ) {
        if (! this.isLayerActive(this.trackOrder[i])) {
            continue;
        }
        jQuery('.'+this.trackOrder[i]+'_overlay').css('z-index',z_index);
        this._z_indexes[this.trackOrder[i]] = z_index;
        z_index -= 1;
    }
};

/**
 * Bind a function to execute on a particular event for this object
 * @param {String} ev Event name
 * @param {Function} func Function to execute
 */

MASCP.SequenceRenderer.prototype.bind = function(ev,func)
{
    jQuery(this).bind(ev,func);
};

MASCP.SequenceRenderer.prototype.trigger = function(ev)
{
    jQuery(this).trigger(ev);
};

var SVGCanvas = SVGCanvas || (function() {
    
    var extended_elements = [];
    var DEFAULT_RS = 1;
    var svgns = 'http://www.w3.org/2000/svg';
    
    function extend_array(an_array,RS) {
        var curr_x, curr_y, curr_transform, targ_disp, a_disp;
        
        an_array.visibility = function() {
            var curr_disp = 'hidden';

            for (var i = 0 ; i < an_array.length; i++ ) {
                a_disp = an_array[i].getAttribute('visibility');
                if (a_disp && a_disp != 'hidden') {
                    curr_disp = a_disp;
                    break;
                }
            }
            return curr_disp;
        };
        
        an_array.currenty = function() {
            var a_y;
            
            if (an_array[0] && an_array[0].getAttribute('transform')) {
                a_y = /translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/.exec(an_array[0].getAttribute('transform'));
                if (typeof a_y != 'undefined') {
                    a_y = a_y[2];
                }
            }
            return an_array[0] ? parseInt( a_y || an_array[0].getAttribute('y') || 0,10) : 0;
        };
        
        an_array.animate = function(hsh) {
            if (typeof hsh.y == 'undefined') {
                attr(hsh);
                return;
            }
            if (an_array.length === 0) {
                return;
            }

            var hash = {};
            var key;
            
            for (key in hsh) {
                if (hsh.hasOwnProperty(key)) {
                    hash[key] = hsh[key];
                }
            }
            
            setup_anim_clocks();
                        
            if (an_array.animating) {
                for (var i = 0; i < (anim_clock_funcs || []).length; i++ ) {                    
                    if (anim_clock_funcs[i].target_set != an_array) {
                        continue;
                    }
                    an_array.animating = false;
                    anim_clock_funcs.splice(i,1);
                }
            }
            

            
            var curr_disp = an_array.visibility();

            var target_disp = hash.visibility;
            if (curr_disp == target_disp && target_disp == 'hidden') {
                attr(hsh);
                return;
            }

            var curr_y = an_array.currenty();

            if (isNaN(parseInt(curr_y,10))) {
                console.log("Have a NaN y value, skipping");
                return;
            }

            var target_y = parseInt(hash.y,10);

            delete hash.y;

            if (curr_disp == target_disp && target_disp == 'visible' ) {
                delete hash.visibility;
                target_disp = null;                    
                attr({'visibility' : 'visible'});
            }

            if (hash.visibility == 'hidden') {
                delete hash.visibility;
            }

            attr(hash);
            var counter = 0;

            if (target_y != curr_y) {
                var anim_steps = 1 * (Math.abs(parseInt(((target_y - curr_y)/(50*RS)),10)/rate) + 1);
                var diff = (target_y - curr_y) / anim_steps;
                hash.y = curr_y || 0;
                var orig_func = arguments.callee;
                an_array.animating = true;
                hash.y = curr_y + diff*1;
                
                anim_clock_funcs.push(
                    function(step) {
                        if (diff < 0 && (hash.y < target_y) ) {
                            hash.y = target_y;
                        }
                        if (diff > 0 && (hash.y > target_y) ) {
                            hash.y = target_y;
                        }
                        attr(hash);
                        counter += (step || 1);
                        if (hash.y != target_y) {
                            hash.y = curr_y + diff*(counter+1);
                            return;
                        }
                        an_array.animating = false;
                        if (target_disp) {
                            attr({'visibility' : target_disp});
                        }
                        anim_clock_funcs.splice(anim_clock_funcs.indexOf(arguments.callee),1);
                    }
                );
                anim_clock_funcs[anim_clock_funcs.length - 1].target_set = an_array;
            }
            return;
        };
        
        an_array.attr = function(hsh) {
            if (in_anim) {
                return this.animate(hsh);
            }
            return attr(hsh);
        };
        
        var attr = function(hsh) {
            var hash = {};
            var key;
            for (key in hsh) {
                if (hsh.hasOwnProperty(key)) {
                    hash[key] = hsh[key];
                }
            }
            
            var curr_disp = an_array.visibility();
            
            var targ_y = parseInt(hash.y,10);
            targ_disp = hash.visibility;
            
            for (key in hash) {
                if (hash.hasOwnProperty(key)) {
                    for (var i = 0; i < an_array.length; i++) {
                        if ( ! an_array[i]) {
                            continue;
                        }
                        var value = hash[key];
                        if (key == 'style' && an_array[i].hasAttribute('style')) {
                            var curr_style = an_array[i].getAttribute('style');
                            curr_style += '; '+hash[key];
                            value = curr_style;
                        }
                        if (key == 'height' && an_array[i].hasAttribute('transform')) {
                            curr_transform = an_array[i].getAttribute('transform');

                            var curr_scale = /scale\((-?\d+\.?\d*)\)/.exec(an_array[i].getAttribute('transform'));
                        
                            var curr_height = parseFloat(an_array[i].getAttribute('height') || 1);
                        
                            var new_scale = 1;
                            if (curr_scale === null) {
                                curr_transform += ' scale(1) ';
                                curr_scale = 1;
                            } else {
                                curr_scale = parseFloat(curr_scale[1]);
                            }
                        
                        
                            new_scale = ( parseFloat(hash[key]) / curr_height ) * curr_scale;
                        
                            curr_transform = curr_transform.replace(/scale\((-?\d+\.?\d*)\)/,'scale('+new_scale+')');

                            an_array[i].setAttribute('transform',curr_transform);
                        }
                        if  (! (an_array[i].hasAttribute('transform') && (key == 'y' || key == 'x'))) {
                            an_array[i].setAttribute(key, value);                        
                        }
                        if (key == 'y' && an_array[i].hasAttribute('d')) {
                            var curr_path = an_array[i].getAttribute('d');
                            var re = /M\s*([\d\.]+) ([\d\.]+)/;
                            curr_path = curr_path.replace(re,'');
                            if (isNaN(parseInt(value,10))) {
                                throw "Error "+key+" is "+hash[key];
                            }
                            an_array[i].setAttribute('d', 'M0 '+parseInt(value,10)+' '+curr_path);
                        }
                        if (key == 'y' && an_array[i].hasAttribute('cy')) {
                            an_array[i].setAttribute('cy', hash[key]);
                        }
                    
                    
                        if (key == 'y' && an_array[i].hasAttribute('transform')) {
                            curr_transform = an_array[i].getAttribute('transform');
                        
                            curr_x = /translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/.exec(an_array[i].getAttribute('transform'));
                            if (curr_x === null) {
                                continue;
                            }
                            curr_x = curr_x[1];
                            curr_transform = curr_transform.replace(/translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/,'translate('+curr_x+','+value+')');
                            an_array[i].setAttribute('transform',curr_transform);                        
                        }
                        if (key == 'x' && an_array[i].hasAttribute('transform')) {
                            curr_transform = an_array[i].getAttribute('transform');
                        
                            curr_y = /translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/.exec(an_array[i].getAttribute('transform'));
                            if (curr_y === null) {
                                continue;
                            }
                            curr_y = curr_y[2];
                            curr_transform = curr_transform.replace(/translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/,'translate('+value+','+curr_y+')');
                            an_array[i].setAttribute('transform',curr_transform);                        
                        }                    
                    }
                }
            }
        };
        an_array.hide = function() {
            this.attr({ 'visibility' : 'hidden'});
        };
        an_array.show = function() {
            this.attr({ 'visibility' : 'visible'});
        };

        an_array.refresh_zoom = function() {
            for (var i = 0; i < an_array.length; i++ ) {
                if (an_array[i].zoom_level && an_array[i].zoom_level == 'text') {
                    if (canvas.zoom > 3.5) {
                        an_array[i].setAttribute('display', 'inline');
                        an_array[i].setAttribute('opacity', 1);
                    } else {
                        an_array[i].setAttribute('display', 'none');                            
                    }                        
                }
            
                if (an_array[i].zoom_level && an_array[i].zoom_level == 'summary') {
                    if (canvas.zoom <= 3.5) {
                        an_array[i].setAttribute('display', 'inline');
                        an_array[i].setAttribute('opacity', 1);
                    } else {
                        an_array[i].setAttribute('display', 'none');                            
                    }
                }
            }
        };
        
        return an_array;
    }

    var anim_clock_funcs = null, in_anim = false;
    var anim_clock = null;
    var rate = 75;
    var new_rate = null;
    
    var setup_anim_clocks = function() {
        if (anim_clock_funcs === null) {
            anim_clock_funcs = [];
        } else {
            anim_clock_funcs.forEach(function(func) {
                func._last_step = null;
            });
            clearInterval(anim_clock);
        }
        if ( ! in_anim ) {
            extended_elements.forEach(function(canv) {
                jQuery(canv).trigger('_anim_begin');
            });
            in_anim = true;
        }
        var start = null;
        anim_clock = setInterval(function() {
            if ( ! anim_clock_funcs || anim_clock_funcs.length === 0 ) {
                clearInterval(anim_clock);
                anim_clock = null;
                anim_clock_funcs = null;
                in_anim = false;
                extended_elements.forEach(function(canv) {
                    jQuery(canv).trigger('_anim_end');
                });
                return;
            }
            
            var suspended_ids = [];
            
            extended_elements.forEach(function(canv) {
                suspended_ids.push(canv.suspendRedraw(5000));
            });
            var tic = (new Date()).getTime();
                                                
            if (! start) {
                start = (new Date()).getTime();
            }
            
            for (var i = 0; i < (anim_clock_funcs || []).length; i++ ) {
                var end = (new Date()).getTime();
                var step_id = parseInt((end - start)/rate,10);
                if ( new_rate === null && (step_id - anim_clock_funcs[i]._last_step) > 2) {
                    new_rate = Math.round(1.6*rate);
                }
                anim_clock_funcs[i].apply(null,[step_id - (anim_clock_funcs[i]._last_step || step_id)]);
                if (anim_clock_funcs && anim_clock_funcs[i]) {
                    anim_clock_funcs[i]._last_step = step_id;
                }
            }
            var toc = (new Date()).getTime();

            extended_elements.forEach(function(canv) {
                canv.unsuspendRedraw(suspended_ids.shift());
            });
            
            var actual_speed = (toc - tic);
            if (( actual_speed < rate) && (new_rate === null) && actual_speed >= 1 ) {
                rate = Math.round(1.5*(toc - tic));
                setup_anim_clocks();
            } else if (new_rate !== null && new_rate != rate) {
                rate = new_rate;
                setup_anim_clocks();
            }
            
            
        },rate);
    };
    
    return (function(canvas) {
        
        var RS = canvas.RS || DEFAULT_RS;
        canvas.RS = RS;
        
        extended_elements.push(canvas);
        
        canvas.makeEl = function(name,attributes) {
            var result = document.createElementNS(svgns,name);
            for (var attribute in attributes) {
                if (attributes.hasOwnProperty(attribute)) {
                    result.setAttribute(attribute, attributes[attribute]);
                }
            }
            return result;
        };

        canvas.make_gradient = function(id,x2,y2,stops,opacities) {
            var gradient = this.makeEl('linearGradient',{
                'id': id,
                'x1':'0%',
                'x2': x2,
                'y1':'0%',
                'y2': y2
            });
            var total_stops = stops.length;
            while(stops.length > 0) {
                var stop_id = Math.round( ((total_stops - stops.length) / total_stops) * 100 );
                var stop = stops.shift();
                var opacity = opacities.shift();
                gradient.appendChild(this.makeEl('stop',{
                    'offset': stop_id+'%',
                    'style':'stop-color:'+stop+';stop-opacity:'+opacity
                }));
            }
            return gradient;
        };


        canvas.path = function(pathdesc) {
          var a_path = document.createElementNS(svgns,'path');
          a_path.setAttribute('d', pathdesc);
          a_path.setAttribute('stroke','#000000');
          a_path.setAttribute('stroke-width','1');
          this.appendChild(a_path);
          return a_path;
        };

        canvas.poly = function(points) {
           var a_poly = document.createElementNS(svgns,'polygon');
           a_poly.setAttribute('points',points);
           this.appendChild(a_poly);
           return a_poly;
        };

        canvas.circle = function(x,y,radius) {
            var a_circle = document.createElementNS(svgns,'circle');
            a_circle.setAttribute('cx', typeof x == 'string' ? x : x * RS);
            a_circle.setAttribute('cy', typeof y == 'string' ? y : y * RS);
            a_circle.setAttribute('r', typeof radius == 'string' ? radius : radius * RS);        
            this.appendChild(a_circle);
            return a_circle;
        };

        canvas.group = function() {
            var a_g = document.createElementNS(svgns,'g');
            this.appendChild(a_g);
            a_g.push = function(new_el) {
                a_g.appendChild(new_el);
            };

            return a_g;
        };

        canvas.line = function(x,y,x2,y2) {
            var a_line = document.createElementNS(svgns,'line');
            a_line.setAttribute('x1', typeof x == 'string' ? x : x * RS);
            a_line.setAttribute('y1', typeof y == 'string' ? y : y * RS);
            a_line.setAttribute('x2', typeof x2 == 'string' ? x2 : x2 * RS);
            a_line.setAttribute('y2', typeof y2 == 'string' ? y2 : y2 * RS);
            this.appendChild(a_line);
            return a_line;        
        };

        canvas.rect = function(x,y,width,height) {
          var a_rect = document.createElementNS(svgns,'rect');
          a_rect.setAttribute('x', typeof x == 'string' ? x : x * RS);
          a_rect.setAttribute('y', typeof y == 'string' ? y : y * RS);
          a_rect.setAttribute('width', typeof width == 'string' ? width : width * RS);
          a_rect.setAttribute('height', typeof height == 'string' ? height : height * RS);
          a_rect.setAttribute('stroke','#000000');
    //      a_rect.setAttribute('shape-rendering','optimizeSpeed');
          this.appendChild(a_rect);
          return a_rect;
        };

        canvas.use = function(ref,x,y,width,height) {
            var a_use = document.createElementNS(svgns,'use');
            a_use.setAttribute('x', typeof x == 'string' ? x : x * RS);
            a_use.setAttribute('y', typeof y == 'string' ? y : y * RS);
            a_use.setAttribute('width', typeof width == 'string' ? width : width * RS);
            a_use.setAttribute('height', typeof height == 'string' ? height : height * RS);
            a_use.setAttributeNS('http://www.w3.org/1999/xlink','href',ref);
            this.appendChild(a_use);

            return a_use;        
        };

        canvas.a = function(href) {
            var a_anchor = document.createElementNS(svgns,'a');
            a_anchor.setAttribute('target','_new');        
            a_anchor.setAttributeNS('http://www.w3.org/1999/xlink','href',href);
            this.appendChild(a_anchor);
            return a_anchor;
        };

        canvas.button = function(x,y,width,height,text) {
            var fo = document.createElementNS(svgns,'foreignObject');
            fo.setAttribute('x',0);
            fo.setAttribute('y',0);
            fo.setAttribute('width',x+width);
            fo.setAttribute('height',y+height);
            fo.style.position = 'absolute';
            this.appendChild(fo);
            var button = document.createElement('button');
            button.style.display = 'block';
            button.style.position = 'relative';
            button.style.top = y+'px';
            button.style.left = x+'px';
            button.textContent = text;
            fo.appendChild(button);
            return button;
        };

        canvas.svgbutton = function(x,y,width,height,txt) {
            var button = this.group();
            var back = this.rect(x,y,width,height);
            back.setAttribute('rx','10');
            back.setAttribute('ry','10');
            back.setAttribute('stroke','#ffffff');
            back.setAttribute('stroke-width','2');
            back.setAttribute('fill','url(#simple_gradient)');
            x = back.x.baseVal.value;
            y = back.y.baseVal.value;
            width = back.width.baseVal.value;
            height = back.height.baseVal.value;

            var text = this.text(x+width/2,y+(height/3),txt);        
            text.setAttribute('text-anchor', 'middle');
            text.firstChild.setAttribute('dy', '1.5ex');
            text.setAttribute('font-size',0.5*height);
            text.setAttribute('fill','#ffffff');
            button.push(back);
            button.push(text);
            button.background_element = back;
            button.text_element = text;

            button.setAttribute('cursor','pointer');
            var button_trigger = function() {
                back.setAttribute('fill','#999999');
                back.setAttribute('stroke','#000000');
            };
            button.addEventListener('mousedown',button_trigger,false);
            button.addEventListener('touchstart',button_trigger,false);
            var button_reset = function() {
                back.setAttribute('stroke','#ffffff');
                back.setAttribute('fill','url(#simple_gradient)');
            };
            button.addEventListener('mouseup',button_reset,false);
            button.addEventListener('mouseout',button_reset,false);
            button.addEventListener('touchend',button_reset,false);
            return button;
        };

        canvas.callout = function(x,y,content,opts) {
            var callout = this.group();
            var back = this.rect(-0.5*(opts.width+4),20,opts.width+4,opts.height+4);
            back.setAttribute('fill','#000000');
            var pres_box = this.rect(-0.5*(opts.width+1),22,opts.width+1,opts.height);
            pres_box.setAttribute('fill','#eeeeee');
            callout.push(back);
            callout.push(pres_box);
            var poly = this.poly('0,500 500,1000 -500,1000');
            poly.setAttribute('fill','#000000');
            callout.push(poly);
            var fo = document.createElementNS(svgns,'foreignObject');
            fo.setAttribute('x',-0.5*(opts.width+1)*RS);
            fo.setAttribute('y',21*RS);
            fo.setAttribute('width',opts.width*RS);
            fo.setAttribute('height',opts.height*RS);
            callout.push(fo);
            var html = document.createElementNS('http://www.w3.org/1999/xhtml','html');
            html.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
            var body = document.createElementNS('http://www.w3.org/1999/xhtml','body');
            body.style.fontSize = (15*RS) +'px';
            body.style.margin = (5*RS)+'px';
            html.appendChild(body);
            body.appendChild(content);
            fo.appendChild(html);
            callout.setAttribute('transform','translate('+(x*RS)+','+((y+20)*RS)+')');
            return callout;
        };

        canvas.growingMarker = function(x,y,symbol,opts) {
            var container = document.createElementNS(svgns,'svg');
            container.setAttribute('viewBox', '-50 -100 150 300');
            container.setAttribute('preserveAspectRatio', 'xMinYMin meet');
            container.setAttribute('x',x);
            container.setAttribute('y',y);
            var the_marker = this.marker(50/RS,50/RS,50/RS,symbol,opts);
            container.appendChild(the_marker);
            container.contentElement = the_marker.contentElement;
            var result = this.group();
            result.appendChild(container);
            return result;
        };

        canvas.marker = function(cx,cy,r,symbol,opts) {
            var units = 0;
            if (typeof cx == 'string') {
                var parts = new RegExp(/(\d+)(.*)/g).exec(cx);
                units = parts[2];
                cx = parseFloat(parts[1]);

                parts = new RegExp(/(\d+)(.*)/g).exec(cy);
                cy = parseFloat(parts[1]);

                parts = new RegExp(/(\d+)(.*)/g).exec(r);
                r = parseFloat(parts[1]);        

            }

            var dim = {
                CX      : cx+units,
                CY      : cy+units,
                R       : r+units,
                MIN_X   : (cx-r)+units,
                MAX_X   : (cx+r)+units,
                MIN_Y   : (cy-r)+units,
                MAX_Y   : (cy+r)+units,
                MID_X1  : (cx-(r/2))+units,
                MID_X2  : (cx+(r/2))+units,
                MID_Y1  : (cy-(r/2))+units,
                MID_Y2  : (cy+(r/2))+units
            };

            var marker = this.group();

            var fill_color = (opts && opts.border) ? opts.border : 'rgb(0,0,0)';

            marker.push(this.circle(0,-0.5*r,r));

            marker.lastChild.style.fill = fill_color;

            marker.push(this.circle(0,1.5*r,r));

            marker.lastChild.style.fill = fill_color;

            var arrow = this.poly((-0.9*r*RS)+','+(0*r*RS)+' 0,'+(-2.5*r*RS)+' '+(0.9)*r*RS+','+(0*r*RS));


            arrow.setAttribute('style','fill:'+fill_color+';stroke-width: 0;');
            marker.push(arrow);
            marker.setAttribute('transform','translate('+((cx)*RS)+','+0.5*cy*RS+') scale(1)');
            marker.setAttribute('height', dim.R*RS);
            if (typeof symbol == 'string') {
                marker.contentElement = this.text_circle(0,0.5*r,1.75*r,symbol,opts);
                marker.push(marker.contentElement);
            } else {
                marker.contentElement = this.group();
                if (symbol) {
                    marker.contentElement.push(symbol);
                }
                marker.push(marker.contentElement);
            }
            return marker;
        };

        canvas.text_circle = function(cx,cy,r,txt,opts) {

            if ( ! opts ) {
                opts = {};
            }        

            var units = 0;

            if (typeof cx == 'string') {
                var parts = new RegExp(/(\d+)(.*)/g).exec(cx);
                units = parts[2];
                cx = parseFloat(parts[1]);

                parts = new RegExp(/(\d+)(.*)/g).exec(cy);
                cy = parseFloat(parts[1]);

                parts = new RegExp(/(\d+)(.*)/g).exec(r);
                r = parseFloat(parts[1]);        

            }
            var dim = {
                CX      : cx+units,
                CY      : cy+units,
                R       : r+units,
                MIN_X   : (cx-r)+units,
                MAX_X   : (cx+r)+units,
                MIN_Y   : (cy-r)+units,
                MAX_Y   : (cy+r)+units,
                MID_X1  : (cx-(r/2))+units,
                MID_X2  : (cx+(r/2))+units,
                MID_Y1  : (cy-(r/2))+units,
                MID_Y2  : (cy+(r/2))+units
            };

            var marker_group = this.group();

            var back = this.circle(0,dim.CY,9/10*dim.R);
            back.setAttribute('fill','url(#simple_gradient)');
            back.setAttribute('stroke', opts.border || '#000000');
            back.setAttribute('stroke-width', (r/10)*RS);

            marker_group.push(back);
            var text = this.text(0,dim.CY-0.5*dim.R,txt);
            text.setAttribute('font-size',r*RS);
            text.setAttribute('font-weight','bolder');
            text.setAttribute('fill','#ffffff');
            text.setAttribute('style','font-family: sans-serif; text-anchor: middle;');
            text.firstChild.setAttribute('dy','1.5ex');
            text.setAttribute('text-anchor','middle');
            marker_group.push(text);

            marker_group.setAttribute('transform','translate('+dim.CX*RS+', 1) scale(1)');
            marker_group.setAttribute('height', (dim.R/2)*RS );
            return marker_group;
        };

        canvas.crossed_circle = function(cx,cy,r) {

            var units = 0;


            if (typeof cx == 'string') {
                var parts = new RegExp(/(\d+)(.*)/g).exec(cx);
                units = parts[2];
                cx = parseFloat(parts[1]);

                parts = new RegExp(/(\d+)(.*)/g).exec(cy);
                cy = parseFloat(parts[1]);

                parts = new RegExp(/(\d+)(.*)/g).exec(r);
                r = parseFloat(parts[1]);        

            }
            var dim = {
                CX      : cx+units,
                CY      : cy+units,
                R       : r+units,
                MIN_X   : (cx-r)+units,
                MAX_X   : (cx+r)+units,
                MIN_Y   : (cy-r)+units,
                MAX_Y   : (cy+r)+units,
                MID_X1  : (cx-(r/2))+units,
                MID_X2  : (cx+(r/2))+units,
                MID_Y1  : (cy-(r/2))+units,
                MID_Y2  : (cy+(r/2))+units
            };

            var close_group = this.group();

            var close_button = this.circle(dim.CX,dim.CY,dim.R);
            close_button.setAttribute('fill','#000000');
            close_button.setAttribute('stroke', '#ffffff');
            close_button.setAttribute('stroke-width', '2');

            close_group._button = close_button;

            close_group.push(close_button);

            var a_line = this.line(dim.MID_X1,dim.MID_Y1,dim.MID_X2,dim.MID_Y2);
            a_line.setAttribute('stroke', '#ffffff');
            a_line.setAttribute('stroke-width', '2');

            close_group.push(a_line);

            a_line = this.line(dim.MID_X1,dim.MID_Y2,dim.MID_X2,dim.MID_Y1);
            a_line.setAttribute('stroke', '#ffffff');
            a_line.setAttribute('stroke-width', '2');

            close_group.push(a_line);

            return close_group;        
        };
        canvas.text = function(x,y,text) {
            var a_text = document.createElementNS(svgns,'text');
            var a_tspan = document.createElementNS(svgns, 'tspan');
            if (typeof text != 'string') {
                a_text.appendChild(text);
            } else {
                a_text.appendChild(a_tspan);
                a_tspan.textContent = text;
                a_tspan.setAttribute('dy','0');
            }
            a_text.style.fontFamily = 'Helvetica, Verdana, Arial, Sans-serif';
            a_text.setAttribute('x',typeof x == 'string' ? x : x * RS);
            a_text.setAttribute('y',typeof y == 'string' ? y : y * RS);        
            this.appendChild(a_text);
            return a_text;
        };
        canvas.plus = function(x,y,height) {
            var g = this.group();
            g.appendChild(this.makeEl('rect', {
                'x' : Math.round((0.4)*height*RS).toString(),
                'y' : Math.round((0.1)*height*RS).toString(),
                'stroke-width' : '1',
                'width' : Math.round((0.2)*height*RS).toString(),
                'height': Math.round((0.8)*height*RS).toString(),
                'stroke': '#ffffff',
                'fill'  : '#ffffff'            
            }));

            g.appendChild(this.makeEl('rect', {
                'x' : Math.round((0.1)*height*RS).toString(),
                'y' : Math.round((0.4)*height*RS).toString(),
                'stroke-width' : '1',
                'width' : Math.round((0.8)*height*RS).toString(),
                'height': Math.round((0.2)*height*RS).toString(),
                'stroke': '#ffffff',
                'fill'  : '#ffffff'            
            }));
            g.setAttribute('transform','translate('+x*RS+','+y*RS+')');
            return g;
        };
        canvas.minus = function(x,y,height) {
            var g = this.group();

            g.appendChild(this.makeEl('rect', {
                'x' : Math.round((0.1)*height*RS).toString(),
                'y' : Math.round((0.4)*height*RS).toString(),
                'stroke-width' : '1',
                'width' : Math.round((0.8)*height*RS).toString(),
                'height': Math.round((0.2)*height*RS).toString(),
                'stroke': '#ffffff',
                'fill'  : '#ffffff'            
            }));
            g.setAttribute('transform','translate('+x*RS+','+y*RS+')');
            return g;
        };
        
        canvas.set = function() {
            var an_array = [];
            extend_array(an_array,RS);
            return an_array;
        };
        canvas.hide = function() {
            this.setAttribute('display','none');
        };
        canvas.show = function() {
            this.setAttribute('display','inline');
        };
    });

})();/**
 *  @fileOverview   Basic classes and definitions for an SVG-based sequence renderer
 */

/** Default class constructor
 *  @class      Renders a sequence using a condensed track-based display
 *  @param      {Element} sequenceContainer Container element that the sequence currently is found in, and also 
 *              the container that data will be re-inserted into.
 *  @extends    MASCP.SequenceRenderer
 */
MASCP.CondensedSequenceRenderer = function(sequenceContainer) {
    this._RS = 50;
    MASCP.SequenceRenderer.apply(this,arguments);
    var self = this;

    MASCP.CondensedSequenceRenderer.Zoom(self);
    
    // When we have a layer registered with the global MASCP object
    // add a track within this rendererer.
    bean.add(MASCP,'layerRegistered', function(layer) {
        self.addTrack(layer);
    });
    
    // We want to unbind the default handler for sequence change that we get from
    // inheriting from CondensedSequenceRenderer
    jQuery(this).unbind('sequenceChange');

    jQuery(this).bind('sequenceChange',function() {
        for (var layername in MASCP.layers) {
            if (MASCP.layers.hasOwnProperty(layername)) {
                MASCP.layers[layername].disabled = true;
            }
        }
        self.zoom = self.zoom;
    });

    return this;
};

MASCP.CondensedSequenceRenderer.prototype = new MASCP.SequenceRenderer();

(function() {
    var scripts = document.getElementsByTagName("script");
    var src = scripts[scripts.length-1].src;
    src = src.replace(/[^\/]+$/,'');
    MASCP.CondensedSequenceRenderer._BASE_PATH = src;
})();

(function(clazz) {
    var createCanvasObject = function() {
        var renderer = this;

        if (this._object) {
            if (typeof svgweb != 'undefined') {
                svgweb.removeChild(this._object, this._object.parentNode);
            } else {
                this._object.parentNode.removeChild(this._object);
            }
            this._canvas = null;
            this._object = null;
        }
        var canvas;

        if ( document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") ) {
            var native_canvas = document.createElementNS(svgns,'svg');
            native_canvas.setAttribute('width','100%');
            native_canvas.setAttribute('height','100%');
            this._container.appendChild(native_canvas);
            this._canvas = native_canvas;
            canvas = {
                'addEventListener' : function(name,load_func) {
                    native_canvas.contentDocument = { 'rootElement' : native_canvas };
                    load_func.call(native_canvas);
                }            
            };
        }

        canvas.addEventListener('load',function() {
            var container_canv = this;
            SVGCanvas(container_canv);
            var group = container_canv.makeEl('g');
        
            var canv = container_canv.makeEl('svg');
            canv.RS = renderer._RS;
            SVGCanvas(canv);
            group.appendChild(canv);
            container_canv.appendChild(group);

            var supports_events = true;

            try {
                var noop = canv.addEventListener;
            } catch (err) {
                supports_events = false;
            }

            if (false && supports_events) {
                var oldAddEventListener = canv.addEventListener;
        
                // We need to track all the mousemove functions that are bound to this event
                // so that we can switch off all the mousemove bindings during an animation event
        
                var mouse_moves = [];

                canv.addEventListener = function(ev,func,bubbling) {
                    if (ev == 'mousemove') {
                        if (mouse_moves.indexOf(func) < 0) {
                            mouse_moves.push(func);
                        } else {
                            return;
                        }
                    }
                    return oldAddEventListener.apply(canv,[ev,func,bubbling]);
                };

                jQuery(canv).bind('_anim_begin',function() {
                    for (var i = 0; i < mouse_moves.length; i++ ) {
                        canv.removeEventListener('mousemove', mouse_moves[i], false );
                    }
                    jQuery(canv).bind('_anim_end',function() {
                        for (var j = 0; j < mouse_moves.length; j++ ) {
                            oldAddEventListener.apply(canv,['mousemove', mouse_moves[j], false] );
                        }                        
                        jQuery(canv).unbind('_anim_end',arguments.callee);
                    });
                });
            }
        
        
            var canvas_rect = canv.makeEl('rect', {  'x':'-10%',
                                                    'y':'-10%',
                                                    'width':'120%',
                                                    'height':'120%',
                                                    'style':'fill: #ffffff;'});
        
        
        
            var left_fade = container_canv.makeEl('rect',{      'x':'0',
                                                                'y':'0',
                                                                'width':'50',
                                                                'height':'100%',
                                                                'style':'fill: url(#left_fade);'});

            var right_fade = container_canv.makeEl('rect',{     'x':'100%',
                                                                'y':'0',
                                                                'width':'50',
                                                                'height':'100%',
                                                                'transform':'translate(-50,0)',
                                                                'style':'fill: url(#right_fade);'});


            jQuery(canv).bind('pan',function() {
                if (canv.currentTranslate.x >= 0) {
                    left_fade.setAttribute('visibility','hidden');
                } else {
                    left_fade.setAttribute('visibility','visible');
                }
            });
        
            jQuery(canv).bind('_anim_begin',function() {
                left_fade.setAttribute('visibility','hidden');
            });
        
            jQuery(canv).bind('_anim_end',function() {
                jQuery(canv).trigger('pan');
            });

            if (canv.currentTranslate.x >= 0) {
                left_fade.setAttribute('visibility','hidden');
            }
            var nav_group = container_canv.makeEl('g');
            container_canv.appendChild(nav_group);
            var nav_canvas = container_canv.makeEl('svg');
            nav_group.appendChild(nav_canvas);



           canv.setCurrentTranslateXY = function(x,y) {
                    var curr_transform = (group.getAttribute('transform') || '').replace(/translate\([^\)]+\)/,'');
                    curr_transform = curr_transform + ' translate('+x+', '+y+') ';
                    group.setAttribute('transform',curr_transform);
                    this.currentTranslate.x = x;
                    this.currentTranslate.y = y;
            };
        
            nav_canvas.setCurrentTranslateXY = function(x,y) {
                    var curr_transform = (nav_group.getAttribute('transform') || '').replace(/translate\([^\)]+\)/,'');
                    curr_transform = curr_transform + ' translate('+x+', '+y+') ';
                    nav_group.setAttribute('transform',curr_transform);
                    this.currentTranslate.x = x;
                    this.currentTranslate.y = y;
            };
        

        
            addNav.call(renderer,nav_canvas);

            var nav = renderer.navigation;
            var old_show = nav.show, old_hide = nav.hide;
            nav.show = function() {
                old_show.call(nav);
                canv.style.GomapScrollLeftMargin = 100 * renderer._RS / renderer.zoom;
            };
        
            nav.hide = function() {
                old_hide.call(nav);
                canv.style.GomapScrollLeftMargin = 1000;
            };
        
            renderer._container_canvas = container_canv;
            container_canv.setAttribute('preserveAspectRatio','xMinYMin meet');
            container_canv.setAttribute('width','100%');
            container_canv.setAttribute('height','100%');
            canv.appendChild(canv.makeEl('rect', {'x':0,'y':0,'width':'100%','height':'100%','stroke-width':'0','fill':'#ffffff'}));
            renderer._object = this;
            renderer._canvas = canv;
            renderer._canvas._canvas_height = 0;
            jQuery(renderer).trigger('svgready');
        },false);
    
        return canvas;
    };

    var addNav = function(nav_canvas) {
        this.navigation = new MASCP.CondensedSequenceRenderer.Navigation(nav_canvas,this);
        var nav = this.navigation;
        var self = this;
    
        var hide_chrome = function() {
            nav.demote(); 
        };
    
        var show_chrome = function() {
            nav.promote(); 
        };

        if ( ! MASCP.IE ) {
        jQuery(this._canvas).bind('panstart',hide_chrome);
        jQuery(this._canvas).bind('panend',show_chrome);
        jQuery(this._canvas).bind('_anim_begin',hide_chrome);
        jQuery(this._canvas).bind('_anim_end',show_chrome);
        }
    };

    var drawAminoAcids = function(canvas) {
        var RS = this._RS;
        var seq_chars = this.sequence.split('');
        var renderer = this;
        //var aa_selection = document.createElement('div');
        // We need to prepend an extra > to the sequence since there is a bug with Safari failing
        // to select reliably when you set the start offset for the range to 0
        //aa_selection.appendChild(document.createTextNode(">"+this.sequence));
        //renderer._container.appendChild(aa_selection);
        //aa_selection.style.top = '110%';
        //aa_selection.style.height = '1px';
        //aa_selection.style.overflow = 'hidden';
    
        var amino_acids = canvas.set();
        var amino_acids_shown = false;
        var x = 0;
    
        var has_textLength = true;
        var no_op = function() {};
        try {
            var test_el = document.createElementNS(svgns,'text');
            test_el.setAttribute('textLength',10);
            no_op(test_el.textLength);
        } catch (e) {
            has_textLength = false;
        }

        /* We used to test to see if there was a touch event
           when doing the textLength method of amino acid
           layout, but iOS seems to support this now.
           
           Test case for textLength can be found here
           
           http://jsfiddle.net/nkmLu/11/embedded/result/
        */

        renderer.select = function() {
            var vals = Array.prototype.slice.call(arguments);
            var from = vals[0];
            var to = vals[1];
        //     var sel = window.getSelection();
        //     if(sel.rangeCount > 0) {
        //         sel.removeAllRanges();
        //     }
        //     var range = document.createRange();
        //     range.selectNodeContents(aa_selection.childNodes[0]);
        //     sel.addRange(range);
        //     sel.removeAllRanges();
        //     range.setStart(aa_selection.childNodes[0],from+1);
        //     range.setEnd(aa_selection.childNodes[0],to+1);
        //     sel.addRange(range);
            this.moveHighlight.apply(this,vals);
        };
        var a_text;
    
        if (has_textLength && ('lengthAdjust' in document.createElementNS(svgns,'text')) && ('textLength' in document.createElementNS(svgns,'text'))) {
            if (this.sequence.length <= 1500) {
                a_text = canvas.text(0,12,document.createTextNode(this.sequence));
                a_text.setAttribute('textLength',RS*this.sequence.length);
            } else {
                a_text = canvas.text(0,12,document.createTextNode(this.sequence.substr(0,1500)));
                a_text.setAttribute('textLength',RS*1500);
            }
            a_text.style.fontFamily = "'Lucida Console', 'Courier New', Monaco, monospace";
            a_text.setAttribute('lengthAdjust','spacing');
            a_text.setAttribute('text-anchor', 'start');
            a_text.setAttribute('dx',5);
            a_text.setAttribute('font-size', RS);
            a_text.setAttribute('fill', '#000000');
            amino_acids.push(a_text);
        } else {    
            for (var i = 0; i < seq_chars.length; i++) {
                a_text = canvas.text(x,12,seq_chars[i]);
                a_text.firstChild.setAttribute('dy','1.5ex');
                amino_acids.push(a_text);
                a_text.style.fontFamily = "'Lucida Console', Monaco, monospace";
                x += 1;
            }
            amino_acids.attr( { 'y':-1000,'width': RS,'text-anchor':'start','height': RS,'font-size':RS,'fill':'#000000'});
        }
        var update_sequence = function() {
            if (renderer.sequence.length <= 1500) {
                return;
            }
            var start = parseInt(renderer.leftVisibleResidue());
            start -= 50;
            if (start < 0) { 
                start = 0;
            }
            if ((start + 1500) >= renderer.sequence.length) {
                start = renderer.sequence.length - 1500 - 1;
            }
            a_text.replaceChild(document.createTextNode(renderer.sequence.substr(start,1500)),a_text.firstChild);
            a_text.setAttribute('dx',5+((start)*RS));
        };
        
        canvas.addEventListener('panstart', function() {
            if (amino_acids_shown) {
                amino_acids.attr( { 'display' : 'none'});
            }
            jQuery(canvas).bind('panend', function() {
                if (amino_acids_shown) {
                    amino_acids.attr( {'display' : 'block'});
                    update_sequence();
                }
                jQuery(canvas).unbind('panend',arguments.callee);
            });
        },false);
           
        canvas.addEventListener('zoomChange', function() {
           if (canvas.zoom > 3.5) {
               renderer._axis_height = 14;
               amino_acids.attr({'y': 12*RS, 'visibility' : 'visible'});
               amino_acids_shown = true;
               update_sequence();
           } else {
               renderer._axis_height = 30;
               amino_acids.attr({'y':-1000, 'visibility' : 'hidden'});   
               amino_acids_shown = false;        
           }
           renderer.refresh();
       },false);
   
    };

    var drawAxis = function(canvas,lineLength) {
        var RS = this._RS;
        var x = 0, i = 0;
    
    
        var axis = canvas.set();
        axis.push(canvas.path('M0 '+15*RS+' l0 '+10*RS));

        axis.push(canvas.path('M'+(lineLength*RS)+' '+14*RS+' l0 '+10*RS));

        this._axis_height = 20;

        axis.attr({'pointer-events' : 'none'});

        var big_ticks = canvas.set();
        var little_ticks = canvas.set();
        var big_labels = canvas.set();
        var little_labels = canvas.set();
        var minor_mark = 10;
        var major_mark = 20;
        
        if (this.sequence.length > 5000) {
            minor_mark = 100;
            major_mark = 200;
        }
    
        for ( i = 0; i < (lineLength/5); i++ ) {

            if ( (x % minor_mark) === 0) {
                big_ticks.push(canvas.path('M'+x*RS+' '+14*RS+' l 0 '+7*RS));
            } else {
                little_ticks.push(canvas.path('M'+x*RS+' '+16*RS+' l 0 '+4*RS));
            }

            if ( (x % major_mark) === 0 && x !== 0) {
                big_labels.push(canvas.text(x,5,""+(x)));
            } else if (( x % minor_mark ) === 0 && x !== 0) {
                little_labels.push(canvas.text(x,7,""+(x)));
            }

            x += 5;
        }
    
        for ( i = 0; i < big_labels.length; i++ ) {
            big_labels[i].style.textAnchor = 'middle';
            big_labels[i].setAttribute('text-anchor','middle');
            big_labels[i].firstChild.setAttribute('dy','1.5ex');
            big_labels[i].setAttribute('font-size',7*RS+'pt');
        }

        for ( i = 0; i < little_labels.length; i++ ) {
            little_labels[i].style.textAnchor = 'middle';
            little_labels[i].setAttribute('text-anchor','middle');
            little_labels[i].firstChild.setAttribute('dy','1.5ex');
            little_labels[i].setAttribute('font-size',2*RS+'pt');        
            little_labels[i].style.fill = '#000000';
        }
    
        big_ticks.attr({'pointer-events' : 'none'});
        little_ticks.attr({'pointer-events' : 'none'});
        big_labels.attr({'pointer-events' : 'none'});
        little_labels.attr({'pointer-events' : 'none'});
    
        little_ticks.attr({ 'stroke':'#555555', 'stroke-width':0.5*RS+'pt'});
        little_ticks.hide();
        little_labels.hide();

        canvas.addEventListener('zoomChange', function() {
               if (this.zoom > 3.6) {
                   little_ticks.hide();
                   big_ticks.show();
                   big_ticks.attr({'stroke-width' : 0.05*RS+'pt', 'stroke' : '#999999', 'transform' : 'scale(1,0.1) translate(0,4500)' });
                   little_labels.attr({'font-size':2*RS+'pt'});
                   big_labels.attr({'font-size': 2*RS+'pt'});
                   axis.hide();
                   if (this._visibleTracers && this._visibleTracers()) {
                       this._visibleTracers().show();
                   }
               } else if (this.zoom > 1.8) {
                   axis.show();
                   big_ticks.show();
                   axis.attr({'stroke-width':0.5*RS+'pt'});
                   big_ticks.attr({'stroke-width':0.5*RS+'pt', 'stroke' : '#000000', 'transform' : ''});
                   big_labels.show();
                   big_labels.attr({'font-size':4*RS+'pt','y':7*RS});
                   little_labels.attr({'font-size':4*RS+'pt'});
                   little_ticks.attr({'stroke-width':0.3*RS+'pt'});
                   little_ticks.show();
                   little_labels.show();
                   if (this.tracers) {
                       this.tracers.hide();
                   }
               } else {
                   if (this.tracers) {
                       this.tracers.hide();
                   }
                   axis.show();
                   axis.attr({'stroke-width':RS+'pt'});
                   big_ticks.show();
                   big_ticks.attr({'stroke-width':RS+'pt', 'transform' : '', 'stroke' : '#000000'});
                   big_labels.show();
                   big_labels.attr({'font-size':7*RS+'pt','y':5*RS});
                   little_ticks.hide();
                   little_labels.hide();
               }
        },false);
    };

    clazz.prototype.leftVisibleResidue = function() {
        var self = this;
        return Math.floor((self.sequence.length+self.padding+2)*(1-((self._canvas.width.baseVal.value + self._canvas.currentTranslate.x) / self._canvas.width.baseVal.value)))-1;
    };

    clazz.prototype.rightVisibleResidue = function() {
        var self = this;
        return Math.floor(self.leftVisibleResidue() + (self.sequence.length+self.padding+2)*(self._container_canvas.parentNode.getBoundingClientRect().width / self._canvas.width.baseVal.value));
    };

    clazz.prototype.setSequence = function(sequence) {
        var new_sequence = this._cleanSequence(sequence);
        if (new_sequence == this.sequence && new_sequence !== null) {
            jQuery(this).trigger('sequenceChange');
            return;
        }
    
        if (! new_sequence) {
            return;
        }
    
        this.sequence = new_sequence;
    
        var seq_chars = this.sequence.split('');
        var line_length = seq_chars.length;

        if (line_length === 0) {
            return;
        }

        var renderer = this;

        var seq_els = [];
    
        jQuery(seq_chars).each( function(i) {
            var el = {};
            el._index = i;
            el._renderer = renderer;
            renderer._extendElement(el);
            el.amino_acid = this;
            seq_els.push(el);
        });

        this._sequence_els = seq_els;

        var RS = this._RS;

        jQuery(this).unbind('svgready').bind('svgready',function(cnv) {
            var canv = renderer._canvas;
            canv.RS = RS;
            canv.setAttribute('background', '#000000');
            canv.setAttribute('preserveAspectRatio','xMinYMin meet');
        
            var defs = canv.makeEl('defs');
            renderer._container_canvas.appendChild(defs);


            defs.appendChild(canv.make_gradient('track_shine','0%','100%',['#111111','#aaaaaa','#111111'], [0.5,0.5,0.5]));
            defs.appendChild(canv.make_gradient('simple_gradient','0%','100%',['#aaaaaa','#888888'], [1,1]));
            defs.appendChild(canv.make_gradient('left_fade','100%','0%',['#ffffff','#ffffff'], [1,0]));
            defs.appendChild(canv.make_gradient('right_fade','100%','0%',['#ffffff','#ffffff'], [0,1]));
            defs.appendChild(canv.make_gradient('red_3d','0%','100%',['#CF0000','#540000'], [1,1]));
        
            var shadow = canv.makeEl('filter',{
                'id':'drop_shadow',
                'filterUnits':'objectBoundingBox',
                'x': '0',
                'y': '0',
                'width':'150%',
                'height':'130%'
            });

            shadow.appendChild(canv.makeEl('feGaussianBlur',{'in':'SourceGraphic', 'stdDeviation':'4', 'result' : 'blur_out'}));
            shadow.appendChild(canv.makeEl('feOffset',{'in':'blur_out', 'result':'the_shadow', 'dx':'3','dy':'1'}));
            shadow.appendChild(canv.makeEl('feBlend',{'in':'SourceGraphic', 'in2':'the_shadow', 'mode':'normal'}));
        
            defs.appendChild(shadow);

            var link_icon = canv.makeEl('svg',{
                'width' : '100%',
                'height': '100%',
                'id'    : 'new_link_icon',
                'viewBox': '0 0 100 100',
                'preserveAspectRatio' : 'xMinYMin meet'
            });

            defs.appendChild(link_icon);

            link_icon.appendChild(canv.makeEl('rect', {
                'x' : '12.5',
                'y' : '37.5',
                'stroke-width' : '3',
                'width' : '50',
                'height': '50',
                'stroke': '#ffffff',
                'fill'  : 'none'            
            }));
            link_icon.appendChild(canv.makeEl('path', {
                'd' : 'M 50.0,16.7 L 83.3,16.7 L 83.3,50.0 L 79.2,56.2 L 68.8,39.6 L 43.8,66.7 L 33.3,56.2 L 60.4,31.2 L 43.8,20.8 L 50.0,16.7 z',
                'stroke-width' : '3',
                'stroke': '#999999',
                'fill'  : '#ffffff'            
            }));

            var plus_icon = canv.makeEl('svg',{
                'width' : '100%',
                'height': '100%',
                'id'    : 'plus_icon',
                'viewBox': '0 0 100 100',
                'preserveAspectRatio' : 'xMinYMin meet'
            });
            plus_icon.appendChild(canv.plus(0,0,100/canv.RS));
            
            defs.appendChild(plus_icon);

            var minus_icon = canv.makeEl('svg',{
                'width' : '100%',
                'height': '100%',
                'id'    : 'minus_icon',
                'viewBox': '0 0 100 100',
                'preserveAspectRatio' : 'xMinYMin meet'
            });
            minus_icon.appendChild(canv.minus(0,0,100/canv.RS));

            defs.appendChild(minus_icon);
        
            drawAxis.call(this,canv,line_length);
            drawAminoAcids.call(this,canv);
            renderer._layer_containers = {};
            jQuery(renderer).trigger('sequenceChange');
        });
    
        var canvas = createCanvasObject.call(this);
    
        if (this._canvas) {
            has_canvas = true;
        } else {
            if (typeof svgweb != 'undefined') {
                svgweb.appendChild(canvas,this._container);
            } else {
                this._container.appendChild(canvas);
            }
        }
    
        var rend = this;
        this.EnableHighlights();
    
        var seq_change_func = function(other_func) {
            if ( ! rend._canvas ) {
                rend.bind('sequenceChange',function() {
                    jQuery(rend).unbind('sequenceChange',arguments.callee);
                    other_func.apply();
                });
            } else {
                other_func.apply();
            }
        };
    
        seq_change_func.ready = function(other_func) {
            this.call(this,other_func);
        };
    
        return seq_change_func;
    
    };

})(MASCP.CondensedSequenceRenderer);

/**
 * Create a Hydropathy plot, and add it to the renderer as a layer.
 * @param {Number}  windowSize  Size of the sliding window to use to calculate hydropathy values
 * @returns Hydropathy values for each of the residues
 * @type Array
 */
MASCP.CondensedSequenceRenderer.prototype.createHydropathyLayer = function(windowSize) {
    var RS = this._RS;
    
    var canvas = this._canvas;
    
    if ( ! canvas ) {        
        var orig_func = arguments.callee;
        var self = this;
        this._renderer.bind('sequencechange',function() {
            this._renderer.unbind('sequencechange',arguments.callee);            
            orig_func.call(self,windowSize);
        });
        log("Delaying rendering, waiting for sequence change");
        return;
    }

    MASCP.registerLayer('hydropathy',{ 'fullname' : 'Hydropathy plot','color' : '#990000' });
    var kd = { 'A': 1.8,'R':-4.5,'N':-3.5,'D':-3.5,'C': 2.5,
           'Q':-3.5,'E':-3.5,'G':-0.4,'H':-3.2,'I': 4.5,
           'L': 3.8,'K':-3.9,'M': 1.9,'F': 2.8,'P':-1.6,
           'S':-0.8,'T':-0.7,'W':-0.9,'Y':-1.3,'V': 4.2 };
    var plot_path = 'm'+RS*(windowSize-1)+' 0 ';
    var last_value = null;
    var max_value = -100;
    var min_value = null;
    var scale_factor = 2.5 * RS;
    var values = [];
    for (var i = windowSize; i < (this._sequence_els.length - windowSize); i++ ) {
        var value = 0;
        for (var j = -1*windowSize; j <= windowSize; j++) {
            value += kd[this._sequence_els[i+j].amino_acid[0]] / (windowSize * 2 + 1);
        }        
        
        if (scale_factor*value > max_value) {
            max_value = scale_factor*value;
        }
        if (! min_value || scale_factor*value < min_value) {
            min_value = scale_factor*value;
        }
        values[i] = value;
        if ( ! last_value ) {
            plot_path += ' m'+RS+' '+(-1*scale_factor*value);
        } else {
            plot_path += ' l'+RS+' '+(-1 * scale_factor * (last_value + value));
        }
        last_value = value * -1;
    }
    
    var plot = this._canvas.path('M0 0 m0 '+max_value+' '+plot_path);
    plot.setAttribute('stroke','#ff0000');
    plot.setAttribute('stroke-width', 0.35*RS);
    plot.setAttribute('fill', 'none');
    plot.setAttribute('visibility','hidden');
    var axis = this._canvas.path('M0 0 m0 '+(-1*min_value)+' l'+this._sequence_els.length*RS+' 0');
    axis.setAttribute('stroke-width',0.2*RS);
    axis.setAttribute('visibility','hidden');
    plot.setAttribute('pointer-events','none');
    axis.setAttribute('pointer-events','none');
    
    this._layer_containers.hydropathy.push(plot);    
    this._layer_containers.hydropathy.push(axis);
    this._layer_containers.hydropathy.fixed_track_height = (-1*min_value+max_value) / RS;
    return values;
};

(function() {
var addElementToLayer = function(layerName) {
    var canvas = this._renderer._canvas;

    if ( ! canvas ) {        
        var orig_func = arguments.callee;
        var self = this;
        this._renderer.bind('sequencechange',function() {
            this._renderer.unbind('sequencechange',arguments.callee);            
            orig_func.call(self,layerName);
        });
        log("Delaying rendering, waiting for sequence change");
        return;
    }

    var bobble = canvas.circle(this._index+0.3,10,0.25);
    bobble.setAttribute('visibility','hidden');
    bobble.style.opacity = '0.4';
    var tracer = canvas.rect(this._index+0.3,10,0.05,0);
    tracer.style.strokeWidth = '0';
    tracer.style.fill = MASCP.layers[layerName].color;
    tracer.setAttribute('visibility','hidden');
    canvas.insertBefore(tracer,canvas.firstChild.nextSibling);
    var renderer = this._renderer;
    
    if ( ! this._renderer._layer_containers[layerName].tracers) {
        this._renderer._layer_containers[layerName].tracers = canvas.set();
    }
    if ( ! canvas.tracers ) {
        canvas.tracers = canvas.set();
        canvas._visibleTracers = function() {
            return renderer._visibleTracers();
        };
    }
    var tracer_marker = canvas.marker(this._index+0.3,10,0.5,layerName.charAt(0).toUpperCase());
    
    // tracer_marker.zoom_level = 'text';
    tracer_marker.setAttribute('visibility','hidden');

    this._renderer._layer_containers[layerName].tracers.push(tracer);
    this._renderer._layer_containers[layerName].tracers.push(bobble);
    this._renderer._layer_containers[layerName].push(tracer_marker);
    canvas.tracers.push(tracer);
    
    return [tracer,tracer_marker,bobble];
};

var addBoxOverlayToElement = function(layerName,width,fraction) {
    
    if (typeof fraction == 'undefined') {
        fraction = 1;
    }
    
    var canvas = this._renderer._canvas;

    if ( ! canvas ) {
        var orig_func = arguments.callee;
        var self = this;
        this._renderer.bind('sequencechange',function() {
            this._renderer.unbind('sequencechange',arguments.callee);            
            orig_func.call(self,layerName,fraction,width);
        });
        log("Delaying rendering, waiting for sequence change");
        return;
    }


    var rect =  canvas.rect(-0.25+this._index,60,width || 1,4);
    var rect_x = parseFloat(rect.getAttribute('x'));
    var rect_max_x = rect_x + parseFloat(rect.getAttribute('width'));
    var container = this._renderer._layer_containers[layerName];
    for (var i = 0; i < container.length; i++) {
        var el_x = parseFloat(container[i].getAttribute('x'));
        var el_max_x = el_x + parseFloat(container[i].getAttribute('width'));
        if ((el_x <= rect_x && rect_x <= el_max_x) ||
            (rect_x <= el_x && el_x <= rect_max_x)) {
                container[i].setAttribute('x', ""+Math.min(el_x,rect_x));
                container[i].setAttribute('width', ""+(Math.max(el_max_x,rect_max_x)-Math.min(el_x,rect_x)) );
                rect.parentNode.removeChild(rect);
                return container[i];
            }
    }
    this._renderer._layer_containers[layerName].push(rect);
    rect.setAttribute('class',layerName);
    rect.style.strokeWidth = '0px';
    rect.setAttribute('visibility', 'hidden');
    rect.style.opacity = fraction;
    rect.setAttribute('fill',MASCP.layers[layerName].color);
    rect.position_start = this._index;
    rect.position_end = this._index + width;
//    rect.setAttribute('pointer-events','none');
    
/*
    var shine = canvas.rect(-0.25+this._index,60,width || 1,4);
    this._renderer._layer_containers[layerName].push(shine);    
    shine.style.strokeWidth = '0px';
    shine.style.fill = 'url(#track_shine)';
    shine.setAttribute('display','none');
    shine._is_shine = true;
*/
    return rect;
};

var addElementToLayerWithLink = function(layerName,url,width) {
    var canvas = this._renderer._canvas;

    if ( ! canvas ) {
        var orig_func = arguments.callee;
        var self = this;
        this._renderer.bind('sequencechange',function() {
            this._renderer.unbind('sequencechange',arguments.callee);            
            orig_func.call(self,layerName,url,width);
        });
        log("Delaying rendering, waiting for sequence change");
        return;
    }


    var rect =  canvas.rect(-0.25+this._index,60,width || 1,4);
    this._renderer._layer_containers[layerName].push(rect);
    rect.style.strokeWidth = '0px';    
    rect.setAttribute('fill',MASCP.layers[layerName].color);
    rect.setAttribute('visibility', 'hidden');
    rect.setAttribute('class',layerName);

    // BIG POTENTIAL PERFORMANCE HIT HERE?
//    rect.setAttribute('pointer-events','none');
    
/*
    var shine = canvas.rect(-0.25+this._index,60,width || 1,4);
    this._renderer._layer_containers[layerName].push(shine);    
    shine.style.strokeWidth = '0px';
    shine.style.fill = 'url(#track_shine)';
    shine.setAttribute('display','none');
    shine._is_shine = true;
*/
    return rect;
};

var addCalloutToLayer = function(layerName,element,opts) {
    var canvas = this._renderer._canvas;

    var renderer = this._renderer;
    
    if (typeof element == 'string') {
        var a_el = document.createElement('div');
        a_el.innerHTML = renderer.fillTemplate(element,opts);
        element = a_el;
    }
    
    if ( ! canvas ) {
        var orig_func = arguments.callee;
        var self = this;
        this._renderer.bind('sequencechange',function() {
            this._renderer.unbind('sequencechange',arguments.callee);            
            orig_func.call(self,layerName,width,opts);
        });
        log("Delaying rendering, waiting for sequence change");
        return;
    }
    
    var callout = canvas.callout(this._index+0.5,0.01,element,{'width' : opts.width || 100 ,'height': opts.height || 100 });
    callout.setAttribute('height',10*this._renderer._RS);
    this._renderer._canvas_callout_padding = Math.max((opts.height || 100),this._renderer._canvas_callout_padding||0);
    this._renderer._layer_containers[layerName].push(callout);
    callout.clear = function() {
        var cont = renderer._layer_containers[layerName];
        if (cont.indexOf(callout) > 0) {
            cont.splice(cont.indexOf(callout),1);
        }
        callout.parentNode.removeChild(callout);
    };
    return callout;
};

var all_annotations = {};
var default_annotation_height = 8;

var addAnnotationToLayer = function(layerName,width,opts) {
    var canvas = this._renderer._canvas;
    
    var renderer = this._renderer;
    
    if ( ! canvas ) {
        var orig_func = arguments.callee;
        var self = this;
        this._renderer.bind('sequencechange',function() {
            this._renderer.unbind('sequencechange',arguments.callee);            
            orig_func.call(self,layerName,width,opts);
        });
        log("Delaying rendering, waiting for sequence change");
        return;
    }

    if (typeof opts == 'undefined') {
        opts = { 'angle' : 0,
                'border' : 'rgb(255,0,0)',
                'content': 'A'
         };
    } else {
        if ( typeof opts.angle == 'undefined' ) {
            opts.angle = 0;
        }
    }
    
    if ( ! all_annotations[layerName]) {
        all_annotations[layerName] = {};
    }
    
    var blob_id = this._index+'_'+opts.angle;

    if (opts.angle == 'auto') {
        if ( ! all_annotations[layerName][blob_id] ) {
            all_annotations[layerName][blob_id] = {};
        }
    }

    var blob_exists = (typeof all_annotations[layerName][blob_id]) !== 'undefined';

    var height = default_annotation_height;
    var offset = this._renderer._RS * height / 2;
    var blob = all_annotations[layerName][blob_id] ? all_annotations[layerName][blob_id] : canvas.growingMarker(0,offset,opts.content,opts);
    
    if (opts.angle == 'auto') {
        if ( ! blob.contents ) {
            blob.contents = [opts.content];
        } else {
            if (blob.contents.indexOf(opts.content) < 0) {
                blob.contents.push(opts.content);
            }
        }

        opts.angle = blob.contents.length == 1 ? 0 : (-45 + 90*((blob.contents.indexOf(opts.content))/(blob.contents.length-1)));
        blob_id = this._index+'_'+opts.content;
        blob_exists = (typeof all_annotations[layerName][blob_id]) !== 'undefined';
        blob = all_annotations[layerName][blob_id] ? all_annotations[layerName][blob_id] : canvas.growingMarker(0,offset,opts.content,opts);
    }    
    
    blob.setAttribute('transform','translate('+((this._index + 0.25 - 0.1) * this._renderer._RS) +',0.01) scale(1,1) translate(0) rotate('+opts.angle+',0.01,'+offset+')');
    all_annotations[layerName][blob_id] = blob;
    if ( ! blob_exists ) {
        blob._value = 0;
        this._renderer._layer_containers[layerName].push(blob);
        this._renderer._layer_containers[layerName].fixed_track_height = default_annotation_height;
    }
    
    blob._value += width;
    if ( ! blob_exists ) {
        var bobble = canvas.circle(this._index+0.3,10+height,0.25);
        bobble.setAttribute('visibility','hidden');
        bobble.style.opacity = '0.4';

        var tracer = canvas.rect(this._index+0.25,10+height,0.05,0);
        tracer.style.strokeWidth = '0px';
        tracer.style.fill = '#777777';
        tracer.setAttribute('visibility','hidden');
        canvas.insertBefore(tracer,canvas.firstChild.nextSibling);
    
        if ( ! this._renderer._layer_containers[layerName].tracers) {
            this._renderer._layer_containers[layerName].tracers = canvas.set();
        }
        if ( ! canvas.tracers ) {
            canvas.tracers = canvas.set();
            canvas._visibleTracers = function() {
                return renderer._visibleTracers();
            };
        }

        this._renderer._layer_containers[layerName].tracers.push(tracer);
        this._renderer._layer_containers[layerName].tracers.push(bobble);
        canvas.tracers.push(tracer);
    }
    
    this._renderer.redrawAnnotations(layerName,height);
    return blob;
};

MASCP.CondensedSequenceRenderer.prototype._extendElement = function(el) {
    el.addToLayer = addElementToLayer;
    el.addBoxOverlay = addBoxOverlayToElement;
    el.addToLayerWithLink = addElementToLayerWithLink;
    el.addAnnotation = addAnnotationToLayer;
    el.callout = addCalloutToLayer;
};


MASCP.CondensedSequenceRenderer.prototype.renderTextTrack = function(lay,in_text) {
    var layerName = lay;
    if (typeof layerName !== 'string') {
        layerName = lay.name;
    }
    var canvas = this._canvas;
    if ( ! canvas || typeof layerName == 'undefined') {
        return;
    }
    var RS = this._RS;
    var renderer = this;

    var rows = parseInt(in_text.length / this.sequence.length);
    var texts = [];

    if (rows > 1) {
        var grps = in_text.match(new RegExp( ".{"+rows+"}", "g"));
        for (var i = 0; i < grps.length; i++) {
            var tot_length = grps[i].length - 1;
            while (tot_length >= 0) {
                if ( ! texts[tot_length] ) {
                    texts[tot_length] = "";
                }
                texts[tot_length] += grps[i].charAt(tot_length);
                tot_length -= 1;
            }
        }
    } else {
        texts = [in_text];
    }

    var container = this._layer_containers[layerName];

    var x = 0;

    var has_textLength = true;
    var no_op = function() {};
    try {
        var test_el = document.createElementNS(svgns,'text');
        test_el.setAttribute('textLength',10);
        no_op(test_el.textLength);
    } catch (e) {
        has_textLength = false;
    }

    if ("ontouchend" in document) {
        has_textLength = false;
    }

    var a_text;

    if (has_textLength && ('lengthAdjust' in document.createElementNS(svgns,'text')) && ('textLength' in document.createElementNS(svgns,'text'))) {
        for (var i = 0 ; i < texts.length; i++) {
            a_text = canvas.text(0,12,document.createTextNode(texts[i]));
            a_text.style.fontFamily = "'Lucida Console', 'Courier New', Monaco, monospace";
            a_text.setAttribute('lengthAdjust','spacing');
            a_text.setAttribute('textLength',RS*this.sequence.length);
            a_text.setAttribute('text-anchor', 'start');
            a_text.setAttribute('dx',5);
            a_text.setAttribute('dy',(i+0.25)*RS);
            a_text.setAttribute('font-size', RS);
            a_text.setAttribute('fill', '#000000');
            if (texts.length > 1) { 
                a_text.setAttribute('rotate','90');
            }
            container.push(a_text);
        }
        container.fixed_track_height = texts.length;
    } else {
        var seq_chars = in_text.split('');
        for (var i = 0; i < seq_chars.length; i++) {
            a_text = canvas.text(x,12,seq_chars[i]);
            a_text.firstChild.setAttribute('dy',(1.5*(i % texts.length))+'ex');
            container.push(a_text);
            a_text.style.fontFamily = "'Lucida Console', Monaco, monospace";
            if ((i % texts.length) == 0 && i > 0) {
                x += 1;
            }
        }
        container.attr( { 'y':-1000,'width': RS,'text-anchor':'start','height': RS,'font-size':RS,'fill':'#000000'});
    }
    
     canvas.addEventListener('zoomChange', function() {
        if (canvas.zoom > 3.5) {
            renderer.showLayer(lay);
        } else {
            renderer.hideLayer(lay);
        }
        renderer.refresh();
    },false);
    
    
};

MASCP.CondensedSequenceRenderer.prototype.resetAnnotations = function() {
    all_annotations = {};
};

MASCP.CondensedSequenceRenderer.prototype.removeAnnotations = function(lay) {
    var layerName = lay;
    if (typeof layerName !== 'string') {
        layerName = lay.name;
    }
    var canvas = this._canvas;
    if ( ! canvas || typeof layerName == 'undefined') {
        return;
    }

    for (var blob_idx in all_annotations[layerName]) {
        if (all_annotations[layerName].hasOwnProperty(blob_idx)) {
            var blob = all_annotations[layerName][blob_idx];
            var container = this._layer_containers[layerName];
            if (container.indexOf(blob) >= 0) {
                container.splice(container.indexOf(blob),1);
            }
            if (canvas.tracers && container.tracers) {
                for (var i = 0; i < container.tracers.length; i++ ) {
                    var tracer = container.tracers[i];
                    tracer.parentNode.removeChild(tracer);
                    if (canvas.tracers.indexOf(tracer) >= 0) {                    
                        canvas.tracers.splice(canvas.tracers.indexOf(tracer),1);
                    }
                }
                container.tracers = canvas.set();
            }
            if (blob.parentNode) {
                blob.parentNode.removeChild(blob);
            }
            all_annotations[layerName][blob_idx] = null;
        }
    }
    all_annotations[layerName] = null;
    delete all_annotations[layerName];
    delete this._layer_containers[layerName].fixed_track_height;

};

MASCP.CondensedSequenceRenderer.prototype.redrawAnnotations = function(layerName) {
    var canvas = this._canvas, a_parent = null, blob_idx = 0;
    var susp_id = canvas.suspendRedraw(10000);
    
    var max_value = 0;
    var height = default_annotation_height;
    var offset = 0;
    for (blob_idx in all_annotations[layerName]) {
        if (all_annotations[layerName].hasOwnProperty(blob_idx)) {
            if ( all_annotations[layerName][blob_idx]._value > max_value ) {
                max_value = all_annotations[layerName][blob_idx]._value;
            }
            a_parent = all_annotations[layerName][blob_idx].parentNode;
            if ( ! a_parent ) {
                continue;
            }
            a_parent.removeChild(all_annotations[layerName][blob_idx]);
            all_annotations[layerName][blob_idx]._parent = a_parent;
        }
    }
    for (blob_idx in all_annotations[layerName]) {
        if (all_annotations[layerName].hasOwnProperty(blob_idx)) {
            var a_blob = all_annotations[layerName][blob_idx];
            if ( ! a_blob.getAttribute ) {
                continue;
            }
            var size_val = (0.3 + (0.6 * a_blob._value) / max_value)*(this._RS * height * 1);
            offset = 0.5*((this._RS * height * 1) - size_val);
            var curr_transform = a_blob.getAttribute('transform');
            var transform_shift = ((-315.0/1000.0)*size_val);
            var rotate_shift = (1.0/3.0)*size_val;
            a_blob.firstChild.setAttribute('y',offset);
            curr_transform = curr_transform.replace(/translate\(\s*(-?\d+\.?\d*)\s*\)/,'translate('+transform_shift+')');
            curr_transform = curr_transform.replace(/,\s*(-?\d+\.?\d*)\s*,\s*\d+\.?\d*\s*\)/,','+rotate_shift+','+offset+')');
            a_blob.setAttribute('transform', curr_transform);
            a_blob.firstChild.setAttribute('width',size_val);
            a_blob.firstChild.setAttribute('height',size_val);
        }
    }
    
    for (blob_idx in all_annotations[layerName]) {
        if (all_annotations[layerName].hasOwnProperty(blob_idx)) {
            a_parent = all_annotations[layerName][blob_idx]._parent;
            if ( ! a_parent ) {
                continue;
            }
            a_parent.appendChild(all_annotations[layerName][blob_idx]);
        }
    }
    canvas.unsuspendRedraw(susp_id);
};

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(mpr){
  var cache = {};
  
  mpr.fillTemplate = function tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :
      
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
        
        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +
        
        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");
    
    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
  };
})(MASCP.CondensedSequenceRenderer.prototype);

})();

/**
 * Mouseover event for a layer
 * @name    MASCP.Layer#mouseover
 * @event
 * @param   {Object}    e
 */
 
/**
 * Mouseout event for a layer
 * @name    MASCP.Layer#mouseout
 * @event
 * @param   {Object}    e
 */
  
/**
 * Mousemove event for a layer
 * @name    MASCP.Layer#mousemove
 * @event
 * @param   {Object}    e
 */

/**
 * Mousedown event for a layer
 * @name    MASCP.Layer#mousedown
 * @event
 * @param   {Object}    e
 */
 
/**
 * Mouseup event for a layer
 * @name    MASCP.Layer#mouseup
 * @event
 * @param   {Object}    e
 */

/**
 * Click event for a layer
 * @name    MASCP.Layer#click
 * @event
 * @param   {Object}    e
 */

 /**
  * Long click event for a layer
  * @name    MASCP.Layer#longclick
  * @event
  * @param   {Object}    e
  */

MASCP.CondensedSequenceRenderer.prototype.EnableHighlights = function() {
    var renderer = this;
    var highlights = [];
    var createNewHighlight = function() {
        var highlight = renderer._canvas.rect(0,0,0,'100%');
        highlight.setAttribute('fill','#ffdddd');
        var pnode = highlight.parentNode;
        pnode.insertBefore(highlight,pnode.firstChild.nextSibling);
        highlights.push(highlight);
    };
    createNewHighlight();

    renderer.moveHighlight = function() {
        var vals = Array.prototype.slice.call(arguments);
        var RS = this._RS;
        var i = 0, idx = 0;
        for (i = 0; i < vals.length; i+= 2) {
            var from = vals[i];
            var to = vals[i+1];
            var highlight = highlights[idx];
            if ( ! highlight ) {
                createNewHighlight();
                highlight = highlights[idx];
            }
        
            highlight.setAttribute('x',(from - 0.25) * RS );
            highlight.setAttribute('width',(to - from) * RS );
            highlight.setAttribute('visibility','visible');
            idx += 1;
        }
        for (i = idx; i < highlights.length; i++){
            highlights[i].setAttribute('visibility','hidden');
        }
    };
};

/*
 * Get a canvas set of the visible tracers on this renderer
 */
MASCP.CondensedSequenceRenderer.prototype._visibleTracers = function() {
    var tracers = null;
    for (var i in MASCP.layers) {
        if (this.isLayerActive(i) && this._layer_containers[i].tracers) {
            if ( ! tracers ) {
                tracers = this._layer_containers[i].tracers;
            } else {
                tracers.concat(this._layer_containers[i].tracers);
            }
        }
    }
    return tracers;
};

MASCP.CondensedSequenceRenderer.prototype._resizeContainer = function() {
    var RS = this._RS;
    if (this._container && this._canvas) {
        
        var width = (this.zoom || 1)*2*this.sequence.length;
        var height = (this.zoom || 1)*2*(this._canvas._canvas_height/this._RS);
        if (this._canvas_callout_padding) {
            height += this._canvas_callout_padding;
        }
        this._canvas.setAttribute('width', width);
        this._canvas.setAttribute('height',height);
        this.navigation.setDimensions(width,height);
        
        if (this.grow_container) {
            this._container_canvas.setAttribute('height',height);
            this._container.style.height = height+'px';        
        } else {
            this._container_canvas.setAttribute('height','100%');
            this._container_canvas.setAttribute('width','100%');
            this.navigation.setZoom(this.zoom);
        }        
    }
};

(function(clazz) {

var vis_change_event = function(e,renderer,visibility) {
    var self = this;
    if ( ! renderer._layer_containers[self.name] || renderer._layer_containers[self.name].length <= 0 ) {
        return;
    }
    
    if (! visibility) {
        if (renderer._layer_containers[self.name].tracers) {
            renderer._layer_containers[self.name].tracers.hide();
        }
    }
};

/**
 * Add a layer to this renderer.
 * @param {Object} layer    Layer object to add. The layer data is used to create a track that can be independently shown/hidden.
 *                          The track itself is by default hidden.
 */
clazz.prototype.addTrack = function(layer) {
    var RS = this._RS;
    var renderer = this;
    
    if ( ! this._canvas ) {
        this.bind('sequencechange',function() {
            this.addTrack(layer);
            this.unbind('sequencechange',arguments.callee);
        });
        console.log("No canvas, cannot add track, waiting for sequencechange event");
        return;
    }

    var layer_containers = this._layer_containers || [];

    if ( ! layer_containers[layer.name] || layer_containers[layer.name] === null) {
        layer_containers[layer.name] = this._canvas.set();
        if ( ! layer_containers[layer.name].track_height) {
            layer_containers[layer.name].track_height = 4;
        }
        jQuery(layer).unbind('visibilityChange',vis_change_event).bind('visibilityChange',vis_change_event);
        var event_names = ['click','mouseover','mousedown','mousemove','mouseout','mouseup','mouseenter','mouseleave'];
        var ev_function = function(ev,original_event,element) {
            jQuery(layer).trigger(ev.type,[original_event,element.position_start,element.position_end]);
        };
        for (var i = 0 ; i < event_names.length; i++) {
            jQuery(layer_containers[layer.name]._event_proxy).bind(event_names[i],ev_function);
        }
        jQuery(layer).unbind('removed').bind('removed',function() {
            renderer.removeTrack(this);
        });
    }
    
    this._layer_containers = layer_containers;
    
};

clazz.prototype.removeTrack = function(layer) {
    if (! this._layer_containers ) {
        return;
    }
    var layer_containers = this._layer_containers || [];
    if ( layer_containers[layer.name] ) {                
        layer_containers[layer.name].forEach(function(el) {
            el.parentNode.removeChild(el);
        });
        this.removeAnnotations(layer);
        this._layer_containers[layer.name] = null;
        layer.disabled = true;
    }
    
};

/**
 * Cause a refresh of the renderer, re-arranging the tracks on the canvas, and resizing the canvas if necessary.
 * @param {Boolean} animateds Cause this refresh to be an animated refresh
 */
clazz.prototype.refresh = function(animated) {
    if ( ! this._canvas ) {
        return;
    }

    var layer_containers = this._layer_containers || [];

    var RS = this._RS;
    var track_heights = 0;
    var order = this.trackOrder || [];
    
    if (this.navigation) {
        this.navigation.reset();
    }
    for (var i = 0; i < order.length; i++ ) {
        
        var name = order[i];
        var container = layer_containers[name];
        if ( ! container ) {
            continue;
        }
        var y_val;
        if (! this.isLayerActive(name)) {
            var attrs = { 'y' : -1*(this._axis_height)*RS, 'height' :  RS * container.track_height / this.zoom ,'visibility' : 'hidden' };
//            var attrs = { 'y' : (this._axis_height  + (track_heights - container.track_height )/ this.zoom)*RS, 'height' :  RS * container.track_height / this.zoom ,'visibility' : 'hidden' };
            if (MASCP.getLayer(name).group) {
                var controller_track = this.navigation.getController(MASCP.getLayer(name).group);
                if (controller_track && this.isLayerActive(controller_track)) {
                    attrs.y = layer_containers[controller_track.name].currenty();
                }
            }
            
            if (container.fixed_track_height) {
                delete attrs.height;
            }

            if (animated) {                
                container.animate(attrs);
            } else {
                container.attr(attrs);
            }
            if (container.tracers) {
            }
            continue;
        } else {
            container.attr({ 'opacity' : '1' });
        }
        if (container.tracers) {
            var disp_style = (this.isLayerActive(name) && (this.zoom > 3.6)) ? 'visible' : 'hidden';
            var height = (1.5 + track_heights / this.zoom )*RS;
            
            if (container.fixed_track_height) {
                height += 0.5*container.fixed_track_height * RS;
            }
            if(animated) {
                container.tracers.animate({'visibility' : disp_style , 'y' : (this._axis_height - 1.5)*RS,'height' : height });
            } else {
                container.tracers.attr({'visibility' : disp_style , 'y' : (this._axis_height - 1.5)*RS,'height' : height });                
            }
        }
        if (container.fixed_track_height) {

            var track_height = container.fixed_track_height;

            y_val = this._axis_height + (track_heights  - track_height*0.3) / this.zoom;

            if (animated) {
                container.animate({ 'visibility' : 'visible','y' : (y_val)*RS });
            } else {
                container.attr({ 'visibility' : 'visible','y' : (y_val)*RS });                
            }
            
            if (this.navigation) {
                var grow_scale = this.grow_container ? 1 / this.zoom : 1;
                this.navigation.renderTrack(MASCP.getLayer(name), (y_val)*RS , RS * track_height, { 'font-scale' : (container.track_height / track_height) * 3 * grow_scale } );
            }
            track_heights += (this.zoom * track_height) + this.trackGap;
        } else {
            y_val = this._axis_height + track_heights / this.zoom;
            if (animated) {
                container.animate({ 'visibility': 'visible', 'y' : y_val*RS, 'height' :  RS * container.track_height / this.zoom });
            } else {
                container.attr({ 'visibility': 'visible', 'y' : y_val*RS, 'height' :  RS * container.track_height / this.zoom });                
            }
            if (this.navigation) {
                y_val -= 1*container.track_height/this.zoom;
                this.navigation.renderTrack(MASCP.getLayer(name), y_val*RS , RS * 3 * container.track_height / this.zoom );
                track_heights += container.track_height;
            }
            track_heights += container.track_height + this.trackGap;
        }

        container.refresh_zoom();

    }

    var viewBox = [-1,0,0,0];
    viewBox[0] = -2*RS;
    viewBox[2] = (this.sequence.split('').length+(this.padding+2))*RS;
    viewBox[3] = (this._axis_height + (track_heights / this.zoom)+ (this.padding))*RS;
    this._canvas.setAttribute('viewBox', viewBox.join(' '));
    this._canvas._canvas_height = viewBox[3];


    var outer_viewbox = [].concat(viewBox);

    outer_viewbox[0] = 0;
    outer_viewbox[2] = (this.zoom)*(2*this.sequence.length)+(this.padding);
    outer_viewbox[3] = (this.zoom)*2*(this._axis_height + (track_heights / this.zoom)+ (this.padding));
    if (! this.grow_container ) {
        this._container_canvas.setAttribute('viewBox', outer_viewbox.join(' '));
    }

    this._resizeContainer();

    viewBox[0] = 0;
    if (this.navigation) {

        if (this.navigation.visible()) {
            this._canvas.style.GomapScrollLeftMargin = 100 * RS / this.zoom;
        } else {
            this._canvas.style.GomapScrollLeftMargin = 1000;            
        }
        this.navigation.setViewBox(viewBox.join(' '));
    }

    if (this.navigation) {
        this.navigation.refresh();
    }

};

})(MASCP.CondensedSequenceRenderer);

/**
 * Zoom level has changed for this renderer
 * @name    MASCP.CondensedSequenceRenderer#zoomChange
 * @event
 * @param   {Object}    e
 */

MASCP.CondensedSequenceRenderer.Zoom = function(renderer) {

/**
 *  @lends MASCP.CondensedSequenceRenderer.prototype
 *  @property   {Number}    zoom        The zoom level for a renderer. Minimum zoom level is zero, and defaults to the default zoom value
 *  @property   {Array}     trackOrder  The order of tracks on the renderer, an array of layer/group names.
 *  @property   {Number}    padding     Padding to apply to the right and top of plots (default 10).
 *  @property   {Number}    trackGap    Vertical gap between tracks (default 10)
 */
    var timeout = null;
    var start_zoom = null;
    var zoom_level = null;
    var center_residue = null;
    var start_x = null;
    var accessors = { 
        setZoom: function(zoomLevel) {
            var min_zoom_level = renderer.sequence ? (0.3 / 2) * window.innerWidth / renderer.sequence.length : 0.5;
            if (zoomLevel < min_zoom_level) {
                zoomLevel = min_zoom_level;
            }
            if (zoomLevel > 10) {
                zoomLevel = 10;
            }

            if (zoomLevel == zoom_level) {
                return;
            }

            var self = this;

            if (! self._canvas) {
                return;
            }
            if (self.zoomCenter == 'center') {
                self.zoomCenter = {'x' : self._RS*(self.leftVisibleResidue()+0.5*(self.rightVisibleResidue() - self.leftVisibleResidue())) };
            }
            
            if ( self.zoomCenter && ! center_residue ) {
                start_x = self._canvas.currentTranslate.x || 0;
                center_residue = self.zoomCenter ? self.zoomCenter.x : 0;
            } else if (center_residue && ! self.zoomCenter ) {
                // We should not be zooming if there is a center residue and no zoomCenter;
                return;
            }

            if ( timeout ) {
                clearTimeout(timeout);
            } else {
                start_zoom = parseFloat(zoom_level || 1);
            }

            zoom_level = parseFloat(zoomLevel);        


            var curr_transform = self._canvas.parentNode.getAttribute('transform') || '';
            curr_transform = curr_transform.replace(/scale\([^\)]+\)/,'');
            var scale_value = Math.abs(parseFloat(zoomLevel)/start_zoom);
            curr_transform = 'scale('+scale_value+') '+(curr_transform || '');
            self._canvas.parentNode.setAttribute('transform',curr_transform);
            jQuery(self._canvas).trigger('_anim_begin');

            if (center_residue) {
                var delta = ((start_zoom - zoom_level)/(scale_value*25))*center_residue;
                delta += start_x/(scale_value);
                self._canvas.setCurrentTranslateXY(delta,0);
            }
        
            var end_function = function() {
                timeout = null;
                var scale_value = Math.abs(parseFloat(zoom_level)/start_zoom);

                var curr_transform = self._canvas.parentNode.getAttribute('transform') || '';
                curr_transform = curr_transform.replace(/scale\([^\)]+\)/,'');
                self._canvas.parentNode.setAttribute('transform',curr_transform);

                jQuery(self._canvas).trigger('_anim_end');

                jQuery(self._canvas).one('zoomChange',function() {
                    if (typeof center_residue != 'undefined') {
                        var delta = ((start_zoom - zoom_level)/(25))*center_residue;
                        delta += start_x;
                        if (self._canvas.shiftPosition) {
                            self._canvas.shiftPosition(delta,0);
                        } else {
                            self._canvas.setCurrentTranslateXY(delta,0);
                        }
                    }
                    center_residue = null;
                    start_x = null;              
                });
            
                if (self._canvas) {
                    self._canvas.zoom = parseFloat(zoom_level);
                    if (document.createEvent) {
                        var evObj = document.createEvent('Events');
                        evObj.initEvent('zoomChange',false,true);
                        self._canvas.dispatchEvent(evObj);
                    } else {
                        jQuery(self._canvas).trigger('zoomChange');
                    }
                }
                jQuery(self).trigger('zoomChange');


            };
        
            if (("ontouchend" in document) && self.zoomCenter) {
                jQuery(self).unbind('gestureend');
                jQuery(self).one('gestureend',end_function);
                timeout = 1;
            } else {
                timeout = setTimeout(end_function,100);
            }
        },

        getZoom: function() {
            return zoom_level || 1;
        }
    };

    if (renderer.__defineSetter__) {    
        renderer.__defineSetter__("zoom", accessors.setZoom);
        renderer.__defineGetter__("zoom", accessors.getZoom);
    }

    if (Object.defineProperty && ! MASCP.IE8) {
        Object.defineProperty(renderer,"zoom", {
            get : accessors.getZoom,
            set : accessors.setZoom
        });
    }

};

/* Add some properties that will trigger a refresh on the renderer when they are changed.
   These are all stateless
 */

(function(clazz) {

    var accessors = {
        getPadding: function() {
            return this._padding || 10;
        },

        setPadding: function(padding) {
            this._padding = padding;
            this.refresh();
        },

        getTrackGap: function() {
            if (! this._track_gap){
                var default_value = ("ontouchend" in document) ? 20 : 10;
                this._track_gap = this._track_gap || default_value;
            }

            return this._track_gap;
        },

        setTrackGap: function(trackGap) {
            this._track_gap = trackGap;
            this.refresh();
        }
    };

    if (clazz.prototype.__defineSetter__) {    
        clazz.prototype.__defineSetter__("padding", accessors.setPadding);
        clazz.prototype.__defineGetter__("padding", accessors.getPadding);
        clazz.prototype.__defineSetter__("trackGap", accessors.setTrackGap);
        clazz.prototype.__defineGetter__("trackGap", accessors.getTrackGap);
    }



    if (Object.defineProperty && ! MASCP.IE8 ) {
        Object.defineProperty(clazz.prototype,"padding", {
            get : accessors.getPadding,
            set : accessors.setPadding
        });
        Object.defineProperty(clazz.prototype,"trackGap", {
            get : accessors.getTrackGap,
            set : accessors.setTrackGap
        });
    }
    
})(MASCP.CondensedSequenceRenderer);
MASCP.CondensedSequenceRenderer.Navigation = (function() {

    var touch_scale = 1, touch_enabled = false;
    if ("ontouchend" in document) {
        touch_scale = 2;
        touch_enabled = true;
    }

    var Navigation = function(parent_canvas,renderer) {
        SVGCanvas(parent_canvas);

        buildNavPane.call(this,parent_canvas);

        var track_group = parent_canvas.group();

        parent_canvas.insertBefore(track_group,parent_canvas.lastChild);

        var track_canvas = document.createElementNS(svgns,'svg');    
        buildTrackPane.call(this,track_canvas,connectRenderer.call(this,renderer));

        track_group.appendChild(track_canvas);

        track_group.setAttribute('clip-path','url(#nav_clipping)');

        this.demote = function() {
            track_canvas.hide();
            return;
        };

        this.promote = function() {
            if (this.visible()) {
                track_canvas.show();
            } else {
                track_canvas.hide();
            }
        };
        
        this.setDimensions = function(width,height) {
            parent_canvas.setAttribute('width',width);
            parent_canvas.setAttribute('height',height);
        };
        
    };

    var connectRenderer = function(renderer) {

        /**
         * Create a layer based controller for a group. Clicking on the nominated layer will animate out the expansion of the
         * group.
         * @param {Object} lay Layer to turn into a group controller
         * @param {Object} grp Group to be controlled by this layer.
         */
        
        var controller_map = {};
        var expanded_map = {};
        
        var old_remove_track = renderer.removeTrack;

        renderer.removeTrack = function(layer) {
            old_remove_track.call(this,layer);
            delete controller_map[layer.name];
            delete expanded_map[layer.name];
        };


        this.isController = function(layer) {
            if (controller_map[layer.name]) {
                return true;
            } else {
                return false;
            }
        };
        
        this.getController = function(group) {
            for (var lay in controller_map) {
                if (controller_map.hasOwnProperty(lay) && controller_map[lay] == group) {
                    return MASCP.getLayer(lay);
                }
            }
            return null;
        };
        
        this.isControllerExpanded = function(layer) {
            return expanded_map[layer.name];
        };
        
        renderer.createGroupController = function(lay,grp) {
            var layer = MASCP.getLayer(lay);
            var group = MASCP.getGroup(grp);

            if ( ! layer || ! group) {
                return;
            }

            if (controller_map[layer.name]) {
                return;
            }

            controller_map[layer.name] = group;
            
            expanded_map[layer.name] = false;
            
            var self = this;

            jQuery(layer).bind('removed',function(ev,rend) {
                self.setGroupVisibility(group);
            });

            jQuery(layer).bind('visibilityChange',function(ev,rend,visible) {
                if (group.size() > 0) {            
                    self.setGroupVisibility(group, expanded_map[layer.name] && visible,true);
                    renderer.refresh();
                }
            });
            jQuery(group).bind('visibilityChange',function(ev,rend,visible) {
                if (visible) {
                    self.showLayer(layer,true);
                    expanded_map[layer.name] = true;
                }
            });
            jQuery(layer).unbind('_expandevent').bind('_expandevent',function(ev) {
                expanded_map[layer.name] = ! expanded_map[layer.name];
                self.withoutRefresh(function() {
                    self.setGroupVisibility(group,expanded_map[layer.name]);
                });
                self.refresh(true);
            });
        };

        return DragAndDrop(function(track,before,after){
            var t_order = renderer.trackOrder;

            t_order.trackIndex = function(tr) {
                if (! tr ) {
                    return this.length;
                }
                return this.indexOf(tr.name);
            };
        
            if (after && ! before) {
                before = MASCP.getLayer(t_order[t_order.trackIndex(after) + 1]);
            }
        
            t_order.splice(t_order.trackIndex(track),1);
            var extra_to_push = [];
            if (controller_map[track.name]) {
                MASCP.getGroup(controller_map[track.name]).eachLayer(function(lay) {
                    if (MASCP.getGroup(lay) === lay) {
                        MASCP.getGroup(lay).eachLayer(arguments.callee);
                    }
                    if (t_order.trackIndex(lay) >= 0) {
                        extra_to_push = [t_order.splice(t_order.trackIndex(lay),1)[0]].concat(extra_to_push);
                    }
                });
            }
            if (before) {
                t_order.splice(t_order.trackIndex(before),1,track.name, before ? before.name : undefined );
                for (var i = 0; i < extra_to_push.length; i++ ) {
                    if (extra_to_push[i]) {
                        t_order.splice(t_order.trackIndex(before),0,extra_to_push[i]);
                    }
                }
            } else {
                renderer.hideLayer(track);
                MASCP.getLayer(track).disabled = true;                

                extra_to_push.forEach(function(lay) {
                    
                    renderer.hideLayer(lay);
                    MASCP.getLayer(lay).disabled = true;                    
                });
                t_order.push(track.name);
                t_order = t_order.concat(extra_to_push);
            }
        
            renderer.trackOrder = t_order;
        });
    };
    
    var DragAndDrop = function(spliceFunction) {    
        var targets = [];
        var in_drag = false, drag_el;
        
        var splice_before, splice_after, trackToSplice;
        
        var last_target;

        var timeouts = {};
        
        var nav_reset_set = null;

        var drag_func = function(handle,element,track,canvas) {
            var nav = this;

            var old_reset = nav.reset;
            if (nav_reset_set === null) {
                nav.reset = function() {
                    targets = [];
                    old_reset.call(this);
                };
                nav_reset_set = true;
            }
            var resetDrag = function() {
                window.clearTimeout(timeouts.anim);
                window.clearTimeout(timeouts.hover);
                for (var i = 0; i < targets.length; i++) {
                    if (targets[i] != drag_el) {
                        targets[i].removeAttribute('transform');
                        targets[i].setAttribute('pointer-events','all');
                    }
                }
            };
        
            targets.push(element);
            element.track = track;

            var single_touch_event = function(fn) {
                return function(e) {
                    if (e.touches && e.touches.length == 1) {
                        fn.call(this,e);
                    }
                };
            };

            var beginDragging = function(ev,tr,lbl_grp) {
            
                if (drag_disabled()) {
                    return;
                }

                var target = canvas.nearestViewportElement;

                if (in_drag) {
                    return;                
                }


                spliceBefore = null;
                spliceAfter = null;

                var p_orig = lbl_grp.nearestViewportElement.createSVGPoint();

                p_orig.x = ev.clientX || (window.pageXOffset + ev.touches[0].clientX);
                p_orig.y = ev.clientY || (window.pageYOffset + ev.touches[0].clientY);

                var rootCTM = lbl_grp.nearestViewportElement.getScreenCTM();
                var matrix = rootCTM.inverse();

                p_orig = p_orig.matrixTransform(matrix);

                var oX = p_orig.x;
                var oY = p_orig.y;

                var dragfn = function(e) {
                    var p = lbl_grp.nearestViewportElement.createSVGPoint();
                    p.x = e.clientX || (window.pageXOffset + e.touches[0].clientX);
                    p.y = e.clientY || (window.pageYOffset + e.touches[0].clientY);
                    p = p.matrixTransform(matrix);

                    var dX = (p.x - oX);
                    var dY = (p.y - oY);
                    var curr_transform = lbl_grp.getAttribute('transform') || '';
                    curr_transform = curr_transform.replace(/\s?translate\([^\)]+\)/,'');
                    curr_transform += ' translate('+dX+','+dY+') ';
                    curr_transform = curr_transform.replace(/\s*$/,'');
                    lbl_grp.setAttribute('transform',curr_transform);
                    targets.forEach(function(targ){
                        var bb = targ.getBBox();
                        if (bb.y < p.y && bb.y > (p.y - bb.height) && bb.x < p.x && bb.x > (p.x - bb.width)) {
                            el_move.call(targ,e,targ.track);
                        }
                    });
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                };
                if (touch_enabled) {
                    dragfn = single_touch_event(dragfn);
                }

                var enddrag = function(e) {
                    if (e.relatedTarget && (e.relatedTarget == lbl_grp || e.relatedTarget.nearestViewportElement == lbl_grp.nearestViewportElement || e.relatedTarget.nearestViewportElement == target)) {
                        if (in_drag && targets.indexOf(e.relatedTarget) >= 0) {                        
                            resetDrag();
                        }
                        return;
                    }

                    if (in_drag && (e.type == 'mouseup' || e.type == 'touchend')) {
                        if (spliceBefore || spliceAfter) {
                            spliceFunction(trackToSplice, spliceBefore, spliceAfter);
                        }
                    }
                    target.removeEventListener('touchmove',dragfn,false);
                    target.removeEventListener('mousemove',dragfn,false);
                    target.removeEventListener('touchend',arguments.callee,false);
                    target.removeEventListener('mouseup',arguments.callee,false);
                    target.removeEventListener('mouseout',arguments.callee,false);
                    if (in_drag) {
                        lbl_grp.setAttributeNS(null, 'pointer-events', 'all');
                        lbl_grp.removeAttribute('transform');
                        resetDrag();
                        in_drag = false;
                        last_target = null;
                    }
                };
                lbl_grp.setAttributeNS(null, 'pointer-events', 'none');
                lbl_grp.addEventListener('touchmove',dragfn,false);
                lbl_grp.addEventListener('touchend',enddrag,false);
                target.addEventListener('mousemove',dragfn,false);
                target.addEventListener('mouseup',enddrag,false);
                target.addEventListener('mouseout',enddrag,false);
            
                in_drag = track;
                drag_el = lbl_grp;
            };

            var handle_start = function(e) {
                beginDragging(e,track,element);
            };

            var el_move = function(e,trk) {
                var trck = trk ? trk : track;
                var elem = this ? this : element;
            
                if ( in_drag && in_drag != trck && trck != last_target) {
                    last_target = trck;
                    if (timeouts.hover) {
                        window.clearTimeout(timeouts.hover);
                    }
                    timeouts.hover = window.setTimeout(function() {
                        if ( (in_drag.group || trck.group) &&                    
                             (in_drag.group ? trck.group :  ! trck.group ) ) {
                            if (in_drag.group.name != trck.group.name) {
                                return;
                            }
                        } else {
                            if ( in_drag.group || trck.group ) {
                                return;
                            }
                        }

                        if (timeouts.anim) {
                            window.clearInterval(timeouts.anim);
                            timeouts.anim = null;
                        }
                    
                        resetDrag();
                    
                        var current_sibling = elem;
                    
                        var elements_to_shift = [];

                        while (current_sibling !== null) {
                            if (current_sibling != drag_el && targets.indexOf(current_sibling) >= 0) {
                                elements_to_shift.push(current_sibling);
                            }
                            current_sibling = current_sibling.nextSibling;
                            if (current_sibling == drag_el) {
                                break;
                            }
                        }
                    
                        current_sibling = elem.previousSibling;
                    
                        var elements_to_shift_up = [];
                    
                        while (current_sibling !== null) {
                            if (current_sibling != drag_el && targets.indexOf(current_sibling) >= 0) {
                                elements_to_shift_up.push(current_sibling);
                            }
                            current_sibling = current_sibling.previousSibling;
                            if (current_sibling == drag_el) {
                                break;
                            }
                        }
                        var anim_steps = 1;
                        var height = drag_el.getBBox().height / 4;
                        timeouts.anim = window.setInterval(function() {
                            var curr_transform, i = 0;
                        
                            if (anim_steps < 5) {
                                for (i = 0; i < elements_to_shift.length; i++ ) {
                                    curr_transform = elements_to_shift[i].getAttribute('transform') || '';
                                    curr_transform = curr_transform.replace(/\s?translate\([^\)]+\)/,'');
                                    curr_transform += ' translate(0,'+anim_steps*height+')';
                                    elements_to_shift[i].setAttribute('transform',curr_transform);
                                }

                                for (i = 0; (elements_to_shift.length > 0) && i < elements_to_shift_up.length; i++ ) {

                                    curr_transform = elements_to_shift_up[i].getAttribute('transform') || '';
                                    curr_transform = curr_transform.replace(/\s?translate\([^\)]+\)/,'');
                                    curr_transform += ' translate(0,'+anim_steps*-1*height+')';
                                    elements_to_shift_up[i].setAttribute('transform',curr_transform);
                                }


                                anim_steps += 1;
                            } else {
                                spliceBefore = trck;
                                trackToSplice = in_drag;
                                window.clearInterval(timeouts.anim);
                                timeouts.anim = null;
                            }
                        },30);

                    },300);
                }
            };
        
            handle.addEventListener('mousedown', handle_start,false);
            handle.addEventListener('touchstart',single_touch_event(handle_start),false);
        };

        var drag_disabled = function() {
            return drag_func.disabled;
        };

        drag_func.spliceFunction = spliceFunction;
        
        return drag_func;
    };

    var buildNavPane = function(back_canvas) {
        var self = this;
        var nav_width = 200+(touch_scale - 1)*100;
        var panel_back = back_canvas.group();
        var button_group = back_canvas.group();
        
        var rect = back_canvas.rect(-10,0,nav_width.toString(),'100%');
        var base_rounded_corner = [12*touch_scale,10*touch_scale];
        rect.setAttribute('rx',base_rounded_corner[0].toString());
        rect.setAttribute('ry',base_rounded_corner[1].toString());    
        if (! touch_enabled) {
            rect.setAttribute('opacity','0.8');
        }
        rect.style.stroke = '#000000';
        rect.style.strokeWidth = '2px';
        rect.style.fill = '#000000';
        rect.id = 'nav_back';

        panel_back.push(rect);

        var clipping = document.createElementNS(svgns,'clipPath');
        clipping.id = 'nav_clipping';
        var rect2 = document.createElementNS(svgns,'use');
        rect2.setAttributeNS('http://www.w3.org/1999/xlink','href','#nav_back');
    
        back_canvas.insertBefore(clipping,back_canvas.firstChild);
        clipping.appendChild(rect2);

        var close_group = back_canvas.crossed_circle(nav_width-(10 + touch_scale*11),(12*touch_scale),(10*touch_scale));

        close_group.style.cursor = 'pointer';

        button_group.push(close_group);

        var tracks_button = MASCP.IE ? back_canvas.svgbutton(10,5,65,25,'Edit') : back_canvas.button(10,5,65,25,'Edit');
        tracks_button.id = 'controls';
        tracks_button.parentNode.setAttribute('clip-path','url(#nav_clipping)');

        panel_back.push(MASCP.IE ? tracks_button : tracks_button.parentNode);

        var scroll_controls = document.createElementNS(svgns,'foreignObject');
        scroll_controls.setAttribute('x','0');
        scroll_controls.setAttribute('y','0');
        scroll_controls.setAttribute('width','100');
        scroll_controls.setAttribute('height','45');
        scroll_controls.setAttribute('clip-path',"url(#nav_clipping)");
    
        panel_back.push(scroll_controls);
            
        tracks_button.addEventListener('click',function() {
            jQuery(self).trigger('toggleEdit');
            jQuery(self).trigger('click');
        },false);
    
        var visible = true;
        
        var toggler = function(vis) {
            visible = ( vis === false || vis === true ) ? vis : ! visible;
            var close_transform;
        
            if (visible) {
                self.promote();
                panel_back.setAttribute('visibility','visible');

                close_group._button.removeAttribute('filter');
                close_transform = close_group.getAttribute('transform') || ' ';
                close_transform = close_transform.replace(/translate\(.*\)/,'');
                close_transform = close_transform.replace(/rotate\(.*\)/,'');
            
                close_group.setAttribute('transform',close_transform);

                scroll_controls.setAttribute('display','inline');
                self.refresh();
            } else {
                self.demote();
                panel_back.setAttribute('visibility','hidden');

                close_group._button.setAttribute('filter','url(#drop_shadow)');            
                close_transform = close_group.getAttribute('transform') || ' ';
                close_transform = close_transform + ' translate('+-0.75*nav_width+',0) rotate(45,'+(nav_width-(10 + touch_scale*11))+','+(12*touch_scale)+') ';
                close_group.setAttribute('transform',close_transform);
                scroll_controls.setAttribute('display','none');
            }
            return true;
        };
    
        self.hide = function() {
            toggler.call(this,false);
        };
        self.show = function() {
            toggler.call(this,true);
        };

        self.visible = function() {
            return visible;
        };

        self.setZoom = function(zoom) {
            close_group.setAttribute('transform','scale('+zoom+','+zoom+') ');
            rect.setAttribute('transform','scale('+zoom+',1) ');
            rect.setAttribute('ry', (zoom*base_rounded_corner[1]).toString());
            self.refresh();
        };

        close_group.addEventListener('click',function() {
            if (visible) {
                self.hide();
            } else {
                self.show();
            }
        },false);
    };

    var buildTrackPane = function(track_canvas,draganddrop) {
        var self = this;

        var close_buttons, controller_buttons, edit_enabled;

        var nav_width_track_canvas_ctm = 0;

        SVGCanvas(track_canvas);
        track_canvas.setAttribute('preserveAspectRatio','xMinYMin meet');



        var track_rects = [];

        self.reset = function() {
            while (track_canvas.firstChild) {
                track_canvas.removeChild(track_canvas.firstChild);
            }
            track_rects = [];
            ctm_refresh = [];
//            self.refresh();
        };

        var ctm_refresh = [];

        self.refresh = function() {
            (close_buttons || []).forEach(function(button) {
                button.setAttribute('visibility', edit_enabled ? 'visible' : 'hidden');
            });
            (controller_buttons || []).forEach(function(button) {
                button.setAttribute('visibility', edit_enabled ? 'hidden' : 'visible');
            });
            if (edit_enabled) {
                toggleMouseEvents.call(this,true);
            } else {
                toggleMouseEvents.call(this,false);
            }

            if (track_canvas.getAttribute('display') == 'none') {
                return;
            }

            var ctm = document.getElementById('nav_back').getTransformToElement(track_canvas);
            var back_width = (document.getElementById('nav_back').getBBox().width + document.getElementById('nav_back').getBBox().x);
            var point = track_canvas.createSVGPoint();
            point.x = back_width;
            point.y = 0;
            nav_width_track_canvas_ctm = point.matrixTransform(ctm).x;
            ctm_refresh.forEach(function(el) {
                var width = 0;
                try {
                    width = el.getBBox().width;
                } catch (err) {
                    // This is a bug with Firefox on some elements getting
                    // the bounding box. We silently fail here, as I can't
                    // figure out why the call to getBBox fails.
                }
                if ( width > 0) {
                    var a_y = /translate\((-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)\)/.exec(el.getAttribute('transform') || '');
                    if (typeof a_y != 'undefined') {
                        a_y = a_y[2];
                    } else {
                        return;
                    }
                    
                    var new_x = nav_width_track_canvas_ctm- 1.5*parseInt(el.getAttribute('width'),10);
                    el.setAttribute('transform','translate('+new_x+','+a_y+')');
                }
            });
        };

        var toggleMouseEvents = function(on) {
            if (track_rects) {
                (track_rects || []).forEach(function(el) {
                    el.setAttribute('opacity',on ? '1': (touch_enabled ? "0.5" : "0.1") );
                    el.setAttribute('pointer-events', on ? 'all' : 'none');
                });
            }
        };

        jQuery(self).bind('toggleEdit',function() {
            edit_enabled = typeof edit_enabled == 'undefined' ? true : ! edit_enabled;
            draganddrop.disabled = ! edit_enabled;
            toggleMouseEvents.call(self,edit_enabled);
        
            self.hide();
            self.show();
            
            (close_buttons || []).forEach(function(button) {
                button.setAttribute('visibility', edit_enabled ? 'visible' : 'hidden');
            });
            (controller_buttons || []).forEach(function(button) {
                button.setAttribute('visibility', edit_enabled ? 'hidden' : 'visible');
            });

        });
        
        this.setViewBox = function(viewBox) {
            track_canvas.setAttribute('viewBox',viewBox);
        };
    
        track_canvas.style.height = '100%';
        track_canvas.style.width = '100%';
        track_canvas.setAttribute('height','100%');        
        track_canvas.setAttribute('width','100%');


        this.renderTrack = function(track,y,height,options) {
            var label_group = track_canvas.group();
            var a_rect = track_canvas.rect(0,y,'100%',height);
            a_rect.setAttribute('stroke','#000000');
            a_rect.setAttribute('stroke-width','2');
            a_rect.setAttribute('fill','url(#simple_gradient)');
            a_rect.setAttribute('opacity',touch_enabled ? '0.5' : '0.1');
            a_rect.setAttribute('pointer-events','none');
            track_rects = track_rects || [];
        
            track_rects.push(a_rect);
        
            label_group.push(a_rect);

            // Use these for debugging positioning
        
            // var r = track_canvas.rect(0,y-height,height,height);
            // r.setAttribute('fill','#ff0000');
            // label_group.push(r);
            // 
            // r = track_canvas.rect(0,y+height,height,height);
            // r.setAttribute('fill','#ff0000');
            // label_group.push(r);
        
        
            var text_scale = (options && options['font-scale']) ? options['font-scale'] : 1;
            var text_left = 4/3*touch_scale*height*text_scale;            
            var a_text = track_canvas.text(text_left,y+0.5*height,track.fullname);
            a_text.setAttribute('height', height);
            a_text.setAttribute('width', height);
            a_text.setAttribute('font-size',0.6*height*text_scale);
            a_text.setAttribute('fill','#ffffff');
            a_text.setAttribute('stroke','#ffffff');
            a_text.setAttribute('stroke-width','1');
            a_text.firstChild.setAttribute('dy', '0.5ex');

            // r = track_canvas.rect(3*height*text_scale,y+0.5*height,2*height,2*height);
            // r.setAttribute('fill','#00ff00');
            // label_group.push(r);

            label_group.push(a_text);
        
            a_text.setAttribute('pointer-events','none');
        
            var circ;
        
            if (track.href ) {
                a_anchor = track_canvas.a(track.href);
                var icon_name = null;
                var icon_metrics = [0.5*height*text_scale,0,height*text_scale*touch_scale];
                icon_metrics[1] = -0.5*(icon_metrics[2] - height);

                circ = track_canvas.circle(icon_metrics[0]+0.5*icon_metrics[2],0.5*height,0.5*icon_metrics[2]);
                circ.setAttribute('fill','#ffffff');
                circ.setAttribute('opacity','0.1');
                a_anchor.appendChild(circ);
            
                var url_type = track.href;
                if (typeof url_type === 'string' && url_type.match(/^javascript\:/)) {
                    icon_name = '#plus_icon';
                } else if (typeof url_type === 'function') {
                    icon_name = '#plus_icon';
                    a_anchor.setAttribute('href','#');
                    a_anchor.removeAttribute('target');
                    a_anchor.addEventListener('click',function(e) {
                        url_type.call();

                        if (e.preventDefault) {
                            e.preventDefault();
                        } else {
                            e.returnResult = false;
                        }
                        if (e.stopPropagation) {
                            e.stopPropagation();
                        } else {
                            e.cancelBubble = true;
                        }

                        return false;
                    },false);
                } else {
                    icon_name = '#new_link_icon';
                }
                if (track.icon) {
                    icon_name = track.icon;
                }
                var a_use = track_canvas.use(icon_name,icon_metrics[0],icon_metrics[1],icon_metrics[2],icon_metrics[2]);
                a_use.style.cursor = 'pointer';
                a_anchor.appendChild(a_use);
                a_anchor.setAttribute('transform','translate('+(nav_width_track_canvas_ctm - 1.5*icon_metrics[2])+','+y+')');
                a_anchor.setAttribute('width',icon_metrics[2].toString());
                ctm_refresh.push(a_anchor);
            }
        
            label_group.addEventListener('touchstart',function() {
                label_group.onmouseover = undefined;
                label_group.onmouseout = undefined;
            },false);

            label_group.addEventListener('touchend',function() {
                label_group.onmouseover = undefined;
                label_group.onmouseout = undefined;
            },false);
        
            draganddrop.call(this,a_rect,label_group,track,track_canvas);
        
            (function() {
            
                if (track.group) {
                    return;
                }
            
                var t_height = 0.5*height*touch_scale;            

                if ( ! close_buttons) {
                    close_buttons = [];
                }
            
                var closer = track_canvas.crossed_circle(1.5*t_height,0,t_height);
                closer.setAttribute('transform','translate(0,'+(y+0.5*height)+') scale('+text_scale+')');
                closer.firstChild.setAttribute('fill','url(#red_3d)');
                for (var nodes = closer.childNodes, i = 0, len = nodes.length; i < len; i++) {
                    nodes[i].setAttribute('stroke-width',(t_height/4).toString());
                }
                closer.addEventListener('click',function() {
                    draganddrop.spliceFunction(track);
                },false);
                label_group.push(closer);
                close_buttons.push(closer);
                closer.setAttribute('visibility', 'hidden');
            
            })();
            if (this.isController(track)) {
                if ( ! controller_buttons) {
                    controller_buttons = [];
                }

                var t_height = 0.5*height*touch_scale;
                var expander = track_canvas.group();
                circ = track_canvas.circle(1.5*t_height,0,t_height);
                circ.setAttribute('fill','#ffffff');
                circ.setAttribute('opacity','0.1');
                expander.push(circ);

                var t_metrics = [1.1*t_height,-1.25*t_height,2.25*t_height,(-0.5*t_height),1.1*t_height,0.25*t_height];
            
                t_metrics[1] += 0.5*(t_height - 0*height);
                t_metrics[3] += 0.5*(t_height - 0*height);
                t_metrics[5] += 0.5*(t_height - 0*height);

            
                var group_toggler = track_canvas.poly(''+t_metrics[0]+','+t_metrics[1]+' '+t_metrics[2]+','+t_metrics[3]+' '+t_metrics[4]+','+t_metrics[5]);
                if (this.isControllerExpanded(track)) {
                    expander.setAttribute('transform','translate(0,'+(y+0.5*height)+') scale('+text_scale+') rotate(90,'+(1.5*t_height)+','+t_metrics[3]+')');
                } else {
                    expander.setAttribute('transform','translate(0,'+(y+0.5*height)+') scale('+text_scale+')');
                }
                group_toggler.setAttribute('height', 1.75*t_height);
                group_toggler.setAttribute('font-size',1.5*t_height);
                group_toggler.setAttribute('fill','#ffffff');
                group_toggler.setAttribute('pointer-events','none');
            
                expander.push(group_toggler);

                expander.style.cursor = 'pointer';
                expander.addEventListener('click',function(e) {
                    e.stopPropagation();
                    jQuery(track).trigger('_expandevent');
                    if (self.isControllerExpanded(track)) {
                        expander.setAttribute('transform','translate(0,'+(y+0.5*height)+') scale('+text_scale+') rotate(90,'+(1.5*t_height)+','+t_metrics[3]+')');                
                    } else {
                        expander.setAttribute('transform','translate(0,'+(y+0.5*height)+') scale('+text_scale+')');
                    }
                },false);
                label_group.push(expander);

                controller_buttons.push(expander);
                expander.setAttribute('visibility', 'hidden');
            }
        };
    };

    return Navigation;
})();// Copyright Hiren Joshi - tobe LGPLed
/**
 * @fileoverview    Tag visualisation class
 * @author          hirenj
 */

if ( typeof(MASCP) == 'undefined' ) {
    MASCP = {};
}

/**

*/
if ( typeof(MASCP.TagVisualisation) == 'undefined' ) {
    MASCP.TagVisualisation = {};
}

/**
 * MASCP.TagVisualisation. Provides a set of visualisations which can be used
 * to render tables of tags.
 * e.g:
 *
 * <pre>
 * ***************************************
 * * Row *  Surname * Number of children *
 * ***************************************
 * *  1  *  Smith   *   25               *
 * *  2  *  Jones   *   12               *
 * *  3  *  Wesson  *   8                *
 * ***************************************
 * </pre>
 * 
 * This javascript will replace this table with a tag cloud, and set the sizes
 * of each of the tags (in this case Surname would be appropriate to use) to
 * correspond to the number of children.
 *
 * It is important the markup for the table contain thead and tbody elements, 
 * as these are required to distinguish between header and data sections within
 * the table.
 * 
 * <h3>Usage</h3>
 * <pre>
 *  var tagvis;
 *  tagvis = new MASCP.TagVisualisation("table_identifier",[MASCP.TagVisualisation.TagCloud]);
 *
 *  // Set the tag column to 2
 *  tagvis.tagColumn = 2;
 *
 *  // Optionally set the tagFactory method to return A elements instead of SPANS
 *  foobar.visualisations[0].tagFactory = function(tagId,tag,row) {
 *      var md = MochiKit.DOM;
 *      var tagEl = md.A({ "id" : MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_ID_PREFIX+tagId
 *                  }, tag);
 *      return tagEl;
 *  };
 *
 *  // Call an update on the visualisation, using data column 1
 *  foobar.visualisations[0].update(1);
 * </pre>
 *
 * @param {String} datasetName The id of the table containing the dataset.
 * @param {Class[]} visClasses The classes of the visualisations to be used in this visualiser
 * @constructor 
 */
MASCP.TagVisualisation = function(datasetName,visClasses) {
    this.datasetName = datasetName;
    this._buildRichTableView(visClasses);
    
};

MASCP.TagVisualisation.prototype = {
    __class__: MASCP.TagVisualisation,
    /** The visualisations
     *  @type Visualisation[]
     */
    visualisations: null,
    /** The id of the element used for data
     * @type String
     */
    datasetName: "",
    /** The column number in the data set for tag names
     *  @type int
     */
    tagColumn: ""
};

MASCP.TagVisualisation.prototype._buildRichTableView = function(visClasses) {
    var datasetName = this.datasetName;
    var dataTable = document.getElementById(datasetName);
    if (dataTable.getAttributeNS) {
        var newColumn = parseInt(dataTable.getAttributeNS("MASCP.TagVisualisation","tagcolumn"),10);
        this.tagColumn = newColumn ? newColumn : this._getTagColumn();
    } else {
        this.tagColumn = this._getTagColumn();
    }
    var dataTableContainer = dataTable.parentNode;
    var containingElement = null;

    // Place the Table element within a containing DIV
    // just in case it's not in one already
    // containingElement will then contain a sized div
    // which is the dataTableContainer. The dataTableContainer
    // contains the table itself.
    
    if (dataTableContainer.nodeName == "BODY") {
        containingElement = dataTableContainer;
        var container_div = document.createElement('div');
        dataTable.parentNode.replaceChild(container_div,dataTable);     
        container_div.appendChild(dataTable);
        dataTableContainer = dataTable.parentNode;
    } else {
        containingElement = dataTableContainer.parentNode;
    }

    this._dataTableContainer = dataTableContainer;

    var richDiv = this._buildRichTagInfoContainer(dataTableContainer);
    containingElement.insertBefore( richDiv, dataTableContainer);   
    this._displayElement = richDiv;

    for (var i = 0; i < visClasses.length; i++ ) {
        this.addVisualisation(new visClasses[i](this));
    }
    // Hide away the existing table
    dataTable.old_style = dataTable.style.display;
    dataTable.style.display = "none";
    
};

MASCP.TagVisualisation.prototype._getDisplayWidth = function(el) {
    var computedStyle;

    // If the default method of obtaining the
    // computed style works, use that
    if ( window.getComputedStyle !== undefined ) {
        computedStyle = getComputedStyle(el,"");

    // We need to use a different method to get the computed style
    // from Safari
    } else if (document.defaultView.getComputedStyle !== undefined) {
        computedStyle = document.defaultView.getComputedStyle(el,"");
    }

    // Use a default width just in case we can't find a computed style
    if (computedStyle !== undefined) {
        return parseInt(computedStyle.getPropertyValue("width").replace(/px/, ""),10); 
    } else {
        return undefined;
    }
};

MASCP.TagVisualisation.prototype._buildRichTagInfoContainer = function(currentElement) {
    var a_div = document.createElement('div');
    a_div.setAttribute('id', "rich_"+this.datasetName );
    a_div.setAttribute('class', "rich_as_data "+currentElement.className );
    a_div.style.width = currentElement.style.width;
    a_div.style.height = currentElement.style.height;
    a_div.style.display = currentElement.style.display;
    a_div.style.position = currentElement.style.position;
    return a_div;
};

/**
 * Toggle the usage of this visualisation. Returns the original 
 * table to the data flow if has been hidden.
 */
MASCP.TagVisualisation.prototype.toggleTagView = function() {
    var dataTable = document.getElementById(this.datasetName);
    if ( dataTable.style.display == "none" ) {
        dataTable.style.display = dataTable.old_style;
        this.getDisplayElement().style.display = "none";
    } else {
        dataTable.style.display = "none";
        this.getDisplayElement().style.display = "block";       
    }
};

/**
 * Returns the element in the document which act as the container to the visualisation
 * @return {HTMLElement} Container element
 */
MASCP.TagVisualisation.prototype.getDisplayElement = function() {
    return this._displayElement;
};

/**
 * Add a visualisation to the visualiser
 * @param Visualisation (such as instance of TagCloud)
 */
MASCP.TagVisualisation.prototype.addVisualisation = function(visObject) {
    if ( ! this.visualisations ) {
        this.visualisations = [];
    }
    this.getDisplayElement().appendChild(visObject.getDisplayElement());
    this.visualisations.push(visObject);
};
/**
 * Get all the tags found in this data set
 * @return {String[]} Array of tag names
 */
MASCP.TagVisualisation.prototype.getAllTags = function() {
    var dataTable = document.getElementById(this.datasetName);
    var tableRows = dataTable.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    var maxValue = 0;

    var alltags = {};

    for ( var i = 0; i < tableRows.length ; i++ ) {
        tagname = tableRows[i].getElementsByTagName("td")[this.tagColumn].childNodes[0].data;
        alltags[tableRows[i].id] = tagname;
    }
    return alltags;
};

MASCP.TagVisualisation.prototype._getTagColumn = function() {
    var dataTable = document.getElementById(this.datasetName);
    var headers = dataTable.getElementsByTagName("thead")[0].getElementsByTagName("tr")[0].getElementsByTagName("th");
    for ( var i = 0; i < headers.length ; i++ ) {
        if ( headers[i].childNodes[0].data.toLowerCase() == "tag" ) {
            return i;
        }
    }
    return 1;
};
MASCP.TagVisualisation.prototype._getColumnCount = function() {
    var dataTable = document.getElementById(this.datasetName);
    var headers = dataTable.getElementsByTagName("thead")[0].getElementsByTagName("tr")[0].getElementsByTagName("th");
    return (headers.length - this._getTagColumn() - 1);
};

/**
 * MASCP.TagVisualisation::TagCloud class
 * @class
 */
if ( typeof(MASCP.TagVisualisation.TagCloud) === undefined ) {
    MASCP.TagVisualisation.TagCloud = {};
}

/**
 * Create a new TagCloud visualisation
 * @param {TagVisualiser} tagVisualiser The TagVisualiser object to attach this visualisation to
 * @constructor 
 */
MASCP.TagVisualisation.TagCloud = function(tagVisualiser) {
    this._tagVisualiser = tagVisualiser;
    this._initElements();
};

MASCP.TagVisualisation.TagCloud.prototype = {
    __class__: MASCP.TagVisualisation.TagCloud
};
/**
 * Class appended to the element which contains the tags. Defaults to "rich_tagcloud"
 */
MASCP.TagVisualisation.TagCloud.ELEMENT_CSS_CLASS = "rich_tagcloud";
/**
 * Prefix appended to the id of the element which contains the tags. Defaults to "rich_tagcloud_"
 */
MASCP.TagVisualisation.TagCloud.ELEMENT_ID_PREFIX = "rich_tagcloud_";
/**
 * Class appended to the tag element. Defaults to "rich_tagcloud_tag"
 */
MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_CSS_CLASS = "rich_tagcloud_tag";
/**
 * Prefix appended to the id of the tag element. Defaults to "rich_tagcloud_tag_"
 */
MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_ID_PREFIX = "rich_tagcloud_tag_";

MASCP.TagVisualisation.TagCloud.prototype._initElements = function() {
    this._displayElement = document.createElement('div');
    this._displayElement.setAttribute("id",MASCP.TagVisualisation.TagCloud.ELEMENT_ID_PREFIX+this._tagVisualiser.datasetName);
    this._displayElement.setAttribute("class",MASCP.TagVisualisation.TagCloud.ELEMENT_CSS_CLASS);
    return this._displayElement;
};

/**
 * Get the element used to contain the tags
 * @return {HTMLElement} Generated element acting as tag container
 */
MASCP.TagVisualisation.TagCloud.prototype.getDisplayElement = function() {
    return this._displayElement;
};

/**
 * Update this visualisation using the given data column number, which is an offset
 * from the base of the tag column number.
 * @param {int} dataColumn Data column offset (e.g. 1 for the next column after the tag column)
 */
MASCP.TagVisualisation.TagCloud.prototype.update = function(dataColumn) {
    var container = this.getDisplayElement();
    var dataTable = document.getElementById(this._tagVisualiser.datasetName);
    var values = {};
    var all_values = {};
    var tableRows = dataTable.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
    var maxValue = 0;

    var alltags = [];
    var i;
    for (i = 0; i < tableRows.length ; i++ ) {
        var row_values = tableRows[i].getElementsByTagName("td"); 
        var value = parseFloat(row_values[this._tagVisualiser.tagColumn+dataColumn].childNodes[0].data);
        if (row_values[this._tagVisualiser.tagColumn].childNodes.length === 0) {
            continue;
        }
        var tagname = row_values[this._tagVisualiser.tagColumn].childNodes[0].data;
        values[tagname] = value;
        all_values[tagname] = row_values;
        maxValue = Math.max(maxValue,value);
        alltags[i] = tagname;
    }
    alltags.sort();
    for (i = 0; i < alltags.length; i++ )  {
        var tag = alltags[i];
        if ( ! tag ) {
            continue;
        }
        var tagId = tag.replace(/\s+/,"_");
        var tagSpan;
        if ( document.getElementById(MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_ID_PREFIX+tagId) !== null ) {
            tagSpan = document.getElementById(MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_ID_PREFIX+tagId);
            tagSpan.parentNode.removeChild(tagSpan);
        }

        tagSpan = this.tagFactory(tagId,tag,all_values[tag]);
        container.appendChild(tagSpan);

        var fontsize = Math.floor(30 * Math.log(1.5 + (values[tag] / maxValue)));
        tagSpan.style.fontSize = fontsize+"px";
        tagSpan.setAttribute('class',  MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_CSS_CLASS );
    }
    if ( ! container.hasSpacer ) {
        var a_div = document.createElement('div');
        a_div.setAttribute('class','spacer');
        a_div.setAttribute('style','width: 100%; height: 0px; clear: both;');
        container.appendChild(a_div);
        container.hasSpacer = true;
    }
};
/**
 * Factory method for creating tags. Override this method to specify your own tags
 * @param {String}          tagId       Identifier for the new element
 * @param {String}          tag         The actual tag to be displayed
 * @param {HTMLElement[]}   row         The full data row (from the table) for this tag  
 */
MASCP.TagVisualisation.TagCloud.prototype.tagFactory = function(tagId,tag,row) {
    var a_span = document.createElement('span');
    a_span.setAttribute('id', MASCP.TagVisualisation.TagCloud.TAG_ELEMENT_ID_PREFIX+tagId );
    a_span.textContent = tag;
    return a_span;
};
/**
 *  @fileOverview   Basic classes and defitions for a Gene Ontology ID based map
 */


if ( typeof GOMap == 'undefined' ) {
 /**
  *  @namespace GOMap namespace
  */
  GOMap = {};
}

 /* 
  * Convenience environment detection – see if the browser is Internet Explorer and set variables to mark browser
  * version.
  */
 (function() {
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
          GOMap.IE = true;
          GOMap.IE7 = true;
      }
      if (ie === 8) {
          GOMap.IE = true;
          GOMap.IE8 = true;
      }
  }
 })();


/*
 *  Include the svgweb library when we include this script. Set the SVGWEB_PATH environment variable if
 *  you wish to retrieve svgweb from a relative path other than ./svgweb/src
 */
if (GOMap.IE && (typeof svgweb === 'undefined') && (typeof SVGWEB_LOADING === 'undefined') && ! window.svgns ) {

    var svg_path = 'svgweb/';
    if (typeof SVGWEB_PATH != 'undefined') {
        svg_path = SVGWEB_PATH;
    }
    var scriptTag = document.createElement("script");
    scriptTag.src = svg_path + 'svg.js';
    scriptTag.type="text/javascript";
    scriptTag.setAttribute('data-path',svg_path);
    document.getElementsByTagName("head")[0].insertBefore(scriptTag, document.getElementsByTagName("head")[0].firstChild);

    SVGWEB_LOADING = true;
}

/** Convenience logging function. If there is no log function defined, add a log method that simply
 *  forwards the message on to the console.log.
 *  @function
 *  @param  {Object}    message Message to log
 */
log = (typeof log == 'undefined') ? (typeof console == 'undefined') ? function() {} : function(msg) {    
    if (typeof msg == 'String' && arguments.length == 1) {
        console.log("%s", msg);
    } else {
        console.log("%o: %o", msg, this);
    }
    return this;
} : log ;


// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ callback, /* DOMElement */ element){
          window.setTimeout(callback, 1000 / 60);
        };
})();


if (window.attachEvent) { //&& svgweb.getHandlerType() == 'flash') {
    window.onload = function() {
        GOMap.LOADED = true;
    };
} else {
    GOMap.LOADED = true;
}


/**
 * @class       A diagram that can be marked up with keywords.
 * @param       image   Image to be used for the diagram. Either an url to an svg file, an existing object element with a src attribute, or a reference to an SVG element if the SVG has been inlined.
 * @param       params  Params to be passed into initialisation. Possible values include 'load', which is a function to be executed when the diagram is loaded.
 * @author      hjjoshi
 * @requires    svgweb
 */
GOMap.Diagram = function(image,params) {
    if (image === null) {
        return;
    }
    this._highlighted = {};
    this._styles_cache = {};
    this.enabled = true;

    var self = this;
    
    var url = null;
    if (typeof image == 'string') {
        url = image;
        image = null;
    } else if (image.nodeName && image.nodeName.toLowerCase() == 'object') {
        url = image.getAttribute('src') || image.getAttribute('data');
    } else if (image.nodeName && image.nodeName.toLowerCase() == 'svg') {        
        (function() {
            if ( ! GOMap.LOADED ) {
                window.attachEvent('onload',arguments.callee);
                return;
            }
            self._container = image.parentNode;
            self.element = image;
            self._svgLoaded();
            self.loaded = true;
            if (params.load) {
                params.load.apply(self);
            }
            if ( self.onload ) {
                self.onload.apply(self);
            }
        })();
        return;
    }

    this.element = document.createElement('object',true);
    
    this.element.setAttribute('data',url);
    this.element.setAttribute('type','image/svg+xml');
    this.element.setAttribute('width','100%');
    this.element.setAttribute('height','100%');
    this.element.setAttribute('style','background: transparent;');
    
    if ( ! this.element.addEventListener ) {
        this.element.addEventListener = function(ev,func) {
            this.attachEvent(ev,func);
        };
    }

    var has_svgweb = typeof svgweb != 'undefined';

    this.element.addEventListener(has_svgweb ? 'SVGLoad' : 'load',function() {
        var object_el = this;
        if (! this.nodeName) {
            console.log("The SVG hasn't been loaded properly");
            return;
        }
        if (object_el.contentDocument !== null) {
            self.element = object_el.contentDocument.rootElement;
        } else {
            self.element = object_el.getAttribute('contentDocument').rootElement;
        }
        
        // Make the destroy function an anonymous function, so it can access this new
        // element without having to store it in a field
        
        var svg_object = object_el;
        self.destroy = function() {
            if ( svg_object && svg_object.parentNode) {
                if (typeof svgweb != 'undefined') {
                    svgweb.removeChild(svg_object, svg_object.parentNode);
                } else {
                    svg_object.parentNode.removeChild(svg_object);
                }
            }
        };

        self._svgLoaded();

        self.loaded = true;
        if (params.load) {
            params.load.apply(self);
        }
        if ( self.onload ) {
            self.onload.apply(self);
        }

    },false);

    if (image) {
        this.appendTo(image.parentNode);
        image.parentNode.removeChild(image);
    }
};

/**
 * Retrieve the SVG element for this diagram
 * @returns SVG element used to render the diagram
 * @type Element
 */

/**
 * Append this diagram to the given parent node
 * @param {Element} parent Parent node to append this element to
 */
GOMap.Diagram.prototype.appendTo = function(parent) {
    this._container = parent;
    if (typeof svgweb != 'undefined') {
        svgweb.appendChild(this.element,parent);
    } else {
        parent.appendChild(this.element);
    }
    return this;
};


/**
 * Highlight a given keyword on the diagram
 * @param {String} keyword  GO keyword to highlight
 * @param {String} color    CSS color string to use as the highlighting colour. Defaults to #ff0000.
 * @returns True if keyword is found, False if keyword is not in map
 * @type Boolean
 */
GOMap.Diagram.prototype.showKeyword = function(keyword,color) {
    var els = this._elementsForKeyword(keyword);
    
    if (els.length === 0) {
        return false;
    }
    
    if (this._highlighted[keyword] && ! color) {
        return true;
    }
    
    color = color || '#ff0000';
    
    this._highlighted[keyword] = true;

    for (var i = 0; i < els.length; i++ ) {
        els[i]._highlighted = els[i]._highlighted || {};
        els[i]._highlighted[color] = true;
        if (els[i].nodeName == 'path' || els[i].nodeName == 'circle' || els[i].nodeName == 'ellipse') {
            this._outlineElement(els[i]);
        }
    }
    var self = this;
    this._recurse(els, function(el) {
        self._highlightElement(el);
        return true;
    });
    
    return true;
};

/**
 * Set the viewport for the image to be centered around a single keyword. This method picks the first
 * group element matching the keyword, and modifies the viewBox attribute to center around that group
 * only. Using currentTranslate/currentScale yields unpredictable results, so viewBox manipulation has
 * to be performed.
 * @param {String} keyword Keyword to zoom in to
 */
GOMap.Diagram.prototype.zoomToKeyword = function(keyword) {
    var self = this;
    var root = this.element;
    
    var els = this._elementsForKeyword(keyword);
    var targetEl = null;
    for (var i = 0; i < els.length; i++ ) {
        if (els[i].nodeName == 'g') {
            targetEl = els[i];
            break;
        }
    }
    if ( ! targetEl ) {
        if (root._baseViewBox) {
            root.setAttribute('viewBox',root._baseViewBox);
        }
        return;
    }
    
    if (! targetEl.getBBox) {
        return;
    }
    
    var bbox = targetEl.getBBox();    
    var root_bbox = root.getBBox();
    
    if ( ! root._baseViewBox) {
        root._baseViewBox = root.getAttribute('viewBox');
    }
    var location = [bbox.x-10,bbox.y-10,bbox.width+20,bbox.height+20];
    root.setAttribute('viewBox',location.join(' '));
};

/**
 * Hide all the keywords currently being highlighted on this diagram
 */
GOMap.Diagram.prototype.hideAllKeywords = function() {    
    for (var key in this._highlighted) {
        if (this._highlighted.hasOwnProperty(key)) {
            this.hideKeyword(key);
        }
    }
};

/**
 * Hide a given keyword on the diagram
 * @param {String} keyword  GO keyword to turn highlighting off for
 */
GOMap.Diagram.prototype.hideKeyword = function(keyword,color) {
    var els = this._elementsForKeyword(keyword);
    var self = this;

    this._highlighted[keyword] = false;
    
    this._recurse(els, function(el) {
        if (color !== null && el._highlighted) {
            el._highlighted[color] = false;
        } else {
            el._highlighted = {};
        }

        for (var col in el._highlighted) {
            if (el._highlighted[col] === true) {
                if (el.nodeName == 'path' || el.nodeName == 'circle' || el.nodeName == 'ellipse') {
                    self._outlineElement(el);
                }
                return false;
            }
        }
        self._restoreStyle(el);
        return true;
    });
};


/**
 * Toggle the highlight for a given keyword on the diagram
 * @param {String} keyword  GO keyword to highlight
 * @param {String} color    CSS color string to use as the highlighting colour. Defaults to #ff0000.
 */
GOMap.Diagram.prototype.toggleKeyword = function(keyword,color) {
    if (this._highlighted[keyword]) {
        this.hideKeyword(keyword);
        return false;
    } else {
        return this.showKeyword(keyword,color);
    }
};

GOMap.Diagram.prototype.clearMarkers = function(keyword) {
    if ( ! this.markers ) {
        return;
    }
    if (keyword) {
        this._clearMarkers(this.markers[keyword]);
        return;
    }
    for (var key in this.markers) {
        if (this.markers.hasOwnProperty(key)) {
            this._clearMarkers(this.markers[key]);
        }
    }
    this.markers = {};
};

GOMap.Diagram.prototype._clearMarkers = function(elements) {
    if ( ! elements ) {
        return;
    }
    for (var i = 0 ; i < elements.length ; i++ ) {
        elements[i].parentNode.removeChild(elements[i]);
    }
};

GOMap.Diagram.prototype.addMarker = function(keyword,value) {
    if ( ! this.markers ) {
        this.markers = {};
    }
    
    if ( ! value ) {
        value = 1;
    }
    
    var root_svg = this.element,i;
    
    if ( this.markers[keyword]) {
        this.markers[keyword].current_radius += value;
        for (i = 0; i < this.markers[keyword].length ; i++ ) {
            this.markers[keyword][i].setAttribute('r',this.markers[keyword].current_radius);
        }
        return;
    }

    var els = this._elementsForKeyword(keyword);

    this.markers[keyword] = [];
    
    this.markers[keyword].current_radius = value;
    for ( i = 0 ; i < els.length; i++ ) {
        var node = els[i];
        if ( node.nodeName != 'g' ) {
            continue;
        }
        var bbox = node.getBBox();
        var mid_x = bbox.x + (bbox.width / 2);
        var mid_y = bbox.y + (bbox.height / 2);
        circle = document.createElementNS(svgns,'circle');
        circle.setAttribute('cx',mid_x);
        circle.setAttribute('cy',mid_y);
        circle.setAttribute('r',this.markers[keyword].current_radius);
        circle.setAttribute('fill','#ff0000');
        this.markers[keyword].push(circle);
        root_svg.appendChild(circle);
    }
};


/**
 *  Register a function callback for an event with this object. Actually binds the event to the container
 *  element associated with this Diagram using addEventListener
 *  @param  {Object}    evt     Event name to bind to
 *  @param  {Function}  func    Function to call when event occurs
 */
GOMap.Diagram.prototype.addEventListener = function(evt,func) {
    if ( ! this._events ) {
        this._events = {};
    }
    if ( ! this._events[evt] ) {
        this._events[evt] = [];
    }
    
    this._events[evt].push(func);
};

/**
 * Event fired when the zoom property is changed
 * @name    GOMap.Diagram#zoomChange
 * @param   {Object}    e
 * @event
 * @see     #zoom
 */

/**
 *  @lends GOMap.Diagram.prototype
 *  @property   {Number}    zoom        The zoom level for a diagram. Minimum zoom level is zero, and defaults to 1
 *  @see GOMap.Diagram#event:zoomChange
 */
(function() {

var zoomChange = function() {
    if ( ! this._events || ! this._events.zoomChange ) {
        return;
    }
    for ( var i = 0; i < this._events.zoomChange.length; i++ ) {
        this._events.zoomChange[i].apply(this,[{'type' : 'zoomChange'}]);
    }        
};

var accessors = {
        
    setZoom: function(zoomLevel) {
        if (zoomLevel < 0) {
            zoomLevel = 0;
        }
        // if (zoomLevel > 2) {
        //     zoomLevel = 2;
        // }
        
        if (this.element) {
            this.element.currentScale = zoomLevel;
        }
        
        zoomChange.apply(this);

    },

    getZoom: function() {
        return this.element.currentScale;
    }
};



if (GOMap.Diagram.prototype.__defineSetter__) {
    GOMap.Diagram.prototype.__defineSetter__("zoom", accessors.setZoom);
    GOMap.Diagram.prototype.__defineGetter__("zoom", accessors.getZoom);
}

})();

/**
 * Allow for zooming and panning on the diagram
 */
GOMap.Diagram.prototype.makeInteractive = function() {
    
    var root = this.element;
    var container = this._container;
    
    var diagram = this;
    
    try {
        var foo = root.addEventListener;
    } catch(err) {
        console.log("Browser does not support addEventListener");
        return;
    }
    (new GOMap.Diagram.Dragger()).applyToElement(root);
    var controls = GOMap.Diagram.addZoomControls(this,0.1,2,0.1,1);
    container.appendChild(controls);
    controls.style.position = 'absolute';
    controls.style.top = '0px';
    controls.style.left = '0px';
    controls.style.height = '30%';
};

/*
 * Set the opacity of all the elements for the diagram to translucent
 */
GOMap.Diagram.prototype._svgLoaded = function() {
    this._forceOpacity();
};

/*
 * Retrieve all the SVG elements that match the given keyword. The SVG document
 * should have elements marked up with a keyword attribute.
 * @param {String}  keyword     Keyword to use to search for elements
 */
GOMap.Diagram.prototype._elementsForKeyword = function(keyword) {
    var root_svg = this.element;
    var els = [];

    if (! GOMap.IE ) {
        els = this._execute_xpath(root_svg,"//*[@keyword = '"+keyword+"']",root_svg.ownerDocument);
    } else {
        var some_els = root_svg.ownerDocument.getElementsByTagNameNS(svgns,'*');
        for (var i = 0; i < some_els.length; i++) {
            var el_key = some_els[i].getAttribute('keyword');
            if (el_key == keyword) {                
                els.push(some_els[i]);
            }
        }
    }
    return els;
};

/* 
 * Execute an xpath query upon a document, pulling the results into an array of elements
 * @param {Element} element Start element
 * @param {String} xpath Xpath query to execute
 * @param {Document} document Parent document
 */
GOMap.Diagram.prototype._execute_xpath = function(element, xpath, doc) {
    var results = [],i=0;
    if (doc.evaluate) {
        xpath_result = doc.evaluate(xpath,element,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);
        while ( (a_result = xpath_result.snapshotItem(i)) !== null ) {
            results.push(a_result);
            i++;
        }
    } else {
        xpath_result = element.selectNodes(xpath);
        for (i = 0; i < xpath_result.length; i++ ){
            results[i] = xpath_result.item(i);
        }
    }
    return results;
};
/*
 * Perform a breadth-first traversal of the nodelist.
 * @param {Array} nodelist Starting list of nodes to perform traversal over
 * @param {Function} function Callback for this traversal. Callback function takes a single argument, which is the currently inspected node.
 */
GOMap.Diagram.prototype._recurse = function(nodelist,callback) {
    for (var i = 0; i < nodelist.length; i++) {
        var return_val = callback.call(this,nodelist[i]);
        if ( ! return_val ) {
            continue;
        }
        if (nodelist[i].childNodes.length > 0) {
            this._recurse(nodelist[i].childNodes,callback);
        }
    }
};
/*
 * Cache the old style for this element. We need to cache the style for the element so that we can restore the
 * element style when it is active.
 * @param {Element} el Element to store the style for
 */
GOMap.Diagram.prototype._cacheStyle = function(el) {    
    if ( ! el.id ) {
        var an_id = 'svg'+(new Date()).getTime().toString()+Math.floor(Math.random()*1000);
        el.setAttribute('id',an_id);
    }

    if (this._styles_cache[el.id] !== null || ! el.style || ! el.id ) {
        return;
    }
    
    if (el.style.stroke && ! el.style.strokeWidth && ! el.style.getPropertyValue('stroke-width')) {
        el.style.strokeWidth = '1';
    }
    
    this._styles_cache[el.id] = {
        'stroke'         : el.style.stroke || el.style.getPropertyValue('stroke'),
        'stroke-width'   : el.style.strokeWidth || el.style.getPropertyValue('stroke-width') || '0px',
        'opacity'        : el.style.getPropertyValue('opacity'),
        'fill-opacity'   : el.style.fillOpacity || el.style.getPropertyValue('fill-opacity'),
        'stroke-opacity' : el.style.strokeOpacity || el.style.getPropertyValue('stroke-opacity')
    };
};

/*
 * Restore the style for an element from the cache
 * @param {Element} element Element to restore the style for. This element must have cache data.
 */

GOMap.Diagram.prototype._restoreStyle = function(element) {
    if ( ! element.style ) {
        return;
    }
    if (this._styles_cache[element.id]) {
        var cacher = this._styles_cache[element.id];
        for (var prop in {'stroke-width':null,'opacity':null,'stroke':null,'fill-opacity':null,'stroke-opacity':null}) {
            // We don't set null properties in IE because they cause the wrong styles to be displayed
            if ( (! GOMap.IE) || cacher[prop] ) {
                element.style.setProperty(prop,cacher[prop],null);
            }
        }
    }
};

/*
 * Draw an outline around the given element
 * @param {Element} element Element to outline
 */
GOMap.Diagram.prototype._outlineElement = function(element) {
    if ( ! element.style ) {
        return;
    }
    this._cacheStyle(element);
    
    var target_color = this._calculateColorForElement(element);
    
    element.style.setProperty('stroke',target_color,null);
    element.style.setProperty('stroke-width',1,null);
    element.style.setProperty('stroke-opacity',1,null);
};

/*
 * Calculate the color fill. Since there may be more than one color highlighted
 * on this element, we build the pattern if needed, and return a reference to 
 * that pattern if a pattern is to be used.
 */

GOMap.Diagram.prototype._calculateColorForElement = function(element) {
    var pattern = "pat";
    var total_keywords = 0,i;
    
    if (element._animates) {
        for (i = 0; i < element._animates.length; i++ ) {
            element.removeChild(element._animates[i]);
        }
        element._animates = null;
    }
    
    for (var col in element._highlighted) {
        if (element._highlighted && element._highlighted[col] === true) {
            pattern += "_"+col;
            total_keywords++;
        }
    }
    
    // Internet Explorer is waiting on support for this http://code.google.com/p/svgweb/issues/detail?id=145
    // Firefox needs at least v 3.7 to support this
    
    var animation_supported = document.createElementNS(svgns,'animate').beginElement;
    
    if (total_keywords == 1) {
        return pattern.split(/_/)[1];
    } else {        
        if (animation_supported) {        
            var animates = this._buildAnimatedColor(pattern,element.id);
            for (i = 0 ; i < animates.length; i++ ) {            
                element.appendChild(animates[i]);
            }
            animates[0].beginElement();
            element._animates = animates;
            return pattern.split(/_/)[1];
        } else {
            return this._buildPattern(pattern);
        }
    }
    
};
/*
 * Create a pattern element under the defs element for the svg. If there isn't a defs element
 * there already, create one and append it to the document.
 * @param {String} pattern_name Underscore separated pattern name - each component of the pattern should be represented. e.g. ff0000_00ff00_0000ff
 * @returns The color name that can be used to reference this pattern
 * @type String
 */
GOMap.Diagram.prototype._buildPattern = function(pattern_name) {
    var pattern_els = pattern_name.split('_');
    pattern_els.shift();
    this._cached_patterns = this._cached_patterns || {};
    var cleaned_name = pattern_name.replace(/#/g,'');
    if (this._cached_patterns[cleaned_name]) {
        return 'url(#'+cleaned_name+')';
    }
    
    var root_svg = this.element;
    var defs_el = root_svg.ownerDocument.getElementsByTagNameNS(svgns,'defs')[0];

    if ( ! defs_el ) {
        defs_el = document.createElementNS(svgns,'defs');
        root_svg.appendChild(defs_el);
    }

    var new_pattern = document.createElementNS(svgns,'pattern');
    new_pattern.setAttribute('x','0');
    new_pattern.setAttribute('y','0');
    new_pattern.setAttribute('width','30');
    new_pattern.setAttribute('height','30');
    new_pattern.setAttribute('viewBox', '0 0 100 100');
    new_pattern.setAttribute('patternUnits','userSpaceOnUse');
    new_pattern.setAttribute('patternTransform','rotate(45)');
    new_pattern.setAttribute('id',cleaned_name);
    
    var pattern_width = 100.0 / (pattern_els.length);
    var start_pos = 0;
    
    for (var i = 0; i < pattern_els.length; i++ ) {
        var a_box = document.createElementNS(svgns, 'rect');
        a_box.setAttribute('x', start_pos);
        start_pos += pattern_width;
        a_box.setAttribute('y', 0);
        a_box.setAttribute('width', pattern_width);
        a_box.setAttribute('height', 100);
        a_box.setAttribute('fill', pattern_els[i]);
        new_pattern.appendChild(a_box);
    }

    defs_el.appendChild(new_pattern);
    this._cached_patterns[cleaned_name] = true;
    return 'url(#'+cleaned_name+')';
};

GOMap.Diagram.prototype._buildAnimatedColor = function(pattern_name,id_prefix) {
    var pattern_els = pattern_name.split('_');
    pattern_els.shift();
    this._cached_patterns = this._cached_patterns || {};
    var cleaned_name = pattern_name.replace(/#/g,'');
    if (this._cached_patterns[cleaned_name]) {
        return 'url(#'+cleaned_name+')';
    }
    
    cleaned_name = id_prefix+cleaned_name;
    
    var root_svg = this.element;
    var defs_el = root_svg.ownerDocument.getElementsByTagNameNS(svgns,'defs')[0];

    if ( ! defs_el ) {
        defs_el = document.createElementNS(svgns,'defs');
        root_svg.appendChild(defs_el);
    }
    
    var animates = [];

    for ( var i = 0; i < pattern_els.length; i++ ) {
        var an_anim = document.createElementNS(svgns,'animate');
        an_anim.setAttribute('id',cleaned_name+i);
        an_anim.setAttribute('from',pattern_els[i]);
        var to_string = '';
        if ( pattern_els.length <= (i+1) ) {
            to_string = pattern_els[0];
        } else {
            to_string = pattern_els[i+1];
        }
        an_anim.setAttribute('to',to_string);
        var begin_string = '';
        if ( i === 0 ) {
            begin_string = 'SVGLoad;indefinite;'+(cleaned_name+(pattern_els.length-1))+'.end';
        } else {
            begin_string = cleaned_name+(i-1)+'.end';
        }
        an_anim.setAttribute('attributeType','CSS');
        an_anim.setAttribute('attributeName','stroke');
        an_anim.setAttribute('begin',begin_string);
        an_anim.setAttribute('dur','1s');
        animates.push(an_anim);
    }

    return animates;
};

/* Highlight an element by making it opaque
 * @param {Element} element Element to make opaque
 */
GOMap.Diagram.prototype._highlightElement = function(element) {
    // Skip this if we don't have a style or has no id and isn't a group
    if ( (! element.style) || (element.nodeName != 'g' && element.id === null)) {
        return;
    }
    
    this._cacheStyle(element);

    if (element.nodeName == 'path' || element.nodeName == 'circle' || element.nodeName == 'ellipse') {
        element.setAttribute('opacity','1');
        element.style.setProperty('opacity',1,null);
    }
    element.setAttribute('fill-opacity','1');
    element.setAttribute('stroke-opacity','1');
    if (element.style.setProperty) {
        element.style.setProperty('fill-opacity',1,null);
        element.style.setProperty('stroke-opacity',1,null);
    }
};

/* Go through all the elements in the svg document and force the opacity to be translucent. Since
 * svgweb doesn't support the referencing of extrinsic stylesheets, we need to go through and 
 * explicitly set the opacity for all the elements. This is really slow on Internet Explorer.
 * We've got different behaviour for the different svg element types as they all react differently
 * to having their opacity set.
 */
GOMap.Diagram.prototype._forceOpacity = function() {
    var root_svg = this.element;
    var suspend_id = root_svg.suspendRedraw(5000);
    var els = root_svg.ownerDocument.getElementsByTagNameNS(svgns,'*');
    for (var i = 0; i < els.length; i++ ) {
        if (els[i].nodeName == 'svg') {
            continue;
        }
        if (els[i].parentNode && els[i].parentNode.parentNode && els[i].parentNode.parentNode.nodeName == 'defs') {
            continue;
        }
        if (els[i].nodeName == 'defs' || (els[i].parentNode && els[i].parentNode.nodeName == 'defs')) {
            continue;
        }
        if (els[i].nodeName == 'path') {
            els[i].setAttribute('opacity','0.4');
            els[i].style.opacity = 0.4;
        } else {
            els[i].setAttribute('fill-opacity','0.3');
            els[i].setAttribute('stroke-opacity','0.2');
            if (els[i].style) {
                els[i].style.fillOpacity = 0.3;
                els[i].style.strokeOpacity = 0.2;
            }
        }
    }
    root_svg.unsuspendRedraw(suspend_id);
};


/**
 * @class       State class for adding panning functionality to an element. Each element that is to be panned needs a new instance
 *              of the Dragger to store state.
 * @author      hjjoshi
 * @requires    svgweb
 */
GOMap.Diagram.Dragger = function() {
  this.oX = 0;
  this.oY = 0;
  this.dX = 0;
  this.dY = 0;
  this.dragging = false;
  this.targetElement = null;
};

/**
 * Connect this dragger to a particular element. If an SVG element is given, panning occurs within the bounding box of the SVG, and
 * the image is shifted by using the currentTranslate property. If a regular HTML element is given, the scrollLeft and scrollTop attributes
 * are used to move the viewport around. 
 * @param {Element} targetElement Element to enable panning upon.
 */
GOMap.Diagram.Dragger.prototype.applyToElement = function(targetElement) {
    var self = this;
    self.enabled = true;
    
    var momentum = [];

    if (targetElement.nodeName == 'svg') {
        targetElement.getPosition = function() {
            var dX = targetElement.currentTranslate.x;
            var dY = targetElement.currentTranslate.y;

            return [dX, dY];
        };
        
        targetElement.shiftPosition = function(x,y) {
            var p = {'x' : x, 'y' : y };
            var viewBoxScale = 1;
            var vbox = this.getAttribute('viewBox');

            var min_x,min_y,width,height;

            if (vbox) {
                var viewBox = this.getAttribute('viewBox').split(' ');
                viewBoxScale = parseFloat(this.width.baseVal.value) / parseFloat(viewBox[2]);
                min_x = 0;
                min_y = parseInt(viewBox[1],10);
                width = parseInt(viewBox[2],10);
                height = parseInt(viewBox[3],10);
            } else {
                min_x = 0;
                min_y = 0;
                width = targetElement.width;
                height = targetElement.height;
            }

            if (targetElement.style.GomapScrollLeftMargin) {
                min_x += targetElement.style.GomapScrollLeftMargin;
            }
            
            if ( self.dragging ) {
                p.x = viewBoxScale*(p.x - self.oX);
                p.y = viewBoxScale*(p.y - self.oY);

                p.x += self.dX;
                p.y += self.dY;
                p.y = 0;
            }

            if (targetElement._snapback) {
                clearTimeout(targetElement._snapback);
                targetElement._snapback = null;
            }
            
            if (p.x > viewBoxScale * min_x) {
                targetElement._snapback = setTimeout(function() {
                    var evObj;
                    if (Math.abs(targetElement.currentTranslate.x - (viewBoxScale * min_x)) > 35 ) {
                        var new_pos = 0.95*(targetElement.currentTranslate.x - (viewBoxScale * min_x));
                        if (new_pos < (viewBoxScale * min_x)) {
                            new_pos = (viewBoxScale * min_x);
                        }
                        
                        targetElement.setCurrentTranslateXY( new_pos, 0);
                        window.requestAnimFrame(arguments.callee, targetElement);
//                        targetElement._snapback = setTimeout(arguments.callee,10);
                        if (document.createEvent) {
                            evObj = document.createEvent('Events');
                            evObj.initEvent('panstart',false,true);
                            targetElement.dispatchEvent(evObj);
                        }
                    } else {
                        targetElement.setCurrentTranslateXY( (viewBoxScale * min_x), 0 );
                        if (document.createEvent) {
                            evObj = document.createEvent('Events');
                            evObj.initEvent('pan',false,true);
                            targetElement.dispatchEvent(evObj);
                        }
                        if (document.createEvent && ! self.dragging) {
                            evObj = document.createEvent('Events');
                            evObj.initEvent('panend',false,true);
                            targetElement.dispatchEvent(evObj);
                        }
                        targetElement._snapback = null;
                    }
                },300);
            }
            
            var min_val = viewBoxScale * ( width - 2 * min_x );
            
            if (min_x === 0) {
                min_val *= 0.90;
            }
            if (p.x < 0 && Math.abs(p.x) > min_val) {
                targetElement._snapback = setTimeout(function() {
                    var evObj;
                    
                    if (Math.abs(targetElement.currentTranslate.x - (-1 * min_val)) > 35 ) {
                        var new_pos = 0.95*(targetElement.currentTranslate.x);
                        if (new_pos > (-1*min_val)) {
                            new_pos = -1*min_val;
                        }
                        targetElement.setCurrentTranslateXY( new_pos, 0);
                        window.requestAnimFrame(arguments.callee, targetElement);
//                        targetElement._snapback = setTimeout(arguments.callee,10);
                        if (document.createEvent) {
                            evObj = document.createEvent('Events');
                            evObj.initEvent('panstart',false,true);
                            targetElement.dispatchEvent(evObj);
                        }
                    } else {
                        targetElement.setCurrentTranslateXY( -1*min_val, 0);                        
                        if (document.createEvent) {
                            evObj = document.createEvent('Events');
                            evObj.initEvent('pan',false,true);
                            targetElement.dispatchEvent(evObj);
                        }
                        if (document.createEvent && ! self.dragging) {
                            evObj = document.createEvent('Events');
                            evObj.initEvent('panend',false,true);
                            targetElement.dispatchEvent(evObj);
                        }
                        targetElement._snapback = null;
                    }
                },300);
            }

            if (p.y > viewBoxScale * min_y) {
                p.y = viewBoxScale * min_y;
            }
            if (Math.abs(p.y) > 0.50*viewBoxScale * height ) {
                p.y = -0.50 * viewBoxScale * height;
            }
            if (this.setCurrentTranslateXY) {
                this.setCurrentTranslateXY(p.x,p.y);
            } else if (this.currentTranslate.setXY) {
                this.currentTranslate.setXY(p.x,p.y);
            } else {
                this.currentTranslate.x = p.x;
                this.currentTranslate.y = p.y;          
            }            

            if (document.createEvent) {
                var evObj = document.createEvent('Events');
                evObj.initEvent('pan',false,true);
                this.dispatchEvent(evObj);
            }
        };
    } else {
        targetElement.getPosition = function() {
            return [this.scrollLeft, this.scrollTop];
        };
        targetElement.shiftPosition = function(x,y) {
            this.scrollLeft = self.dX + (self.oX - x);
            this.scrollTop = self.dY + (self.oY - y);

            if (document.createEvent) {
                var evObj = document.createEvent('Events');
                evObj.initEvent('pan',false,true);
                this.dispatchEvent(evObj);
            }
        };
    }

    var stationary;

    var svgMouseDown = function(evt) {
      if ( ! self.enabled ) {
          return true;
      }

      var targ = self.targetElement ? self.targetElement : targetElement;
      var positions = mousePosition(evt);
      self.dragging = true;

      if (self.targetElement) {

          self.oX = positions[0];
          self.oY = positions[1];
          self.dX = self.targetElement.scrollLeft;
          self.dY = self.targetElement.scrollTop;
          evt.preventDefault(true);
          return;
      }

      var p = targetElement.createSVGPoint();
      positions = mousePosition(evt);
      p.x = positions[0];
      p.y = positions[1];

      var rootCTM = this.getScreenCTM();
      self.matrix = rootCTM.inverse();
      
      p = p.matrixTransform(self.matrix);

      self.dX = targetElement.getPosition()[0];
      self.dY = targetElement.getPosition()[1];

      self.oX = p.x;
      self.oY = p.y;

      evt.preventDefault(true);
      
      if (document.createEvent) {
          var evObj = document.createEvent('Events');
          evObj.initEvent('panstart',false,true);
          targ.dispatchEvent(evObj);
      }      

    };
    
    var mousePosition = function(evt) {
        var posx = 0;
        var posy = 0;
        if (!evt) {
            evt = window.event;
        }
        if (evt.pageX || evt.pageY)     {
            posx = evt.pageX;
            posy = evt.pageY;
        } else if (evt.clientX || evt.clientY)  {
            posx = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        if (self.targetElement) {
            posx = evt.screenX;
            posy = evt.screenY;
        }
        return [ posx, posy ];
    };
    
    var mouseMove = function(evt) {
        this.style.cursor = 'url(http://maps.gstatic.com/intl/en_us/mapfiles/openhand_8_8.cur)';
        var positions = mousePosition(evt);
        if (!self.dragging) {
           return;
        }
        this.style.cursor = 'url(http://maps.gstatic.com/intl/en_us/mapfiles/closedhand_8_8.cur)';

        targetElement.shiftPosition(positions[0],positions[1]);
        
        evt.preventDefault(true);
    };
    
    var mouseDown = function(evt) {
        self.dragging = true;
        var positions = mousePosition(evt);
        self.oX = positions[0];
        self.oY = positions[1];
        self.dX = targetElement.getPosition()[0];
        self.dY = targetElement.getPosition()[1];
        evt.preventDefault(true);
        var targ = self.targetElement ? self.targetElement : targetElement;
        if (document.createEvent) {
            var evObj = document.createEvent('Events');
            evObj.initEvent('panstart',false,true);
            targ.dispatchEvent(evObj);
        }
    };
    
    var svgMouseMove = function(evt) {
        if (!self.enabled) {
            this.style.cursor = 'pointer';
            return true;
        }
        this.style.cursor = 'url(http://maps.gstatic.com/intl/en_us/mapfiles/openhand_8_8.cur), move';
        if (!self.dragging) {
            return;
        }

        // if (stationary) {
        //     clearTimeout(stationary);
        //     stationary = null;
        // }
        // 
        // stationary = window.setTimeout(function() {
        //     self.dragging = false;
        // },200);        
        
        doMouseMove.call(this,evt);
    };

    var doMouseMove = function(evt) {        
        var positions = mousePosition(evt);
        this.style.cursor = 'url(http://maps.gstatic.com/intl/en_us/mapfiles/closedhand_8_8.cur), -moz-grabbing';

        if (self.targetElement) {
            self.targetElement.shiftPosition(positions[0],positions[1]);
            return;
        }

        
        var p = targetElement._cachedpoint || targetElement.createSVGPoint();
        targetElement._cachedpoint = p;
        
        positions = mousePosition(evt);

        p.x = positions[0];
        p.y = positions[1];

        var rootCTM = targetElement._cachedrctm || targetElement.getScreenCTM();
        targetElement._cachedrctm = rootCTM;
        
        p = p.matrixTransform(self.matrix);
        targetElement.shiftPosition(p.x,p.y);
//        momentum = p.x;        
    };

    var mouseUp = function(evt) { 
      if ( ! self.enabled ) {
          return true;
      }
      self.oX = 0;
      self.oY = 0;
      self.dX = null;
      self.dY = null;
      self.dragging = false;
      evt.preventDefault(true);
      
      var targ = self.targetElement ? self.targetElement : targetElement;      
      
      if (document.createEvent && ! targ._snapback) {
          var evObj = document.createEvent('Events');
          evObj.initEvent('panend',false,true);
          targ.dispatchEvent(evObj);
      }      
    };

    var mouseOut = function(e) {
        if (!self.dragging || ! self.enabled) {
            return true;
        }
        if (this == self.targetElement) {
            mouseUp(e);
        }
        
        
        if ( e.target != this && ! e.currentTarget ) {
            return;
        }

        var toTarget = e.relatedTarget ? e.relatedTarget : e.toElement;
        
        while (toTarget !== null) {
            if (toTarget == this) {
                return;
            }
            toTarget = toTarget.parentNode;
        }
        mouseUp(e);
    };
        
    targetElement.setAttribute('cursor','pointer');    
    
    if ( ! targetElement.addEventListener) {
        targetElement.addEventListener = function(name,func,bool) {
            this.attachEvent(name,func);
        };
    }
    
    targetElement.addEventListener('touchstart',function(e) {
        var targ = self.targetElement ? self.targetElement : targetElement;
        if (self.momentum) {
            window.clearTimeout(self.momentum);
            self.momentum = null;
        }
        if (e.touches.length == 1) {
            var positions = mousePosition(e.touches[0]);
            var p;
            if (targ.nodeName == 'svg') {
                p = targ.createSVGPoint();
                p.x = positions[0];
                p.y = positions[1];
                var rootCTM = this.getScreenCTM();
                self.matrix = rootCTM.inverse();
                p = p.matrixTransform(self.matrix);
            } else {
                p.x = positions[0];
                p.y = positions[1];
            }
            self.oX = p.x;
            self.oY = p.y;
            
            self.dragging = true;
            self.dX = targ.getPosition()[0];
            self.dY = targ.getPosition()[1];
            
            self._momentum_shrinker = setInterval(function() {
                momentum.shift();
            },20);
            
            if (document.createEvent) {
                var evObj = document.createEvent('Events');
                evObj.initEvent('panstart',false,true);
                targ.dispatchEvent(evObj);
            }
        }
    },false);


    // document.addEventListener('touchmove',function(e) {
    //     console.log('touchmove for the document');
    //     console.log(self.dragging);
    //     if ( ! self.dragging ) {
    //         return;
    //     }
    //     console.log("Ending the drag for document move");
    //     self.oX = 0;
    //     self.oY = 0;
    //     self.dX = null;
    //     self.dY = null;
    //     self.dragging = false;
    // 
    //     var targ = self.targetElement ? self.targetElement : targetElement;      
    // 
    //     if (document.createEvent) {
    //         var evObj = document.createEvent('Events');
    //         evObj.initEvent('panend',false,true);
    //         targ.dispatchEvent(evObj);
    //     }      
    // },false);

    targetElement.addEventListener('touchmove',function(e) {
        if (self.momentum) {
            window.clearTimeout(self.momentum);
            self.momentum = null;
        }

        if (e.touches.length != 1) {
            self.dragging = false;
        }

        var targ = self.targetElement ? self.targetElement : targetElement;

        var positions = mousePosition(e.touches[0]);

        var p;
        if (targ.nodeName == 'svg') {
            p = targ.createSVGPoint();
            p.x = positions[0];
            p.y = positions[1];
            p = p.matrixTransform(self.matrix);
        } else {
            p.x = positions[0];
            p.y = positions[1];
        }
        
        if (self.dragging && ((6*Math.abs(self.oX - p.x)) > Math.abs(self.oY - p.y))) {
            e.preventDefault();
        }

        if (!self.dragging) {
            self.oX = 0;
            self.oY = 0;
            self.dX = null;
            self.dY = null;
            return;
        }
        if (momentum.length > 3) {
            momentum.splice(2);
        }
        targ.shiftPosition(p.x,p.y);
        momentum.push(targ.getPosition()[0] - self.dX);
    },false);
    
    var momentum_func = function(e) {
        if ( ! self.enabled ) {
            return true;
        }
        if ( ! self.dragging ) {
            mouseUp(e);
            return;
        }
        var targ = self.targetElement ? self.targetElement : targetElement;
        var delta = 0;
        
        if (momentum.length > 0) {
            var last_val = momentum[0];
            momentum.forEach(function(m) {
                if ((typeof last_val) != 'undefined') {
                    delta += m - last_val;
                }
                last_val = m;
            });
            delta = delta / momentum.length;
        }
        var start = targ.getPosition()[0];
        var start_delta = delta;
        self.dragging = false;
        if (self.momentum) {
            window.clearTimeout(self.momentum);
        }
        self.momentum = window.setTimeout(function() {
            start = targ.getPosition()[0];
            if (self.dragging) {
                start += self.oX - self.dX;
            } else {
                self.oX = 0;
                self.dX = 0;
            }
            targ.shiftPosition(start+delta,0);
            start = start+delta;
            delta = delta * 0.5;
            
            if (Math.abs(start_delta / delta) < 10) {
                window.requestAnimFrame(arguments.callee, targ);
//                window.setTimeout(arguments.callee,50);
            } else {
                self.momentum = null;
                clearInterval(self._momentum_shrinker);
                mouseUp(e);
            }
        },50);
    };
    
    targetElement.addEventListener('touchend',momentum_func,false);


    if (targetElement.nodeName == 'svg') {
        targetElement.addEventListener('mousedown', svgMouseDown, false);
        targetElement.addEventListener('mousemove', svgMouseMove, false);        
        targetElement.addEventListener('mouseup',mouseUp,false);
        targetElement.addEventListener('mouseout',mouseOut, false); 
        if (self.targetElement) {
            self.targetElement.addEventListener('mouseout',mouseOut,false);
        }
    } else {
        targetElement.addEventListener('mousedown', mouseDown, false);
        targetElement.addEventListener('mousemove', mouseMove, false);        
        targetElement.addEventListener('mouseup', mouseUp, false);        
        targetElement.addEventListener('mouseout',mouseOut, false);
    }

};


GOMap.Diagram.addTouchZoomControls = function(zoomElement,touchElement) {

    var mousePosition = function(evt) {
        var posx = 0;
        var posy = 0;
        if (!evt) {
            evt = window.event;
        }
        if (evt.pageX || evt.pageY)     {
            posx = evt.pageX;
            posy = evt.pageY;
        } else if (evt.clientX || evt.clientY)  {
            posx = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        if (self.targetElement) {
            posx = evt.screenX;
            posy = evt.screenY;
        }
        return [ posx, posy ];
    };
    touchElement.addEventListener('touchstart',function(e) {
        if (e.touches.length == 2) {
            var positions = mousePosition(e.touches[0]);
            var positions2 = mousePosition(e.touches[1]);
            var p;
            if (touchElement.nodeName == 'svg') {
                p = touchElement.createSVGPoint();
                p.x = 0.5*(positions[0] + positions2[0]);
                p.y = 0.5*(positions[1] + positions2[1]);
                var rootCTM = this.getScreenCTM();
                self.matrix = rootCTM.inverse();
                p = p.matrixTransform(self.matrix);
            } else {
                p.x = 0.5*(positions[0] + positions2[0]);
                p.y = 0.5*(positions[1] + positions2[1]);
            }
            zoomElement.zoomCenter = p;  
            e.preventDefault();
        }
    },false);

    touchElement.addEventListener('gesturestart',function(e) {
        zoomElement.zoomLeft = null;
        var zoomStart = zoomElement.zoom;

        var zoomscale = function(ev) {
            if ( zoomElement.zoomCenter ) {
                zoomElement.zoom = zoomStart * ev.scale;
            }
            ev.preventDefault();
        };
        this.addEventListener('gesturechange',zoomscale,false);
        this.addEventListener('gestureend',function(ev) {
            touchElement.removeEventListener('gesturechange',zoomscale);
            touchElement.removeEventListener('gestureend',arguments.callee);
            zoomElement.zoomCenter = null;
            zoomElement.zoomLeft = null;
            if (zoomElement.trigger) {
                zoomElement.trigger('gestureend');
            }
        },false);  
        e.preventDefault();
    },false);

};

/**
 * Given an element that implements a zoom attribute, creates a div that contains controls for controlling the zoom attribute. The
 * zoomElement must have a zoom attribute, and can fire the zoomChange event whenever the zoom value is changed on the object. The
 * scrollwheel is connected to this element so that when the mouse hovers over the controls, it can control the zoom using only
 * the scroll wheel.
 * @param {Object} zoomElement Element to control the zooming for.
 * @param {Number} min Minimum value for the zoom attribute (default 0)
 * @param {Number} max Maximum value for the zoom attribute (default 10)
 * @param {Number} precision Step precision for the zoom control (default 0.5)
 * @param {Number} value Default value for this control
 * @returns DIV element containing the controls
 * @type Element
 * @see GOMap.Diagram#event:zoomChange
 */
GOMap.Diagram.addZoomControls = function(zoomElement,min,max,precision,value) {
    min = min || 0;
    max = max || 10;
    precision = precision || 0.5;
    value = value || zoomElement.zoom || min; 
    
    var controls_container = document.createElement('div');
    
    var zoomIn = document.createElement('input');
    zoomIn.setAttribute('type','button');
    zoomIn.setAttribute('value','+');
    var zoomOut = document.createElement('input');
    zoomOut.setAttribute('type','button');
    zoomOut.setAttribute('value','-');
    var reset = document.createElement('input');
    reset.setAttribute('type','button');
    reset.setAttribute('value','Reset');

    controls_container.appendChild(reset);    

    reset.addEventListener('click',function() {
        zoomElement.zoom = zoomElement.defaultZoom || value;
    },false);
    
    var range = document.createElement('input');
    range.setAttribute('min',min);
    range.setAttribute('max',max);
    range.setAttribute('step',precision);
    range.setAttribute('value',value); 
    range.setAttribute('type','range');
    range.setAttribute('style','-webkit-appearance: slider-horizontal; width: 100%; position: absolute; top: 0px; bottom: 0px; margin-top: 0.5em; left: 100%; margin-left: -0.5em;');

    if (range.type == 'range') {
        
        range.addEventListener('change',function() {
            zoomElement.zoom = this.value;
        },false);
        
        var evFunction = null;
        if (zoomElement.addEventListener) {
            evFunction = zoomElement.addEventListener;
        } else if (zoomElement.bind){
            evFunction = zoomElement.bind;
        }
        
        evFunction.apply(zoomElement,['zoomChange',function() {
            range.value = zoomElement.zoom;
        },false]);
        

        reset.style.margin = '0px';
        reset.style.display = 'block';
        reset.style.position = 'absolute';
        reset.style.top = '0px';
        
        controls_container.appendChild(range);
        controls_container.style.height = '100%';
    } else {
        if (! zoomIn.addEventListener) {
            var addevlis = function(name,func) {
                this.attachEvent(name,func);
            };
            zoomIn.addEventListener = addevlis;
            reset.addEventListener = addevlis;
            zoomOut.addEventListener = addevlis;        
        }
        zoomIn.addEventListener('click',function() {
            zoomElement.zoom += precision;
        },false);
        zoomOut.addEventListener('click',function() {
            zoomElement.zoom -= precision;
        },false);

        zoomIn.style.margin = '0px';
        zoomIn.style.display = 'block';
        zoomIn.style.position = 'absolute';
        zoomIn.style.top = '0px';
        zoomIn.style.left = '29px';

        zoomOut.style.margin = '0px';
        zoomOut.style.display = 'block';
        zoomOut.style.position = 'absolute';
        zoomOut.style.top = '0px';

        reset.style.margin = '0px';
        reset.style.display = 'block';
        reset.style.position = 'absolute';
        reset.style.top = '23px';
        reset.style.left = '3px';

        controls_container.appendChild(zoomOut);
        controls_container.appendChild(zoomIn);
        controls_container.appendChild(reset);
    }

    this.addScrollZoomControls(zoomElement,controls_container,precision);

    return controls_container;
};

/**
 * Connect the scroll wheel to the controls to control zoom
 */
GOMap.Diagram.addScrollZoomControls = function(target,controlElement,precision) {
    precision = precision || 0.5;

    var self = this;

    var hookEvent = function(element, eventName, callback) {
      if (typeof(element) == 'string') {
        element = document.getElementById(element);
      }

      if (element === null) {
        return;
      }

      if (element.addEventListener) {
        if (eventName == 'mousewheel') {
          element.addEventListener('DOMMouseScroll', callback, false);  
        }
        element.addEventListener(eventName, callback, false);
      } else if (element.attachEvent) {
        element.attachEvent("on" + eventName, callback);
      }
    };


    var mousePosition = function(evt) {
          var posx = 0;
          var posy = 0;
          if (!evt) {
              evt = window.event;
          }
          if (evt.pageX || evt.pageY)   {
              posx = evt.pageX;
              posy = evt.pageY;
          } else if (evt.clientX || evt.clientY)    {
              posx = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
              posy = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
          }

          var p = {};

          if (controlElement.nodeName == 'svg') {
              p = controlElement.createSVGPoint();
              p.x = posx;
              p.y = posy;
              var rootCTM = controlElement.getScreenCTM();
              self.matrix = rootCTM.inverse();
              p = p.matrixTransform(self.matrix);
          } else {
              p.x = posx;
              p.y = posy;
          }

          return p;
    };

    var mouseWheel = function(e) {

      e = e ? e : window.event;
      var wheelData = e.detail ? e.detail * -1 : e.wheelDelta;
      target.zoomCenter = mousePosition(e);
      
      if (wheelData > 0) {
        target.zoom = target.zoom += precision;
      } else {
        target.zoom = target.zoom -= precision;
      }
      
      
      if (e.preventDefault) {
        e.preventDefault();
      }
      return false;
    };

    var isFF = false;

    if (navigator.userAgent.indexOf('Gecko') >= 0) {
      isFF = parseFloat(navigator.userAgent.split('Firefox/')[1]) || undefined;
    }                         

    if (isFF && (typeof svgweb != 'undefined')&& svgweb.getHandlerType() == 'native') {
      hookEvent(controlElement, 'mousewheel',
                mouseWheel);
    } else {
      hookEvent(controlElement, 'mousewheel', mouseWheel);
    }

    hookEvent(controlElement,'mousemove', function(e) {
        if (target.zoomCenter && Math.abs(target.zoomCenter.x - mousePosition(e).x) > 100) {
            target.zoomCenter = null;
            target.zoomLeft = null;
        }
    });
};

