Ext.namespace("Ext.cruise.client.adapt.comet");
/**
 * @author Carsten Radeck
 * @class Ext.cruise.client.adapt.comet.CroCoComet 
 * This class is responsible for the connection to the comet-interface of CroCo.
 * 
 */
Ext.cruise.client.adapt.comet.CroCoComet = Ext.extend(Object, {
    _subscription: null,
    _metaSubscriptions: [],
    _handshook: false,
    _connected: false,
    _cometd: null,
    log: null,	
    callback: null,
	ceCallback: null,
	
	/**
	 * @constructor
	 * @public
	 * @param {Object} log Logger
	 * @param {Function} callback The function to be called after a notification of CroCo
	 * @param {Function} connectionEstablishedCallback The function to be called after the connection to CroCo was established successfully  
	 */
	constructor: function(log, callback, connectionEstablishedCallback){
		Ext.cruise.client.adapt.comet.CroCoComet.superclass.constructor.call(this);
		
		this.log=log;
		this.callback= callback;
		this.ceCallback= connectionEstablishedCallback;
	},
	
	/**
	 * Initializes the connection, registers the listener for page-unload
	 * @public
	 * @function 
	 * @param {String} url (optional) the URL of CroCo's comet-interface. default: %croco-root%/cometd
	 */
	init: function(url){
		this._cometd = $.cometd;
		
		Ext.EventManager.on(window, 'unload', this.dispose, this);

		this.join(url?url:"http://localhost:8080/CroCoWS/cometd");
	},
	
	/**
	 * 
	 * @private
	 * @function
	 */
	join: function(url){
		this.log.debug('[CroCoComet] trying to connect to',url);
		try{
			this._metaSubscribe();
		}catch(e){this.log.error("[CroCoComet] join._ms",e);}
		try{
			this._cometd.init(url);
		}catch(e){this.log.error("[CroCoComet] join.init:",e);}
	},

	/**
	 * Method to subscribe for changes of the context-model of CroCo.
	 *  
	 * @public
	 * @function
	 * @param {String} query The SPARQL-Query to subscribe for
	 * @param {boolean} initialResult Indicates whether the result of the query should be delivered after registration
	 */
	subscribe: function(query, initialResult){
		if (!this._connected) {
			this.log.warn('[CroCoComet] subscribe: not connected');
			return;
		}
      	if (!query || !(typeof(query)=="string"))
			return;
		try{
			this._cometd.publish("/croco/subscribe", {
				query: query,
				returnResult: initialResult
			});
			this.log.debug("[CroCoComet] subscribed for notifications. query=",query);
		}catch(e){this.log.error(e);}
	},

	/**
	 * 
	 * @private
	 * @function
	 */
	unsubscribe: function(query){
		if (!this._connected) return;
        if (!query || !(typeof(query)=="string"))
    			return;
        
		try{
			this._cometd.publish("/croco/unsubscribe", {
				query: query
			});
		}catch(e){this.log.error(e);}
	},
	
	/**
	 * 
	 * @private
	 * @function
	 */
	dispose: function(){
	try{
	    this.log.debug("[CroCoComet] disposing");
		this._cometd.startBatch();
		this._cometd.publish("/croco/unsubscribeall", {});
		this._unsubscribe();	
		this._cometd.endBatch();
		this._metaUnsubscribe();

		this._cometd.disconnect();
	}catch(f){this.log.error(f);}
	},

	/**
	 * 
	 * @private
	 * @function
	 */
	receive: function(message){
		// atm simply forward the notification to the handler
		// there might be some processing steps involved in the future
		if (this.callback)
			this.callback(message.data.query, message.data.result);
	},

	/**
	 * 
	 * @private
	 * @function
	 */
	_unsubscribe: function(){
		if (this._subscription){
			this._cometd.unsubscribe(this._subscription);
	    		this.log.debug("[CroCoComet] unsubscribing");
		}
		this._subscription = null;
	},

	/**
	 * 
	 * @private
	 * @function
	 */
	_subscribe: function(){
		this.log.debug("[CroCoComet] subscribing");
		this._unsubscribe();
		this._subscription = this._cometd.subscribe('/croco/notify', this, this.receive);
	},

	/**
	 * 
	 * @private
	 * @function
	 */
    _metaUnsubscribe: function(){
    	this.log.debug("[CroCoComet] _metaunubscribe");
        Ext.each(this._metaSubscriptions, function(index, subscription)
        {
        	this._cometd.removeListener(subscription);
        }, this);
        this._metaSubscriptions = [];
    },

	/**
	 * 
	 * @private
	 * @function
	 */
    _metaSubscribe: function(){
    	this.log.debug("[CroCoComet] _metaSubscribe");
    	this._metaUnsubscribe();
    	this._metaSubscriptions.push(this._cometd.addListener('/meta/handshake', this, this._metaHandshake));
    	this._metaSubscriptions.push(this._cometd.addListener('/meta/connect', this, this._metaConnect));
    },
	
	/**
	 * 
	 * @private
	 * @function
	 */
    _metaHandshake: function(message){
    	this.log.debug("[CroCoComet] _metaHandshake",message.successful);
    	this._handshook = message.successful;
    	this._connected = false;
    },

	/**
	 * 
	 * @private
	 * @function
	 */
    _metaConnect: function(message){
    	this.log.debug('[CroCoComet] _metaConnect. connected:',message.successful);
        var wasConnected = this._connected;
        this._connected = message.successful;
        
        if (!wasConnected)
        {
            if (this._connected)
            {
				try{
					if (Ext.isFunction(this.ceCallback)){
						this.ceCallback();
					}
				}catch(E){this.log.error(E);}
				
            	this._cometd.startBatch();
            	this._subscribe();
            	this._cometd.endBatch();
            }
        }
    }
});