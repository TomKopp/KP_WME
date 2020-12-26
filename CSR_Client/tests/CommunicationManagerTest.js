describe("Testing the functionalities of the communication manager middleware component", function() {
	var _communicationManager = null;
	var _serverAddress = null;

	beforeEach(function() {
		_serverAddress = "ws://localhost:8082";
		_communicationManager = Documa.RuntimeManager.getCommunicationManager();
	});

	/**
	 * Testing the creation of a connection between client and server.
	 */
	it("should opens a connection to the server", function() {
		expect(_communicationManager).not.toBe(null);
		expect(_communicationManager).not.toBe(undefined);
		expect(_serverAddress).not.toBe(null);
		expect(_serverAddress).not.toEqual("");

		var handler = function(connectionstate) {
			expect(connectionstate).toBe(Documa.communication.ConnectionStates.Connected);
			_communicationManager.unregister(handler);
		};

		_communicationManager.register(handler);
		_communicationManager.open(_serverAddress);

		waits(5000);
	});

	/**
	 * Testing command message creation and sending functionality.
	 */
	it("shoud send a command message to the server", function() {
		expect(_communicationManager).not.toBe(null);
		expect(_communicationManager).not.toBe(undefined);

		var cfactory = new Documa.communication.commands.CommandFactory();
		expect(cfactory).not.toBe(null);
		expect(cfactory).not.toBe(undefined);

		var cmd = cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemCommands.PUBLISH, "Hello World!");
		expect(cmd).not.toBe(null);
		expect(cmd).not.toBe(undefined);

		_communicationManager.sendSystemLevelMessage(cmd);
	});

	/**
	 * Testing the closing operation to shutdown a connection.
	 */
	it("should shutdown a server connection", function() {
		var handler = function(connectionstate) {
			expect(connectionstate).toBe(Documa.communication.ConnectionStates.Closed);
			_communicationManager.unregister(handler);
		};
		expect(_communicationManager).not.toBe(null);
		expect(_communicationManager).not.toBe(undefined);

		_communicationManager.register(handler);
		_communicationManager.close();
		waits(1000);
	});
});
