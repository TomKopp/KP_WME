describe("Test functions of LayoutManager", function() {
	var _communicationManager = null;
	var _layoutManager = null;
	var _commandFactory = null;

	/**
	 * Helper method to test the given position layout element.
	 *
	 * @param {Documa.layout.Position} position layout element
	 */
	var testPositionElement = function(position) {
		var unit = position.getUnit();
		var instid = position.getComponentInstanceId();
		var origin = position.getOrigin();
		var bounds = position.getBounds();

		expect(unit).toBe("pixel");

		expect(instid).not.toBe(null);
		expect(instid).not.toBe(undefined);
		expect(instid.length).toBeGreaterThan(0);

		expect(origin).not.toBe(null);
		expect(origin).not.toBe(undefined);
		expect(origin.x).toBeGreaterThan(0);
		expect(origin.y).toBeGreaterThan(0);

		expect(bounds).not.toBe(null);
		expect(bounds).not.toBe(undefined);
		expect(bounds.width).toBeGreaterThan(0);
		expect(bounds.height).toBeGreaterThan(0);
	};

	/**
	 * Helper method to test the given layout element.
	 *
	 * @param {Documa.layout.Layout} layout descriptor object that contains layout
	 * information
	 */
	var testLayout = function(layout) {

		// testing layout instance
		expect( layout instanceof Documa.layout.Layout).toBe(true);

		// testing agility
		expect(layout.isAgile()).toBe(false);

		// testing name
		expect(layout.getName()).not.toBe(null);
		expect(layout.getName()).not.toBe(undefined);
		expect(layout.getName().length).not.toBeLessThan(1);

		// testing styles
		expect(layout.getStyles()).not.toBe(null);
		expect(layout.getStyles()).not.toBe(undefined);
		expect(layout.getStyles().length).toBe(0);

		// testing position elements
		if ( layout instanceof Documa.layout.AbsoluteLayout) {
			expect(layout.getPositions()).not.toBe(null);
			expect(layout.getPositions()).not.toBe(undefined);
			expect(layout.getPositions().length).toBeGreaterThan(0);

			for (var i = 0; i < layout.getPositions().length; ++i) {
				var pos = layout.getPositions()[i];
				testPositionElement(pos);
			}
		}
	};

	/**
	 * Helper method to send a STARTAPP command to the server-side.
	 * @param {Object} payload
	 */
	var startApplication = function(payload) {
		// create start app command object
		var startappcmd = _commandFactory.create(
			Documa.communication.MessageFieldValues.SYS_LEVEL, 
			Documa.communication.commands.SystemCommands.STARTAPP, 
			payload);

		_communicationManager.sendSystemLevelMessage(startappcmd);
	};

	beforeEach(function() {
		_communicationManager = Documa.RuntimeManager.getCommunicationManager();
		_layoutManager = Documa.RuntimeManager.getLayoutManager();
		_commandFactory = new Documa.communication.commands.CommandFactory();
	});

	it("should register all possible views and related layouts", function() {
		expect(_communicationManager).not.toBe(null);
		expect(_communicationManager).not.toBe(undefined);
		expect(_layoutManager).not.toBe(null);
		expect(_layoutManager).not.toBe(undefined);
		
		var called = false;

		// set onInitialized event handler
		_layoutManager.onInitialized = function(view) {
			var views = _layoutManager.getViews();
			var curView = _layoutManager.getCurrentView();
			var initView = _layoutManager.getInitialView();

			// definition of initialization expectations
			expect(views).not.toBe(null);
			expect(views).not.toBe(undefined);
			expect(views.length > 0).toBe(true);

			expect(view).toEqual(curView);
			expect(view).toEqual(initView);
			expect(curView).toEqual(initView);

			for (var i = 0; i < views.length; ++i) {
				var v = views[i];

				// test view element
				var viewName = v.getName();
				expect(viewName).not.toBe(null);
				expect(viewName).not.toBe(undefined);

				var layout = v.getLayout();
				expect(layout).not.toBe(null);
				expect(layout).not.toBe(undefined);

				// testing layout element
				testLayout(layout);
				called = true;
			}
		};

		// let the client and server do the handshake and open the connection
		waits(3000);
		runs(function() {
			// send load application command to trigger the sending and receiving process of
			// layout information
			startApplication({
				id : 'tm1.10',
				version : '1.10.145124800000',
				name : 'TravelMash'
			});
		});

		waits(6000);
		runs(function() {
			expect(called).toBe(true);
		});
	});
});
