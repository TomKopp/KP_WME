Ext.namespace("Documa.ui.migration");

Documa.require("Documa.distribution.migration.options.MigrationOption");
Documa.require("Documa.distribution.DistributionOptionsVector");

Documa.require("Documa.ui.migration.MigrationStatus");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * Extend from Documa.distribution.migration.options.MigrationOption. MigrationComponent is a Migration (Name already assigned, so MigrationComponent) with more functionality.
 * @class Documa.ui.migration.MigrationComponent
 * @extends Documa.distribution.migration.options.MigrationOption
 */
Documa.ui.migration.MigrationComponent = Ext.extend(Documa.distribution.migration.options.MigrationOption, function () {
    const TAG = "Documa.ui.migration.MigrationComponent";
    const LOG = Documa.util.Logger;

    /////////////////////
    // private methods //
    /////////////////////

    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationComponent
         * @param {Documa.distribution.migration.options.MigrationOptionType} payload
         */
        constructor: function (payload) {
            Documa.ui.migration.MigrationComponent.superclass.constructor.call(this, payload);


            // iterate over all items and convert in MigrationComponentDistribution object
            for (let key in this._distributions) {
                if (this._distributions.hasOwnProperty(key)) {
                    this._distributions[key] = new Documa.ui.migration.MigrationComponentDistribution(
                        this._distributions[key].getDevice(),
                        this._distributions[key].getExecutables(),
                        this._distributions[key].getNonExecutables(),
                        this._distributions[key].getReplaceables()
                    );
                }
            }
        },

        /**
         * Return migration items.
         * @memberOf Documa.ui.migration.MigrationComponent#
         * @returns {Array.<Documa.ui.migration.MigrationComponentExecutable, Documa.ui.migration.MigrationComponentReplaceable>}
         */
        getMigrateItems: function () {
            let result = [];

            // iterate
            for (let key in this._distributions) {
                if (this._distributions.hasOwnProperty(key)) {
                    result = result.concat(this._distributions[key].getMigrateItems());
                }
            }

            return result;
        }

    };
}());

/**
 * Extend from DistributionOptionsVector. MigrationComponentDistribution represent migration distribution with items.
 * @class Documa.ui.migration.MigrationComponentDistribution
 * @extends Documa.distribution.DistributionOptionsVector
 */
Documa.ui.migration.MigrationComponentDistribution = Ext.extend(Documa.distribution.DistributionOptionsVector, function () {
    const TAG = "Documa.ui.migration.MigrationComponentDistribution";
    const LOG = Documa.util.Logger;

    /////////////////////
    // private methods //
    /////////////////////


    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationComponentDistribution
         * @param {Documa.distribution.Device} device
         * @param {Array.<Documa.distribution.DVComponentItem>} execs
         * @param {Array.<Documa.distribution.DVComponentItem>} nonexecs
         * @param {Array.<Documa.distribution.DVReplacementItem>} replaceables
         */
        constructor: function (device, execs, nonexecs, replaceables) {
            Documa.ui.migration.MigrationComponentDistribution.superclass.constructor.call(this, device, execs, nonexecs, replaceables);

            /**
             * Represent abstract condition of all included items.
             * @type {{id: number, level: number, success: boolean, styleClass: string}}
             * @private
             */
            this._conditionType = Documa.ui.migration.MigrationConditionType.DEFAULT;

            /**
             * Rate for progress bar.
             * @type {number}
             * @private
             */
            this._progressRate = 0;

            // iterate over executables and overwrite extended
            for (let executeKey in this._execs) {
                if (this._execs.hasOwnProperty(executeKey)) {
                    this._execs[executeKey] = new Documa.ui.migration.MigrationComponentExecutable(this._execs[executeKey]);
                }
            }

            // iterate over nonexecutables and overwrite extended
            for (let noexecuteKey in this._nonexecs) {
                if (this._nonexecs.hasOwnProperty(noexecuteKey)) {
                    this._nonexecs[noexecuteKey] = new Documa.ui.migration.MigrationComponentNonExecutable(this._nonexecs[noexecuteKey]);
                }
            }

            // iterate over replaceables and overwrite extended
            for (let replaceKey in this._replaceables) {
                if (this._replaceables.hasOwnProperty(replaceKey)) {
                    this._replaceables[replaceKey] = new Documa.ui.migration.MigrationComponentReplaceable(this._replaceables[replaceKey]);
                }
            }

            /**
             * Array of all migratable items (executables and replaceables).
             * @type {Array.<Documa.ui.migration.MigrationComponentExecutable, Documa.ui.migration.MigrationComponentReplaceable>}
             * @private
             */
            this._migrateItems = [].concat(this._execs, this._replaceables);
        },

        /**
         * Return abstract condition of all included items.
         * @memberOf Documa.ui.migration.MigrationComponentDistribution#
         * @returns {{id: number, level: number, success: boolean, styleClass: string}}
         */
        getConditionType: function () {
            // if all success
            let success = this._migrateItems.every(function (element) {
                return element.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.SUCCESS.id;
            });

            if (success) return this._conditionType = Documa.ui.migration.MigrationConditionType.SUCCESS;

            // if all reverse success
            let reverse_success = this._migrateItems.every(function (element) {
                return element.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.REVERSE_SUCCESS.id;
            });

            if (reverse_success) return this._conditionType = Documa.ui.migration.MigrationConditionType.REVERSE_SUCCESS;

            // if some error
            let error = this._migrateItems.some(function (element) {
                return element.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.ERROR.id;
            });

            if (error) return this._conditionType = Documa.ui.migration.MigrationConditionType.ERROR;

            // if some warning
            let warning = this._migrateItems.some(function (element) {
                return element.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.WARNING.id;
            });

            if (warning) return this._conditionType = Documa.ui.migration.MigrationConditionType.WARNING;

            // if some reverse
            let reverse = this._migrateItems.some(function (element) {
                return element.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.REVERSE.id;
            });

            if (reverse) return this._conditionType = Documa.ui.migration.MigrationConditionType.REVERSE;

            return this._conditionType = Documa.ui.migration.MigrationConditionType.DEFAULT;
        },

        /**
         * Returns the calculated progress bar rate based on all elements.
         * @memberOf Documa.ui.migration.MigrationComponentDistribution#
         * @returns {number}
         */
        getProgressRate: function () {
            /**
             * @type {number}
             */
            let sumRate = 0;

            // iterate over migrate items and sum it up
            for (let key in this._migrateItems) {
                if (this._migrateItems.hasOwnProperty(key)) {
                    sumRate += this._migrateItems[key].getStatus().getProgressRate();
                }
            }

            // calculate
            this._progressRate = Math.round(sumRate / (this._migrateItems.length));

            return this._progressRate;
        },

        /**
         * Return all migratable items.
         * @memberOf Documa.ui.migration.MigrationComponentDistribution#
         * @returns {Array.<Documa.ui.migration.MigrationComponentExecutable, Documa.ui.migration.MigrationComponentReplaceable>}
         */
        getMigrateItems: function () {
            return this._migrateItems;
        }
    };
}());

