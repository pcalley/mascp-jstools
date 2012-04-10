/**
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
