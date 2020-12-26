Ext.namespace('Documa.ui.authentication');
Documa.require('Documa.util.Logger');
Documa.require('Documa.authentication.AuthenticationManager');

Documa.ui.authentication.ErrorPanel = Ext.extend(Object, ( function() {
		/* private members */
		var TAG = 'Documa.ui.authentication.ErrorPanel';
		var _log = Documa.util.Logger;

		var _authenticationManager = null;
		var _errorPanel = null;

		return {
			constructor : function(controller) {
				_authenticationManager = controller;

				_errorPanel = new Ext.Window({
					title : 'Error',
					layout : {
						align : 'stretch',
						type : 'vbox'
					},
					id : '_errorPanel',
					autoScroll : false,
					width : 280,
					height : 120,
					modal : true,
					shadow : false,
					maximizable : false,
					maximized : false,
					resizable : false,
					draggable : false,
					closable : true,
					closeAction : 'hide', //replace close action with hide
					//padding: '5',
					hidden : true,
					items : [{
						xtype : 'container',
						id : 'ep_error',
						cls : 'alert alert-error',
						layout : 'fit',
						padding : '5',
						flex : 1
					}]
				});
			},

			/**
			 * Function to show Error Message
			 *
			 * @param errorTxt String passed error text
			 */
			show : function(errorTxt) {
				_errorPanel.show();
				Ext.getCmp('ep_error').update(errorTxt);
			},

			hide : function() {
				_errorPanel.hide();
			},

			close : function() {
				_errorPanel.close();
			}

		};
	}())); 