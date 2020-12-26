describe("Testing the application loading procedure", function() {

	var _communicationManager = null;
	var _commandFactory = null;
	var _componentManager = null;
	var _log = null;

	var sendCommand = function(payload) {
		// create start app command object
		var startappcmd = _commandFactory.create(
			Documa.communication.MessageFieldValues.SYS_LEVEL, 
			Documa.communication.commands.SystemCommands.STARTAPP, 
			payload);

		_communicationManager.sendSystemLevelMessage(startappcmd);
	};

	beforeEach(function() {
		_communicationManager = Documa.RuntimeManager.getCommunicationManager();
		_commandFactory = new Documa.communication.commands.CommandFactory();
		_componentManager = Documa.RuntimeManager.getComponentManager();
		_log = Documa.util.Logger;
	});

	/**
	 * Testing application loading procedure and server-side response messages
	 */
	it("should send a start application command message via the CommunicationManager", function() {
		expect(_communicationManager).not.toBe(null);
		expect(_communicationManager).not.toBe(undefined);

		expect(_commandFactory).not.toBe(null);
		expect(_commandFactory).not.toBe(undefined);

		expect(_componentManager).not.toBe(null);
		expect(_componentManager).not.toBe(undefined);

		// opens connection to the server
		_communicationManager.open("ws://localhost:8082");

		// waiting for server response
		waits(3000);
		runs(function() {

			var handler = _componentManager.onAllResourcesLoaded;
			// attach handler to component manager
			_componentManager.onAllResourcesLoaded = function(resources, components, containers) {
				// TODO: test internal members to have assigned expected
				// values, e. g. count of application components

				expect( resources instanceof Array).toBe(true);
				expect( components instanceof Object).toBe(true);
				expect( containers instanceof Array).toBe(true);

				// test count of available component containers
				expect(containers.length).toBe(9);

				// test count of different component classes - there are o multiple instances of the same component
				var count = 0;
				for (var cmp in components) {
					expect(cmp).not.toBe(null | undefined); ++count;
				}

				expect(count).toBe(9);
				
				if(handler)
					handler(resources, components, containers);
			};

			// send command to load travelmash application
			sendCommand({
				id : 'tm1.10',
				version : '1.10.1351247002995',
				name : 'TravelMash'
			});

			// wait for response
			waits(5000);
			runs(function() {
				// close each open connection with the csr server
				_communicationManager.close();
				waits(1500);
			});
		});
	});
});
