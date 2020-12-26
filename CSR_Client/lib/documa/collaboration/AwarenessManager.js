Ext.namespace('Documa.collaboration');

Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.ui.awareness.AwarenessView');
Documa.require('Documa.ui.awareness.WorkspaceAwarenessUtility');

/**
 * @class
 */
Documa.collaboration.AwarenessManager = Ext.extend(Object, function(){
	var TAG = 'Documa.collaboration.AwarenessManager';
	var _log = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			/**
			 * participant registry
			 * @type {object.<string, Documa.collaboration.user.Participant>}
			 * @private
			 */
			this._participants = {};

			// instantiate awareness view that contains the buddy list
			/**
			 * @type {Documa.ui.awareness.AwarenessView}
			 * @private
			 */
			this._view = new Documa.ui.awareness.AwarenessView();

			/**
			 * create new workspace awareness utility
			 * @type {Documa.ui.awareness.WorkspaceAwarenessUtility}
			 * @private
			 */
			this._workspaceAwarenessUtilty = new Documa.ui.awareness.WorkspaceAwarenessUtility();
		},

		//Is called to show the sharing window
		initialize: function(){
			// show buddylist
			//if (_buddyList != null || _buddyList != undefined)
			if (this._view) {
				//this._view.getBuddyList().show();
			} else {
				throw new Error("... awareness view was not instantiated!");
			}
		},

		/**
		 * Adds participating client to homescreen user list.
		 *
		 * @param {Documa.collaboration.user.Participant} participant object encaspulating user information
		 */
		add: function(participant){
			if (this._participants[participant.getUserId()]) {
				_log.warn(TAG, "Participant " + participant.getUsername() + " already registered!");
				return;
			}
			_log.debug(TAG, "... adding new Participant with session id {" + participant.getSessionId() + "}");
			this._participants[participant.getUserId()] = participant;
			// add participant on ui layer
			this._view.addParticipant(participant);
		},

		/**
		 * Returns participating client by given session id
		 *
		 * @param {String} userid participant's userid
		 * @returns {Documa.collaboration.user.Participant}
		 */
		get: function(userid){
			return this._participants[userid];
		},

		/**
		 * Returns participant from its user id.
		 * @param {String} uid user identifier
		 * @returns {Documa.collaboration.user.Participant}
		 */
		getFromUserId: function(uid){
			for (var key in this._participants){
				var participant = this._participants[key];
				if (participant.getUserId() === uid) {
					return participant;
				}
			}
			return null;
		},

		/**
		 * Returns all participants from specified application context.
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		fromApplication: function(appcontext){
			/** @type {Array.<Documa.collaboration.user.Participant>} */
			var results = [];
			for (var i = 0; i < this._participants.length; ++i){
				var participant = this._participants[i];
				var appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
				if (participant.getApplication(appinstid)) {
					// there is an association between the specified
					// application and the current participant
					results.push(participant);
				}
			}
			return results;
		},

		/**
		 * Removes participator object with the specified session id.
		 *
		 * @param {String} userid participant's userid
		 */
		remove: function(userid){
			// remove participant on ui-layer
			this._view.removeParticipant(this._participants[userid]);
			delete this._participants[userid];
		},

		/**
		 * Returns application's owner object.
		 *
		 * @returns {Documa.collaboration.user.Participant}
		 */
		getApplicationOwner: function(){
			for (var i = 0; i < this._participants.length; ++i){
				if (this._participants[i].isInitiator()) {
					return this._participants[i];
				}
			}
			throw new Error("No application's owner defined!");
		},

		/**
		 * Returns awareness view.
		 * @returns {Documa.ui.awareness.AwarenessView}
		 */
		getView: function(){
			return this._view;
		},

		/**
		 * @returns {Documa.ui.awareness.WorkspaceAwarenessUtility}
		 */
		getAwarenessUtility: function(){
			return this._workspaceAwarenessUtilty;
		}

	};
}());
