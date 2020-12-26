Ext.namespace("Documa.components");

Documa.components.ContextConstants = {
	LOG : "Logger",
	EVENTHANDLER : "EventHandler",
	ERRORHANDLER : "ErrorHandler",
	LCMANAGER : "LifeCycleManager",
	STYLE : "Style",
	SERVICEACCESS : "ServiceAccess",
	RTID : "renderTargetId",
	APPCONTEXT : "ApplicationContext",
	XMLUTIL : "XMLUtilities",
	EVENTBUFFER : "EventBuffer"
};

/**
 * @class
 */
Documa.components.ComponentContext = Ext.extend(Object, (function () {
	return{
		/**
		 * Constructor.
		 *
		 * @constructs
		 * @param {Object} predefinedAttributes
		 * @param {Documa.components.ApplicationEventProxy} broker
		 */
		constructor: function (predefinedAttributes, broker) {
			Documa.components.ComponentContext.superclass.constructor.call(this);
			this._predef = predefinedAttributes || new Object();
			this._attributes = {};
			this._broker = broker;
		},
		/**
		 * Get the value for the specified attribute.
		 * @param {String} name the name of the attribute
		 * @return {Object} the value currently set
		 */
		getAttribute: function (name) {
			if (!name)
				throw new Error("Invalid attribute argument!");
			return this._attributes[name];
		},
		/**
		 * Get all available attributes of this context.
		 * @return {Array} an array of all available attributes
		 */
		getAttributeNames: function () {
			var res = new Array();
			for (var attrName in this._attributes) {
				res.push(attrName);
			}
			return res;
		},
		/**
		 * Set the value of an attribute of this context. Should only be called by the
		 * creator of the context.
		 * @param {String} name the name of the attribute
		 * @param {Object} value the value.
		 */
		setAttribute: function (name, value) {
			if (!name)
				throw new Error("Invalid attribute argument!");
			this._attributes[name] = value;
		},
		/**
		 * Removes the specified attribute from this context. Predefined attributes are
		 * not removeable.
		 * @param {String} name the name of the attribute to be removed
		 */
		removeAttribute: function (name) {
			if (!name)
				throw new Error("Invalid attribute argument!");

			if (this._predef) {
				for (var pre in this._predef) {
					if (this._predef[pre] === name)
						return false;
				}
			}
			delete this._attributes[name];
		}
	};
})());