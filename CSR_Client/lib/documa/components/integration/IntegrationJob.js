Ext.namespace("Documa.components.integration");

Documa.components.integration.CheckMarks = {
	RESOURCES: 1,
	INSTANTIATION: 2,
	COUPLING: 3,
	INITIALIZATION: 4,
	INJECTION: 5,
	ACTIVATION: 6
};

Documa.components.integration.IntegrationJob = Ext.extend(Object, (function(){
	return {
		/**
		 * Constructor.
		 *
		 * @param {String} id integration job id
		 * @param {String} type integration context type
		 * @param {Array} components set of component items
		 * @returns {void}
		 */
		constructor: function(id, type, components){
			this._id = id;
			this._components = components;
			this._successCb = null;
			this._failureCb = null;
			this._type = type;
			this._checklist = {};
			this._checklist[Documa.components.integration.CheckMarks.RESOURCES] = false;
			this._checklist[Documa.components.integration.CheckMarks.INSTANTIATION] = false;
			this._checklist[Documa.components.integration.CheckMarks.INITIALIZATION] = false;
			this._checklist[Documa.components.integration.CheckMarks.INJECTION] = false;
			this._checklist[Documa.components.integration.CheckMarks.ACTIVATION] = false;
		},

		getId: function(){
			return this._id;
		},

		getType: function(){
			return this._type;
		},

		check: function(checkmark){
			this._checklist[checkmark] = true;
		},

		uncheck: function(checkmark){
			this._checklist[checkmark] = false;
		},

		getCheckmark: function(checkmark){
			return this._checklist[checkmark];
		},

		getComponents: function(){
			return this._components;
		},

		setComponents: function(components){
			this._components = components;
		},

		/**
		 * @param {IntegrationSuccessCallback} successCb
		 */
		setSuccessCallback: function(successCb){
			this._successCb = successCb;
		},
		/**
		 * @returns {IntegrationSuccessCallback}
		 */
		getSuccessCallback: function(){
			return this._successCb;
		},

		/**
		 * @param {ErrorCallback} failureCb
		 */
		setFailureCallback: function(failureCb){
			this._failureCb = failureCb;
		},

		/**
		 * @returns {ErrorCallback}
		 */
		getFailureCallback: function(){
			return this._failureCb;
		}
	};
})());
