describe("Testing XMLRequestMessage Object", function() {

	var _xhr;
	var _serviceAccess = null;
	var	_commandFactory = null;
	var _communicationManager = null;
	

	var sendCommand = function(payload) {
		// create start app command object
		var startappcmd = _commandFactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemCommands.STARTAPP, payload);
		_communicationManager.sendSystemLevelMessage(startappcmd);
	};

	beforeEach(function(){
		_serviceAccess = Documa.RuntimeManager.getServiceAccess();
		_commandFactory = new Documa.communication.commands.CommandFactory();
		_communicationManager = Documa.RuntimeManager.getCommunicationManager();
	});


	it("creates non empty xmr object instances", function() {
		expect(_serviceAccess).not.toBe(null)
		expect(_serviceAccess).not.toBe(undefined);

		_xhr = _serviceAccess.createXHR();
		expect(_xhr).not.toBe(null);
		expect(_xhr).not.toBe(undefined);
	});

	it("should open connection to a distributed service and receive response", function() {
		expect(_commandFactory).not.toBe(null | undefined);
		expect(_xhr).not.toBe(null);
		expect(_xhr).not.toBe(undefined);

		// a small amount of time to let the client execute the handshake
		waits(2000);
		runs(function() {
			// send command to load travelmash application --> server-side service access is
			// only available when an application was instantiated
			sendCommand({
				id : 'sm1.10',
				version : '1.10.1351247002995',
				name : 'StockMash'
			});
		});

		// waits for application creation
		waits(3000);
		runs(function() {
			_xhr.open("POST", "http://api.geonames.org/postalCodeSearch?postalcode=9011&maxRows=10&username=demo");
			_xhr.onreadystatechange = function() {
				if (_xhr.readyState === 4 && _xhr.status === 200) {
					expect(_xhr.responseXML).not.toBe(null);
					expect(_xhr.responseXML).not.toBe(undefined);
				}
			};
			_xhr.send(null);

			waits(5000);
		});
	});

	it("should allow to call the external service via the HTTP Post-Method to retrieve data", function() {
		expect(_commandFactory).not.toBe(null | undefined);
		expect(_xhr).not.toBe(null);
		expect(_xhr).not.toBe(undefined);

		// a small amount of time to let the client execute the handshake
		waits(2000);
		runs(function() {
			// send command to load travelmash application --> server-side service access is
			// only available when an application was instantiated
			sendCommand({
				id : 'sm1.10',
				version : '1.10.1351247002995',
				name : 'StockMash'
			});
		});

		// waits for application creation
		waits(3000);
		runs(function() {
			_xhr.open("POST", "http://api.geonames.org/postalCodeSearch?postalcode=9011&maxRows=10&username=demo");
			_xhr.onreadystatechange = function() {
				if (_xhr.readyState === 4 && _xhr.status === 200) {
					expect(_xhr.responseXML).not.toBe(null);
					expect(_xhr.responseXML).not.toBe(undefined);
				} else if (_xhr.readyState === 4) {
					expect(_xhr.status).toBe(0);
				}
			};
			_xhr.send(null);
			waits(5000);
		});
	});

	it("should allow synchronous response handling", function() {
		expect(_commandFactory).not.toBe(null | undefined);
		expect(_xhr).not.toBe(null);
		expect(_xhr).not.toBe(undefined);

		_communicationManager.open("ws://localhost:8082");

		// a small amount of time to let the client execute the handshake
		waits(2000);
		runs(function() {
			// send command to load travelmash application --> server-side service access is
			// only available when an application was instantiated
			sendCommand({
				id : 'tm1.10',
				version : '1.10.1351247002995',
				name : 'TravelMash'
			});
		});

		// waits for application creation
		waits(3000);
		runs(function() {
			var xhr = _serviceAccess.createXHR();
			xhr.open("GET", "http://api.geonames.org/postalCodeSearch?postalcode=9011&maxRows=10&username=demo", false);
			xhr.onreadystatechange = function() {
				if (_xhr.readyState === 4 && _xhr.status === 200) {
					expect(_xhr.responseXML).not.toBe(null);
					expect(_xhr.responseXML).not.toBe(undefined);
				}
			};
			xhr.send(null);
			waits(5000);
		});
	});
});
