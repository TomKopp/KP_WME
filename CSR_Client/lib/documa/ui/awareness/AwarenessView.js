Ext.namespace("Documa.ui.awareness");

Documa.require("Documa.util.Logger");
Documa.require("Documa.ui.awareness.BuddyList");

/**
 * @class
 */
Documa.ui.awareness.AwarenessView = Ext.extend(Object, (function(){
	var TAG = "Documa.ui.awareness.AwarenessView";
	var LOG = Documa.util.Logger;

	// ***********************************************************
	// private functions *****************************************
	// ***********************************************************

	/**
	 * Helper for creating a random color.
	 *
	 * @return {String} color in hexcode representation
	 */
	function createRandomColorCode() {
		LOG.debug(TAG, "... creating random color.");
		return '#000000'.replace(/0/g, function(){
			return (~~(Math.random() * 16)).toString(16);
		});
	}

	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			this._buddyList = new Documa.ui.awareness.BuddyList();
			this._userColorMapping = {};
		},

		addUserColorMapping: function(userid, colorcode){
			// add color to user id
			this._userColorMapping[userid] = colorcode;
		},

		getUserColorMapping: function(userid){
			for (var prop in this._userColorMapping) {
				if (prop == userid)
					return this._userColorMapping[prop];
			}
			return null;
		},

		/**
		 * Creates a visual representation of specified participant and adds it to the buddy list.
		 *
		 * @param {Documa.collaboration.user.Participant} participant
		 */
		addParticipant: function(participant){
			LOG.debug(TAG, "... adding participant " + participant.getSessionId());

			//check whether user already has a colormapping
			var color = this.getUserColorMapping(participant.getUserId());
			if (color == null) {
				//generate new color
				color = createRandomColorCode();
				//add color to colormapping
				this.addUserColorMapping(participant.getUserId(), color);
			}

			// create list entry from participant
			var entry = new Documa.ui.awareness.BuddyListEntry({
				userid: participant.getUserId(),
				username: participant.getUsername(),
				icon: participant.getIcon(),
				status: participant.getStatus(),
				awarenesscolor: participant.getColor()
			});

			// add list entry to buddy list
			this._buddyList.getStore().add(entry);
		},

		/**
		 * Removes given participant from buddy list on ui-layer.
		 *
		 * @param {Documa.collaboration.user.Participant} participant
		 */
		removeParticipant: function(participant){
			LOG.debug(TAG, "... removing participant " + participant.getSessionId());

			// getting store from user list on ui-layer
			var store = this._buddyList.getStore();
			var candidate = null;
			// should hold reference to removable candidate
			for (var i = 0; i < this._buddyList.getStore().getCount(); ++i) {
				var record = store.getAt(i);
				if (record.get('userid') === participant.getUserId()) {
					// matching candidate found
					candidate = record;
					break;
				}
			}
			// remove buddylist entry from ui-layer
			store.remove(candidate);
		},

		/**
		 * Returns user list.
		 *
		 * @return {Documa.ui.awareness.BuddyList}
		 */
		getBuddyList: function(){
			return this._buddyList;
		}

	};
})());
