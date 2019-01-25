(function() {
	var fetch, DOMParser;
	if(typeof(module)!=="undefined") {
		fetch = require("node-fetch");
		DOMParser = require('xmldom').DOMParser;
	}

	const 
		_copy = data => {
			const type = typeof(data);
			if(data && type==="object") {
				return Object.keys(data).reduce((accum,key) => { accum[key] = _copy(data[key]); return accum; },{});
			}
			return data;
		},
		// remove puntuation except possible : and return space separated tokens
		_tokenize = (value,isObject) => (value.replace(new RegExp(`[^A-Za-z0-9\\s${isObject ? "\:" : ""}]`,"g"),"").replace(/  +/g," ").toLowerCase().split(" ")),
		// return an array of possible misspelling for a word based on common patterns of error
		// will often return uncommon misspellings, but that's ok, it keeps the code simple without a dictionary
		_misspellings = (value,compress) => {
			const results = [];
			if(compress) {
			// remove double letter occurrance, e.g. occurance vs ocurance
				const dedoubled = Object.values(value).reduce((accum,char) => accum[accum.length-1]===char ? accum : accum += char,"");
				if(dedoubled!==value) {
					value = dedoubled;
					results.push(dedoubled)
				}
			}
			// common misspelling signatures
			if(value.includes("ie")) results.push(value.replace(/ie/g,"ei"));
			if(value.includes("ei")) results.push(value.replace(/ei/g,"ie"));
			if(value.includes("ea") && !value[0]==="e" && !value[value.length-1]==="a") results.push(value.replace(/ea/g,"e"));
			if(value.includes("sc") && !value[0]==="s" && !value[value.length-1]==="c") results.push(value.replace(/sc/g,"c"));
			if(value.includes("os") && !value[0]==="o" && !value[value.length-1]==="s") results.push(value.replace(/os/g,"ous"));
			if(value.endsWith("ery")) results.push(value.substring(0,value.length-3)+"ary");
			if(value.includes("ite")) results.push(value.replace(/ite/g,"ate"));
			if(value.endsWith("ent")) results.push(value.substring(0,value.length-3)+"ant");
			if(value.endsWith("eur")) results.push(value.substring(0,value.length-3)+"er");
			if(value.endsWith("for")) results.push(value+"e");
			if(value.startsWith("gua")) results.push("gau"+value.substring(4));
			if(value.endsWith("oah")) results.push(value.substring(0,value.length-3)+"aoh");
			if(value.endsWith("ally")) results.push(value.substring(0,value.length-4)+"ly");
			if(value.endsWith("ence")) results.push(value.substring(0,value.length-4)+"ance");
			if(value.endsWith("fore")) results.push(value.substring(0,value.length-1));
			if(value.endsWith("ious")) results.push(value.substring(0,value.length-4)+"ous");
			if(value.endsWith("guese")) results.push(value.substring(0,value.length-4)+"gese");
			if(value.endsWith("ible")) results.push(value.substring(0,value.length-4)+"able");
			if(value.startsWith("busi")) results.push("buis"+value.substring(5));
			if(value.startsWith("fore")) results.push("for"+value.substring(5));
			if(value.startsWith("fluor")) results.push("flor"+value.substring(5));
			if(value.startsWith("propa")) results.push("propo"+value.substring(5));
			return results;
		},
		// remove vowels from a word
		_disemvowel = value => value.replace(/[AEIOUaeiou]+/g,""),
		// disemvowel and remove spaces
		_compress = value => Object.values(_disemvowel(value)).reduce((accum,char) => accum[accum.length-1]===char ? accum : accum += char,"");
		// join all the tokens together and return an array of three letter sequences, stepping through string one char at a time
		_trigrams = tokens => {
			const grams = [],
				str = Array.isArray(tokens) ? tokens.join("") : tokens+"";
			for(let i=0;i<str.length-2;i++) {
					grams.push(str.substring(i,i+3));
			}
			return grams;
		}

	//stemmer adapted from from https://github.com/words/stemmer MIT License, Titus Wormer
	/* Character code for `y`. */
	var CC_Y = 'y'.charCodeAt(0);

	/* Standard suffix manipulations. */
	var step2list = {
	  ational: 'ate',
	  tional: 'tion',
	  enci: 'ence',
	  anci: 'ance',
	  izer: 'ize',
	  bli: 'ble',
	  alli: 'al',
	  entli: 'ent',
	  eli: 'e',
	  ousli: 'ous',
	  ization: 'ize',
	  ation: 'ate',
	  ator: 'ate',
	  alism: 'al',
	  iveness: 'ive',
	  fulness: 'ful',
	  ousness: 'ous',
	  aliti: 'al',
	  iviti: 'ive',
	  biliti: 'ble',
	  logi: 'log'
	};

	var step3list = {
	  icate: 'ic',
	  ative: '',
	  alize: 'al',
	  iciti: 'ic',
	  ical: 'ic',
	  ful: '',
	  ness: ''
	};

	/* Consonant-vowel sequences. */
	var consonant = '[^aeiou]';
	var vowel = '[aeiouy]';
	var consonantSequence = '(' + consonant + '[^aeiouy]*)';
	var vowelSequence = '(' + vowel + '[aeiou]*)';

	var MEASURE_GT_0 = new RegExp(
	  '^' + consonantSequence + '?' + vowelSequence + consonantSequence
	);

	var MEASURE_EQ_1 = new RegExp(
	  '^' + consonantSequence + '?' + vowelSequence + consonantSequence +
	  vowelSequence + '?$'
	);

	var MEASURE_GT_1 = new RegExp(
	  '^' + consonantSequence + '?' +
	  '(' + vowelSequence + consonantSequence + '){2,}'
	);

	var VOWEL_IN_STEM = new RegExp(
	  '^' + consonantSequence + '?' + vowel
	);

	var CONSONANT_LIKE = new RegExp(
	  '^' + consonantSequence + vowel + '[^aeiouwxy]$'
	);

	/* Exception expressions. */
	var SUFFIX_LL = /ll$/;
	var SUFFIX_E = /^(.+?)e$/;
	var SUFFIX_Y = /^(.+?)y$/;
	var SUFFIX_ION = /^(.+?(s|t))(ion)$/;
	var SUFFIX_ED_OR_ING = /^(.+?)(ed|ing)$/;
	var SUFFIX_AT_OR_BL_OR_IZ = /(at|bl|iz)$/;
	var SUFFIX_EED = /^(.+?)eed$/;
	var SUFFIX_S = /^.+?[^s]s$/;
	var SUFFIX_SSES_OR_IES = /^.+?(ss|i)es$/;
	var SUFFIX_MULTI_CONSONANT_LIKE = /([^aeiouylsz])\1$/;
	var STEP_2 = new RegExp(
	  '^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|' +
	  'ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|' +
	  'biliti|logi)$'
	);
	var STEP_3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
	var STEP_4 = new RegExp(
	  '^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|' +
	  'iti|ous|ive|ize)$'
	);

	/* Stem `value`. */
	function _stemmer(value) {
	  var firstCharacterWasLowerCaseY;
	  var match;

	  value = String(value).toLowerCase();

	  /* Exit early. */
	  if (value.length < 3) {
	    return value;
	  }

	  /* Detect initial `y`, make sure it never matches. */
	  if (value.charCodeAt(0) === CC_Y) {
	    firstCharacterWasLowerCaseY = true;
	    value = 'Y' + value.substr(1);
	  }

	  /* Step 1a. */
	  if (SUFFIX_SSES_OR_IES.test(value)) {
	    /* Remove last two characters. */
	    value = value.substr(0, value.length - 2);
	  } else if (SUFFIX_S.test(value)) {
	    /* Remove last character. */
	    value = value.substr(0, value.length - 1);
	  }

	  /* Step 1b. */
	  if (match = SUFFIX_EED.exec(value)) {
	    if (MEASURE_GT_0.test(match[1])) {
	      /* Remove last character. */
	      value = value.substr(0, value.length - 1);
	    }
	  } else if ((match = SUFFIX_ED_OR_ING.exec(value)) && VOWEL_IN_STEM.test(match[1])) {
	    value = match[1];

	    if (SUFFIX_AT_OR_BL_OR_IZ.test(value)) {
	      /* Append `e`. */
	      value += 'e';
	    } else if (SUFFIX_MULTI_CONSONANT_LIKE.test(value)) {
	      /* Remove last character. */
	      value = value.substr(0, value.length - 1);
	    } else if (CONSONANT_LIKE.test(value)) {
	      /* Append `e`. */
	      value += 'e';
	    }
	  }

	  /* Step 1c. */
	  if ((match = SUFFIX_Y.exec(value)) && VOWEL_IN_STEM.test(match[1])) {
	    /* Remove suffixing `y` and append `i`. */
	    value = match[1] + 'i';
	  }

	  /* Step 2. */
	  if ((match = STEP_2.exec(value)) && MEASURE_GT_0.test(match[1])) {
	    value = match[1] + step2list[match[2]];
	  }

	  /* Step 3. */
	  if ((match = STEP_3.exec(value)) && MEASURE_GT_0.test(match[1])) {
	    value = match[1] + step3list[match[2]];
	  }

	  /* Step 4. */
	  if (match = STEP_4.exec(value)) {
	    if (MEASURE_GT_1.test(match[1])) {
	      value = match[1];
	    }
	  } else if ((match = SUFFIX_ION.exec(value)) && MEASURE_GT_1.test(match[1])) {
	    value = match[1];
	  }

	  /* Step 5. */
	  if (
	    (match = SUFFIX_E.exec(value)) &&
	    (MEASURE_GT_1.test(match[1]) || (MEASURE_EQ_1.test(match[1]) && !CONSONANT_LIKE.test(match[1])))
	  ) {
	    value = match[1];
	  }

	  if (SUFFIX_LL.test(value) && MEASURE_GT_1.test(value)) {
	    value = value.substr(0, value.length - 1);
	  }

	  /* Turn initial `Y` back to `y`. */
	  if (firstCharacterWasLowerCaseY) {
	    value = 'y' + value.substr(1);
	  }

	  return value;
	}


	var STOPWORDS = [
	  'a', 'about', 'after', 'ala', 'all', 'also', 'am', 'an', 'and', 'another', 'any', 'are', 
	  'around','as', 'at', 'be',
	  'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'came', 'can',
	  'come', 'could', 'did', 'do', 'each', 'for', 'from', 'get', 'got', 'has', 'had',
	  'he', 'have', 'her', 'here', 'him', 'himself', 'his', 'how', 'i', 'if', 'iff', 'in', 
	  'include', 'into',
	  'is', 'it', 'like', 'make', 'many', 'me', 'might', 'more', 'most', 'much', 'must',
	  'my', 'never', 'now', 'of', 'on', 'only', 'or', 'other', 'our', 'out', 'over',
	  'said', 'same', 'see', 'should', 'since', 'some', 'still', 'such', 'take', 'than',
	  'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
	  'through', 'to', 'too', 'under', 'up', 'very', 'was', 'way', 'we', 'well', 'were',
	  'what', 'where', 'which', 'while', 'who', 'with', 'would', 'you', 'your'];

	// return all the values in an object's properties concatenated into a space separated string
	// include the property names followed by :
	function _toText(objectOrPrimitive,seen=new Set()) {
		if(objectOrPrimitive && typeof(objectOrPrimitive)==="object" && !seen.has(objectOrPrimitive)) {
			seen.add(objectOrPrimitive);
			return Object.keys(objectOrPrimitive)
				.reduce((accum,key) => accum +=  key + ": " + _toText(objectOrPrimitive[key],seen),"");
		}
		return objectOrPrimitive;
	}

	// convert ids into numbers if possible
	function _coerceId(id) {
		try {
			return JSON.parse(id);
		} catch(e) {
			return id;
		}
	}

	function Txi({stops,stems=true,trigrams=true,compressions=true,misspellings=true}={}) {
		const defaults = {stops,stems,trigrams,compressions,misspellings};
		// ensure Txi is called with the new operator
		if(!this || !(this instanceof Txi)) {
			return new Txi(defaults);
		}
		
		// create stop map from array, stop words are not indexed
		stops = (defaults.stops||STOPWORDS).reduce((accum,word) => { accum[word] = true; return accum;},{});
		
		const keys = {};
		
		// the map to store the index, which is of the form
		// {[<characterSequence>:{<id>:{stems:<count>,trigrams:<count>,compressions:<count>}}[,...]}
		let keycount = 0,
			index = {}
		
		// add words to the stop map created during instantiation
		this.addStops = (...words) => { words.forEach((word) => stops[word] = true); return this; }
		this.compress = () => {
			const onchange = this.onchange || (() => {})
			Object.keys(index)
				.forEach(word => {
					const entry = index[word],
						ids = Object.keys(entry);
					let changed;
					ids.forEach(id => {
						if(entry[id].stems===0 && entry[id].trigrams===0 && entry[id].compressions===0) {
							delete entry[id];
							changed = true;
						}
					});
					if(Object.keys(entry).length===0) {
						delete index[word];
						delete keys[word];
						onchange({[word]:null});
						keycount--;
					} else if(changed) {
						onchange([word],entry);
					}
				});
			return this;
		}
		// remove words from the stop map
		this.removeStops = (...words) => { 
			words.forEach((word) => delete stops[word]); 
			return this; 
		}
		// remove the provided ids from the index
		this.remove = (...ids) => {
			const onchange = this.onchange || (() => {})
			ids.forEach(id => Object.keys(index).forEach(word => { 
				if(index[word][id]) { 
					delete index[word][id];
					onchange({[word]:{[id]:{stems:0,trigrams:0,compressions:0}}})
				}}));
			return this;
		}
		// return the index so that the calling program can perhaps store it somewhere
		this.getIndex = () => _copy(index);
		this.getKeys = () => keys;
		this.getKeyCount = () => keycount;
		// set the index, in case the calling program is loading it from somewhere
		this.setIndex = newIndex => { 
			index = _copy(newIndex);
			keycount = 0;
			Object.assign(keys,Object.keys(index).reduce((accum,key) => { accum[key] = true; keycount++; return accum; }, {}));
			return this; 
		}
		// function to call every time an index entry is updated
		// called which can be used to update an external data structure using Object.assign(external,updates);
		// alternatively,it can be decomposed so that more precise updating of say a Redis store can be done incrementally
		this.onchange = defaults.onchange;
		// create an index entry with id by indexing objectOrText
		// use the id, perhaps a URL< to lookup the full object when it is returned in search results
		this.index = function(id,objectOrText,{stems=defaults.stems,trigrams=defaults.trigrams,compressions=defaults.compressions,misspellings=defaults.misspellings}=defaults) {
			const  type = typeof(objectOrText);
			if(!objectOrText || !(type==="string" || type==="object")) {
				return;
			}
			if(type==="object") {
				stems = true;
			}
			const tokens = objectOrText ? _tokenize(_toText(objectOrText),type==="object") : [],
				stemmed = (stems || type==="object" ? tokens.map(token => _stemmer(token)) : tokens).filter(stem => !stops[stem]),
				noproperties = stemmed.filter(token => token[token.length-1]!==":"),
				grams = trigrams ? _trigrams(noproperties) : [],
				misspelled = (misspellings ? noproperties.reduce((accum,stem) => accum.concat(_misspellings(stem,true)),[]) : []).filter(word => !grams.includes(word)),
				compressed = compressions ? noproperties.reduce((accum,stem) => accum.concat(_compress(stem)),[]).concat(misspelled.reduce((accum,stem) => accum.concat(_compress(stem)),[])) : [],
				onchange = this.onchange || (() => {});
			let changes,
				count = 0;
			stemmed.concat(misspelled).concat(compressed).forEach((word) => {
					if(!stops[word]) {
						let node = index[word],
							change;
						if(stems && (stemmed.includes(word) || misspelled.includes(word))) {
							if(!node) {
								node = index[word] = {};
								keys[word] = true;
								count++;
							}
							if(!node[id]) {
								node[id] =  {stems:0,trigrams:0,compressions:0};
							}
							node[id].stems++;
							change = node[id];
						}
						if(compressions && compressed.includes(word)) {
							if(!node) {
								node = index[word] = {};
								keys[word] = true;
								count++;
							}
							if(!node[id]) {
								node[id] =  {stems:0,trigrams:0,compressions:0};
							}
							node[id].compressions++;
							change = node[id];
						}
						if(!changes) {
							changes = {};
						}
						if(!changes[word]) {
							changes[word] = {};
						}
						changes[word][id] = change;
					}
				});
			grams.forEach((word) => {
				if(!stops[word]) {
					let node = index[word];
					if(!node) {
						node = index[word] = {};
						keys[word] = true;
						count++;
					}
					if(!node[id]) {
						node[id] = {stems:0,trigrams:0,compressions:0};
					}
					node[id].trigrams++;
					if(!changes) {
						changes = {};
					}
					if(!changes[word]) {
						changes[word] = {};
					}
					changes[word][id] = node[id];
				}
			});
			if(changes) onchange(changes);
			keycount += count;
			return this;
		}
		// return a sorted array of search results matching the provided objectOrText
		this.search = function(objectOrText,{stems=defaults.stems,trigrams=defaults.trigrams,compressions=defaults.compressions,misspellings=defaults.misspellings}=defaults) {
			const  type = typeof(objectOrText);
			if(!objectOrText || !(type==="string" || type==="object")) {
				return [];
			}
			if(type==="object") {
				stems = true;
			}
			const	tokens = objectOrText ? _tokenize(_toText(objectOrText),type==="object") : [],
				stemmed = (stems || type==="object" ? tokens.map(token => _stemmer(token)) : tokens).filter(stem => !stops[stem]),
				noproperties = stemmed.filter(token => token[token.length-1]!==":"),
				grams = trigrams ? _trigrams(noproperties) : [],
				compressed = compressions ? noproperties.map(stem => _compress(stem)) : [];
				results = stemmed.concat(grams).concat(compressed).reduce((accum,word) => {
					if(!stops[word]) {
						const node = index[word];
						if(node) {
							Object.keys(node).forEach(id => {
								if(!accum[id]) {
									accum[id] = {score:0,count:0,stems:{},trigrams:{},compressions:{}};
								}
								let count = 0;
								if(stems && stemmed.includes(word)) {
									if(!accum[id].stems[word]) {
										accum[id].stems[word] = 0;
									}
									accum[id].stems[word] += node[id].stems;
									accum[id].score += node[id].stems;
									count = 1;
								}
								if(trigrams && grams.includes(word)) {
									if(!accum[id].trigrams[word]) {
										accum[id].trigrams[word] = 0
									}
									const score = node[id].trigrams * .5;
									accum[id].trigrams[word] += score;
									accum[id].score += score;
								}
								if(compressions && compressed.includes(word)) {
									if(!accum[id].compressions[word]) {
										accum[id].compressions[word] = 0;
									}
									const score = node[id].compressions * .75;
									accum[id].compressions[word] += score;
									accum[id].score += score;
									count || (count = 1);
								}
								accum[id].count += count;
							});
						}
					}
					return accum;
					},{});
				const properties = type==="object" ? Object.keys(objectOrText) : [];
				return Object.keys(results)
					.reduce((accum,id) => {
						const result = results[id];
						if(result.score>0) {
							// if matching an object, find at least one top level matching property name
							// and a matched stem value that is not a property name
							if(type==="object") {
								if(properties.some(property => result.stems[property+":"]) 
										&& Object.keys(result.stems).some(key => !properties.includes(key.substring(0,key.length-1)))) {
									accum.push(Object.assign({id:_coerceId(id)},result));
								}
							} else {
								accum.push(Object.assign({id:_coerceId(id)},result));
							}
						}
						return accum;
					},[])
					.sort((a,b) => b.score - a.score);
		}
	}
	
	if(typeof(module)!=="undefined") module.exports = Txi;
	if(typeof(window)!=="undefined") window.Txi = Txi;
	
}).call(this);
