Ext.namespace('Documa.communication.channels');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.communication.channels.ComponentChannel');
Documa.require('Documa.communication.channels.Participant');

Documa.communication.channels.PropertyLinkChannel = Ext.extend(Documa.communication.channels.ComponentChannel, (function() {
	var TAG = "Documa.communication.channels.PropertyLinkChannel";
	var _self = null;
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;

	var getParticipant = function(elementName) {
		for (var i = 0; i < _self._participants.length; ++i) {
			var p = _self._participants[i];
			if (!p)
				continue;
			if (p.getPropertyName() === elementName) {
				return p;
			}
		}
	};

	return {
		/**
		 * Ctor.
		 * @param channelObj channel data
		 */
		constructor : function(channelObj) {
			Documa.communication.channels.PropertyLinkChannel.superclass.constructor.call(this, channelObj);
			_self = this;
			this._participants = [];
			try {
				for (let i = 0; i < channelObj.sender.length; ++i) {
					this._participants.push(new Documa.communication.channels.Participant(channelObj.sender[i]));
				}

				for (let i = 0; i < channelObj.receiver.length; ++i) {
					var p = getParticipant.call(this, channelObj.receiver[i].cename);
					if (!p) {
						this._participants.push(channelObj.receiver[i]);
					}
				}
			} catch(error) {
				_log.error(TAG, error);
			}
		},
		/**
		 * Releases resources of this channel.
		 */
		destroy : function(){
			_log.debug(TAG,"... destroying.");
			Documa.communication.channels.PropertyLinkChannel.superclass.destroy.call(this);
			_util.clearArray(this._participants);
			delete this._participants;
		},

		/**
		 * Returns list of communication channel participants.
		 * @returns {Array}
		 */
		getParticipantList : function() {
			return this._participants;
		},

		getUnidirectionalSender : function() {
			return this._channelObj.dir;
		}

	};
})()); 