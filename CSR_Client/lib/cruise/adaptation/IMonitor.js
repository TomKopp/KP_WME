/**
 * @class Ext.cruise.client.adapt.IContextMonitor The Baseclass for monitors. A monitor senses a certain partition of the context and 
 * asynchronously publishes context changes.
 * @public
 */
Ext.cruise.client.adapt.IContextMonitor = Ext.extend(Object, {
	ran: false,
	minThreshold: 2000,
	active: true,
	contextManager: null,
	log: null,
	store: null,

	/**
	 * @constructor
	 * @param {Object} minThreshold minimal threshold between context updates
	 * @param {Object} ctxMgr reference to the Context Manager
	 * @param {Object} log references the Logger
	 */
	constructor: function(minThreshold, ctxMgr, log){
		Ext.cruise.client.adapt.IContextMonitor.superclass.constructor.call(this);

		this.store = new Object();
		this.minThreshold= minThreshold;
		this.contextManager= ctxMgr;
		this.log= log;
	},
	
	/**
	 * Get the ID of this monitor.
	 * @public
	 * @function
	 * @return {String} the id
	 */
	getId: function(){
	},

	/**
	 * Get the description of the context-partition sensed by this monitor.
	 * @public
	 * @function
	 * @return {String} the description
	 */	
	getContextDescription: function(){return "";},

	/**
	 * Activate this monitor. It is assumed that an implementation initially starts a 
	 * measurement and sends the results 'as fast as possible'.
	 * @public
	 * @function
	 */
	activate: function(){
		this.active= true;
	},
	/**
	 * Deactivate this monitor.
	 * @public
	 * @function
	 */
	deactivate: function(){
		this.active= false;
	},

	/**
	 * Get the confidence value of this monitor.
	 * @public
	 * @function
	 * @return {float} the confidence in range of [0...1]
	 */
	getConfidence: function(){
		return 0.0;
	},

	/**
	 * Send the sensed data.
	 * @public
	 * @function
	 * @param {Array} array the data
	 */
	sendContext: function(stuff){
		//if (stuff.length==0) return;
		this.log.debug("[IMonitor] monitor '"+this.getId()+"' is sending...", stuff);
		this.contextManager.updateRemoteContext(this,stuff);
	},

	/**
	 * Builds a correct datastructure required by the send-method.
	 * @protected
	 * @function
	 */
	buildResponse: function(){
		/*var resp= {};
		resp.confidence= this.confidence;
		resp.data= new Array();*/
		return new Array();
	},
	/**
	 * Add an entry to the datastructure.
	 * @protected
	 * @funtion
	 * @param {Object} resp the datastrucutre (should be created via buildResponse)
	 * @param {Object} path the path of the ontology concept
	 * @param {Object} value the value(s)
	 * @param {Object} confidence the confidence value for this context data
	 */
	addToResponse: function(resp, path, value, confidence){
		if (this.changed(path, value))
			// context= (path, value+, confidence)*
			resp./*data.*/push({
				path: path,
				value: value,
				confidence: confidence?confidence:this.getConfidence()
			});
	},

	/**
	 * Checks whether something changed or not.
	 * @private
	 * @function
	 * @param {Object} key
	 * @param {Object} newvalue
	 */
	changed: function(key, newvalue){
		if (this.store[key]){
			if (this.store[key] != newvalue){
				this.store[key]= newvalue;
				return true;
			}else
				return false;
		}else 
			this.store[key]= newvalue;
		return true;
	}
});