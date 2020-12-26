Ext.namespace("Documa.ui.views.capview");
Documa.require('Documa.ui.views.capview.LabelGeneratorDictionary');

/**
 * @author Carsten Radeck, Robert Starke
 * @class Documa.ui.views.capview.LabelGenerator
 *
 * The label generator is responsible for determining the natural language labels shown in the CapView. Thereby, it employs
 * a generic rule set to derive both the initial labels (in case nothing is selected) and sentence-like labels (for an active user selection).
 *
 */
Documa.ui.views.capview.LabelGenerator = function(){
	var _log = Documa.util.Logger;
	var MAX_VALUE_TEXT_LENGTH = 25;
	var dictionary = new Documa.ui.views.capview.LabelGeneratorDictionary();

	/**
	 * pre-processes the given concept URL (extracting concept name, cleaving of prefix verbs and splitting according to camel case)
	 * e.g.
	 * http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location -> location
	 * http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation -> center location
	 */
	var preProcess = function(type){
		var idx = type.lastIndexOf("#");
		if(idx == -1) {
			idx = type.lastIndexOf(":");
		}

		if(idx != -1) {
			type = type.substring(idx + 1);

			// cleave prefixed "has" and "is"
			type = type.replace(/^has|^is/, "")
			// split according to camel case and convert to lower case
				.replace(/([a-z])([A-Z])/g, '$1 $2')
				.toLowerCase();
		}
		return type;
	};

	/**
	 * Determines the past participle for the given activity
	 */
	var pp = function(activity){
		return dictionary.getPastParticiple(preProcess(activity));
	};

	/**
	 * Determines the label for a type or entity concept. May incorporate a instance value if given.
	 */
	var dataLabel = function(type, value){
		// currently, we only parse the URL of the annotated ontology concept
		// later on, the proper ontology label should be queried
		type = preProcess(type);
		if(type === "weather")
			type = "weather information";
		// limit length
		if(value && value.length > MAX_VALUE_TEXT_LENGTH) {
			value = value.substring(0, MAX_VALUE_TEXT_LENGTH - 3) + "...";
		}
		if(type === value || !value) {
			return type;
		} else return type + " (" + value + ")";
	};

	/**
	 * Determines the label for an activity concept.
	 */
	var activityLabel = function(act){
		return preProcess(act);
	};

	/**
	 * determines whether for a given entry G and an array A, there is an entry E in A where E.arraykey == G.entrykey.
	 *
	 * @param {Object} entry entry which occurrence is requested
	 * @param {Array} array array to be searched for occurrences
	 * @param {String} arraykey the property of the array-entries to be utilized for comparision
	 * @param {String} entrykey the property of the given object to be used for comparision
	 */
	var containsEntry = function(entry, array, arraykey, entrykey){
		for(var _lidx = 0, _llen = array.length; _lidx < _llen; ++_lidx) {
			var _lentry = array[_lidx];
			if(_lentry[arraykey] == entry[entrykey]) {
				return true;
			}
		}
		return false;
	};

	/*
	 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ public interface ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	 */

	/**
	 * Prop
	 * @param {Object} prop configures the (unselected) property the label has to be generated for. An instance has to comply to the following scheme: { type: (String), value: (String, optional) }
	 * @return String the generated label for the property.
	 */
	this.getInitialLabelForProperty = function(prop){
		var val = prop.value;
		var type = prop.type;
		var valLabel = dataLabel(type, val);
		return valLabel;
	};

	/**
	 * Cap
	 * @param {Object} prop configures the (unselected) capability the label has to be generated for. An instance has to comply to the following scheme: { activity: (String), entity: (String) }
	 * @return String the generated label for the property.
	 */
	this.getInitialLabelForCapability = function(cap){
		var dl = dataLabel(cap.entity);
		return activityLabel(cap.activity) + dictionary.getArticle(dl) + dl;
	};

	/**
	 * Prop -> Prop
	 * @param {Object} prop infos about the property to be relabeled; An instance has to comply to the following scheme: { type: (String), value: (String, option), isSource: (boolean, optional) }
	 * @param {Object} r_0 infos about the selected property. An instance has to comply to the following scheme: { type: (String), value: (String, option), isSource: (boolean, optional) }
	 * @return String the generated label for the property
	 */
	this.getLabelForConnectibleProperty = function(prop, r0, mappings){
		if(prop.isSource) {
			if(!mappings) {
				return {label: "use " + dataLabel(prop.type, prop.value) + " as ..."};
			}
			if(mappings.length === 1) {
				var mapping = mappings[0];
				var splitInsert = " ";

				// split rules applies
				if(mapping.parameterSplits) {
					var split = mapping.parameterSplits[0];
					var pairing = split.pairings[0];

					// split rule holds
					if(pairing.usesEvPropertyRange) {
						splitInsert = "the " + dataLabel(pairing.sourcePropertyURI) + " of ";
					}
				}
				return {label: "use " + splitInsert + dataLabel(prop.type, prop.value) + " as ..."};
			} else {
				var options = {"1": []};

				for(var idx = 0, mapping; mapping = mappings[idx]; ++idx) {
					if(mapping.parameterSplits) {
						// multiple ways to split one event parameter
						var psplit = mapping.parameterSplits[0];

						// create sub options for each split

						var pairing = psplit.pairings[0];
						var splitInsert = dataLabel(pairing.sourcePropertyURI);

						if(pairing.usesEvPropertyRange) {
							options["1"].push({
								label: splitInsert,
								targetParameter: 0,
								sourceParameter: 0,
								mapping: mapping
							});
						}
					}
				}

				return {
					label: "use " + (options["1"].length > 0 ? "the %1% of " : "") + dataLabel(prop.type) + " as ...",
					options: options
				};
			}
		} else {
			if(!mappings)
				return {label: "use " + dataLabel(r0.type, r0.value) + " as " + dataLabel(prop.type)};
			if(mappings.length == 1) {
				var mapping = mappings[0];
				var splitInsert = " ";
				// split rules applies
				if(mapping.parameterSplits) {
					var split = mapping.parameterSplits[0];
					var pairing = split.pairings[0];

					// split rule holds
					if(pairing.usesEvPropertyRange) {
						splitInsert = "the " + dataLabel(pairing.sourcePropertyURI) + " of ";
					}
				}
				return {label: "use " + splitInsert + dataLabel(r0.type, r0.value) + " as " + dataLabel(prop.type)};
			} else {
				var options = {"1": []};
				for(var idx = 0, mapping; mapping = mappings[idx]; ++idx) {
					if(mapping.parameterSplits) {
						// multiple ways to split one event parameter
						var psplit = mapping.parameterSplits[0];
						// create sub options for each split
						var pairing = psplit.pairings[0];
						var splitInsert = dataLabel(pairing.sourcePropertyURI);
						if(pairing.usesEvPropertyRange) {
							options["1"].push({
								label: splitInsert,
								targetParameter: 0,
								sourceParameter: 0,
								mapping: mapping
							});
						}
					}
				}
				return {
					label: "use " + (options["1"].length > 0 ? "the %1% of " : "") + dataLabel(r0.type, r0.value) + " as " + dataLabel(prop.type),
					options: options
				};
			}
		}
	};


	/**
	 * Property <-> Cap
	 *
	 * @param {Object} prop infos about the property to be relabeled; An instance has to comply to the following scheme: { type: (String), value: (String, option), isSource: (boolean, optional) }
	 * @param {Object} r_0 infos about the selected property. An instance has to comply to the following scheme: { type: (String), value: (String, option), isSource: (boolean, optional) }
	 * @param {Array} mappings the mappings that apply, indicating several options
	 * @return Object the label configuration. schema: { "label": String (may contain placeholders %1..n% for options), "options" (optional): { "placeholder_1": [], "placeholder_n": []}}
	 */
	this.getLabelForConnectibleCapability = function(prop, r0, mappings){
		if(prop.isSource) {
			// *************************************************
			// 					prop -> cap
			// *************************************************
			var entity = r0.entity;
			var entityNorm = entity; // TODO
			var splitInsert = "";
			var typeTargetParam, typeTargetParamNorm, typeSourceParam, typeSourceParamNorm;
			if(mappings.length === 1) {
				var mapping = mappings[0];
				if(mapping.forwards) {
					var fwd = mapping.forwards[0];
					var typeParam = fwd.operationParameterURI;
					var typeParamNorm = fwd.usesOpParamRange ? fwd.eventParameterURI : typeParam;
					// compRule holds
					if(entityNorm == typeParamNorm) { // TODO subsumption
						return {label: activityLabel(r0.activity) + " the " + dataLabel(prop.type, prop.value)};
					}
					var typeProp = prop.type;
					var typePropNorm = fwd.usesEvParamRange ? fwd.operationParameterURI : typeProp;
					var subConcepts = typeParam != fwd.eventParameterURI && !fwd.usesEvParaRange && !fwd.usesOpParaRange && !fwd.evParaIsDataProp && !fwd.opParaIsDataProp;
					if(typeParamNorm == typePropNorm || subConcepts) {
						var dl = dataLabel(r0.entity);
						var dl2 = dataLabel(typeProp || prop.value);
						return {label: activityLabel(r0.activity) + dictionary.getArticle(dl) + dl + " using " + dictionary.getArticle(dl2) + dl2};
					}
				}
				// split rules applies
				if(mapping.parameterSplits) {
					var split = mapping.parameterSplits[0];
					// TODO handle multiple pairings in one split
					var pairing = split.pairings[0];
					typeTargetParam = pairing.targetParameterURI;
					typeTargetParamNorm = typeTargetParam;
					typeSourceParam = pairing.sourceParameterURI;
					typeSourceParamNorm = typeSourceParam;
					// split rule holds
					if(pairing.usesEvPropertyRange) {
						splitInsert = dataLabel(typeTargetParam) + " of the ";
					}
				}
				return {
					label: activityLabel(r0.activity) + " a " + dataLabel(r0.entity) + " using the " +
					splitInsert + dataLabel(prop.type)
				};
			} else {

				// multiple mappings -> options required
				var options = {"1": [], "2": []};

				var compRuleHolds = false;

				for(var idx = 0, mapping; mapping = mappings[idx]; ++idx) {


					if(mapping.forwards) {
						var pfwd = mapping.forwards[0];

						options["1"].push({
							label: dataLabel(pfwd.operationParameterURI),
							targetParameter: pfwd.eventParameterName,
							sourceParameter: 0,
							mapping: mapping
						});

						var typeParam = pfwd.operationParameterURI;
						var typeParamNorm = pfwd.usesOpParamRange ? pfwd.eventParameterURI : typeParam;

						// compRule holds
						compRuleHolds = entityNorm == typeParamNorm;
					}

					if(mapping.parameterSplits) {
						// multiple ways to split one event parameter
						var psplit = mapping.parameterSplits[0];

						// create sub options for each split

						var pairing = psplit.pairings[0];
						var splitInsert = dataLabel(pairing.sourcePropertyURI);

						typeTargetParam = pairing.targetParameterURI;
						typeTargetParamNorm = typeTargetParam;

						if(pairing.usesEvPropertyRange) {
							options["2"].push({
								label: splitInsert,
								targetParameter: pairing.targetParameterName,
								sourceParameter: 0,
								mapping: mapping
							});
						}

						/*var alreadyPresent= false;
						// check if there is already an entry for the targetParameter. if so, dont add a new one
						for (var _lidx=0, _llen=options["1"].length; _lidx < _llen; ++_lidx){
							var _lentry= options["1"][_lidx];
							if (_lentry.targetParameter == pairing.targetParameterName){
								alreadyPresent= true;
								break;
							}
						}
						
						if (!alreadyPresent)*/
						if(!containsEntry(pairing, options["1"], "targetParameter", "targetParameterName"))
							options["1"].push({
								label: dataLabel(pairing.targetParameterURI),
								targetParameter: pairing.targetParameterName,
								sourceParameter: 0,
								mapping: mapping
							});

						compRuleHolds = entityNorm == typeTargetParamNorm;
					}
				}

				return {
					label: activityLabel(r0.activity) + (compRuleHolds ? " the " : " a " + dataLabel(r0.entity) + " using the ") + (options["2"].length > 0 ? "%2% of the " : "") + dataLabel(prop.type) + (options["1"].length > 1 ? " as %1%" : ""),
					options: options
				};
			}
		} else {
			// *************************************************
			// 					Cap -> Prop
			// *************************************************

			if(mappings.length == 1) {
				var mapping = mappings[0];
				var splitInsert = "";

				if(mapping.parameterSplits) {
					var split = mapping.parameterSplits[0];

					var pairing = split.pairings[0];
					var typeTargetParam = pairing.targetParameterURI;

					// split rule holds
					if(pairing.usesEvPropertyRange) {
						splitInsert = dataLabel(typeTargetParam) + " of the ";
					}
				}

				if(mapping.forwards) {
					var fwd = mapping.forwards[0];
					typeSourceParam = fwd.eventParameterURI;
					typeSourceParamNorm = fwd.usesEvParamRange ? fwd.operationParameterURI : typeSourceParam;

					/*// compRule holds TODO
					if (ri.entity == typeSourceParamNorm){
						return { label: activityLabel(r0.activity)+" the "+ dataLabel(prop.type)};
					}*/

					typeTargetParam = fwd.operationParameterURI;
					typeTargetParamNorm = fwd.usesOpParamRange ? fwd.eventParameterURI : typeTargetParam;

					if(r0.entity != typeSourceParam) {
						splitInsert = dataLabel(typeSourceParam) + " of the ";
					}
				}

				return {label: "use the " + splitInsert + pp(activityLabel(r0.activity)) + " " + dataLabel(r0.entity) + " as " + dataLabel(prop.type)};
			} else {

				// multiple mappings -> options required
				var options = {"1": []};

				for(var idx = 0, mapping; mapping = mappings[idx]; ++idx) {

					if(mapping.forwards) {
						var pfwd = mapping.forwards[0];
						// multiple event parameters; assumption is that in this case all parameters are splitable from the entity concept
						// e.g. event( location1, location2) -> prop (location)


//						options.push({
//							label: pp(activityLabel(r0.activity)) +" "+ dataLabel(r0.entity),
//							sourceParameter: pfwd.eventParameterName,
//							targetParameter: 0,
//							mapping: mapping
//						});

						options["1"].push({
							label: dataLabel(pfwd.eventParameterURI),
							sourceParameter: pfwd.eventParameterName,
							targetParameter: 0,
							mapping: mapping
						});

					} else if(mapping.parameterSplits) {
						// multiple ways to split one event parameter
						// Route (hasStart, hasDest) -> Location

						var psplit = mapping.parameterSplits[0];


						// create sub options for each split
						var pairing = psplit.pairings[0];

						if(pairing.usesEvPropertyRange) {
							options["1"].push({
								label: dataLabel(pairing.sourcePropertyURI),
								mapping: mapping,
								targetParameter: 0,
								sourceParameter: psplit.eventParameterName
							});
						}

//						var pairing= psplit.pairings[0];
//						var suboptions= [];
//						var splitInsert= dataLabel(pairing.sourcePropertyURI)+ " of the ";
//
//						if (pairing.usesEvPropertyRange){
//							suboptions.push({
//								label: splitInsert,
//								mapping: mapping
//							});
//						}
//						
//						
//						var oobj= null;
//						// look if there is already an entry object for the source parameter
//						for (var _i=0; _i < options.length; ++_i){
//							var temp= options[_i];
//							if (temp.sourceParameter== psplit.eventParameterName){
//								oobj= temp;
//								break;
//							}
//						}
//						if (oobj==null){
//							// create new entry
//							oobj= {
//									label: "%2%"+pp(activityLabel(r0.activity)) +" "+ dataLabel(r0.entity),
//									sourceParameter: psplit.eventParameterName,
//									targetParameter: 0,
//									mapping: mapping
//								};
//							options.push(oobj);
//						} else {
//							// no split yet? --> prepend placeholder to existing label
//							if (!oobj.options)
//								oobj.label= "%2%"+oobj.label;
//						}
//						// append the options
//						if (!oobj.options){
//							oobj.options= suboptions;
//						}else
//							oobj.options= oobj.options.concat(suboptions);
					}
				}
				return {
					label: "use the %1% of the " + pp(activityLabel(r0.activity)) + " " + dataLabel(r0.entity) + " as " + dataLabel(prop.type),
					options: options
				};
			}
		}
	};

	/**
	 * Cap <-> Cap
	 *
	 * @param {Object} r0 infos about the selected capability. An instance has to comply to the following scheme:
	 *     { activity: (String), entity: (String), isSource: (boolean, optional) }
	 * @param {Object} ri infos about a coupling candidate capability. An instance has to comply to the following scheme:
	 *   { activity: (String), entity: (String), isSource: (boolean, optional) }
	 * @param {Array} mappings mapping definitions (mediation rules)
	 *
	 * @return {Object} the label configuration complying to the scheme: { mainlabel: String (optional, only if r0 is source), detailslabel: String (maybe optional if r0 is source, may contain placeholders %ph_1% .. %ph_n%), options (optional): { "ph_1": [], "ph_n": [] } 
	 */
	this.generateLabelForCapToCapConnection = function(r0, ri, mappings){

		if(r0.isSource) {
			if(mappings.length == 1) {
				if(r0.entity == ri.entity) {
					return {mainlabel: "... to " + activityLabel(ri.activity) + " the " + pp(r0.activity) + " " + dataLabel(r0.entity)};
				}
				else {
					var mapping = mappings[0];

					var splitInsert = "";
					var typeTargetParam, typeTargetParamNorm, typeSourceParam, typeSourceParamNorm;

					if(mapping.forwards) {
						var fwd = mapping.forwards[0];
						typeSourceParam = fwd.eventParameterURI;
						typeSourceParamNorm = fwd.usesEvParamRange ? fwd.operationParameterURI : typeSourceParam;

						typeTargetParam = fwd.operationParameterURI;
						typeTargetParamNorm = fwd.usesOpParamRange ? fwd.eventParameterURI : typeTargetParam;

						if(r0.entity != typeSourceParam) {
							splitInsert = dataLabel(typeSourceParam) + " of the ";
						}
					}


					if(mapping.parameterSplits) {
						var split = mapping.parameterSplits[0];

						// TODO handle multiple pairings in one split
						var pairing = split.pairings[0];

						typeTargetParam = pairing.targetParameterURI;
						typeTargetParamNorm = typeTargetParam;

						typeSourceParam = pairing.sourceParameterURI;
						typeSourceParamNorm = typeSourceParam;

						// split rule holds
						if(pairing.usesEvPropertyRange) {
							splitInsert = dataLabel(typeTargetParam) + " of the ";
						}
					}

					if(typeTargetParamNorm == ri.entity) {
						// CompRule holds
						return {mainlabel: "... to " + activityLabel(ri.activity) + " the " + splitInsert + pp(r0.activity) + " " + dataLabel(r0.entity)};
					} else {
						var dl = dataLabel(ri.entity);
						return {mainlabel: "... to " + activityLabel(ri.activity) + dictionary.getArticle(dl) + dl + " by the " + splitInsert + pp(r0.activity) + " " + dataLabel(r0.entity)};
					}
				}
			} else {

				// multiple mappings -> options required

				var options = {"1": [], "2": []};

				var sourceParams = [];
				var compRuleHolds = false;

				for(var idx = 0, mapping; mapping = mappings[idx]; ++idx) {

					if(mapping.forwards) {
						var pfwd = mapping.forwards[0];

						options["1"].push({
							label: dataLabel(pfwd.operationParameterURI),
							targetParameter: pfwd.eventParameterName,
							sourceParameter: 0,
							mapping: mapping
						});

						var typeParam = pfwd.operationParameterURI;
						var typeParamNorm = pfwd.usesOpParamRange ? pfwd.eventParameterURI : typeParam;

						if(sourceParams.indexOf(pfwd.eventParameterName) == -1)
							sourceParams.push(pfwd.eventParameterName);
						// compRule holds
						compRuleHolds = ri.entity == typeParamNorm;
					}

					if(mapping.parameterSplits) {
						// multiple ways to split one event parameter
						var psplit = mapping.parameterSplits[0];

						// iterate all pairings mentioned in the parameter split
						for(var pairingsIdx = 0, pairing; pairing = psplit.pairings[pairingsIdx]; ++pairingsIdx) {
//							var pairing= psplit.pairings[0];
							var splitInsert = dataLabel(pairing.sourcePropertyURI);

							typeTargetParam = pairing.targetParameterURI;
							typeTargetParamNorm = typeTargetParam;

							if(pairing.usesEvPropertyRange) {
								var _c = containsEntry(pairing, options["2"], "sourceParameter", "sourceParameterName");
								if(!_c || (_c && !containsEntry(pairing, options["2"], "type", "sourcePropertyURI")))
									options["2"].push({
										label: splitInsert,
										targetParameter: pairing.targetParameterName,
										sourceParameter: 0,
										mapping: mapping,
										type: pairing.sourcePropertyURI
									});
							}

							// check if there is already an entry for the targetParameter. if so, dont add a new one
							if(!containsEntry(pairing, options["1"], "targetParameter", "targetParameterName"))
								options["1"].push({
									label: dataLabel(pairing.targetParameterURI),
									targetParameter: pairing.targetParameterName,
									sourceParameter: 0,
									mapping: mapping
								});

							if(sourceParams.indexOf(pairing.sourceParameterName) == -1)
								sourceParams.push(pairing.sourceParameterName);
							compRuleHolds = ri.entity == typeTargetParamNorm;
						}
					}
				}

//				console.debug("number of 'as'-parts: "+options["1"].length);
//				console.debug("number of source parameters:"+sourceParams.length);
//				console.debug("compRule holds? "+compRuleHolds);

				if(compRuleHolds) {
					return {
						mainlabel: "... to " + activityLabel(ri.activity) + " the " + (options["2"].length > 0 ? "%2% of the " : "") + pp(r0.activity) + " " + dataLabel(r0.entity),
						options: options
					};
				} else {
					var dl = dataLabel(ri.entity);

					return {
						mainlabel: "... to " + activityLabel(ri.activity) + dictionary.getArticle(dl) + dl,
						label: " by the " + (options["2"].length > 0 ? "%2% of the " : "") + pp(r0.activity) + " " + dataLabel(r0.entity) + (options["1"].length > 1 ? " as %1%" : ""),
						options: options
					};
				}
			}
		} else {
			// r_i is source

			if(mappings.length == 1) {
				if(r0.entity == ri.entity) {
					var adjective = pp(ri.activity);
					var noun = dataLabel(ri.entity);
					return {label: "... by" + dictionary.getArticle(noun, adjective, true) + adjective + " " + noun};
				} else {
					var mapping = mappings[0];

					var splitInsert = "";
					var typeTargetParam, typeTargetParamNorm, typeSourceParam, typeSourceParamNorm;

					if(mapping.forwards) {
						var fwd = mapping.forwards[0];
						typeSourceParam = fwd.eventParameterURI;
						typeSourceParamNorm = fwd.usesEvParamRange ? fwd.operationParameterURI : typeSourceParam;

						typeTargetParam = fwd.operationParameterURI;
						typeTargetParamNorm = fwd.usesOpParamRange ? fwd.eventParameterURI : typeTargetParam;

						if(ri.entity != typeSourceParam) {
							splitInsert = dataLabel(typeSourceParam) + " of the ";
						}
					}

					if(mapping.parameterSplits) {
						var split = mapping.parameterSplits[0];

						var pairing = split.pairings[0];

						typeTargetParam = pairing.targetParameterURI;
						typeTargetParamNorm = typeTargetParam;

						typeSourceParam = pairing.sourceParameterURI;
						typeSourceParamNorm = typeSourceParam;


						// split rule holds
						if(pairing.usesEvPropertyRange) {
							splitInsert = dataLabel(typeTargetParam) + " of the ";
						}
					}

//					if (typeTargetParamNorm == ri.entity) {
//						// CompRule holds
					var dl = dataLabel(ri.entity);
					return {mainlabel: "... by the " + splitInsert + pp(activityLabel(ri.activity)) + " " + dl};
				}
			} else {
				// multiple mappings -> options required

				var options = {"1": [], "2": []};

				var sourceParams = [];
				var compRuleHolds = false;

				for(var idx = 0, mapping; mapping = mappings[idx]; ++idx) {


					if(mapping.forwards) {
						var pfwd = mapping.forwards[0];

						options["1"].push({
							label: dataLabel(pfwd.operationParameterURI),
							targetParameter: pfwd.eventParameterName,
							sourceParameter: 0,
							mapping: mapping
						});

						var typeParam = pfwd.operationParameterURI;
						var typeParamNorm = pfwd.usesOpParamRange ? pfwd.eventParameterURI : typeParam;

						// compRule holds
						compRuleHolds = ri.entity == typeParamNorm;

						if(sourceParams.indexOf(pfwd.eventParameterName) == -1)
							sourceParams.push(pfwd.eventParameterName);
					}

					// create sub options for each split
					if(mapping.parameterSplits) {
						// multiple ways to split one event parameter
						var psplit = mapping.parameterSplits[0];

						// iterate all pairings mentioned in the parameterSplit
						for(var pairingsIdx = 0, pairing; pairing = psplit.pairings[pairingsIdx]; ++pairingsIdx) {

							//var pairing= psplit.pairings[0];
							var splitInsert = dataLabel(pairing.sourcePropertyURI);

							typeTargetParam = pairing.targetParameterURI;
							typeTargetParamNorm = typeTargetParam;

//							var alreadyPresent= false;
							if(pairing.usesEvPropertyRange) {
								/*
								for (var _lidx=0, _llen=options["2"].length; _lidx < _llen; ++_lidx){
									var _lentry= options["2"][_lidx];
									if (_lentry.targetParameter == pairing.targetParameterName){
										alreadyPresent= true;
										break;
									}
								}
								
								if (!alreadyPresent)*/
								// check if there is already an entry for the targetParameter. if so, dont add a new one
								if(!containsEntry(pairing, options["2"], "targetParameter", "targetParameterName"))
									options["2"].push({
										label: splitInsert,
										targetParameter: pairing.targetParameterName,
										sourceParameter: 0,
										mapping: mapping
									});
							}

							//alreadyPresent= false;
							/*for (var _lidx=0, _llen=options["1"].length; _lidx < _llen; ++_lidx){
								var _lentry= options["1"][_lidx];
								if (_lentry.targetParameter == pairing.targetParameterName){
									alreadyPresent= true;
									break;
								}
							}
							
							if (!alreadyPresent)*/
							// check if there is already an entry for the targetParameter. if so, dont add a new one
							if(!containsEntry(pairing, options["1"], "targetParameter", "targetParameterName"))
								options["1"].push({
									label: dataLabel(pairing.targetParameterURI),
									targetParameter: pairing.targetParameterName,
									sourceParameter: 0,
									mapping: mapping
								});

							compRuleHolds = ri.entity == typeTargetParamNorm;

							if(sourceParams.indexOf(pairing.sourceParameterName) == -1)
								sourceParams.push(pairing.sourceParameterName);
						}
					}
				}

//				console.debug("number of 'as'-parts"+options["1"].length);
//				console.debug("number of source parameters: "+sourceParams.length);
//				console.debug("compRule holds? "+compRuleHolds);

				return {
					mainlabel: "...by the " + (options["2"].length > 0 ? "%2% of the " : "") + pp(ri.activity) + " " + dataLabel(ri.entity) + (options["1"].length > 1 ? " as %1%" : ""),
					options: options
				};
			}
		}
	};
};


