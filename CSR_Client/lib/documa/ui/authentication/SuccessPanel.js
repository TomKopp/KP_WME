Ext.namespace('Documa.ui.authentication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.authentication.AuthenticationManager');

Documa.ui.authentication.SuccessPanel = Ext.extend(Object, ( function() {
		/* private members */
		var TAG = 'Documa.ui.authentication.SuccessPanel';
		var _log = Documa.util.Logger;

		var _authenticationManager = null;
		var _successPanel = null;

		return {
			constructor : function(controller) {
				_authenticationManager = controller;

				_successPanel = new Ext.Window({
					title : 'Success',
					layout : {
						align : 'stretch',
						type : 'vbox'
					},
					id : '_successPanel',
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
						id : 'ep_success',
						cls : 'alert alert-success',
						layout : 'fit',
						padding : '5',
						flex : 1
					}],
				});
			},

			/**
			 * Function to show success message
			 *
			 * @param successTxt String passed error text
			 */
			show : function(successTxt) {
				_successPanel.show();
				Ext.getCmp('ep_success').update(successTxt);
			},

			hide : function() {
				_successPanel.hide();
			},

			close : function() {
				_successPanel.close();
			}

		};
	}())); 