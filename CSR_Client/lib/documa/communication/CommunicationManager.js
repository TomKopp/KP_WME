Ext.namespace('Documa.communication');

Documa.require('Documa.communication.Message');
Documa.require('Documa.communication.commands.SystemCommand');
Documa.require('Documa.communication.commands.CommandFactory');

Documa.require('Documa.authentication.AuthenticationManager');
Documa.require('Documa.RuntimeManager');

Documa.require('Documa.plugins.CommunicationPlugin');
Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');

Documa.communication.ConnectionStates = {
	Connected: 1,
	Closed: 2,
	Failure: 3
};

/**
 * @class Documa.communication.CommunicationManager
 *
 * This class encapsulates the communication and transport layer of the
 * client-side runtime environment.
 *
 * @namespace Documa.communication
 * @singleton
 */
Documa.communication.CommunicationManager = Ext.extend(Object, (function(){
	var TAG = 'Documa.communication.CommunicationManager';

	var SERVER_HANDSHAKE_DEST = "/topic/csr.handshake.server";
	var CLIENT_HANDSHAKE_DEST = "/queue/csr.handshake.client";

	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	var _endpoint = null;
	var _cfactory = new Documa.communication.commands.CommandFactory();
	var _efactory = new Documa.communication.events.EventFactory();
	var _clientID = -1;
	var _observers = [];
	var _authenticationManager = null;
	var _runtimeManager = null;

	var _sysLevelDest = null;
	var _appLevelDest = null;
	var _descriptor = null;
	var _reqType = null;
	var _userID = null;
	var _userPwd = null;
	var _userName = null;
	var _passphrase = null;
	var _userPic = null;

	/* private methods */

	/**
	 * Helper method to validate the availability of the endpoint.
	 */
	var checkEndpoint = function(){
		if (_endpoint == null)
			throw new Error("Communication endpoint not initialised! No communication possible!");
	};

	/**
	 * Helper method to validate the send state of the endpoint.
	 */
	var checkSendEndpoint = function(){
		if (!_endpoint.isConnected())
			throw new Error("Could not send any message, cause no connection is established!");
	};

	/**
	 * This callback function is called after the connection between client and
	 * server could be opened successfully.
	 */
	var onConnectionOpened = function(){
		_log.debug(TAG, "Connection with server established!");

		// add here additional connection logic, e.g. fire client wide event
		fireConnectionStateChange(Documa.communication.ConnectionStates.Connected);
	};

	/**
	 * Is called after a connection error ocurred.
	 *
	 * @param {Object} warn
	 *                      Connection error data.
	 */
	var onConnectionError = function(error){
		_log.error(TAG, "Connection error: " + error);

		fireConnectionStateChange(Documa.communication.ConnectionStates.Failure, error);
	};

	/**
	 * Is called after the connection was closed.
	 */
	var onConnectionClosed = function(){
		_log.debug(TAG, "Connection closed!");

		fireConnectionStateChange(Documa.communication.ConnectionStates.Closed);
	};

	/**
	 * This callback function is executed after the handshake response was
	 * received successfully.
	 * It creates the subscription to client specific server side message queues,
	 * which are
	 * described within the handshake response message.
	 *
	 * @param {Object} response
	 *                          handshake response message as stomp frame
	 */
	var onHandShakeResponse = function(response){
		_log.debug(TAG, "Handshake response: " + response);
		_endpoint.clearWaitingOnHandshake();

		_runtimeManager = Documa.RuntimeManager;
		_authenticationManager = _runtimeManager.getAuthenticationManager();

		// check response content
		var hs_response = response.body;
		if (!hs_response) {
			onConnectionError("Received empty handshake response!");
			return;
		}

		var respObj = Ext.decode(hs_response);

		// get message payload
		var payload = new Documa.communication.Message(respObj).getPayload();

		// Distinguish between authentication types
		var resType = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_RES_TYPE];
		var authPl = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_AUTH_PL];
		_log.debug("Response Type: " + resType);

		// function calls depending on the response
		var types = {
			'autherror': function(){
				_authenticationManager.onAuthError(authPl);
			},
			'successfulregister': function(){
				_authenticationManager.onSuccessfulRegister();
			},
			'successfullogin': function(){
				finishHandshake(payload);
			},
			'successfulverification': function(){
				_authenticationManager.onSuccessfulVerification(authPl);
			},
			'successfulpasswordreset': function(){
				_authenticationManager.onSuccessfulPwdReset();
			},
			'usernametaken': function(){
				_authenticationManager.onUsernameTaken();
			},
			'unconfirmedmail': function(){
				_authenticationManager.onUnconfirmedMail();
			}

		};

		if (types[resType]) {
			types[resType]();
		} else {
			types["autherror"]();
		}
	};

	var finishHandshake = function(payload){
		_log.debug(TAG, "... finishing handshake ...");
		// get client connection data from handshake response
		_clientID = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_CID_HEADER];

		// get system & application level channel ids from handshake message
		_sysLevelDest = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_SLIN_HEADER];
		_appLevelDest = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_ALIN_HEADER];
		_log.debug(TAG, "... system level destination: " + _sysLevelDest);
		_log.debug(TAG, "... application level destination: " + _appLevelDest);

		var syslvlout = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_SLOUT_HEADER];
		var applvlout = payload[Documa.communication.events.HandshakeResponse.HANDSHAKE_ALOUT_HEADER];

		// loading of runtime context ready
		_log.debug(TAG, "... client ID: " + _clientID);

		// register the system message handler
		_endpoint.subscribe(syslvlout, onSystemMessage);
		_log.debug(TAG, "... system message handler registered to message queue: " + syslvlout);

		// register the application message handler
		_endpoint.subscribe(applvlout, onApplicationMessage);
		_log.debug(TAG, "... application message handler registered to message queue: " + applvlout);

		// calling onconnection opened handler
		onConnectionOpened();
		_log.debug(TAG, "... handshake finished!");
	};

	/**
	 * Called after an application message was received. Each message is addressing a specific application context.
	 *
	 * @param {Documa.communication.Message} message message object addressing a specific application context
	 */
	var onApplicationMessage = function(message){
		_log.debug(TAG, "Incoming application message: " + message.body);

		try {
			// get message payload
			var msgObj = new Documa.communication.Message(Ext.decode(message.body));

			// get message type
			var type = message.headers[Documa.communication.MessageFields.TYPE];
			switch (type) {
				case Documa.communication.MessageTypes.EVENT_MSG_TYPE:
					// create event message from payload
					var evt = _efactory.createEvent(msgObj);
					if (!evt) {
						// no event defined for this message
						_log.warn(TAG, "... not defined server-side event!");
						return;
					}
					if (evt instanceof Documa.communication.events.ApplicationEvent) {
						// TODO: determine matching application context from application parameters
						var appcontext = Documa.RuntimeManager.getApplicationContext();
						if (appcontext) {
							// publish event to match application context
							appcontext.getEventDispatcher().dispatchEvent(evt);
						}
					}
					// dispatch event to middleware components
					Documa.RuntimeManager.getEventDispatcher().dispatchEvent(evt);
					break;
				case Documa.communication.MessageTypes.COMMAND_MSG_TYPE:
					// create executable command here
					var command = _cfactory.createExecutable(msgObj);
					if (command) {
						command.execute();

						// release consumed resources
						Documa.release(command);
					} else {
						_log.error(TAG, "... could not create command message from message: " + message.body);
					}
					break;
			}
		} catch (error) {
			_log.error(TAG, error.stack);
		}
	};

	/**
	 * Handler is called after the given message was received by the
	 * communication endpoint.
	 *
	 * @param {String} message
	 *                          json string from the server side
	 */
	var onSystemMessage = function(message){
		_log.debug(TAG, "Incoming system message: " + message.body);
		try {
			var msgObj = new Documa.communication.Message(Ext.decode(message.body));
			// get message type
			var type = message.headers[Documa.communication.MessageFields.TYPE];
			switch (type) {
				case Documa.communication.MessageTypes.EVENT_MSG_TYPE:
					// message is an event
					// create event message from payload
					var evt = _efactory.createEvent(msgObj);
					if (!evt)// no event defined for this message
						return;
					// dispatch event to middleware components
					Documa.RuntimeManager.getEventDispatcher().dispatchEvent(evt);
					break;
				// eof event message handling
				case Documa.communication.MessageTypes.COMMAND_MSG_TYPE:
					// message is command
					// create executable command here
					var command = _cfactory.createExecutable(msgObj);
					if (command) {
						// performs inherent process
						command.execute();
						// release consumed resources
						Documa.release(command);
					} else {
						_log.error(TAG, "... could not create command message from message: " + message.body);
					}
					break;
				// eof command message handling
			}
		} catch (error) {
			_log.error(TAG, error.stack);
		}
	};

	/**
	 * Fires new connection state to each observer.
	 */
	var fireConnectionStateChange = function(state, data){
		for (var i = 0; i < _observers.length; ++i){
			_observers[i](state, data);
			// call observers callback
		}
	};

	/**
	 * Helper method to individualize the given client runtime descriptor.
	 *
	 * @param {DOMElement} descriptor client runtime descriptor to individualize
	 */
	var individualizeDescriptor = function(descriptor){
		var dom_descr = _util.parseXMLFromString(descriptor);
		var desktop_query = "//*[@rdf:about=\"" + DESKTOP_INDIVIDUAL + "\"]";
		var csr_query = "//*[@rdf:about=\"" + CSR_INDIVIDUAL + "\"]";

		var resolver = function(prefix){
			if (prefix === "rdf") {
				return RDF_NS;
			}
			return null;
		};

		var d_result = dom_descr.evaluate(desktop_query, dom_descr.documentElement, resolver, XPathResult.ANY_TYPE, null);
		var d_elem = d_result.iterateNext();

		var c_result = dom_descr.evaluate(csr_query, dom_descr.documentElement, resolver, XPathResult.ANY_TYPE, null);
		var c_elem = c_result.iterateNext();

		// getting timebased uuid
		var uuid = window.uuid.v1();
		d_elem.setAttribute("rdf:about", DESKTOP_INDIVIDUAL + "-" + uuid);
		c_elem.setAttribute("rdf:about", CSR_INDIVIDUAL + "-" + uuid);

		var result = _util.serializeXML(dom_descr);

		// remove whitespaces
		result = result.replace(/\s{2}/g, "");
		_log.debug(TAG, "... count of descriptor chars: " + result.length);

		return result;
	};

	return {

		/**
		 * Call this method to register the callback method of an object that
		 * wants to observer
		 * the connection state of the CommunicationManager.
		 *
		 * @param {Function} callback
		 *                            callback of the observer object
		 */
		register: function(callback){
			if (!callback instanceof Function)
				throw new Error("Invalid observer argument!");

			_observers.push(callback);
		},

		/**
		 * Unregister given observer callback.
		 *
		 * @param {Function} callback
		 *                            callback to unregister
		 */
		unregister: function(callback){
			for (var i = 0; i < _observers.length; ++i){
				if (_observers[i] === callback) {
					_observers.splice(i, 1);
					return;
				}
			}
		},

		/**
		 * Call this method to instantiate and initialize the communication
		 * resources.
		 *
		 * @param {String} descriptor runtime descriptor in string format
		 */
		init: function(reqtype, userid, userpwd, username, passphrase, pic, descriptor){
			_endpoint = new Documa.communication.StompWSEndpoint();
			_descriptor = Documa.RuntimeManager.getRuntimeContext().individualizeDescriptor(descriptor);
			_reqType = reqtype;
			_userID = userid;
			_userPwd = userpwd;
			_userName = username;
			_passphrase = passphrase;
			_userPic = pic;
		},

		/**
		 * Opens connection to the given server.
		 *
		 * @param {String} path server path
		 */
		open: function(path){
			_log.debug(TAG, 'Opening connection to path: ' + path);
			checkEndpoint();

			// define handler that is called after the server was contacted
			// successfully
			var serverResponded = function(){
				_log.debug(TAG, "Server contacted ... ");

				// execute handshake with the server
				_endpoint.handshake(SERVER_HANDSHAKE_DEST, CLIENT_HANDSHAKE_DEST,
					_reqType, _userID, _userPwd, _userName, _passphrase, _userPic, _descriptor,
					onHandShakeResponse, onConnectionError);
			};

			_endpoint.open(path, serverResponded, onConnectionError);
		},

		/**
		 * Send message from system level to the server.
		 *
		 * @param {Documa.communication.Message} message content containing message object
		 */
		sendSystemLevelMessage: function(message){
			if (_endpoint == null)
				throw new Error("Communication endpoint not initialised! No communication possible!");
			if (!_endpoint.isConnected())
				throw new Error("Could not send any message, cause no connection is established!");
			// inject clientid
			message.setSenderId(_clientID);
			_log.debug(TAG, 'Sending message:' + message.toString());
			// send message to the server
			_endpoint.send(_sysLevelDest, message);
		},

		/**
		 * Send message from application level to the server.
		 *
		 * @param {Documa.communication.Message} message content containing
		 * message object
		 */
		sendApplicationLevelMessage: function(message){

			if (_endpoint == null)
				throw new Error("Communication endpoint not initialised! No communication possible!");

			if (!_endpoint.isConnected())
				throw new Error("Could not send any message, cause no connection is established!");

			// inject clientid
			message.setSenderId(_clientID);

			_log.debug(TAG, 'Sending message:' + message.toString());

			// send message to the server
			_endpoint.send(_appLevelDest, message);
		},

		/**
		 * Closes connection to the server.
		 */
		close: function(){
			_log.debug(TAG, "... closing connection to server!");
			checkEndpoint();
			_endpoint.close(_sysLevelDest, onConnectionClosed);
		},

		/**
		 * Returns the client id number.
		 *
		 * @return {String} client id as an alpha numeric value
		 */
		getClientID: function(){
			return _clientID;
		}

	};
})());

