Ext.namespace("Documa.ui.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * Static object with values for migration item status.
 * @static
 * @type {{REVERSE_FINISH: {id: number, level: number, message: string}, DEFAULT: {id: number, level: number, message: string}, BLOCK: {id: number, level: number, message: string}, SERIALISE: {id: number, level: number, message: string}, DISINTEGRATE: {id: number, level: number, message: string}, REINTEGRATE: {id: number, level: number, message: string}, INITIALIZE: {id: number, level: number, message: string}, TRANSFER_STATE: {id: number, level: number, message: string}, UNBLOCK: {id: number, level: number, message: string}, RUN: {id: number, level: number, message: string}}}
 */
Documa.ui.migration.MigrationStatusType = {
    REVERSE_FINISH: {
        id: 0,
        level: 0,
        message: "reverse component finsihed",
    },
    DEFAULT: {
        id: 1,
        level: 0,
        message: "init migration",
    },
    BLOCK: {
        id: 2,
        level: 1,
        message: "block component",
    },
    SERIALISE: {
        id: 3,
        level: 2,
        message: "serialise component",
    },
    DISINTEGRATE: {
        id: 4,
        level: 3,
        message: "disintegrate component",
    },
    REINTEGRATE: {
        id: 5,
        level: 4,
        message: "reintegrate component",
    },
    INITIALIZE: {
        id: 6,
        level: 5,
        message: "initialize component",
    },
    TRANSFER_STATE: {
        id: 7,
        level: 6,
        message: "transfer state of component",
    },
    UNBLOCK: {
        id: 8,
        level: 7,
        message: "unblock component",
    },
    RUN: {
        id: 9,
        level: 8,
        message: "run component",
    }
};

/**
 * Static object with values for migration item condition.
 * @static
 * @type {{DEFAULT: {id: number, level: number, success: boolean, styleClass: string}, WARNING: {id: number, level: number, success: boolean, styleClass: string}, ERROR: {id: number, level: number, success: boolean, styleClass: string}, SUCCESS: {id: number, level: number, success: boolean, styleClass: string}, REVERSE: {id: number, level: number, success: boolean, styleClass: string}, REVERSE_SUCCESS: {id: number, level: number, success: boolean, styleClass: string}}}
 */
Documa.ui.migration.MigrationConditionType = {
    DEFAULT: {
        id: 1,
        level: 0,
        success: false,
        styleClass: "progress-bar-info",
    },
    WARNING: {
        id: 2,
        level: 1,
        success: false,
        styleClass: "progress-bar-warning",
    },
    ERROR: {
        id: 3,
        level: 2,
        success: false,
        styleClass: "progress-bar-danger",
    },
    SUCCESS: {
        id: 4,
        level: 2,
        success: true,
        styleClass: "progress-bar-success",
    },
    REVERSE: {
        id: 5,
        level: 2,
        success: false,
        styleClass: "progress-bar-reverse",
    },
    REVERSE_SUCCESS: {
        id: 6,
        level: 2,
        success: true,
        styleClass: "progress-bar-reverse-success",
    },
};

/**
 * Migration status for migration items.
 * @class Documa.ui.migration.MigrationStatus
 */
Documa.ui.migration.MigrationStatus = Ext.extend(Object, function () {
    const TAG = "Documa.ui.migration.MigrationStatus";
    const LOG = Documa.util.Logger;

    /////////////////////
    // private methods //
    /////////////////////

    /**
     * Progress rate per status type.
     * @type {number}
     * @private
     */
    let _progressRatePerType = 0;

    /**
     * Calculate and then return progress rate per status type.
     * @memberOf Documa.ui.migration.MigrationStatus#
     * @private
     * @returns {number}
     */
    function getProgressRatePerType() {
        /**
         * @type {number}
         */
        let sum = 0;

        //count elements
        for (let key in Documa.ui.migration.MigrationStatusType) {
            if (Documa.ui.migration.MigrationStatusType.hasOwnProperty(key)) {
                sum++;
            }
        }

        // sum (-1 for REVERSE_FINISH)
        sum = 100 / (sum - 2);

        return sum;
    }

    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationStatus
         * @param {Object} statusType
         */
        constructor: function (statusType) {
            Documa.ui.migration.MigrationStatus.superclass.constructor.call(this);

            _progressRatePerType = getProgressRatePerType();

            /**
             * Status settings for respective type.
             * @type {{id: number, message: string}}
             * @private
             */
            this._statusType = statusType;

            /**
             * Progress rate for status.
             * @type {number}
             * @private
             */
            this._progressRate = Math.round(this._statusType.level * _progressRatePerType);

            /**
             * Condition settings for respective type.
             * @type {{id: number, level: number, success: boolean, styleClass: string}}
             * @private
             */
            this._conditionType = Documa.ui.migration.MigrationConditionType.DEFAULT;
        },

        /**
         * Return status type.
         * @memberOf Documa.ui.migration.MigrationStatus#
         * @returns {{id: number, message: string}}
         */
        getStatusType: function () {
            return this._statusType;
        },

        /**
         * Sets status type and calculate new progress rate.
         * @memberOf Documa.ui.migration.MigrationStatus#
         * @param {Documa.ui.migration.MigrationStatusType.DEFAULT|Documa.ui.migration.MigrationStatusType.BLOCK|Documa.ui.migration.MigrationStatusType.DISINTEGRATE|Documa.ui.migration.MigrationStatusType.INITIALIZE|Documa.ui.migration.MigrationStatusType.REINTEGRATE|Documa.ui.migration.MigrationStatusType.REVERSE_FINISH|Documa.ui.migration.MigrationStatusType.RUN|Documa.ui.migration.MigrationStatusType.SERIALISE|Documa.ui.migration.MigrationStatusType.TRANSFER_STATE|Documa.ui.migration.MigrationStatusType.UNBLOCK} statusType
         */
        setStatusType: function (statusType) {
            this._statusType = statusType;
            this._progressRate = Math.round(this._statusType.level * _progressRatePerType);
        },

        /**
         * Return condition type.
         * @memberOf Documa.ui.migration.MigrationStatus#
         * @returns {*|{id: number, level: number, success: boolean, styleClass: string}}
         */
        getConditionType: function () {
            return this._conditionType;
        },

        /**
         * Set condition type.
         * @memberOf Documa.ui.migration.MigrationStatus#
         * @param {Documa.ui.migration.MigrationConditionType.DEFAULT|Documa.ui.migration.MigrationConditionType.SUCCESS|Documa.ui.migration.MigrationConditionType.REVERSE|Documa.ui.migration.MigrationConditionType.REVERSE_SUCCESS|Documa.ui.migration.MigrationConditionType.ERROR|Documa.ui.migration.MigrationConditionType.WARNING} conditionType
         */
        setConditionType: function (conditionType) {
            this._conditionType = conditionType;
        },

        /**
         * Return progress rate of status.
         * @memberOf Documa.ui.migration.MigrationStatus#
         * @returns {number}
         */
        getProgressRate: function () {
            return this._progressRate;
        }

    };
}());