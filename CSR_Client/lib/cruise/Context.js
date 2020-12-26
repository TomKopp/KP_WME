/**
 * @class Ext.cruise.client.BaseContext represents the context for a certain
 * entity and provides access to various attributes.
 * Base implementation of IContext (c.f <a
 * href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/runtimes/api#IContext">Specification</a>).
 */
Ext.cruise.client.BaseContext = Ext.extend(Object, {
	_predef : null,
	_attributes : null,

	constructor : function(predefinedAttributes) {
		Ext.cruise.client.BaseContext.superclass.constructor.call(this);
		this._predef = predefinedAttributes || new Object();
		this._attributes = new Array();
	},
	/**
	 * Get the value for the specified attribute.
	 * @param {String} name the name of the attribute
	 * @return {Object} the value currently set
	 */
	getAttribute : function(name) {
		if (name == undefined || name == null)
			return null;
		return this[name];
	},
	/**
	 * Get all available attributes of this context.
	 * @return {Array} an array of all available attributes
	 */
	getAttributeNames : function() {
		var res = new Array();
		return res.concat(this._attributes);
	},
	/**
	 * Set the value of an attribute of this context. Should only be called by the
	 * creator of the context.
	 * @param {String} name the name of the attribute
	 * @param {Object} value the value.
	 */
	setAttribute : function(name, value) {
		if (name == undefined || name == null)
			return false;
		this[name] = value;
		if (this._attributes.indexOf(name) == -1)
			this._attributes.push(name);
		return true;
	},
	/**
	 * Removes the specified attribute from this context. Predefined attributes are
	 * not removeable.
	 * @param {String} name the name of the attribute to be removed
	 */
	removeAttribute : function(name) {
		if (name == undefined || name == null)
			return false;
		if (this._predef !== undefined && this._predef !== null)
			for (var pre in this._predef) {
				if (this._predef[pre] === name)
					return false;
			}
		delete this[name];
		this._attributes.remove(name);
		return true;
	}

});

/**
 * @property PREDEFINED_ATT_NAMES
 * (static) Holds predefined attribute names.
 * @type Object
 */
Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES = {};
/**
 * @property PREDEFINED_ATT_NAMES.ComponentContext
 * (static) Predefined attribute names for component contexts
 * (c.f <a
 * href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/runtimes/api#ComponentContext">Specification</a>)
 *
 * @type Object
 */
Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.ComponentContext = {
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
 * @property PREDEFINED_ATT_NAMES.Style
 * (static) Predefined attribute names for styles
 * (c.f <a
 * href="https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/runtimes/api#Style">Specification</a>)
 *
 * @type Object
 */
Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.Style = {
	WIDTH : "width",
	HEIGHT : "height",
	FFAMILY : "font-family",
	FSIZE : "font-size",
	FSTYLE : "font-style",
	FWEIGHT : "font-weight",
	COLOR : "color",
	BGCOLOR : "background-color",
	BORDERWIDTH : "border-width",
	BORDERCOLOR : "border-color",
	BORDERSTYLE : "border-style"
}; 