/*
 * ~~~~~~~~~~~~~~~~~~ Tests ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 
 */


/*
 * temporary test method
 */
/*this.runPropertyExamples= function(){
	// basic label test
	console.info(this.getInitialLabelForProperty({
		type:"http://example.org/asd.owl#hasStartLocation", 
		value : "<location><name>undefined</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" 
	}));

	console.info(this.getInitialLabelForProperty({
		type:"http://example.org/asd.owl#zoomLevel", 
		value : "13" 
	}));
	
	console.info(this.getInitialLabelForProperty({
		type:"http://example.org/asd.owl#hasCenter", 
		value : "<location><name>undefined</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" 
	}));
	
	console.info(this.getInitialLabelForProperty({
		type:"http://example.org/asd.owl#hasCenter", 
		value : "<location><name>Dresden</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" 
	}));
	
	
	// r_0 is target
	console.info(this.getLabelForConnectibleProperty({
		type:"http://example.org/asd.owl#Location",
		value : "<location><name>Meißen</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>",
		isSource: true
	}, {
		type: "http://example.org/asd.owl#hasStartLocation"
	}));

	// r_0 is source
	console.info(this.getLabelForConnectibleProperty({
		type:"http://example.org/asd.owl#Location",
		value : "<location><name>Meißen</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" 
	}, {
		type: "http://example.org/asd.owl#hasStartLocation"
	}));
	
	
	var propPropWithSplitMappings= [
		{
		    "parameterSplits": [
		        {
		            "eventParameterName": "route",
		            "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		            "hasMediationComponent": false,
		            "pairings": [
		                {
		                    "sourceParameterName": "0",
		                    "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		                    "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
		                    "targetParameterName": "0",
		                    "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
		                    "targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
		                    "hasConvert": false,
		                    "sourceIsDataProp": false,
		                    "sourceParaIsPrimitive": false,
		                    "targetIsDataProp": false,
		                    "usesEvPropertyRange": true
		                }
		            ]
		        }
		    ]
		},
		{
         "parameterSplits": [
             {
                 "eventParameterName": "route",
                 "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
                 "hasMediationComponent": false,
                 "pairings": [
                     {
                         "sourceParameterName": "0",
                         "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
                         "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
                         "targetParameterName": "0",
                         "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
                         "targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
                         "hasConvert": false,
                         "sourceIsDataProp": false,
                         "sourceParaIsPrimitive": false,
                         "targetIsDataProp": false,
                         "usesEvPropertyRange": true
                     }
                 ]
             }
         ]
     }
	];
	
	// prop -> prop with split
	console.info(this.getLabelForConnectibleProperty({
		type:"http://example.org/asd.owl#Route",
		isSource: true
	}, {
		type: "http://example.org/asd.owl#hasCurrentLocation"
	}, propPropWithSplitMappings));

	
	// prop -> prop with split
	console.info(this.getLabelForConnectibleProperty({
		type: "http://example.org/asd.owl#hasCurrentLocation",
		isSource: false
	}, {
		type:"http://example.org/asd.owl#Route",
		isSource: true
	}, propPropWithSplitMappings));

	
	// splitrule
	console.info(this.getLabelForConnectibleCapability({
		type:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
		isSource: true
	}, {
		activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search",
		entity: "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Hotel",
		isSource: false
	}, [{
		parameterSplits: [{
            "eventParameterName": "0",
            "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
            "hasMediationComponent": false,
            "pairings": [
                {
                    "sourceParameterName": "0",
                    "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
                    "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasLocation",
                    "targetParameterName": "0",
                    "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
                    "targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasLocation",
                    "hasConvert": false,
                    "sourceIsDataProp": false,
                    "sourceParaIsPrimitive": false,
                    "targetIsDataProp": false,
                    "usesEvPropertyRange": true
                }
            ]
        }]
	}]));
	
	// compRule
	console.info(this.getLabelForConnectibleCapability({
		type:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		value : "<location><name>Meißen</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" ,
		isSource: true
	}, {
		activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display",
		entity: "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
		isSource: false
	}, [{
		forwards: [{
            "eventParameterName": "0",
            "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
            "operationParameterName": "0",
            "operationParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
            "evParaIsDataProp": false,
            "evParaIsPrimitive": false,
            "hasConvert": false,
            "hasMediationComponent": false,
            "opParaIsDataProp": false,
            "opParaIsPrimitive": false,
            "usesEvParaRange": true,
            "usesOpParaRange": false
        }]
	}]));
	
	
	// SuffixRule Prop -> Cap
	console.info(this.getLabelForConnectibleCapability({
		type:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		value : "<location><name>Meißen</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" ,
		isSource: true
	}, {
		activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search",
		entity: "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		isSource: false
	}, [
		{
			forwards : [{
				"eventParameterName" : "0",
				"eventParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
				"operationParameterName" : "0",
				"operationParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
				"evParaIsDataProp" : false,
				"evParaIsPrimitive" : false,
				"hasConvert" : false,
				"hasMediationComponent" : false,
				"opParaIsDataProp" : false,
				"opParaIsPrimitive" : false,
				"usesEvParaRange" : true,
				"usesOpParaRange" : false
			}]
		},
		{
			forwards : [{
				"eventParameterName" : "0",
				"eventParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
				"operationParameterName" : "1",
				"operationParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
				"evParaIsDataProp" : false,
				"evParaIsPrimitive" : false,
				"hasConvert" : false,
				"hasMediationComponent" : false,
				"opParaIsDataProp" : false,
				"opParaIsPrimitive" : false,
				"usesEvParaRange" : true,
				"usesOpParaRange" : false
			}]
		}
	]));
	
	
	// SuffixRule Prop -> Cap
	console.info(this.getLabelForConnectibleCapability({
		type:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		isSource: true
	}, {
		activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display",
		entity: "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
		isSource: false
	}, [
		{
			"parameterSplits": [
                {
                    "eventParameterName": "0",
                    "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
                    "hasMediationComponent": false,
                    "pairings": [
                        {
                            "sourceParameterName": "0",
                            "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
                            "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
                            "targetParameterName": "0",
                            "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
                            "targetPropertyURI": "null",
                            "hasConvert": false,
                            "sourceIsDataProp": false,
                            "sourceParaIsPrimitive": false,
                            "targetIsDataProp": false,
                            "usesEvPropertyRange": true
                        }
                        
                    ]
                }
            ]
		},
		{
			"parameterSplits": [
                {
                    "eventParameterName": "0",
                    "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
                    "hasMediationComponent": false,
                    "pairings": [
                        {
                            "sourceParameterName": "0",
                            "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
                            "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
                            "targetParameterName": "0",
                            "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
                            "targetPropertyURI": "null",
                            "hasConvert": false,
                            "sourceIsDataProp": false,
                            "sourceParaIsPrimitive": false,
                            "targetIsDataProp": false,
                            "usesEvPropertyRange": true
                        }
                        
                    ]
                }
            ]
		}
	]));
	
	
	// SuffixRule + SplitRule Cap -> Prop
	console.info(this.getLabelForConnectibleCapability({
		type:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		value : "<location><name>Meißen</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" ,
		isSource: false
	}, {
		activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search",
		entity: "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		isSource: true
	}, [
		{
			forwards : [{
				"eventParameterName" : "0",
				"eventParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
				"operationParameterName" : "0",
				"operationParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
				"evParaIsDataProp" : false,
				"evParaIsPrimitive" : false,
				"hasConvert" : false,
				"hasMediationComponent" : false,
				"opParaIsDataProp" : false,
				"opParaIsPrimitive" : false,
				"usesEvParaRange" : true,
				"usesOpParaRange" : false
			}]
		},
		{
			forwards : [{
				"eventParameterName" : "1",
				"eventParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
				"operationParameterName" : "0",
				"operationParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
				"evParaIsDataProp" : false,
				"evParaIsPrimitive" : false,
				"hasConvert" : false,
				"hasMediationComponent" : false,
				"opParaIsDataProp" : false,
				"opParaIsPrimitive" : false,
				"usesEvParaRange" : true,
				"usesOpParaRange" : false
			}]
		}
	]));
	
	
	
	// SuffixRule + SplitRule Cap -> Prop
	console.info(this.getLabelForConnectibleCapability({
		type:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		value : "<location><name>Meißen</name><coordinates><latitude>50.99559767216988</latitude><longitude>13.798377841796876</longitude></coordinates></location>" ,
		isSource: false
	}, {
		activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search",
		entity: "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		isSource: true
	}, [
		{
			parameterSplits: [{
		        "eventParameterName": "0",
		        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		        "hasMediationComponent": false,
		        "pairings": [
		            {
		                "sourceParameterName": "0",
		                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
		                "targetParameterName": "0",
		                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		                "targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		                "hasConvert": false,
		                "sourceIsDataProp": false,
		                "sourceParaIsPrimitive": false,
		                "targetIsDataProp": false,
		                "usesEvPropertyRange": true
		            }
		        ]
		    }]
		},{
			parameterSplits: [{
		        "eventParameterName": "0",
		        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		        "hasMediationComponent": false,
		        "pairings": [
		            {
		                "sourceParameterName": "0",
		                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
		                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
		                "targetParameterName": "0",
		                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		                "targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenterLocation",
		                "hasConvert": false,
		                "sourceIsDataProp": false,
		                "sourceParaIsPrimitive": false,
		                "targetIsDataProp": false,
		                "usesEvPropertyRange": true
		            }
		        ]
		    }]
		}
	]));
};

/*
 * temporary test method 
 */
