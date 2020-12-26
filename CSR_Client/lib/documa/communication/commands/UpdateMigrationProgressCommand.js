Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');



/**
 * @class
 * @extends {Documa.communication.commands.ExecutableCommand}
 */
Documa.communication.commands.UpdateMigrationProgressCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function(){
    var TAG = "Documa.communication.commands.UpdateMigrationProgressCommand";
    var _log = null;
    var _msg = null;

    return {

        /**
         * Constructor.
         *
         * @param {Documa.communication.Message} message
         */
        constructor: function(message){
            Documa.communication.commands.UpdateMigrationProgressCommand.superclass.constructor.call(this);
            _log = Documa.util.Logger;
            _msg = message;
        },

        destructor: function(){
            _log.debug(TAG, "... releasing resources.");
            _msg = null;
            _log = null;
        },

        execute: function(){
            try {
                _log.debug(TAG, "... execute update migration progress right");
                _log.info(_msg.getPayload())
            } catch(error) {
                _log.error(TAG, "ERROR: " + error);
            }
        }

    };
})());