/**
 * Use this class in a browser runtime environent that supports websocket
 * communication directly.
 */
Documa.communication.StompWSEndpoint = Ext.extend(Object, (function(){
	/* private attributes */
	var TAG = "Documa.communication.StompWSEndpoint";
	var _log = Documa.util.Logger;
	var _client = null;
	var _login = "";
	var _password = "";
	var _connected = false;
	var _cfactory = new Documa.communication.commands.CommandFactory();
	var _waitingId = undefined;
	var _self = null;

	var HANDSHAKE_TIMEOUT = 60000;

	/* private methods */
	var checkSendArguments = function(destination, message){
		if (!_connected)
			throw new Error("Could not send any message, cause no connection is established!");

		if (destination == undefined || destination == null)
			throw new Error("Could not send any message, because no destination was specified!");

		if (message == undefined || message == null)
			throw new Error("Could not send any message, because no message was specified!");

		if (!( message instanceof Documa.communication.Message))
			throw new Error("Message datatype is not supported!");
	};

	/* public members */
	return {
		/**
		 * Ctor.
		 * @constructor
		 */
		constructor: function(){
			Documa.communication.StompWSEndpoint.superclass.constructor.call(this);
			_self = this;
		},

		URL: "ws://localhost:61614",

		/**
		 * Establish the connection with the server.
		 *
		 * @param {String} path server path
		 * @param {Function} successCb Callback function that is called after a
		 *            connection could be established successfully.
		 * @param {Function} errorCb Callback function that is called if a failure
		 *            occurs during the connection setup procedure.
		 */
		open: function(path, successCb, errorCb){
			try {
				// Stomp.WebSocketClass = SockJS;
				_client = Stomp.client(path);

				// configuration of heart beats
				_client.heartbeat.outgoing = 0;
				_client.heartbeat.incoming = 0;
				// remove debug messages
				_client.debug = null;

				// just for debugging
				//_client.debug = function(str){
				//	_log.debug(TAG, str);
				//};

				_client.connect(_login, _password, function(){
					_connected = true;
					successCb();
				}, function(error){
					errorCb(error);
					_connected = false;
					_self.clearWaitingOnHandshake();
				});
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Execute handshake procedure with the server.
		 *
		 * @param {String} server_dest server handshake destination (sender)
		 * @param {String} client_dest client handshake destination (receiver)
		 * @param {String} reqtype tells the server if this is a login or a register call
		 * @param {String} userid the id of the user
		 * @param {String} userpwd the password of the user as md5 hash
		 * @param {String} username name of the user (empty for login)
		 * @param {String} descriptor runtime description content
		 * @param {Function} successCb callback function executed after successful
		 * subscription to hs destination
		 * @param {Function} failureCb callback function executed on failure
		 */
		handshake: function(server_dest, client_dest, reqtype, userid, userpwd, username, passphrase, userpic, descriptor, successCb, failureCb){
			// subscribe to the server side handshake destination to receive the
			// handshake response
			var subscription = _client.subscribe(client_dest, function(message){
				// acknowledge subscription
				_client.ack(message.headers['message-id'], subscription.id);
				// unsubscribe from handshake message queue
				subscription.unsubscribe();
				// is called after the handshake was process successfully on the
				// serverside
				successCb(message);
			}, {ack: "client"});

			// define handshake timeout handler --> client did not receive any handshake
			// response
			var onHandshakeTimeout = function(){
				_log.debug(TAG, "... handshake timeout.");
				failureCb(new Error("Timeout on handshake"));
			};

			// create handshake payload object that carries the runtime descriptor and the
			// user id
			var payload = {
				descriptor: descriptor,
				reqtype: reqtype,
				userid: userid,
				userpwd: userpwd,
				username: username,
				passphrase: passphrase,
				userpic: userpic
			};

			// after the connection was opened the client should handshake with
			// the server
			var handshakeCmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemCommands.HANDSHAKE, payload);
			handshakeCmd.setSenderId(Documa.communication.MessageFieldValues.SENDR_DOCUMA_CLIENT);

			// send handshake command to the server
			this.send(server_dest, handshakeCmd);

			// start waiting for 5 seconds on handshake response
			_waitingId = setTimeout(onHandshakeTimeout, HANDSHAKE_TIMEOUT);
		},

		/**
		 * This method should be called to clear the handshake timeout.
		 */
		clearWaitingOnHandshake: function(){
			clearTimeout(_waitingId);
			_log.debug(TAG, "... handshake timeout cleared.");
		},

		/**
		 * Send the given message to the given destination.
		 *
		 * @param {String} destination string value represents the serverside
		 *            destination object, e.g. the handshake queue
		 * @param {Documa.communication.Message} message message object
		 */
		send: function(destination, message){
			checkSendArguments(destination, message);

			var msg_headers = {};
			msg_headers[Documa.communication.MessageFields.MSG_TAG] = message.getMessageTag();
			msg_headers[Documa.communication.MessageFields.TIMESTAMP] = message.getTimestamp();

			if (message instanceof Documa.communication.events.Event) {
				msg_headers[Documa.communication.MessageFields.TYPE] = Documa.communication.MessageTypes.EVENT_MSG_TYPE;
			} else if (message instanceof Documa.communication.commands.Command) {
				msg_headers[Documa.communication.MessageFields.TYPE] = Documa.communication.MessageTypes.COMMAND_MSG_TYPE;
			} else {
				throw new Error("Unknown message type used!");
			}

			var data = JSON.stringify(message.getPayload());
			_client.send(destination, msg_headers, data);
		},

		/**
		 * Returns boolean value that represents the connection state with the
		 * server.
		 *
		 * @return {boolean}
		 */
		isConnected: function(){
			return _connected;
		},

		/**
		 * Closes the connection with the server.
		 */
		close: function(destination, callback){
			try {
				var close_cmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
					Documa.communication.commands.SystemCommands.DISCONNECT, null);

				this.send(destination, close_cmd);

				setTimeout(function(){
					_client.disconnect(function(){
						_connected = false;
						_log.debug(TAG, "Connection between client and server closed!");
						callback();
					});
				}, 100);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Method unregisters from the common handshake message queue.
		 * It should be called after the handshake response was received
		 * successfully.
		 *
		 * @param {String} id
		 *                      destination id to unsubscribe from
		 */
		unsubscribe: function(id){
			// unregister from the handshake message queue
			_client.unsubscribe(id);
		},

		/**
		 * Subscribe to serverside destination for receiving messages from the
		 * server.
		 *
		 * @param {String} destination
		 *                              name of the server side message
		 * destination
		 * @param {Function} callback
		 *                              handler that is called on receiving
		 * messages from the server
		 */
		subscribe: function(destination, callback){
			_log.debug(TAG, "Subscribe to destination: " + destination);
			var sub = _client.subscribe(destination, function(message){
				callback(message);

				// acknowledge the message reception
				_client.ack(message.headers['message-id'], sub.id);
			}, {
				ack: 'client'
			});
		}

	};
})());

Documa.communication.CordovaEndpoint = (function(){

	var TAG = "Documa.communication.CordovaEndpoint";

	/* private members */
	var _connected = false;
	var _nativeLayer = new Documa.plugins.CommunicationPlugin();
	var _cfactory = new Documa.communication.commands.CommandFactory();
	var _log = Documa.util.Logger;

	/* constructor code */
	_nativeLayer.init();

	/* private methods */

	/* public members */
	return {
		URL: "tcp://localhost:61613",

		open: function(destination, path, successCb, errorCb){

			var trans_cmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemClientCommands.OPEN, path);

			// send the command with the help of the
			// native communication manager
			_nativeLayer.send(trans_cmd, function(result){
				// callback after successful sending
				_log.debug(TAG, 'Successful opened connection.');
				_connected = true;
				successCb();
			}, function(error){
				// callback after failure
				_log.error(TAG, 'Failure during opening connection.');
				_connected = false;
				errorCb(error);
			});
		},

		/**
		 *
		 * @param {String}
		 *            destination destination of MessageBroker object
		 * @param {String}
		 *            message message object, e. g. event or command
		 * @param {Function}
		 *            successCb callback function that is called on successful
		 *            message sending
		 * @param {Function}
		 *            errorCb callback function that is called on failure during
		 *            message sending
		 */
		send: function(destination, message, successCb, errorCb){

			var trans_cmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemClientCommands.SEND_MSG, message.toString());

			// send the command with the help of the
			// native communication manager
			_nativeLayer.send(trans_cmd, function(result){
				// callback after successful sending
				successCb(result);
			}, function(error){
				// callback after failure
				errorCb(error);
			});
		},

		/**
		 * Close connection between client and server.
		 */
		close: function(){
			_connected = false;
			var trans_cmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemClientCommands.CLOSE, null);

			// send the command with the help of the
			// native communication manager
			_nativeLayer.send(trans_cmd, function(result){
				// callback after successful sending
				_log.debug(TAG, 'Successful closing connection!');
			}, function(warn){
				// callback after failure
				_log.warn(TAG, 'Failure during closing connection.');
			});
		},

		isConnected: function(){
			return _connected;
		}

	};
});
