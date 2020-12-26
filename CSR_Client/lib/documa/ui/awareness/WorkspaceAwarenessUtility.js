Ext.namespace('Documa.ui.awareness');

Documa.require('Documa.util.Logger');


/**
 * @class
 */
Documa.ui.awareness.WorkspaceAwarenessUtility = Ext.extend(Object, ( function(){
	var TAG = 'Documa.ui.awareness.WorkspaceAwarenessUtility';
	var _log = Documa.util.Logger;

	var _stackStyle = null;

	var setStackStyle = function(style){
		_stackStyle = style;
	};

	var getStackStyle = function(){
		return _stackStyle;
	};

	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			// configure Pines Notify Framework for workspace awareness information
			$.pnotify.defaults.history = false;
			$.pnotify.defaults.delay = 2500;
			setStackStyle({
				"dir1": "up",
				"dir2": "left",
				"firstpos1": 25,
				"firstpos2": 25
			});
		},

		initialize: function(){

		},

		notify: function(text){
			//use Pines Notify Framework to show notification
			$.pnotify({
				text: text,
				opacity: .8,
				addclass: 'basicNotification',
				// stack: getStackStyle()
			});
		}

	};
}()));