/*this.runCapExamples= function(){
	
	console.info(this.getInitialLabelForCapability(
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation"}));
	console.info(this.getInitialLabelForCapability(
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"}));

	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location", isSource: true},
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
	    [{
	    	forwards: [{"eventParameterName": "0","eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","operationParameterName": "0","operationParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","evParaIsDataProp": false,"evParaIsPrimitive": false,"hasConvert": false,"hasMediationComponent": false,"opParaIsDataProp": false,"opParaIsPrimitive": false,"usesEvParaRange": false,"usesOpParaRange": false}]
	    }]
    ));
	
	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
		{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location", isSource: true},
	    [{
	    	forwards: [{"eventParameterName": "0","eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","operationParameterName": "0","operationParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","evParaIsDataProp": false,"evParaIsPrimitive": false,"hasConvert": false,"hasMediationComponent": false,"opParaIsDataProp": false,"opParaIsPrimitive": false,"usesEvParaRange": false,"usesOpParaRange": false}]
	    }]
    ));

	console.info("Cap->Cap: Location -> Location (Search Hotel)");
	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location", isSource: true},
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Hotel"},
		[{
			forwards: [{"eventParameterName": "1","eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","operationParameterName": "0","operationParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","evParaIsDataProp": false,"evParaIsPrimitive": false,"hasConvert": false,"hasMediationComponent": false,"opParaIsDataProp": false,"opParaIsPrimitive": false,"usesEvParaRange": false,"usesOpParaRange": false}]
		}]
	));
	
	console.info("Cap->Cap: Location -> Location (Search Hotel, inverse direction)");
	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Hotel"},
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location", isSource: true},
		[{
			forwards: [{"eventParameterName": "1","eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","operationParameterName": "0","operationParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","evParaIsDataProp": false,"evParaIsPrimitive": false,"hasConvert": false,"hasMediationComponent": false,"opParaIsDataProp": false,"opParaIsPrimitive": false,"usesEvParaRange": false,"usesOpParaRange": false}]
		}]
	));

	
	var evToLocation= {
			parameterSplits: [{
					"eventParameterName": "event",
					"eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
					"hasMediationComponent": false,
					"pairings": [
						{
							"sourceParameterName": "1",
							"sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
							"sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasLocation",
							"targetParameterName": "0",
							"targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
							"targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasLocation",
							"hasConvert": false,
							"sourceIsDataProp": false,
							"sourceParaIsPrimitive": false,
							"targetIsDataProp": false,
							"usesEvPropertyRange": true
						}
					]
			}]
		};

	console.info("Cap->Cap: Location -> Location");
	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location", isSource: true},
	    [{
	    	forwards: [{"eventParameterName": "0","eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","operationParameterName": "0","operationParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location","evParaIsDataProp": false,"evParaIsPrimitive": false,"hasConvert": false,"hasMediationComponent": false,"opParaIsDataProp": false,"opParaIsPrimitive": false,"usesEvParaRange": false,"usesOpParaRange": false}]
	    }]
	));

	console.info("Cap->Cap: Event -> Location (Search Hotel)");
	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event", isSource: true},
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Hotel"},
		[evToLocation]
	));

	console.info("Cap->Cap: Event -> Location (inverse direction, search Hotel)");
	console.info(this.generateLabelForCapToCapConnection(
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Hotel"},
	    {activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event", isSource: true},
		[evToLocation]
	));
	
	// Route.{hasDestinationLocation, hasStartLocation} --> hasDestinationLocation, hasStartLocation
	console.info("Cap->Cap: Route.{hasDestinationLocation, hasStartLocation} --> hasDestinationLocation, hasStartLocation");
	console.info(this.generateLabelForCapToCapConnection(
			// r0
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route", isSource: true},
			// ri € T
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
			[
				{
					"parameterSplits":[
	                   {
	                       "eventParameterName": "null",
	                       "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                       "hasMediationComponent": false,
	                       "pairings": [
	                           {
	                               "sourceParameterName": "0",
	                               "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                               "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                               "targetParameterName": "0",
	                               "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                               "targetPropertyURI": "null",
	                               "hasConvert": false,
	                               "sourceIsDataProp": false,
	                               "sourceParaIsPrimitive": false,
	                               "targetIsDataProp": false,
	                               "usesEvPropertyRange": false
	                           },
	                           {
	                               "sourceParameterName": "0",
	                               "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                               "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                               "targetParameterName": "1",
	                               "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                               "targetPropertyURI": "null",
	                               "hasConvert": false,
	                               "sourceIsDataProp": false,
	                               "sourceParaIsPrimitive": false,
	                               "targetIsDataProp": false,
	                               "usesEvPropertyRange": false
	                           }
	                       ]
	                   }
	               ]
				}
			]
	));
	
	
	// test multiple mappings
	
	console.info("Cap->Cap: Location -> hasStartLocation | hasDestinationLocation");
	console.info(this.generateLabelForCapToCapConnection(
		// r0
		{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location", isSource: true},
		// ri € S
		{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route"},
		[{
			forwards : [{
				"eventParameterName" : "0",
				"eventParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
				"operationParameterName" : "0",
				"operationParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
				"evParaIsDataProp" : false,
				"evParaIsPrimitive" : false,
				"hasConvert" : false,
				"hasMediationComponent" : false,
				"opParaIsDataProp" : false,
				"opParaIsPrimitive" : false,
				"usesEvParaRange" : true,
				"usesOpParaRange" : false
			}]
		},
		{
			forwards : [{
				"eventParameterName" : "0",
				"eventParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
				"operationParameterName" : "1",
				"operationParameterURI" : "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
				"evParaIsDataProp" : false,
				"evParaIsPrimitive" : false,
				"hasConvert" : false,
				"hasMediationComponent" : false,
				"opParaIsDataProp" : false,
				"opParaIsPrimitive" : false,
				"usesEvParaRange" : true,
				"usesOpParaRange" : false
			}]
		}]
	));

	
	// Route.{hasDestinationLocation, hasStartLocation} --> location
	console.info("Cap->Cap: Route.{hasDestinationLocation, hasStartLocation} --> location");
	console.info(this.generateLabelForCapToCapConnection(
			// r0
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route", isSource: true},
			// ri € T
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
			[
				{
					"parameterSplits": [
	                    {
	                        "eventParameterName": "0",
	                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                        "hasMediationComponent": false,
	                        "pairings": [
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                                "targetParameterName": "0",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            }
	                            
	                        ]
	                    }
	                ]
				},
				{
					"parameterSplits": [
	                    {
	                        "eventParameterName": "0",
	                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                        "hasMediationComponent": false,
	                        "pairings": [
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                                "targetParameterName": "0",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            }
	                            
	                        ]
	                    }
	                ]
				}
			]
	));
	
	console.info("Cap->Cap: Event -> hasLocation, hasTime");
	console.info(this.generateLabelForCapToCapConnection(
			// r0
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route", isSource: true},
			// ri € S
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Select", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event"},
			[{
				"parameterSplits": [
                    {
                        "eventParameterName": "null",
                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
                        "hasMediationComponent": false,
                        "pairings": [
                            {
                                "sourceParameterName": "0",
                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasLocation",
                                "targetParameterName": "1",
                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasLocation",
                                "targetPropertyURI": "null",
                                "hasConvert": false,
                                "sourceIsDataProp": false,
                                "sourceParaIsPrimitive": false,
                                "targetIsDataProp": false,
                                "usesEvPropertyRange": false
                            },
                            {
                                "sourceParameterName": "0",
                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Event",
                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasTime",
                                "targetParameterName": "0",
                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasTime",
                                "targetPropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasTime",
                                "hasConvert": false,
                                "sourceIsDataProp": true,
                                "sourceParaIsPrimitive": false,
                                "targetIsDataProp": true,
                                "usesEvPropertyRange": false
                            }
                        ]
                    }
                ]
		}]
	));
	
	
	// Route.{hasDestinationLocation, hasStartLocation} --> location, location
	console.info("Cap->Cap: Route.{hasDestinationLocation, hasStartLocation} --> hasCenter, hasCurrentLocation");
	console.info(this.generateLabelForCapToCapConnection(
			// r0
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
			// ri € T
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route", isSource: true},
			[
				{
					"parameterSplits": [
	                    {
	                        "eventParameterName": "0",
	                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                        "hasMediationComponent": false,
	                        "pairings": [
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                                "targetParameterName": "0",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenter",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            },
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                                "targetParameterName": "1",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            }
	                        ]
	                    }
	                ]
				},
				{
					"parameterSplits": [
	                    {
	                        "eventParameterName": "0",
	                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                        "hasMediationComponent": false,
	                        "pairings": [
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                                "targetParameterName": "1",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            },
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                                "targetParameterName": "0",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenter",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            }
	                        ]
	                    }
	                ]
				}
			]
	));
	
	
	// Route.{hasDestinationLocation, hasStartLocation} --> location, location
	console.info("Cap->Cap: Route.{hasDestinationLocation, hasStartLocation} --> hasCenter, hasCurrentLocation (inverse)");
	console.info(this.generateLabelForCapToCapConnection(
			// r0
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Search", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route", isSource: true},
			// ri
			{activity: "http://mmt.inf.tu-dresden.de/models/activity-actions.owl#Display", entity:"http://mmt.inf.tu-dresden.de/cruise/travel.owl#Location"},
			[
				{
					"parameterSplits": [
	                    {
	                        "eventParameterName": "0",
	                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                        "hasMediationComponent": false,
	                        "pairings": [
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                                "targetParameterName": "0",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenter",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            },
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                                "targetParameterName": "1",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            }
	                        ]
	                    }
	                ]
				},
				{
					"parameterSplits": [
	                    {
	                        "eventParameterName": "0",
	                        "eventParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                        "hasMediationComponent": false,
	                        "pairings": [
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasStartLocation",
	                                "targetParameterName": "1",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCurrentLocation",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            },
	                            {
	                                "sourceParameterName": "0",
	                                "sourceParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#Route",
	                                "sourcePropertyURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasDestinationLocation",
	                                "targetParameterName": "0",
	                                "targetParameterURI": "http://mmt.inf.tu-dresden.de/cruise/travel.owl#hasCenter",
	                                "targetPropertyURI": "null",
	                                "hasConvert": false,
	                                "sourceIsDataProp": false,
	                                "sourceParaIsPrimitive": false,
	                                "targetIsDataProp": false,
	                                "usesEvPropertyRange": true
	                            }
	                        ]
	                    }
	                ]
				}
			]
	));
};*/