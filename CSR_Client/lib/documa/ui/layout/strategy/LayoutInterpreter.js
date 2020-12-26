/**
 * LayoutInterpreter translates the XML model of a layout strategy into
 * executable platform specific code.
 *
 * @author Sebastian Uecker
 * @author Oliver Mross
 * @returns New instance of a LayoutInterpreter using standard mapping
 */
Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.strategy.GroupingFeature');
Documa.require('Documa.ui.layout.strategy.LayoutStrategy');
Documa.require('Documa.ui.layout.strategy.LayoutAlgorithm');
Documa.require('Documa.ui.layout.strategy.RatingCriterion');
Documa.require('Documa.ui.layout.strategy.LayoutPrecondition');

Documa.ui.layout.strategy.LayoutInterpreter = Ext.extend(Object, (function() {
	var TAG = "Documa.ui.layout.strategy.LayoutInterpreter";
	var _log = Documa.util.Logger;
	
	// static private helper object
	var DomHelper = {
		
		/**
		 * Deep checks if two nodes are equal regarding name,
		 * value and children
		 *
		 * @param {Node} node1
		 * @param {Node} node2
		 */
		areEqualNodes: function(node1, node2) {
			if(node1.localName != node2.localName)
				return false;
			if(node1.nodeValue != node2.nodeValue)
				return false;
			if(node1.children.length != node2.children.length)
				return false;
			for(var i = 0; i < node1.children.length; i++) {
				if(!this.areEqualNodes(node1.children[i], node2.children[i]))
					return false;
			}
			return true;
		},
		
		/**
		 * Creates a new XML document from an existing node
		 *
		 * @param sourceNode
		 *            The node to be deep copied as the new
		 *            document's root element
		 * @param namespace
		 *            An optional namespace for the new document
		 *            (default : null)
		 * @param {Node} sourceNode
		 */
		createDocFromNode: function(sourceNode, namespace) {
			// create the new doc's skeleton
			var newDoc = document.implementation.createDocument(namespace, sourceNode.localName, null);
			// import the source node as root element
			for(var i = 0; i < sourceNode.childNodes.length; i++) {
				newDoc.documentElement.appendChild(sourceNode.childNodes[i].cloneNode());
			}
			for(var i = 0; i < sourceNode.attributes.length; i++) {
				newDoc.documentElement.setAttributeNode(sourceNode.attributes[i].cloneNode());
			}
			return newDoc;
		},
		
		/**
		 * Substitutes all occurences of some node underneath a
		 * certain root element by some other node
		 *
		 * @param what
		 *            An example of a target node to replaced
		 * @param by
		 *            The node hierarchy, which replaces the
		 *            target
		 * @param root
		 *            The root node underneath which the
		 *            replacement shall take place
		 */
		substituteNodes: function(what, by, root) {
			var possibleTargets = root.getElementsByTagName(what.localName);
			for(var i = possibleTargets.length - 1; i >= 0; i--) {
				if(this.areEqualNodes(what, possibleTargets[i])) {
					possibleTargets[i].parentNode.replaceChild(by.cloneNode(), possibleTargets[i]);
				}
			}
			return root;
		},
		
		/**
		 * Removes all comments from given DOM document.
		 *
		 * @param {Document} domDoc
		 */
		removeComments: function(domDoc) {
			/** @param {Node} node */
			var removeComment = function(node) {
				// comment node type is 8
				if(node.nodeType === Node.COMMENT_NODE) {
					// remove comment node from parent
					node.parentNode.removeChild(node);
				}
				
				for(var i = 0; i < node.childNodes.length; ++i) {
					removeComment(node.childNodes[i]);
				}
			};
			removeComment(domDoc);
		}
	};
	
	/**
	 * Helper method for validating strategy description. It checks if there is
	 *
	 * @param {String} strategyName
	 * @param {Document} strategyDoc
	 */
	function validateStrategyDescriptor(strategyName, strategyDoc) {
		var ratingCriteriaNodes, preconditionNodes, algorithmNodes;
		
		preconditionNodes = strategyDoc.getElementsByTagName("precondition");
		ratingCriteriaNodes = strategyDoc.getElementsByTagName("ratingcriteria");
		algorithmNodes = strategyDoc.getElementsByTagName("algorithm");
		
		if(preconditionNodes.length > 1) {
			throw new Error("Interpretation error! Unexpected amount of precondition-elements" +
				" detected in strategy " + strategyName);
		}
		
		if(ratingCriteriaNodes.length > 1) {
			throw new Error("Interpretation error! Unexpected amount of ratingcriteria-elements" +
				" detected in strategy " + strategyName);
		}
		
		if(algorithmNodes.length != 1) {
			throw new Error("Interpretation error! Unexpected amount of algorithm-elements" +
				" detected in strategy " + strategyName);
		}
	}
	
	/**
	 * Helper method for getting code from set expression node.
	 *
	 * @param {Node|Element} node
	 * @returns {String}
	 */
	function getSetExpression(node) {
		if(!node.firstElementChild) {
			throw new Error("Invalid set expression!");
		}
		let arrayParameters = this.elementMapping.getMappingsByType("array");
		for(let i = 0; i < arrayParameters.length; ++i) {
			if(arrayParameters[i].element === node.firstElementChild.localName) {
				return this.elementMapping.getMappingByName(node.localName).mapping + "(" + arrayParameters[i].mapping + ")";
			}
		}
	}
	
	return {
		/**
		 * Standard Mapping for translation of model elements to
		 * code.
		 *
		 * @type {Documa.ui.layout.strategy.Mapping}
		 */
		elementMapping: new Documa.ui.layout.strategy.Mapping(),
		
		/**
		 * This method is the entry point for interpreting the
		 * XML model of a layout strategy. It creates a
		 * LayoutStrategy instance, applies substitutes to the
		 * source XML and breaks the revised XML doc into parts
		 * for which it then induces individual interpretation.
		 *
		 *
		 * @param {Document} xmlDoc
		 * @returns {Documa.ui.layout.strategy.LayoutStrategy} A fully interpreted, applicable
		 *          LayoutStrategy instance
		 */
		interpretStrategy: function(xmlDoc) {
			if(xmlDoc.documentElement.localName == "layoutstrategy") {
				
				var strategy = new Documa.ui.layout.strategy.LayoutStrategy();
				
				// remove comments from strategy descriptor
				DomHelper.removeComments(xmlDoc);
				
				
				// init public properties
				strategy.sourceXML = xmlDoc;
				strategy.id = strategy.sourceXML.documentElement.getAttribute("id");
				strategy.name = strategy.sourceXML.documentElement.getAttribute("name");
				strategy.iconUrl = strategy.sourceXML.getElementsByTagName("icon")[0].getElementsByTagName("url")[0].childNodes[0].nodeValue;
				
				var activeAttribute = strategy.sourceXML.documentElement.getAttributeNode("active");
				if(activeAttribute) {
					strategy.active = (activeAttribute.value == 'true');
				} else {
					// true is default value in cases where the attribute is not defined explicitly
					strategy.active = true;
				}
				
				_log.debug(TAG, "Interpreting strategy " + strategy.id + "(" + strategy.name + ")");
				_log.debug(TAG, "Extracting structure nodes");
				
				// validate strategy descriptor
				validateStrategyDescriptor.call(this, strategy.name, xmlDoc);
				
				// getting sub elements
				/** @type {Element} */
				var preconditionNode = strategy.sourceXML.getElementsByTagName("precondition")[0];
				
				/** @type {Element} */
				var ratingcriteriaNode = strategy.sourceXML.getElementsByTagName("ratingcriteria")[0];
				
				/** @type {Element} */
				var algorithmNode = strategy.sourceXML.getElementsByTagName("algorithm")[0];
				
				// Interpret each functional part of the revised
				// model
				
				
				_log.debug(TAG, "Interpreting algorithm");
				var algorithm = new Documa.ui.layout.strategy.LayoutAlgorithm(strategy.name, algorithmNode, this);
				
				// start interpreting the select
				// and internal description elements
				algorithm.interpret();
				
				// set interpreted alogrithm as subitem of strategy object
				strategy.algorithm = algorithm;
				
				var precondition = new Documa.ui.layout.strategy.LayoutPrecondition();
				// there could be a precondition node, but shouldn't
				if(preconditionNode) {
					_log.debug(TAG, "Interpreting precondition");
					precondition.xmlNode = preconditionNode;
					precondition.code = this.interpretBooleanTerm(preconditionNode.firstElementChild);
					strategy.precondition = precondition;
				} else {
					precondition.xmlNode = null;
					precondition.code = "true";
					strategy.precondition = precondition;
				}
				
				// there could be a ratingcriteria node, but shouldn't
				if(ratingcriteriaNode) {
					_log.debug(TAG, "Interpreting criteria " + ratingcriteriaNode.localName + " " + ratingcriteriaNode.getElementsByTagName("criterion").length);
					strategy.ratingcriteria = this.interpretRatingCriteria(ratingcriteriaNode);
				}
				_log.debug(TAG, "strategy successfully interpreted");
				return strategy;
			} else {
				throw new Error("Interpretation error! No strategy-element found.");
			}
		},
		
		/**
		 * Translates model elements referencing boolean typed
		 * functions, operations or context parameters.
		 *
		 * @param {Node|Element} node
		 *                   content of the precondition-node
		 *                   defined as element in the strategy
		 *                   model
		 * @returns {String} The term's code as a String
		 */
		interpretBooleanTerm: function(node) {
			_log.debug(TAG, "interpreting boolean term " + node.localName);
			if(!node.localName) {
				throw new Error("The argument is not a valid node.");
			}
			switch (node.localName) {
				case "boolean":
					return node.textContent;
				case "neg":
					return "!(" + this.interpretBooleanTerm(node.firstElementChild) + ")";
				case "and":
					return "(" + this.interpretBooleanTerm(node.firstElementChild) + " && " + this.interpretBooleanTerm(node.firstElementChild.nextElementSibling) + ")";
				case "or":
					return "(" + this.interpretBooleanTerm(node.firstElementChild) + " || " + this.interpretBooleanTerm(node.firstElementChild.nextElementSibling) + ")";
				case "compare": {
					var op = node.getAttribute("op");
					if(!op) {
						throw new Error(node.localName + " does not contain an \"op\" attribute.");
					}
					switch (op) {
						case "st":
							op = " < ";
							break;
						case "lt":
							op = " < ";
							break;
						case "se":
							op = " <= ";
							break;
						case "le":
							op = " <= ";
							break;
						case "eq":
							op = " == ";
							break;
						case "is":
							op = " == ";
							break;
						case "neq":
							op = " != ";
							break;
						case "not":
							op = " != ";
							break;
						case "be":
							op = " >= ";
							break;
						case "ge":
							op = " >= ";
							break;
						case "bt":
							op = " > ";
							break;
						case "gt":
							op = " > ";
							break;
						default:
							throw new Error("Invalid Operation" + op + " is not a valid comparative operation.");
					}
					return "(" + this.interpretNumeric(node.firstElementChild) + op + this.interpretNumeric(node.firstElementChild.nextElementSibling) + ")";
				}
				case "#comment":
					// nothing to do here
					return null;
				case "#text":
					return null;
				default:
					var mapping = this.elementMapping.getMappingByName(node.localName);
					if(mapping == null || mapping == undefined)
						throw new Error("Could not find a mapping from node: " + node.localName);
					
					if(mapping.type == "boolean") {
						return mapping.mapping;
					} else {
						throw new Error("Invalid Element" + node.localName + " is not a valid boolean term element.");
					}
			}
		},
		
		/**
		 * Translates model elements referencing numeric
		 * (integer/double) typed functions, operations and
		 * context parameters.
		 *
		 * @param {Node|Element} node
		 * @returns {String} The term's code as a String
		 */
		interpretNumeric: function(node) {
			_log.debug(TAG, "interpreting numeric " + node.localName);
			if(!node.localName)
				throw new Error("Invalid Argument! The argument is not a valid node.");
			
			switch (node.localName) {
				case "number":
					return String(parseFloat(node.childNodes[0].nodeValue));
				case "add":
					return "(" + this.interpretNumeric(node.firstElementChild) + " + " + this.interpretNumeric(node.firstElementChild.nextElementSibling) + ")";
				case "subtract":
					return "(" + this.interpretNumeric(node.firstElementChild) + " - " + this.interpretNumeric(node.firstElementChild.nextElementSibling) + ")";
				case "multiply":
					return "(" + this.interpretNumeric(node.firstElementChild) + " * " + this.interpretNumeric(node.firstElementChild.nextElementSibling) + ")";
				case "divide":
					return "(" + this.interpretNumeric(node.firstElementChild) + " / " + this.interpretNumeric(node.firstElementChild.nextElementSibling) + ")";
				case "modulo":
					return "(" + this.interpretNumeric(node.firstElementChild) + " % " + this.interpretNumeric(node.firstElementChild.nextElementSibling) + ")";
				case "absolute":
					return " " + this.elementMapping.getMappingByName("absolute").mapping + "(" + this.interpretNumeric(node.firstElementChild) + ")";
				case "floor":
					return " " + this.elementMapping.getMappingByName("floor").mapping + "(" + this.interpretNumeric(node.firstElementChild) + ")";
				case "ceil":
					return " " + this.elementMapping.getMappingByName("ceil").mapping + "(" + this.interpretNumeric(node.firstElementChild) + ")";
				case "max" :
					return getSetExpression.call(this, node);
				case "min":
					return getSetExpression.call(this, node);
				case  "avg":
					return getSetExpression.call(this, node);
				case "sum":
					return getSetExpression.call(this, node);
				case "count":
					if(node.firstElementChild.localName) {
						var arrayParameters = this.elementMapping.getMappingsByType("array");
						for(var i = 0; i < arrayParameters.length; i++) {
							if(arrayParameters[i].element == node.firstElementChild.localName) {
								return "(" + arrayParameters[i].mapping + ").length";
							}
						}
					}
				case "#comment":
					// nothing to do here
					return null;
				case "#text":
					return null;
				default:
					var mapping = this.elementMapping.getMappingByName(node.localName);
					if(mapping == null || mapping == undefined) {
						throw new Error("Could not determine mapping element from node name:" + node.localName);
					}
					
					if(mapping.type == "numeric") {
						return mapping.mapping;
					}
					throw new Error("Invalid Element! " + node.localName + " is not a valid numeric element.");
			}
		},
		
		/**
		 * Interprets list of rating criterions defined in given ratingcriteria node.
		 *
		 * @param {Node|Element} criteriaNode
		 * @returns {Array.<Documa.ui.layout.strategy.RatingCriterion>}
		 */
		interpretRatingCriteria: function(criteriaNode) {
			var criteria = new Array();
			
			// getting each criterion element from ratingcriteria parent node
			var criterions = Ext.DomQuery.jsSelect("//criterion", criteriaNode);
			
			// analyse each criterion-element
			for(var i = 0; i < criterions.length; ++i) {
				/** @type {Node|Element} */
				var criterionNode = criterions[0];
				var criterion = new Documa.ui.layout.strategy.RatingCriterion();
				criterion.code = this.interpretBooleanTerm(criterionNode.firstElementChild);
				if(criterionNode.hasAttribute("scope")) {
					if(criterionNode.getAttribute("scope") == "individual") {
						criterion.scope = "individual";
					}
				}
				if(criterionNode.hasAttribute("weight")) {
					criterion.weight = parseFloat(criterionNode.getAttribute("weight"));
				}
				criteria.push(criterion);
			}
			
			return criteria;
		},
		
		/**
		 * Translates the algorithm node of a layout strategy
		 * model into a LayoutAlgorithm with fully interpreted,
		 * applicable execution steps, each including target
		 * selection, eventual groups and bounds' code.
		 *
		 */
		interpretAlgorithm: function(node) {
			var algorithm = new Documa.ui.layout.strategy.LayoutAlgorithm(node, this);
			
			// start interpreting the select
			// and internal description elements
			algorithm.interpret();
			return algorithm;
		},
		
		/**
		 * Translates the select element of an algorithm step.
		 * Resulting container selection and groups are added
		 * directly to the step object.
		 *
		 * @param node
		 *            The source "select" element
		 * @param step
		 *            The step object to add the results to
		 */
		interpretSelection: function(node, step) {
			// Calculate the selection condition...
			var condition = "true";
			
			// ...if any...
			if(node.getElementsByTagName("where").length > 0) {
				condition = this.interpretBooleanTerm(node.getElementsByTagName("where")[0].firstElementChild);
			}
			
			_log.debug(TAG, "Interpreting selection with condition \"" + condition + "\", testing " + eval(this.elementMapping.getMappingByName("all-count").mapping) + " components");
			
			// aggregate the indices of the containers which
			// meet the condition
			step.selection = new Array();
			step.condition = condition;
			
			// this code leads to the call of
			// "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllCount()"
			// getting count of integrated components
			var allCount = eval(this.elementMapping.getMappingByName("all-count").mapping);
			
			// for each component check condition and add its representing
			// index into component group selection set
			for(var index = 0; index < allCount; index++) {
				if(eval(condition))
					step.selection.push(index);
			}
			
			_log.debug(TAG, "Condition met by " + step.selection.length + " components");
			
			// Calculate eventual groups
			if(node.getElementsByTagName("groupby").length > 0) {
				var groupByNode = node.getElementsByTagName("groupby")[0];
				var groupIndex = 0;
				step.groups = new Array();
				step.groups[0] = new Array();
				
				// Calculate groups by summing up an individual
				// numeric, opening a new group when exceeding a global limit
				if(groupByNode.getElementsByTagName("sum").length > 0 &&
					groupByNode.getElementsByTagName("limit").length > 0) {
					var currentSum = 0;
					var summandCode = this.interpretNumeric(groupByNode.getElementsByTagName("sum")[0].firstElementChild);
					var limit = parseFloat(eval(this.interpretNumeric(groupByNode.getElementsByTagName("limit")[0].firstElementChild)));
					
					_log.debug(TAG, "Grouping by sum");
					_log.debug(TAG, "Summand: " + summandCode);
					_log.debug(TAG, "Limit: " + limit);
					
					// Must be named "index" in order to
					// correctly calculate individual context parameters
					var index = 0;
					for(var i = 0; i < step.selection.length; i++) {
						index = step.selection[i];
						var summand = parseFloat(eval(summandCode));
						currentSum += summand;
						_log.debug("Component " + i + " - Summand: " + eval(summandCode) + ", current sum: " + currentSum + ", limit: " + limit);
						if(currentSum <= limit) {
							step.groups[groupIndex].push(index);
						} else {
							currentSum = summand;
							groupIndex++;
							step.groups[groupIndex] = [index];
						}
					}
				}
				_log.debug(TAG, "Selected components divided into " + step.groups.length + "groups");
			}
		},
		
		/**
		 * Interprets strategy elements that represent an array of items.
		 *
		 * @param {Node | Element} node
		 * @returns {string}
		 */
		interpretSetExpression: function(node) {
			var arrayParameters = this.elementMapping.getMappingsByType("array");
			for(var i = 0; i < arrayParameters.length; ++i) {
				if(arrayParameters[i].element !== node.localName)
					continue;
				
				return this.elementMapping.getMappingByName(node.localName).mapping;
			}
		},
		
		/**
		 * Interprets grouping feature.
		 *
		 * @param {Node|Element} node
		 * @returns {Documa.ui.layout.strategy.GroupingFeature}
		 */
		interpretGroupingFeature: function(node) {
			if(!node.localName) {
				throw new Error("Invalid argument! Node could not be identified, because of missing local name attribute.");
			}
			
			var q = Ext.DomQuery;
			switch (node.localName) {
				case "rowGrouping": {
					// rowGrouping element contains a numeric expression and a limit description
					/** @type {Element|Node} */
					var limitNode = q.jsSelect("/limit", node)[0];
					if(!limitNode.firstElementChild) {
						throw new Error("Interpretation error! Element 'limit' is missing a content node.");
					}
					var limitProcessing = this.interpretNumeric(limitNode.firstElementChild);
					if(!limitProcessing)
						throw new Error("Interpretation error! Could not determine value of limit-element.");
					
					
					// getting element on first position that uses a numeric value
					// and uses the limit as threshold value
					var groupProcessing = this.interpretSetExpression(node.firstElementChild);
					
					// type, payload
					return new Documa.ui.layout.strategy.GroupingFeature(
						Documa.ui.layout.strategy.GroupingFeatureTypes.ROW_GROUPING,
						{
							limitProcessing: limitProcessing,
							groupProcessing: groupProcessing
						}
					);
				}
				case "componentProperty":
					throw new Error("Not implemented yet!");
			}
		}
	};
})()); 