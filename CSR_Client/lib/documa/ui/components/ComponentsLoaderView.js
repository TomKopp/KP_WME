Ext.namespace("Documa.ui.components");

Documa.ui.components.ComponentsLoaderView = Ext.extend(Object, (function() {

	var TAG = "Documa.ui.components.ComponentsLoaderView";
	var _log = Documa.util.Logger;
	var loadingSprites = [" | ", " / ", " -- ", " \ "];

	return {
		constructor : function() {
			Documa.ui.components.ComponentsLoaderView.superclass.constructor.call(this);

			this._progressItemList = new Ext.form.FormPanel({
				title : 'Components loading progress',
				autoScroll : 'true'
			});

			this._dialog = new Ext.Window({
				width : 400,
				height : 300,
				resizable : true,
				layout : 'fit',
				autoScroll : 'true',
				modal : true,
				showAnimDuration : 1,
				animCollapse : true,
				items : this._progressItemList
			});
		},

		/**
		 * Renders progress item list into given panel element.
		 *
		 * @param {Ext.Panel} optional parent element
		 */
		show : function(panel) {
			this._dialog.show(panel);
		},

		/**
		 * Closes progress list element.
		 */
		close : function() {
			this._dialog.close();
		},
		
		/**
		 * Hides progress list element. 
		 */
		hide : function() {
			this._dialog.hide();
		},

		/**
		 * Shows component loading state during the component integration process.
		 * @param {Documa.components.ComponentLoadingState} componentLoadingState
		 */
		addLoadingStateObject : function(componentLoadingState) {
			var cid = componentLoadingState.getComponentId();
			var instid = componentLoadingState.getInstanceId();
			_log.debug(TAG, "... adding component: " + instid + "#" + cid);

			// creating progressbar item for component instance
			var progressItem = new Ext.ProgressBar({
				fieldLabel : instid,
				height : 20,
				animate : false,
				text : cid
			});

			this._progressItemList.add(progressItem);
			this._progressItemList.doLayout();
			this._dialog.doLayout();

			var self = this;

			// add handler for event
			componentLoadingState.addListener(Documa.components.ComponentLoadingStateEvents.PROGRESSCHANGED, function(newvalue) {
				_log.debug(TAG, "... " + instid + "#" + cid + " loading ... " + newvalue);
				progressItem.updateProgress(newvalue, Math.round(100 * newvalue) + "% ... resources loaded", false);
				self._progressItemList.doLayout();
				self._dialog.doLayout();
			});
		}

	};
})());
