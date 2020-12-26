Ext.namespace("Documa.distribution");

/**
 * @typedef {object} DistVO
 * @property {string} sid
 * @property {string} distid
 * @property {Array.<{cid:string, id:string}>} cmpset
 */

/**
 * @typedef {object} DistributionType
 * @property {string} id
 * @property {string} target
 * @property {Array.<ComponentItemType>} components
 */

Documa.distribution.DistributionEvents = {
	CHANGED: "changed"
};


/**
 * @class
 * @extends {Ext.util.Observable}
 */
Documa.distribution.Distribution = Ext.extend(Ext.util.Observable, (function(){

	/**
	 * Helper method to validate specified payload object.
	 *
	 * @param {DistVO} obj distribution description object
	 */
	function validate(obj) {
		if (!obj.sid)
			throw new Error("Invalid payload object of distribution detected: no session id defined!");
		if (!obj.distid)
			throw new Error("Invalid payload object of distribution detected: no distribution id defined!");
		if (!obj.cmpset && !(obj.cmpset instanceof Array))
			throw new Error("Invalid payload object of distribution detected: no valid component set defined!");

		for (var i = 0; i < obj.cmpset.length; ++i) {
			if (!obj.cmpset[i].id)
				throw new Error("No component instance id in distribution item detected!");
			if (!obj.cmpset[i].cid)
				throw new Error("No component id in distribution item detected!");
		}
	}

	/**
	 * Helper method to validate the structure of given component description object.
	 *
	 * @param {Object} cmp component description object
	 */
	function validateComponent(cmp) {
		if (!cmp.id)
			throw new Error("Invalid component item of distribution detected: no instance id defined!");
		if (!cmp.cid)
			throw new Error("Invalid component item of distribution detected: no component id defined!");
	}

	/**
	 * Public interface of distribution class.
	 */
	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {DistVO} distObj distribution description object
		 */
		constructor: function(distObj){
			Documa.distribution.Distribution.superclass.constructor.call(this);
			// check payload object for protocol errors
			validate(distObj);
			this._sessionid = distObj.sid;
			this._id = distObj.distid;

			var components = new Array();
			for (var i = 0; i < distObj.cmpset.length; ++i) {
				// fill up the array of component items
				validateComponent(distObj.cmpset[i]);
				components.push(new Documa.distribution.ComponentItem({
					id: distObj.cmpset[i].id,
					cid: distObj.cmpset[i].cid
				}));
			}

			/**
			 * @type {Documa.distribution.ComponentItem[]}
			 * @private
			 */
			this._components = components;
			this._channels = new Array();
		},
		/**
		 * Returns distribution id.
		 * @returns {String}
		 */
		getId: function(){
			return this._id;
		},
		/**
		 * Returns session id of runtime context.
		 * @returns {String}
		 */
		getSessionId: function(){
			return this._sessionid;
		},
		/**
		 * Returns set of component instances executed on runtime context represented within this distribution class.
		 * Each component is represented by an object containing its instance id and component id (as Documa.distribution.ComponentItem).
		 *
		 * @returns {Array.<Documa.distribution.ComponentItem>} set of corresponding components
		 */
		getComponents: function(){
			return this._components;
		},

		/**
		 * Tests whether a component defined by the given id is included in this distribution.
		 *
		 * @param {string} instid
		 * @param {string} cid
		 */
		containsComponent: function(instid, cid){
			for (var i = 0; i < this._components.length; ++i){
				if (this._components[i].getComponentId() === cid &&
					this._components[i].getInstanceId() === instid) {
					return true;
				}
			}
			return false;
		},
		/**
		 * Returns the index of given component if it is included in this distribution. If not a negativ index will be returned.
		 *
		 * @param {Documa.distribution.ComponentItem} component
		 * @returns {Number} index of component or -1 if component is not included
		 */
		indexOf: function(component){
			if (!( component instanceof Documa.distribution.ComponentItem))
				throw Error("Invalid argument!");
			for (var i = 0; i < this._components.length; ++i) {
				if (this._components[i].getInstanceId() === component.getInstanceId()) {
					return i;
				}
			}
			return -1;
		},
		/**
		 * Adds component item into this distribution, e. g. during a migration transaction.
		 * @param {Documa.distribution.ComponentItem} component
		 * @returns {void}
		 */
		addComponent: function(component){
			if (!( component instanceof Documa.distribution.ComponentItem))
				throw Error("Invalid argument!");
			var index = this.indexOf(component);
			if (index >= 0)
				throw new Error("Given component is already an element of this distribution!");
			this._components.push(component);
			this.fireEvent(Documa.distribution.DistributionEvents.CHANGED, this);
		},
		/**
		 * Removes component item from this distribution, e. g. during a migration transaction.
		 * @param {Documa.distribution.ComponentItem} component
		 * @returns {void}
		 */
		removeComponent: function(component){
			if (!( component instanceof Documa.distribution.ComponentItem))
				throw Error("Invalid argument!");
			var index = this.indexOf(component);
			if (index < 0)
				throw new Error("Given component could not removed, because it's not registered in this distribution!");
			// remove component at the delete index determined previously
			this._components.splice(index, 1);
			this.fireEvent(Documa.distribution.DistributionEvents.CHANGED, this);
		},
		/**
		 * Adds channel item into this distribution.
		 * Updates the channel if it already exists.
		 * 
		 * @param {Documa.communication.channels.ComponentChannel} channel
		 * @returns {void}
		 */
		addChannel: function(channel){
			if (!(channel instanceof Documa.communication.channels.ComponentChannel)) throw Error("Invalid argument!");
			
			var index = this.indexOfChannel(channel);
			if (index >= 0) this._channels[index] = channel;
			else this._channels.push(channel);
		},
		/**
		 * Removes channel item from this distribution.
		 * @param {Documa.communication.channels.ComponentChannel} channel
		 * @returns {void}
		 */
		removeChannel: function(channel){
			if (!(channel instanceof Documa.communication.channels.ComponentChannel)) throw Error("Invalid argument!");
			
			var index = this.indexOfChannel(channel);
			if (index < 0) throw new Error("Given channel could not removed, because it's not registered in this distribution!");
			else this._channels.splice(index, 1);
		},
		/**
		 * Returns the index of given channel if it is included in this distribution. 
		 * If not a negative index will be returned.
		 *
		 * @param {Documa.communication.channels.ComponentChannel} channel
		 * @returns {Number} index of channel or -1 if channel is not included
		 */
		indexOfChannel: function(channel){
			if (!(channel instanceof Documa.communication.channels.ComponentChannel)) throw Error("Invalid argument!");
			
			for (var i = 0; i < this._channels.length; ++i) {
				if (this._channels[i].getName() === channel.getName()) {
					return i;
				}
			}
			return -1;
		},
		/**
		 * Returns set of channels in this distribution.
		 *
		 * @returns {Array.<Documa.communication.channels.ComponentChannel>} set of channels
		 */
		getChannels: function(){
			return this._channels;
		}
	};
})());
