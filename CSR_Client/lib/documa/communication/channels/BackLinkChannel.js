Ext.namespace('Documa.communication.channels');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.communication.channels.ComponentChannel');
Documa.require('Documa.communication.channels.Requestor');
Documa.require('Documa.communication.channels.Replier');

Documa.communication.channels.BackLinkChannel = Ext.extend(Documa.communication.channels.ComponentChannel, (function() {
	var TAG = "Documa.communication.channels.BackLinkChannel";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	return {
		constructor : function(channelObj) {
			Documa.communication.channels.BackLinkChannel.superclass.constructor.call(this, channelObj);
			this._reqs = [];
			this._repls = [];
			for (var i = 0; i < channelObj.sender.length; ++i)
				this._reqs.push(new Documa.communication.channels.Requestor(channelObj.sender[i]));

			for (var i = 0; i < channelObj.receiver.length; ++i)
				this._repls.push(new Documa.communication.channels.Replier(channelObj.receiver[i]));
		},
		/**
		 * Releases resources of this channel.
		 */
		destroy : function(){
			_log.debug(TAG,"... destroying");
			Documa.communication.channels.BackLinkChannel.superclass.destroy.call(this);
			_util.clearArray(this._repls);
			_util.clearArray(this._reqs);
			delete this._repls;
			delete this._reqs;
		},
		/**
		 * Returns list of registered requestors.
		 * @returns {Array}
		 */
		getRequestorList : function() {
			return this._reqs;
		},
		/**
		 * Returns list of registered repliers.
		 * @returns {Array}
		 */
		getReplierList : function() {
			return this._repls;
		}
	};
})());
