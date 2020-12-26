Ext.namespace('Documa.communication.protocol');

Documa.communication.protocol.Operation = Ext.extend(Object, (function(){
	
	function validate(jsonObj){
		if(jsonObj.component && jsonObj.opname && jsonObj.params){
			return true;
		}
		throw new Error("Invalid payload object defined as initial state transition operation.");
	};
	
	return {
		constructor : function(jsonObj){
			validate(jsonObj);
			
			this._cinstid = jsonObj.component;
			this._name = jsonObj.opname;
			this._params = jsonObj.params;
		},
		
		/**
		 * Returns operation name.
		 * 
		 * @return {String} name of operation
		 */
		getName : function(){
			return this._name;
		},
		
		
		/**
		 * Returns the instance id of corresponding component.
		 * 
		 * @return {String} component instance id
		 */
		getComponentInstanceId : function(){
			return this._cinstid;
		},
		
		/**
		 * Returns associative array of sorted and named operation parameter names and values.
		 * 
		 * @return {Object} parameter name-value-pairs
		 */
		getParameters : function(){
			return this._params;
		}
	};
})());
