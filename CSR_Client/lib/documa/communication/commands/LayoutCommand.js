Ext.namespace('Documa.communication.commands');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.AbsoluteLayout');
Documa.require('Documa.ui.layout.View');

Documa.communication.commands.LayoutCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.LayoutCommand";
	var _payload = null;
	var _log = Documa.util.Logger;

	return {
		constructor : function(message) {
			Documa.communication.commands.LayoutCommand.superclass.constructor.call(this);
			_payload = message.getPayload();
		},

		destructor : function() {
			_log.debug(TAG, "... destructing");
			delete _payload;
			_payload = null;
		},

		execute : function() {
			try {
				var layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();

				var initviewName = _payload.initview;
				var views = new Array();

				for (var i = 0; i < _payload.views.length; ++i) {
					var curView = _payload.views[i];

					var layoutObj = null;

					// create layout instance from received payload according to its layout type
					switch(curView.layout.type) {
						case "AbsoluteLayout":
							layoutObj = new Documa.ui.layout.AbsoluteLayout(curView.layout);
							break;
						case "FillLayout":
							throw new Error("Not supported yet.");
						case "TabLayout":
							throw new Error("Not supported yet.");
						case "GridLayout":
							throw new Error("Not supported yet.");
					}

					if (!layoutObj) {
						throw new Error("Could not create a layout object.");
					}

					// create view object from its name and related layout object and add it into
					// list
					views.push(new Documa.ui.layout.View(curView.name, layoutObj));
				}

				// initialize layout manager
				layoutManager.initialize(initviewName, views);
			} catch(error) {
				_log.error(TAG,"... error during layouting {"+error+"}");
			}
		}

	};
})());