Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.strategy.LayoutContextState');
Documa.require('Documa.ui.layout.strategy.Mapping');

/**
 * @class
 */
Documa.ui.layout.strategy.LayoutContext = Ext.extend(Object, (function () {
	const TAG = "Documa.ui.layout.strategy.LayoutContext";
	const _log = Documa.util.Logger;

	/**
	 * Heap's algorithm for generating possible permutations.
	 * @param {Array.<Documa.components.ComponentContainer>} components
	 * @param {Number} size element in each permutation
	 * @returns {Array.<Array<Documa.components.ComponentContainer>>}
	 */
	function getPermutationSet(components) {
		if(components.length === 0)
			return [
				[]
			];

		var result = [];
		for (var i = 0; i < components.length; ++i) {

			// get copy of array
			var copy = components.slice(0);

			// get list head
			var head = copy.splice(i, 1);
			var tail = getPermutationSet(copy);

			// add head to each permutation of list tail
			for (var j = 0; j < tail.length; ++j) {
				var next = head.concat(tail[j]);
				result.push(next);
			}
		}
		return result;
	}

	/**
	 * Returns size date defined in component's interface descriptor.
	 * @param {Documa.components.ComponentContainer} container
	 * @returns {{width:Number, height:Number}}
	 */
	function getSize(container) {
		var descriptor = container.getDescriptor();
		var q = Ext.DomQuery;

		var widthNode = q.jsSelect("//interface/property[@name='width']", descriptor)[0];
		var heightNode = q.jsSelect("//interface/property[@name='height']", descriptor)[0];
		if (!(widthNode && heightNode)) {
			throw new Error("Could not determine size information from component " + container.getComponentInstanceID());
		}

		var width = parseInt(q.jsSelect("//default", widthNode)[0].textContent);
		var height = parseInt(q.jsSelect("//default", heightNode)[0].textContent);

		return {
			width: width,
			height: height
		};
	}

	/**
	 * Adds up width of all components included in given array.
	 * @param {Array.<Documa.components.ComponentContainer>} components
	 */
	function addUpWidth(components) {
		let result = 0;
		for(let i = 0; i < components.length; ++i) {
			let width = getSize(components[i]).width;
			result += width;
		}
		return result;
	}

	return {
		/**
		 * @constructs
		 * @param {Ext.Container} container
		 */
		constructor: function (container) {
			Documa.ui.layout.strategy.LayoutContext.superclass.constructor.call(this);
			this._viewport = container;

			/**
			 * current viewport width and height state
			 * @type {Documa.ui.layout.strategy.LayoutContextState}
			 * @private
			 */
			this._contextState = new Documa.ui.layout.strategy.LayoutContextState(
				container.getWidth(), container.getHeight());
		},

		/**
		 * Setting layout context state.
		 * @param {Documa.ui.layout.strategy.LayoutContextState} state
		 */
		setContextState: function (state) {
			if (!state.viewportWidth || !state.viewportHeight)
				throw new Error("Missing State Parameters! Argument is not a valid viewport state.");

			this._contextState = state;
		},
		/**
		 * Returns layout context state.
		 * @returns {Documa.ui.layout.strategy.LayoutContextState}
		 */
		getContextState: function () {
			return this._contextState;
		},
		/**
		 * Returns array of component containers.
		 * @returns {Array.<Documa.components.ComponentContainer>}
		 */
		getContainers: function () {
			return Documa.RuntimeManager.getComponentManager().getContainers();
		},

		getViewport: function () {
			return this._viewport;
		},

		min: function (array) {
			if (!(array instanceof Array))
				throw new Error("Invalid Argument! The argument is not a valid array.");
			
			if(array.length === 0)
				throw new Error("Invalid Argument! The argument array is empty.");

			var result = parseFloat(array[0]);
			if (array.length > 1) {
				for (var i = 1; i < array.length; i++) {
					if (parseFloat(array[i]) < result)
						result = parseFloat(array[i]);
				}
			}
			return result;

		},

		max: function (array) {
			if (!(array instanceof Array))
				throw new Error("Invalid Argument! The argument is not a valid array.");
			if(array.length === 0)
				throw new Error("Invalid Argument! The argument array is empty.");

			var result = parseFloat(array[0]);
			if (array.length > 1) {
				for (var i = 1; i < array.length; i++) {
					if (parseFloat(array[i]) > result)
						result = parseFloat(array[i]);
				}
			}
			return result;

		},
		/**
		 * Returns sum of all numbers included in given array.
		 * @param {Array.<Number>} array
		 * @returns {number}
		 */
		sum: function (array) {
			if (!(array instanceof Array))
				throw new Error("Invalid Argument! The argument is not a valid array.");
			if(array.length === 0)
				throw new Error("Invalid Argument! The argument array is empty.");

			var result = 0;
			for (var i = 0; i < array.length; i++) {
				result += parseFloat(array[i]);
			}
			return result;
		},
		/**
		 * Returns arithmetic average of numbers include in given array.
		 * @param {Array.<Number>} array
		 * @returns {number}
		 */
		avg: function (array) {
			if (!(array instanceof Array))
				throw new Error("Invalid Argument! The argument is not a valid array.");
			
			if(array.length === 0)
				throw new Error("Invalid Argument! The argument array is empty.");

			var result = 0;
			for (var i = 0; i < array.length; i++) {
				result += parseFloat(array[i]);
			}
			return result / array.length;
		},
		/**
		 * Returns component containers, which are containing ui components.
		 *
		 * @returns {Array.<Documa.components.ComponentContainer>}
		 */
		getUIContainers: function () {
			let result = [];
			let containers = this.getContainers();
			for (var i = 0; i < containers.length; i++) {
				if (containers[i].isUI())
					result.push(containers[i]);
			}
			return result;
		},

		/**
		 * Returns width of components viewport.
		 *
		 * @returns {Number}
		 */
		getViewportWidth: function () {
			return this._viewport.getWidth();
		},

		/**
		 * Returns components' viewport height.
		 *
		 * @returns {Number}
		 */
		getViewportHeight: function () {
			return this._viewport.getHeight();
		},

		/**
		 * Returns array of each component width.
		 *
		 * @returns {Array.<Number>}
		 */
		getAllWidth: function () {
			let result = [];
			for(let i = 0; i < this.getAllCount(); i++) {
				result.push(this.getWidth(i));
			}
			return result;
		},

		/**
		 * Returns array of each component height.
		 *
		 * @returns {Array.<Number>}
		 */
		getAllHeight: function () {
			var result = new Array();
			for (var i = 0; i < this.getAllCount(); i++) {
				result.push(this.getHeight(i));
			}
			return result;
		},

		/**
		 * Returns count of available components.
		 *
		 * @returns {Number}
		 */
		getAllCount: function () {
			return this.getUIContainers().length;
		},

		/**
		 * Returns width of those components with greatest width value that is less than the given threshold.
		 *
		 * @param {Array.<Documa.components.ComponentContainer>} selection
		 * @param threshold
		 * @returns {Array.<Number>}
		 */
		getSetWidth: function (selection, threshold) {
			if (selection.length < 1)
				return null;

			if (selection.length == 1) {
				// just get component width
				return selection;
			} else {
				var maxWidth = 0;

				/** @type Array.<Array.<Documa.components.ComponentContainer>> */
				var permset = [];

				/** @type Array.<Documa.components.ComponentContainer> */
				var optimum = null;

				// creating different permutations with increasing element size - starting with size 2
				for (var size = 2; size <= selection.length; ++size) {
					var c = [];

					// fill up component set to retrieve possible permutations
					for (var j = 0; j < size; ++j) {
						c.push(selection[j]);
					}

					// get all permutations from current component values
					var perms = getPermutationSet(c);
					permset = permset.concat(perms);
				}

				// get the width of each permutation and test which width
				// value is the greatest but at least smaller than the given threshold
				for (var i = 0; i < permset.length; ++i) {

					// get each component permutation
					var p = permset[i];

					// get sum of all width values
					var widthSum = addUpWidth(p);

					if (widthSum > maxWidth && widthSum <= threshold) {
						optimum = p;
						maxWidth = widthSum;
					}
				}
				return optimum;
			}
		},

		/**
		 * Returns width of each component being an element of the specific group.
		 * @param {Array.<Documa.components.ComponentContainer>} group
		 * @returns {Array.<Number>}
		 */
		getGroupWidth: function (group) {
			var result = new Array();
			var uiContainers = this.getUIContainers();
			for (var i = 0; i < uiContainers.length; i++) {
				var container = uiContainers[i];
				if (group.indexOf(container) > -1)
					result.push(this.getWidth(i));
			}
			return result;
		},

		/**
		 * Returns height of each component being an element of the specific group.
		 * @param {Array.<Documa.components.ComponentContainer>} group
		 * @returns {Array.<Number>}
		 */
		getGroupHeight: function (group) {
			var result = new Array();
			var uiContainers = this.getUIContainers();
			for (var i = 0; i < uiContainers.length; i++) {
				var container = uiContainers[i];
				if (group.indexOf(container) > -1)
					result.push(this.getHeight(i));
			}
			return result;
		},

		/**
		 * Returns length of component group.
		 * @param {Array.<Documa.components.ComponentContainer>} group
		 * @returns {Number}
		 */
		getGroupCount: function (group) {
			return group.length;
		},

		/**
		 * Returns width of the component with given index.
		 * @param {Number} index
		 * @returns {Number}
		 */
		getWidth: function (index) {
			let properties = this.getUIContainers()[index].getDescriptor().querySelectorAll("property");
			for(let k = 0; k < properties.length; k++) {
				if(properties[k].getAttribute("name") === "width") {
					return parseInt(properties[k].querySelectorAll("default")[0].childNodes[0].nodeValue);
				}
			}
		},

		/**
		 * Returns height of the component with given index.
		 * @param {Number} index
		 * @returns {Number}
		 */
		getHeight: function (index) {
			var properties = this.getUIContainers()[index].getDescriptor().querySelectorAll("property");
			for (var k = 0; k < properties.length; k++) {
				if (properties[k].getAttribute("name") == "height") {
					return parseInt(properties[k].querySelectorAll("default")[0].childNodes[0].nodeValue);
				}
			}
		}
	};
})()); 