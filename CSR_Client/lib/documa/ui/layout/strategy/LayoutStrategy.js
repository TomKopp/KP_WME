Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');

/**
 * @class
 */
Documa.ui.layout.strategy.LayoutStrategy = Ext.extend(Object, (function () {
	var TAG = "Documa.ui.layout.strategy.LayoutStrategy";
	var _log = Documa.util.Logger;
	return {
		/**
		 * Id of layout strategy.
		 * @type {String}
		 */
		id: null,
		/**
		 * Name of layout strategy
		 * @type {String}
		 */
		name: null,
		/**
		 * Layout strategy description document.
		 * @type {Document}
		 */
		sourceXML: null,

		/**
		 * Returns strategy's activation state defined by the runtime developer. If it should not
		 * be actived this  attribute's value is false, else true.
		 */
		active: true,

		/**
		 * Strategy precondition is used to determine the applicability of this strategy
		 * with respect to the current layout context.
		 *
		 * @type {Documa.ui.layout.strategy.LayoutPrecondition}
		 */
		precondition: null,

		/**
		 * Array of rating criterions defined as part of the strategy
		 * descriptor.
		 * @type {Array.<Documa.ui.layout.strategy.RatingCriterion>}
		 */
		ratingcriteria: null,

		/**
		 * Object describing the layouting behaviour.
		 * @type {Documa.ui.layout.strategy.LayoutAlgorithm}
		 */
		algorithm: null,
		/**
		 * Evaluates the precondition of this layout strategy object.
		 * Returns true if context conditions allow the application of
		 * this layout strategy, else false.
		 *
		 * @returns {boolean}
		 */
		isApplicable: function () {
			if (!this.active)
				return false;
			
			if (this.precondition) {
				return eval(this.precondition.code);
			} else
				return false;
		},
		/**
		 * Returns rating degree of this layout strategy.
		 * @returns {number}
		 */
		getRatingValue: function () {
			if (this.ratingcriteria) {
				var fulfilledWeightSum = 0;
				var totalWeightSum = 0;
				for (var i = 0; i < this.ratingcriteria.length; i++) {
					totalWeightSum += this.ratingcriteria[i].weight;
					switch (this.ratingcriteria[i].scope) {
						case "global":
							if (eval(this.ratingcriteria[i].code)) {
								fulfilledWeightSum += this.ratingcriteria[i].weight;
							}
							break;
						case "individual":
							var uiContainers = Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getUIContainers();
							for (var index = 0; index < uiContainers.length; index++) {
								if (eval(this.ratingcriteria[i].code)) {
									fulfilledWeightSum += this.ratingcriteria[i].weight / uiContainers.length;
								}
							}
							break;
					}
				}
				return Math.floor(100 * fulfilledWeightSum / totalWeightSum);
			} else {
				return 50;
			}
		}
	};
})());