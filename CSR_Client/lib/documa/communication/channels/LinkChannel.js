Ext.namespace('Documa.communication.channels');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.communication.channels.ComponentChannel');
Documa.require('Documa.communication.channels.Publisher');
Documa.require('Documa.communication.channels.Subscriber');

Documa.communication.channels.LinkChannel = Ext.extend(Documa.communication.channels.ComponentChannel, (function() {
	var TAG = "Documa.communication.channels.LinkChannel";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	return {
		constructor : function(channelObj) {
			Documa.communication.channels.LinkChannel.superclass.constructor.call(this, channelObj);

			this._pList = [];
			this._sList = [];

			for (var i = 0; i < this._channelObj.sender.length; ++i) {
				this._pList.push(new Documa.communication.channels.Publisher(this._channelObj.sender[i]));
			}

			for (var i = 0; i < this._channelObj.receiver.length; ++i) {
				this._sList.push(new Documa.communication.channels.Subscriber(this._channelObj.receiver[i]));
			}
		},
		/**
		 * Releases channel resources.
		 */
		destroy : function(){
			_log.debug(TAG,"... destroying");
			Documa.communication.channels.LinkChannel.superclass.destroy.call(this);
			_util.clearArray(this._pList);
			_util.clearArray(this._sList);
			delete this._pList;
			delete this._sList;
		},
		/**
		 * Returns array of publishers.
		 * @returns {Array}
		 */
		getPublisherList : function() {
			return this._pList;
		},
		/**
		 * Set list of publishers.
		 * @param {Array} publishers
		 */
		setPublisherList : function(publishers) {
			this._pList = publishers;
		},
		/**
		 * Returns array of subscribers.
		 * @returns {Array}
		 */
		getSubscriberList : function() {
			return this._sList;
		},
		/**
		 * Set array of subscribers.
		 * @param {Array} subscribers
		 */
		setSubscriberList : function(subscribers) {
			this._sList = subscribers;
		}
	};
})());
