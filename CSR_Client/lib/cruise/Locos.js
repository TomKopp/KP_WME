/**
 * @class Ext.cruise.client.EventSplit  TSR-provided implementation of an EventSplit.  Adheres to the <a href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/components/model">specified interface</a> of CRUISe-compliant components.
 * Should not be instantiated directly, but via composition models.
 * 
 * <br/><br/>For further documentation see <a href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/runtimes/logic_spec#EventSplit">Specification</a>
 */
Ext.cruise.client.EventSplit = Ext.extend(Object, {
	/** @property argumentnames The names of the input event's parameters to be split. @type Array */
	argumentnames: null,
	proxy: null,
	/** @public */
	constructor: function(){
		Ext.cruise.client.EventSplit.superclass.constructor.call(this);
		this.argumentnames= new Array();
	},
	/** @public @param {Ext.cruise.client.BaseContext} compCtx The component context. */
	init: function(compCtx){
		this.proxy= compCtx.getAttribute("EventHandler");
	},
	/** @public @param {String} name The queried property's name. */
	getProperty: function(name){
		if (name==="parameterNames"){
			var result = "[";
			for(var id = 0; id < this.argumentnames.length; id++){
				result += "'" + this.argumentnames[id] + "',";	
			}
			result = result.substring(0,result.lastIndexOf(","));
			return result + "]";
		}
	},
	/** @public @param {String} compCtx The property name. @param {Object} value The value to be set. */
	setProperty: function(name, value){
		if (name==="parameterNames"){
			if (Ext.isArray(value))
				this.argumentnames= value;
			if (typeof value=="string"){
				this.argumentnames = Ext.util.JSON.decode(value);
				//this.argumentnames.push(value);
			}
		}
	},
	split: function(args){
		this.invokeOperation("split",args);
	},
	/** @public @param {String} name The operation's name. @param {Ext.cruise.client.Message} msg The message object handed over to the operation. */
	invokeOperation : function(name, msg){
		var args= msg.getBody();
		if (name==="split"){
			if (Ext.isArray(args)){
				for (idx in args) {
					if(this.argumentnames.indexOf(idx)==-1)
						continue;
					var msg = new Ext.cruise.client.Message();
					//msg.setName("on"+this.argumentnames[idx]);
					//msg.appendToBody(this.argumentnames[idx], args[idx]);
					msg.setName("on"+idx);
					msg.appendToBody(idx, args[idx]);
					this.proxy.publish(msg);
					//this.proxy.publish("on"+this.argumentnames[idx]+"Split", args[idx]);
				}
			}
		}
	},
	/** Disposes this component. @public */
	dispose: function(){
		delete this.argumentnames;
	}
});

/**
 * @class Ext.cruise.client.EventJoin  TSR-provided implementation of an EventJoin. Adheres to the <a href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/components/model">specified interface</a> of CRUISe-compliant components.
 * Should not be instantiated directly, but via composition models.
 * 
 * <br/><br/>For further documentation see <a href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/runtimes/logic_spec#EventJoin">Specification</a>
 */
Ext.cruise.client.EventJoin = Ext.extend(Object, {
	/** @property mode The joiner mode, one of "tolerant", "repeating", "queueing" @type String*/
	mode: null,
	proxy: null,
	data: null,
	/** @property argumentnames The names of the input event's parameters to be joined. @type Array*/
	argumentnames: null,
	constructor: function(){
		Ext.cruise.client.EventJoin.superclass.constructor.call(this);
		this.argumentnames= new Array();
		this.data= new Object();
	},
	/** @public @param {Ext.cruise.client.BaseContext} compCtx The component context. */
	init: function(compCtx){
		this.proxy= compCtx.getAttribute("EventHandler");
	},
	prepare: function(){},
	/** @public @param {String} name The queried property's name. */
	getProperty: function(name){
		if (name==="mode"){
			return this.mode;
		}
		if (name==="parameterNames"){
			var result = "[";
			for(var id = 0; id < this.argumentnames.length; id++){
				result += "'" + this.argumentnames[id] + "',";	
			}
			result = result.substring(0,result.lastIndexOf(","));
			return result + "]";
			return this.argumentnames;
		}
	},
	/** @public @param {String} compCtx The property name. @param {Object} value The value to be set. */
	setProperty: function(name, value){
		if (name==="mode"){
			if (value=="tolerant" || value=="repeating"||value=="queuing"){
				this.mode= value; 
			}
		}
		if (name==="parameterNames"){
			if (Ext.isArray(value))
				this.argumentnames= value;
			if (typeof value=="string"){
				this.argumentnames = Ext.util.JSON.decode(value);
				//this.argumentnames.push(value);
			}
		}
	},
	/** @public @param {String} name The operation's name. @param {Ext.cruise.client.Message} msg The message object handed over to the operation. */
	invokeOperation : function(name, msg){
		var args = msg.getBody();
		var idx= name.indexOf("join");
		if (idx==-1) return;
		var param=name.substr(4);
		var hit= false;
		for(var i=0; i < this.argumentnames.length; ++i){
			if (this.argumentnames[i]==param){
				hit= true; 
				break;
			}
		}
		if (hit==false) return;
		if (this.mode == "tolerant" || this.mode == "repeating") {
			this.data[param] = args[param];
			if (this.allSet() == true) {
				var array = new Array();
				for (var j = 0; j < this.argumentnames.length; ++j) {
					array[this.argumentnames[j]] = this.data[this.argumentnames[j]];
					if (this.mode == "tolerant") {
						this.data[this.argumentnames[j]] = null;
					}
				}
				//this.proxy.publish("onJoin", array);
				var msg = new Ext.cruise.client.Message();
				msg.setName("onJoin");
				msg.setBody(array);
				this.proxy.publish(msg);
			}
		}
		if (this.mode == "queuing") {
			if (!Ext.isArray(this.data[param])) 
				this.data[param] = new Array();
			this.data[param].push(args[param]);
			if (this.allSet()) {
				var array = new Array();
				for (var j = 0; j < this.argumentnames.length; ++j) {
					var val;
					if (this.data[this.argumentnames[j]].length>1){
						val= this.data[this.argumentnames[j]].shift();
					}else {
						val= this.data[this.argumentnames[j]][0];
						this.data[this.argumentnames[j]]=null;
					}
					array.push(val);
				}
				//this.proxy.publish("onJoin", array);
				var msg = new Ext.cruise.client.Message();
				msg.setName("onJoin");
				msg.setBody(array);
				this.proxy.publish(msg);
			}
		}
	},
	/** Disposes this component. @public */
	dispose: function(){
		delete this.mode;
		delete this.data;
		delete this.argumentnames;
	},
	allSet: function(){
		for(var idx=0; idx<this.argumentnames.length; ++idx){
			var d= this.data[this.argumentnames[idx]];
			if (d==undefined || d==null || (Ext.isArray(d) && d.length==0))
				return false;
		}
		return true;
	}
});