/** Default class constructor
 *  @class      Service class that will retrieve data from Predicted Proteotypic Peptides for a given AGI.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.ProteotypicReader = MASCP.buildService(function(data) {
                        this._raw_data = data;                        
                        return this;
                    });

MASCP.ProteotypicReader.SERVICE_URL = '';

MASCP.ProteotypicReader.prototype.requestData = function()
{
    var agi = this.agi;
    
    return {
        type: "GET",
        dataType: "json",
        data: { 'agi'       : agi,
                'service'   : 'proteotypic' 
        }
    };
};



/**
 *  @class   Container class for results from the Proteotypic service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.ProteotypicReader.Result = MASCP.ProteotypicReader.Result;

/** Retrieve the peptides for this particular entry from the Proteotypic service
 *  @returns Array of peptide strings
 *  @type [String]
 */
MASCP.ProteotypicReader.Result.prototype.getPeptides = function()
{
    var content = null;

    if (this._peptides) {
        return this._peptides;
    }

    if (! this._raw_data || ! this._raw_data.peptides ) {
        return [];
    }
        
    var peptides = [];
        
    for (var i = this._raw_data.peptides.length - 1; i >= 0; i-- ) {
        var a_peptide = this._raw_data.peptides[i];
		var the_pep = { 'sequence' : a_peptide.sequence, 'exp' : a_peptide.exp, 'pvalue' : a_peptide.pvalue };
        peptides.push(the_pep);
    }
    this._peptides = peptides;
    return peptides;
};

MASCP.ProteotypicReader.prototype.setupSequenceRenderer = function(sequenceRenderer)
{
    var reader = this;

    this.bind('resultReceived', function() {

        MASCP.registerGroup('proteotypic_experimental', {'fullname' : 'Expected Peptides', 'hide_member_controllers' : true, 'hide_group_controller' : true, 'color' : '#ff5533' });

        var overlay_name = 'proteotypic_controller';

        var css_block = '.active .overlay { background: #ff5533; } .active a { color: #000000; text-decoration: none !important; }  :indeterminate { background: #ff0000; } .tracks .active { background: #0000ff; } .inactive a { text-decoration: none; } .inactive { display: none; }';

        MASCP.registerLayer(overlay_name,{ 'fullname' : 'Expected Peptides', 'color' : '#008000', 'css' : css_block });

        if (sequenceRenderer.createGroupController) {
            sequenceRenderer.createGroupController('proteotypic_controller','proteotypic_experimental');
        }
                
        var peps = this.result.getPeptides();
        var exps_done = '';
		for(var i = 0; i < peps.length; i++) {
            var an_exp = peps[i].exp;
            if ( exps_done.search(an_exp) < 0 ) {
                MASCP.registerLayer('proteotypic_peptide_'+an_exp, { 'fullname': an_exp.replace('_', '/'), 'group' : 'proteotypic_experimental', 'color' : '#008000', 'css' : css_block });
                exps_done = exps_done + an_exp;
            }
			var peptide = peps[i].sequence;
			var peptide_bits = sequenceRenderer.getAminoAcidsByPeptide(peptide);
			var layer_name = 'proteotypic_peptide_'+an_exp;
			peptide_bits.addToLayer(layer_name);
			peptide_bits.addToLayer(overlay_name);
		}

        jQuery(sequenceRenderer).trigger('resultsRendered',[reader]);
    });
    return this;
};

MASCP.ProteotypicReader.Result.prototype.render = function()
{
    if (this.getPeptides().length > 0) {
        var a_container = jQuery('<div>MS/MS spectra <input class="group_toggle" type="checkbox"/>Proteotypic</div>');
        jQuery(this.reader.renderers).each(function(i){
            this.createGroupCheckbox('proteotypic_experimental',jQuery('input.group_toggle',a_container));
        });
        return a_container;
    } else {
        return null;
    }
};/** @fileOverview   Classes for reading data from the Proteotypic database
 */
if ( typeof MASCP === 'undefined' || typeof MASCP.Service === 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}