/**
 * Extend from DVComponentItem. MigrationComponentExecutable represent migration item with a status object.
 * @class Documa.ui.migration.MigrationComponentExecutable
 * @extends Documa.distribution.DVComponentItem
 */
Documa.ui.migration.MigrationComponentExecutable = Ext.extend(Documa.distribution.DVComponentItem, function () {
    const TAG = "Documa.ui.migration.MigrationComponentExecutable";
    const LOG = Documa.util.Logger;

    /////////////////////
    // private methods //
    /////////////////////


    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationComponentExecutable
         * @param {Documa.distribution.DVComponentItem} instance
         */
        constructor: function (instance) {
            Documa.ui.migration.MigrationComponentExecutable.superclass.constructor.call(this, instance.serialize());

            /**
             * Status object.
             * @type {Documa.ui.migration.MigrationStatus}
             */
            this._status = new Documa.ui.migration.MigrationStatus(Documa.ui.migration.MigrationStatusType.DEFAULT);
        },

        /**
         * Return status.
         * @memberOf Documa.ui.migration.MigrationComponentExecutable#
         * @returns {Documa.ui.migration.MigrationStatus}
         */
        getStatus: function () {
            return this._status;
        },
    };
}());

/**
 * Extend from DVComponentItem. MigrationComponentNonExecutable represent migration item with a status object.
 * @class Documa.ui.migration.MigrationComponentNonExecutable
 * @extends Documa.distribution.DVComponentItem
 */
Documa.ui.migration.MigrationComponentNonExecutable = Ext.extend(Documa.distribution.DVComponentItem, function () {
    const TAG = "Documa.ui.migration.MigrationComponentNonExecutable";
    const LOG = Documa.util.Logger;

    /////////////////////
    // private methods //
    /////////////////////


    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationComponentNonExecutable
         * @param {Documa.distribution.DVComponentItem} instance
         */
        constructor: function (instance) {
            Documa.ui.migration.MigrationComponentNonExecutable.superclass.constructor.call(this, instance.serialize());

            /**
             * Status object.
             * @type {Documa.ui.migration.MigrationStatus}
             */
            this._status = new Documa.ui.migration.MigrationStatus(Documa.ui.migration.MigrationStatusType.DEFAULT);
        },

        /**
         * Return status.
         * @memberOf Documa.ui.migration.MigrationComponentNonExecutable#
         * @returns {Documa.ui.migration.MigrationStatus}
         */
        getStatus: function () {
            return this._status;
        },
    };
}());

/**
 * Extend from DVReplacementItem. MigrationComponentReplaceable represent migration item with a status object.
 * @class Documa.ui.migration.MigrationComponentReplaceable
 * @extends Documa.distribution.DVReplacementItem
 */
Documa.ui.migration.MigrationComponentReplaceable = Ext.extend(Documa.distribution.DVReplacementItem, function () {
    const TAG = "Documa.ui.migration.MigrationComponentReplaceable";
    const LOG = Documa.util.Logger;

    /////////////////////
    // private methods //
    /////////////////////


    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationComponentReplaceable
         * @param {Documa.distribution.DVReplacementItem} instance
         */
        constructor: function (instance) {
            Documa.ui.migration.MigrationComponentReplaceable.superclass.constructor.call(this, instance.serialize());

            /**
             * Status object.
             * @type {Documa.ui.migration.MigrationStatus}
             */
            this._status = new Documa.ui.migration.MigrationStatus(Documa.ui.migration.MigrationStatusType.DEFAULT);
        },

        /**
         * Return status.
         * @memberOf Documa.ui.migration.MigrationComponentReplaceable#
         * @returns {Documa.ui.migration.MigrationStatus}
         */
        getStatus: function () {
            return this._status;
        },
    }
}());

