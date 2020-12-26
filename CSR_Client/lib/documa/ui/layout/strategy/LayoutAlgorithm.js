Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.ui.layout.strategy.LayoutSelect');

/**
 * @class
 */
Documa.ui.layout.strategy.LayoutAlgorithm = Ext.extend(Object, (function () {
	const TAG = "Documa.ui.layout.strategy.LayoutAlgorithm";
	const _log = Documa.util.Logger;
	const _utility = Documa.util.Util;
	
	/**
	 * Helper method for interpreting given selection node.
	 * @param {Element} selectionNode
	 */
	function interpretSelection(selectionNode) {
		/** @type {String} */
		var whereStatement = null;
		/** @type {String} */
		var groupByStatement = null;
		/** @type {String} */
		var offset = null;
		/** @type {String} */
		var limit = null;
		
		// **********************************************************
		// get where-element from selection node ********************
		var whereNodes = selectionNode.getElementsByTagName("where");
		if (whereNodes.length > 1) {
			throw new Error("Interpretation error! There are more than one <where>-element, only a single is allowed!");
		}
		
		if(whereNodes.length === 1) {
			// getting where-statement from select description
			whereStatement = this._interpreter.interpretBooleanTerm(whereNodes[0].firstElementChild);
		}
		// eof where-element interpretation *************************
		
		// **********************************************************
		// get groupby-element from selection node ******************
		var groupNodes = selectionNode.getElementsByTagName("groupby");
		if (groupNodes.length > 1) {
			throw new Error("Interpretation error! There are more than one <groupby>-element, only a single is allowed!");
		}
		
		if(groupNodes.length === 1) {
			groupByStatement = _utility.serializeXML(groupNodes[0]);
			var pattern = /(\n|\t|\r)*/g;
			
			// remove carriage return, newline or tabs
			groupByStatement = groupByStatement.replace(pattern, "");
		}
		// eof groupby-element interpretation ***********************
		
		// get limit statement **************************************
		var limitNodes = selectionNode.getElementsByTagName("limit");
		if (limitNodes.length > 1) {
			throw new Error("Interpretation error! There are more than one <limit>-element, only a single is allowed!");
		}
		if(limitNodes.length === 1) {
			limit = this._interpreter.interpretNumeric(limitNodes[0].firstElementChild);
		}
		// eof limit statement **************************************
		
		// get offset statement *************************************
		var offsetNodes = selectionNode.getElementsByTagName("offset");
		if (offsetNodes.length > 1) {
			throw new Error("Interpretation error! There are more than one <offset>-element, only a single is allowed!");
		}
		
		if(offsetNodes.length === 1) {
			offset = this._interpreter.interpretNumeric(offsetNodes[0].firstElementChild);
		}
		// eof offset statement *************************************
		
		return new Documa.ui.layout.strategy.LayoutSelect(whereStatement, groupByStatement, offset, limit);
	}
	
	/**
	 * Get dimension statement from algorithm descriptions.
	 *
	 * @param {Element} boundsNode
	 * @returns {{widthStatement:{string}, heightStatement:{string}}}
	 */
	function interpretBounds(boundsNode) {
		var ws = boundsNode.getElementsByTagName("width");
		if(ws.length !== 1) {
			throw new Error("Interpretation error! Unexpected count of <width>-elements detected!");
		}
		
		var hs = boundsNode.getElementsByTagName("height");
		if(hs.length !== 1) {
			throw new Error("Interpretation error! Unexpected count of <height>-elements detected!");
		}
		return {
			widthStatement: this._interpreter.interpretNumeric(ws[0].firstElementChild),
			heightStatement: this._interpreter.interpretNumeric(hs[0].firstElementChild)
		};
	}
	
	/**
	 * Helper method for evaluating the <where>-statement in this layout-algorithm
	 * with respect to the current layout context.
	 *
	 * @param {Documa.ui.layout.strategy.LayoutContext} context
	 * @param {Documa.ui.layout.strategy.LayoutSelect} selectItem
	 */
	function evaluateWhereStatement(context, selectItem) {
		// getting available components from current layout context
		var containers = context.getUIContainers();
		
		// if there is no where-statement defined
		// all components are added into the selection-set
		var whereCondition = "true";
		
		if (selectItem.getWhereStatement())
			whereCondition = selectItem.getWhereStatement();
		
		for (var index = 0; index < context.getAllCount(); ++index) {
			if (eval(whereCondition)) {
				// component with current index fulfills where-condition
				var container = containers[index];
				
				_log.debug(TAG, "... selected container: " + container.getComponentInstanceID());
				selectItem.getSelectedComponents().push(container);
			}
		}
	}
	
	/**
	 * Helper method for analyzing grouping feature to get a group
	 * from current component selection set.
	 *
	 * @param {Array.<Documa.components.ComponentContainer>} selection
	 * @param {Documa.ui.layout.strategy.GroupingFeature} feature
	 * @returns {Array.<Documa.components.ComponentContainer>}
	 */
	function analyzeGroupingFeature(selection, feature) {
		switch (feature.type) {
			case Documa.ui.layout.strategy.GroupingFeatureTypes.ROW_GROUPING: {
				_log.debug(TAG, "... analyzing row grouping feature ...");
				_log.debug(TAG, "... count of selection set: " + selection.length);
				if (!(feature.payload.limitProcessing && feature.payload.groupProcessing)) {
					throw new Error("Invalid grouping feature detected!");
				}
				// getting max width limit
				var threshold = eval(feature.payload.limitProcessing);
				// getting processing component group from processing instructions
				return eval(feature.payload.groupProcessing);
				break;
			}
			case Documa.ui.layout.strategy.GroupingFeatureTypes.COMPONENT_PROP:
				_log.debug(TAG, "... analyzing component property grouping feature ...");
				throw new Error("Not implemented yet!");
		}
	}
	
	/**
	 * Helper method for evaluating the groupby-statement defined in this layout-algorithm
	 * with respect to the current layout context.
	 *
	 * @param {Documa.ui.layout.strategy.LayoutContext} context
	 * @param {Documa.ui.layout.strategy.LayoutSelect} selectItem
	 */
	function evaluateGroupByStatement(context, selectItem) {
		if (!window.DOMParser)
			throw new Error("DOM parsing is not supported in your browser!");
		
		if (!selectItem.getGroupByStatement()) {
			_log.debug(TAG, "... no groupby-statement defined!");
			return;
		}
		
		/**
		 * Should contain an expression that determines a group from current selection set.
		 * @type {String|Documa.ui.layout.strategy.GroupingFeature} */
		var result = null;
		var parser = new DOMParser();
		var groupDoc = parser.parseFromString(selectItem.getGroupByStatement(), "application/xml");
		var groupChild = groupDoc.documentElement.firstElementChild;
		
		//var result = this._interpreter.interpretBooleanTerm(groupChild);
		var componentGroups = selectItem.getComponentGroups();
		var selection = selectItem.getSelectedComponents();
		var group = null;
		
		switch (groupChild.localName) {
			case "and" | "or" | "neg" | "compare" | "boolean":
				result = this._interpreter.interpretBooleanTerm(groupChild);
				break;
			default:
				result = this._interpreter.interpretGroupingFeature(groupChild);
				break;
		}
		
		// create copy of selected components
		selection = selection.slice(0);
		while (selection.length > 0) {
			// check result type
			if (result instanceof Documa.ui.layout.strategy.GroupingFeature) {
				_log.debug(TAG, "... evaluating group feature description ...");
				group = analyzeGroupingFeature.call(this, selection, result);
			} else {
				_log.debug(TAG, "... evaluating boolean group condition ...");
				throw new Error("Not implemented yet!");
			}
			
			if (!group) {
				_log.debug(TAG, "Component group is empty!");
				break;
			}
			
			// add current component group into set of possible groups
			componentGroups.push(group);
			
			// remove current group from selection
			_utility.removeElements(selection, group);
		}
	}
	
	
	return {
		/**
		 * Represents the layout algorithm in xml representation.
		 * @type {Document}
		 */
		xmlNode: null,
		/**
		 * @constructor.
		 *
		 * @param {String} strategyName
		 * @param {Document} node
		 * @param {Documa.ui.layout.strategy.LayoutInterpreter} layoutInterpreter
		 */
		constructor: function (strategyName, node, layoutInterpreter) {
			Documa.ui.layout.strategy.LayoutAlgorithm.superclass.constructor.call(this);
			this.xmlNode = node;
			
			/**
			 * name of parent layout strategy
			 * @type {String}
			 * @private
			 */
			this._sname = strategyName;
			
			/**
			 * @type {Documa.ui.layout.strategy.LayoutInterpreter}
			 * @private
			 */
			this._interpreter = layoutInterpreter;
			
			/**
			 * List of component subsets.
			 * @type {Array.<Documa.ui.layout.strategy.LayoutSelect>}
			 * @private
			 */
			this._selects = [];
			
			/**
			 * Mapping between each included select and its corresponding bounds object.
			 * @type {Documa.ui.layout.strategy.LayoutSelect:{width:number, height:number}}
			 * @private
			 */
			this._bounds = {};
		},
		
		/**
		 * Interprets algorithm description defined as xml node
		 * and passed over during the construction of this class.
		 */
		interpret: function () {
			_log.debug(TAG, "... interpreting algorith of layout strategy " + this._sname);
			var selectNodes = this.xmlNode.getElementsByTagName("select");
			
			if(selectNodes.length === 0) {
				var selectItem = new Documa.ui.layout.strategy.LayoutSelect(null, null, null, null);
				this._selects.push(selectItem);
				
				// there should only be a single bounds element when no
				// select-element was not defined
				var boundsNodes = this.xmlNode.getElementsByTagName("bounds");
				if(boundsNodes.length !== 1) {
					throw new Error("Interpretation error! Unexpected count of bounds node detected!");
				}
				
				var boundsNode = boundsNodes.item(0);
				if (!boundsNode) {
					throw new Error("Interpretation error! Bounds node is missing!");
				}
				var boundsItem = interpretBounds.call(this, boundsNode);
				
				// map bounds element to selection item
				this._bounds[selectItem] = boundsItem;
			} else {
				for (var i = 0; i < selectNodes.length; ++i) {
					var selectNode = selectNodes.item(i);
					var selectItem = interpretSelection.call(this, selectNode);
					this._selects.push(selectItem);
					// getting directly following bounds node
					var boundsNode = selectNode.nextSibling.nextSibling;
					if (!boundsNode) {
						throw new Error("Interpretation error! Bounds node is missing!");
					}
					var boundsItem = interpretBounds.call(this, boundsNode);
					// map bounds element to selection item
					this._bounds[selectItem] = boundsItem;
				}
			}
		},
		/**
		 * Applies algorithm specific component layouting rules.
		 */
		apply: function () {
			_log.debug(TAG, "... applying layout algorithm " + this._sname);
			var context = Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext();
			var layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();
			
			// returns panel that contains currently visible components
			var currentPanel = layoutManager.getCurrentViewPanel();
			var body = _utility.getBodyElement(currentPanel);
			
			/**
			 * Applies size information of bounds item to container.
			 *
			 * @param {{widthStatement:string, heightStatement:string}} bitem
			 * @param {Documa.components.ComponentContainer} container
			 * @param {Number} index
			 */
			var applySize = function(bitem, container, index){
				// getting width and height values from bounds item
				/** @type {number} */
				var width = eval(bitem.widthStatement);
				
				/** @type {number} */
				var height = eval(bitem.heightStatement);
				
				if (isNaN(width) || isNaN(height)) {
					throw new Error("Invalid width or height determined for component: " +
						container.getComponentInstanceID() + "#" + container.getComponentID());
				}
				
				// applying bounds values
				container.setSize(width, height);
				
				// has the container resize changed the scrollbar state
				/*var hasHScrollbar = (body.scrollWidth > body.clientWidth);
				var hasVScrollbar = (body.scrollHeight > body.clientHeight);

				var horizontalOffset, verticalOffset;
				horizontalOffset = verticalOffset = 0;

				if (hasVScrollbar)
					horizontalOffset = layoutManager.getScrollbarSize();

				if (hasHScrollbar)
					verticalOffset = layoutManager.getScrollbarSize();

				if (hasHScrollbar || hasVScrollbar) {
					//container.setSize(width - horizontalOffset, height - horizontalOffset);
				}*/
			};
			
			// multiple component groups defined by the layout algorithm
			for (var i = 0; i < this._selects.length; ++i) {
				var selectItem = this._selects[i];
				
				// evaluate where-statement to determine set of target components
				evaluateWhereStatement.call(this, context, selectItem);
				_log.debug(TAG, "... where-statement evaluated!");
				
				// evaluate groupby-statement to determine set of selected component
				// groups
				evaluateGroupByStatement.call(this, context, selectItem);
				_log.debug(TAG, "... groupby-statement evaluated!");
				
				// apply bounds values to each component
				var selection = selectItem.getSelectedComponents();
				if (selectItem.getComponentGroups().length > 0) {
					// check if the geometric width and height values should be applied to group elements
					_log.debug(TAG, "... applying geometric size information to component groups ...");
					
					// get all groups
					var groups = selectItem.getComponentGroups();
					for (var j = 0; j < groups.length; ++j) {
						// getting a component group
						var group = groups[j];
						for (var k = 0; k < group.length; ++k) {
							
							// iterate over each component in current group
							
							// iterate over each component group
							// ****************************************
							// apply bounds values to each group item *
							// ****************************************
							// getting current container from current group
							var container = group[k];
							var index = context.getUIContainers().indexOf(container);
							if (!container) {
								throw new Error("Could not get container from component group!");
							}
							
							// retrieve corresponding bounds definition element from select-item
							var bitem = this._bounds[selectItem];
							if (!bitem) {
								throw new Error("Could not determine bounds item from selection item!");
							}
							
							applySize(bitem, container, index);
						}
						
						// clear current group of components
						_utility.clearArray(group);
					}
					// clear calculated array of component groups --> it will be recalculated next time again with respect
					// to current layout context
					_utility.clearArray(groups);
				} else {
					// *****************************************************
					// apply bounds values to each selected component item *
					// *****************************************************
					_log.debug(TAG, "... applying geometric size information to component selection ...");
					
					// iterating over each selected component container
					for (var index = 0; index < selection.length; ++index) {
						var container = selection[index];
						if (!container) {
							throw new Error("Could not get container from component group!");
						}
						
						// retrieve corresponding bounds definition element from select-item
						var bitem = this._bounds[selectItem];
						if (!bitem) {
							throw new Error("Could not determine bounds item from selection item!");
						}
						
						applySize(bitem, container, index);
					}
				}
				
				// clear all selected components - they will be selected again with respect to
				// the layout context
				_utility.clearArray(selectItem.getSelectedComponents());
				_utility.clearArray(selectItem.getComponentGroups());
			}
		},
		
		/**
		 * Returns array of select statements.
		 *
		 * @returns {Array.<Documa.ui.layout.strategy.LayoutSelect>}
		 */
		getSelects: function () {
			return this._selects;
		}
	};
})()); 