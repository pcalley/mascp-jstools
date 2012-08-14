
/**
 *  @fileOverview Classes for reading data from the Pubmed databases using
 */

/**
 * @class   Service class that will retrieve Pubmed data for this entry given an AGI.
 * @description Default class constructor
 * @param   {String} agi            Agi to look up
 * @param   {String} endpointURL    Endpoint URL for this service
 * @extends MASCP.Service
 */
 
MASCP.PubmedReader = MASCP.buildService(function(data) {
                        if (! data ) {
                            return this;
                        }
                        var extractData = function()
                        {
                            var features = this._raw_data.getElementsByTagName('FEATURE');

                            var peptides = [];

                            var peps_by_seq = {};
                            var all_publications = {};
                            for (var i = 0 ; i < features.length; i++ ) {
                                var type = features[i].getElementsByTagName('TYPE')[0];
                                var textcontent = type.textContent || type.text || type.nodeValue;
                                if ( textcontent == 'Peptide') {
                                    var seq = features[i].getAttribute('label');
                                    if ( ! peps_by_seq[seq] ) {
                                        peps_by_seq[seq] = { 'publications' : [] };
                                    }
                                    var exp_id = parseInt(features[i].getElementsByTagName('GROUP')[0].getAttribute('id'),10);
                                    peps_by_seq[seq].publications.push(exp_id);
                                    all_publications[exp_id] = true;            
                                }
                            }
                            for (var pep in peps_by_seq) {
                                if (peps_by_seq.hasOwnProperty(pep)) {
                                    var pep_obj =  { 'sequence' : pep , 'publications' : peps_by_seq[pep].publications};
                                    peptides.push(pep_obj);
                                }
                            }

                            this._publications= [];
                            for (var expid in all_publications) {
                                if (all_publications.hasOwnProperty(expid)) {
                                    this._publications.push(parseInt(expid,10));
                                }
                            }

                            return peptides;
                        };
                        this._raw_data = data;
                        if (data.getElementsByTagName) {
                            var peps = extractData.call(this);
                            this._raw_data = {
                                'publications' : this._publications,
                                'peptides'    : peps
                            };
                        }
                        this._publications= this._raw_data.publications;
                        this._peptides    = this._raw_data.peptides;
                        return this;
                    });

MASCP.PubmedReader.prototype.requestData = function()
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
                'service'   : 'pubmed'
        }
    };
};


MASCP.PubmedReader.SERVICE_URL = 'http://www.ncbi.nlm.nih.gov/pubmed/'; /* ?segment=locusnumber */

/**
 * @class   Container class for results from the Pubmed service
 * @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.PubmedReader.Result = MASCP.PubmedReader.Result;

MASCP.PubmedReader.Result.prototype = MASCP.extend(MASCP.PubmedReader.Result.prototype,
/** @lends MASCP.PubmedReader.Result.prototype */
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

MASCP.PubmedReader.Result.prototype.render = function()
{
    return null;
};

MASCP.PubmedReader.Result.prototype.getPublications= function()
{
    return this._publications|| [];
};

MASCP.PubmedReader.Result.prototype.getPeptides = function()
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


MASCP.PubmedReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;
    
    this.bind('resultReceived', function() {
        
        
        MASCP.registerGroup('pubmed', {'fullname' : 'Pubmed', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#000000' });

        var overlay_name = 'pubmed_controller';

        var css_block = '.active .overlay { background: #000000; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';

        MASCP.registerLayer(overlay_name,{ 'fullname' : 'Pubmed', 'color' : '#000000', 'css' : css_block });

        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('pubmed_controller','pubmed');
        }
        
        var peps = this.result.getPeptides();
        var publications= this.result.getPublications();
        for(var i = 0; i < publications.length; i++) {
            var layer_name = 'pubmed_publication'+publications[i];
            MASCP.registerLayer(layer_name, { 'fullname': 'Publication'+publications[i], 'group' : 'pubmed', 'color' : '#000000', 'css' : css_block });
            MASCP.getLayer(layer_name).href = 'http://www.ncbi.nlm.nih.gov/pubmed/'+publications[i];
            for (var j = 0 ; j < peps.length; j++) {
                var peptide = peps[j];
                if (peps[j].publications.indexOf(publications[i]) < 0) {
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


