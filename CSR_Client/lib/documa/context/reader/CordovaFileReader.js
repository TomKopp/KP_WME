Ext.namespace('Documa.discovery.reader');

Documa.require('Documa.util.Logger');
/**
 * Uses the org.apache.cordova.file plugin to access directories and files on mobile
 * devices ( https://github.com/apache/cordova-plugin-file )
 */
Documa.discovery.reader.CordovaFileReader = Ext.extend(Object, (function () {

	var TAG = 'Documa.discovery.reader.CordovaFileReader';
	var _log = Documa.util.Logger;

	var _deviceReady = null;
	/* file system*/
	var _fs = null;

	/**
	 * Helper function. resolves error codes to strings
	 * @param  {org.apache.cordova.file.FileError} error FileError object
	 * @return {String}
	 */
	var _errorCodes = function (error) {
		var msg = '';
		switch (error.code) {
			case FileError.NOT_FOUND_ERR:
				msg = 'NOT_FOUND_ERR';
				break;
			case FileError.SECURITY_ERR:
				msg = 'SECURITY_ERR';
				break;
			case FileError.ABORT_ERR:
				msg = 'ABORT_ERR';
				break;
			case FileError.NOT_READABLE_ERR:
				msg = 'NOT_READABLE_ERR';
				break;
			case FileError.ENCODING_ERR:
				msg = 'ENCODING_ERR';
				break;
			case FileError.NO_MODIFICATION_ALLOWED_ERR:
				msg = 'NO_MODIFICATION_ALLOWED_ERR';
				break;
			case FileError.INVALID_STATE_ERR:
				msg = 'INVALID_STATE_ERR';
				break;
			case FileError.SYNTAX_ERR:
				msg = 'SYNTAX_ERR';
				break;
			case FileError.INVALID_MODIFICATION_ERR:
				msg = 'INVALID_MODIFICATION_ERR';
				break;
			case FileError.QUOTA_EXCEEDED_ERR:
				msg = 'QUOTA_EXCEEDED_ERR';
				break;
			case FileError.TYPE_MISMATCH_ERR:
				msg = 'TYPE_MISMATCH_ERR';
				break;
			case FileError.PATH_EXISTS_ERR :
				msg = 'PATH_EXISTS_ERR';
				break;
			default:
				msg = 'Unknown Error';
				break;
		}

		return msg;
	};

	/**
	 * helper function to prevent path string errors
	 * @param  {String} str path to check
	 * @return {String} normalized string
	 */
	var _normalize = function (str) {
		str = str || '';
		// remove leading slash
		if (str[0] === '/') str = str.substr(1);
		// is no file extension detected ('.') ensure a slash at the string end
		if (!!str && str.indexOf('.') < 0 && str[str.length - 1] !== '/') str += '/';
		if (str === './') str = '';
		return str;
	};

	return {

		/**
		 * promise based constructor, encapsulates cordova api initialisation
		 * @param {int} storageSize indicates how much storage space, in bytes, the application expects to need
		 */
		constructor: function (storageSize) {

			var type = LocalFileSystem.PERSISTENT;

			/* basic cordova initialisation */
			_deviceReady = new Promise(function (resolve, reject) {
				document.addEventListener('deviceready', resolve, false);
				/* EventListener has no error handling. Reject the promise after 10 seconds */
				setTimeout(function () {
					reject('deviceready has not fired after 10 seconds.');
				}, 10000);
			});

			/* get filesystem after device is ready.
			 *_fs promise value is a FileSystem - Object
			 */
			_fs = new Promise(function (resolve, reject) {
				_deviceReady.then(function () {
					window.requestFileSystem(type, storageSize, resolve, function (error) {
						reject(_errorCodes(error));
						/* specific filesystem read error */
					});
				}, reject);
				/* adopt error text from _deviceReady reject */
			});
		},

		/**
		 * Get directory entry
		 * resolved with org.apache.cordova.file.DirectoryEntry object
		 * rejected as error code string
		 * @param  {String} path
		 * @return {Promise}
		 */
		dir: function (path) {

			path = _normalize(path);
			/* create new directory, if not existing yet*/
			var options = {create: true, exclusive: false};

			return new Promise(function (resolve, reject) {
				/* 'return' for chaning */
				return _fs.then(function (fileSystem) {
					if (!path || path === '/') {
						/* root is always directoryEntry */
						resolve(fileSystem.root);
					} else {
						fileSystem.root.getDirectory(path, {create: true}, resolve, function (error) {
							reject(_errorCodes(error) + '. Path:' + path);
						});
					}
				}, reject);
				/* adopt error text from _fs reject */
			});
		},

		/**
		 * List all entries
		 * resolved with array of json objects
		 * {
     *   name, 
     *   fullPath, 
     *   type, 
     *   lastModified, 
     *   size
     * }
		 * rejected  with error code strings
		 * @param  {path} path to folder
		 * @return {Promise}
		 */
		list: function (path) {

			var i = 0;
			var files = [];
			var that = this;

			return new Promise(function (resolve, reject) {
				return that.dir(path).then(function (dirEntry) {
					var dirReader = dirEntry.createReader();
					dirReader.readEntries(function (entries) {
						for (i = 0; i < entries.length; ++i) {
							if (entries[i].isFile) {
								files.push({
									name: entries[i].name,
									fullPath: entries[i].fullPath,
									type: entries[i].type,
									modified: entries[i].lastModifiedDate,
									size: entries[i].size
								});
							}
						}
						resolve(files);
					}, function (error) {
						reject(_errorCodes(error));
					});
				}, reject);
				/* adopt error text from dir() reject */
			});
		},


		file: function (path) {

			return new Promise(function (resolve, reject) {
				if (path instanceof FileEntry) {
					return resolve(path);
				}
				path = _normalize(path);
				return _fs.then(function (fileSystem) {
					fileSystem.root.getFile(path, {create: false}, resolve, function (error) {
						reject(_errorCodes(error));
					});
				}, reject);
			});
		},

		/**
		 * check if a file exists.
		 * resolved with org.apache.cordova.file.FileEntry object
		 * resolved with false, if not
		 * rejected with error code string
		 * @param  {String} path
		 * @return {Promise}
		 */
		exists: function (path) {

			var that = this;

			return new Promise(function (resolve, reject) {
				that.file(path).then(function (fileEntry) {
					resolve(fileEntry);
				}, function (error) {
					// file not found
					if (error.code === 1) {
						resolve(false);
					} else {
						reject(_errorCodes(error));
					}
				});
			});
		},

		/**
		 * returns initialisation state
		 * rejected with error code string
		 * @return {Promise}
		 */
		getDeviceStatus: function () {
			return _deviceReady;
		},

		/**
		 * returns filesystem
		 * resolved with org.apache.cordova.file.FileSystem object
		 * rejected with error code string
		 * @return {Promise}
		 */
		getFileSystemStatus: function () {
			return _fs;
		},
	};
})());