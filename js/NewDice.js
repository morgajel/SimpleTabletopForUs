//Dice Roller, How The Trick Is Done:
//Objects: 
//	DiceRoller.roll(): Does the each of the following in order.
//	PreProcess	->	Does things like take labels off.
//	Macros		->	Methods for substituting text for dice strings.
//	Tokenizer	-> 	Methods for how you want to break the dice strings up.
//	SpecialDice	->	How you want your dice to roll (regular, exploding, advantage, hack master, ect...)
//	DiceMath	->	Methods for adding and subtracting multiplying and dividing.	
//	FormatResult->  Customize how you want your result to be formatted.
//
//	Details: 
//	DiceRoller:
//		roll		->	Takes the dice string, returns a result string.
//	
//	Macros:
//		macros{}	->	A object that contains lists of replacements, and the order to replace things in.
//		apply		-> 	Runs through macros replacing values with other values.
//
//	PreProcess:
//		Labels{}	->	Holds all the items that were stripped off for formatting.
//		process()	->	Runs the macros.  Strips off labels.  Returns a clean dice string ready for tokenization.
//		
//	Tokenizer:
//		diceTokens[]->	An array of dice tokens.
//		getToken	->	Returns the construct that generically is a token.
//		tokenize	->	Splits up the dice string based on word boundries.  Preforms some basic validation to determine
//						that things can parse correctly, then sets the diceTokens array.
//						Should look to SpecialDice and DiceMath for valid dice and math operators.
//	
//	SpecialDice:
//		diceOps{}	->	An object that contains functions where the function name is the operation token and takes two 
//						parameters, the value before the op (normally number of dice) and the value after the op 
//						(normally the sides of the dice).  The function should return the value of the roll.
//						var diceOps = {
//							"d": function(x,y) {return normalRoll(x,y);},
//							"ad": function(x,y) {return advantageRoll(x,y);},
//							"dd": function(x,y) {return disadvantageRoll(x,y);},
//							"d!": function(x,y) {return explodingDice(x,y);},
//							"lf": function(x,y) {return lowFudge(x,y);},
//							"hf": function(x,y) {return highFudge(x,y);},
//						};
//						Configure this object to accept all the types of dice you want to handle, or override the 
//						default roll styles.
//	
//	DiceMath:
//		mathOps{}	-> 	An object that contains all the mathmatical operations to perform, in the same form as diceOps.
//						You'll probably not bother configuring this one that much unless you're playing a game with 
//						factorials or something crazy in it.
//		doMath		-> 	Takes the tokens (from Tokenizer.diceTokens) and performs math using the following order of
//						operations.  Parenthesis, Dice Rolls, Multiplication / Division, Addition / Subtraction.
//	
//	FormatResult:			
//		formatDice	->  Takes a value, and the number of sides on the dice.  Returns correctly formatted text/html.
//		formatTokens->	Takes 3 strings and concatnates them, or does other things.
//		formatAll	->	Takes the final result token and formats it's text (final pass).
//
//Objectives:
//	Configurable math ops.
//	Configurable dice ops.
//	Configurable formatting ops.
//	Jquery plugin ready.
//	Jasmine tests.
//	Done "right"
//	

/*
 *  The STFU Namespace.
 *	Simple Tabletop For Us.
 */
if (!STFU) {
	var STFU = {};
}	

/*
 * DiceRoller
 * Responsible for taking a dice string and returning formatted results.
 */
STFU.DiceRoller = function(){

	/*
	 *	DiceRoller.Macros
	 *	Methods for substituting text for dice strings.
	 */
	var _macros = function(){
		
		var macros = {};
		function apply(diceText){
			if (!macros.processOrder){
				return diceText;	// If nothing is loaded just return.
			}
			for(var i = 0; i < macros.processOrder.length; i++){
				diceText = _replaceCategory(macros[macros.processOrder[i]], diceText);
			}
			return diceText;
		}	
		function setMacros(macroJSON){
			var tmpMacros = JSON.parse(macroJSON);
			_validate(tmpMacros);
			macros = tmpMacros;	
		}
		function getMacros(){
			return JSON.stringify(macros);	
		}
		
		function _validate(macroObj){
			if (!macroObj){
				throw "Invalid Macro";
			}
			if (!macroObj.processOrder){
				throw "The order to process the replacements is undefined (processOrder)";
			}
			for (var i = 0; i < macroObj.processOrder.length; i++){
				if (!macroObj[macroObj.processOrder[i]]){
					throw "Missing element to process: " + macroObj.processOrder[i];
				}
			}
		}
		function _replaceCategory(macroCategory, diceText){	
			for (var mod in macroCategory){
				var search = RegExp("\\b" + mod + "\\b", "g");
				var replace = macroCategory[mod].toString();
				diceText = diceText.replace(search, replace);
			}
			return diceText;		
		}
		
		return {
			macros : macros,
			setMacros : setMacros,
			getMacros : getMacros,
			apply : apply
		};
	}();
	
	/*
	 *	DiceRoller.PreProcess
	 *	Takes the dice string, strips the labels off and stores them for later (formatting) use.
	 */
	var _preProcess = function(){
		
		var labels = {};
		function process(diceText){
			this.labels = {mainLabel : ""};
			diceText = _macros.apply(diceText);
			diceText = _normalizeDiceString(diceText);
			diceText = _pullOffLabels(diceText);
			return diceText;
		}
		
		function _normalizeDiceString(dice){	
			dice = dice.split(" ").join("")		// Remove whitespace
			dice = dice.replace("++", "+");		// Play nice with a common dice modifier typo.
			return dice;
		}
		function _pullOffLabels(diceText){			
			var wordsThatEndInColon = /\b\w+[:]\b/;
			var wordFollowedByColon = /\b\w+\b(?=[:])/;
			
			labels.mainLabel = (diceText.match(wordFollowedByColon) || [""])[0];			
			diceText = diceText.replace(wordsThatEndInColon, "");
			
			return diceText;
		}
		
		return {
			labels : labels,
			process : process
		};
	}();
	
	/*
	 *	DiceRoller.Tokenizer
	 *  Methods for how you want to break the input up into parsable tokens.
	 */
	var _tokenizer = function(){
		
		var diceTokens = [];
		function getToken(txt, val){		
			if (val !== 0){
				val = val || parseInt(txt);
			}
			return {value: val, text: txt};
		}
		function tokenize(diceText){
			if (!diceText){
				diceTokens = [];
				return;
			}
			
			this.diceTokens = _tokenParse(diceText);			
			_validateTokens(this.diceTokens);
		}	
		function _tokenParse(diceText){			
			// Remove white space except for at the begining and end.
			// The whitespace at the ends is to help operator detection.
			diceText = " " + diceText.split(" ").join("") + " ";
			
			// Change minus to plus a negative "+-" 
			// It's the difference between a negative number and an operator.
			diceText = diceText.replace(/- */,'+-');
			
			// Pull all the distinct numbers into an array.
			var nums = diceText.match(/[0-9-\.]+/g);
			if (!nums){
				throw "What is this?";
			}
			
			// Anything between numbers is an operator.			
			var ops = diceText.split(/[0-9-\.]+/);
			
			var tokens = [];
			for (var i = 0; i < ops.length; i++){
				if (ops && ops[i] !== " "){	
					_pushOp(ops[i], tokens);	// Operations.
				}
				if (nums.length > i && nums[i] !== " "){					
					tokens.push(getToken(nums[i]));	// Numbers.
				}
			}

			// Note: The whole replacing - with +- can lead to an operator(+) 
			// being the first token.  This would probably produce weird 
			// results so I get rid of it before parsing.
			if (tokens[0].text == " +"){
				tokens = tokens.slice(1);
			}
			return tokens;
		}
		function _pushOp(op, tokens){		
			// Handles creating operation tokens and the exceptions associated 
			// with parenthesis.
			
			var parens = op.match(/[\(|\)]/g);
			if (!parens){			
				// Normal operation.  Push and get out.
				tokens.push(getToken(op));	
				return;	
			}
			
			// Has parens so it needs special treatment.			
			// Parse out the non-paren values.
			// Cases: ")", "(", ") ", " (", "+(", ")+", ")+("
			var nonParens = op.split(/[\(|\)]/);
			
			// At this point parens can equal [")"] ["("].  
			// The parens are in the order that they appear.
			
			// nonParens can equal ["op"] [" "] [""]
			// ["op"] is a valid operator that needs to be pushed on the stack.
			// [" "] means the start or end of the line.			
			// [""] indicates nothing or an implied operator.
			
			for (var i=0; i < nonParens.length; i++){
				// Push the operator.
				if (nonParens[i] !== "" && nonParens[i] !== " "){
					tokens.push(getToken(nonParens[i]));
				}
				if (parens[i]){				
					// If there's no operation or end of line whitespace before 
					// the opening paren then we do implied multiplication.					
					if (parens[i] == "(" && (nonParens[i] == "")){
						nonParens[i] == "*";	// Tag it as multiplication.
						tokens.push(getToken("*"));	
					}
					
					// Push the actual token
					tokens.push(getToken(parens[i]));
					
					// If there's no operation or end of line whitespace after 
					// the closing paren then we do implied multiplication.
					if (parens[i] == ")" && (nonParens[i + 1] == "")){
						// Mark the implied multiplication and it will get 
						// pushed on the next itteration.
						nonParens[i + 1] = "*";	
					}
				}
			}
		}
		function _validateTokens(tokens){
			for (var i = 0; i < tokens.length; i++){
				if (isNaN(tokens[i].value)){
					var op = tokens[i].text;
					if (typeof(_specialDice.diceOps[op]) == "function"){
						continue;	// It's a dice roll.
					}
					if (typeof(_diceMath.mathOps[op]) == 'function'){
						continue;	// It's math op.
					}
					if (op == ")" || op == "("){
						continue;	// It's a parenthesis.
					}
					throw "Unknown operation: " + op;
				}
			}
		}
		
		return {
			diceTokens : diceTokens,
			getToken : getToken,
			tokenize : tokenize	
		};
	}();
	
	/*
	 *	DiceRoller.FormatResult 
	 * Customize how you want your result to be formatted.
	 */
	var _formatResult = function(){
		// TODO: This is just hacked in there.
		// 		 Needs polish and features.
		
		function formatDice(result, sides){
			// Takes a value, and the number of sides on the dice.  
			// Returns correctly formatted text/html.
			return "[" + result + " on a d" + sides + "]";
		}
		function formatTokens(txt1, opTxt, txt2){
			// Takes 3 strings, returns one.
			var txt = txt1 + opTxt + txt2;
			return txt.replace("+-", "-");	// Makes things pretty.
		}
		function formatAll(finalToken){
			if (!finalToken){
				return "No Result.";
			}
			// Takes the final result token and formats it into text/html.
			return finalToken.value + " => " + finalToken.text;
		}
		
		return {
			formatDice : formatDice,
			formatTokens : formatTokens,
			formatAll : formatAll	
		};
	}();
	
	/*
	 *	DiceRoller.SpecialDice	
	 *	How you want your dice to roll (regular, exploding, advantage, hack master, ect...)
	 */
	var _specialDice = function(){
		// TODO: Normal dice work, need to test the other kinds of dice.
		//		 Spend some time cleaning this mess up.
		
		var getToken = _tokenizer.getToken;
		var format = _formatResult.formatDice;	
		var diceOps = {
			"d": function(x,y) {return _normal(x,y);},
			"pd": function(x,y) {return _penetrating(x,y);},
			"ed": function(x,y) {return _exploding(x,y);},
			"lf": function(x,y) {return _lowFudge(x,y);},
			"hf": function(x,y) {return _highFudge(x,y);},
			"ad": function(x,y) {return _advantageDice(x,y);},
			"dd": function(x,y) {return _disadvantageDice(x,y);}
		};
		var _seed = 0;
		function rollADice(sides){
			// Note: I was getting a lot of weird results where the exact same
			// 		 number was coming out of Math.random() multiple times.
			//		 I hope i'm not making a wtf here, but this should fix it.
			_seed = (_seed + Math.random()) % 1;
			return Math.ceil(sides * _seed);
		}
		
		function _advantageDice(numberOfDice, sidesOnTheDice){
			// Rolls each dice twice and takes the highest value.
				
			var foldedToken = getToken("",0);
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				var result1 = rollADice(sidesOnTheDice);
				var result2 = rollADice(sidesOnTheDice);
				var dieResult = result1;
				if (result1 < result2){
					dieResult = result2;
				}
					
				foldedToken.text += "[" + result1 + "|" + result2 + "]";
				foldedToken.text += format(dieResult, sidesOnTheDice);
				
				foldedToken.value += dieResult; 
			}
			
			if (numberOfDice < 0){			
				foldedToken.value = -1 * foldedToken.value;	// Negatives
			}
			return foldedToken;	
		}
		function _disadvantageDice(numberOfDice, sidesOnTheDice){
			// Rolls each dice twice and takes the lowest value.
				
			var foldedToken = getToken("",0);
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				var result1 = rollADice(sidesOnTheDice);
				var result2 = rollADice(sidesOnTheDice);
				var dieResult = result1;
				if (result1 > result2){
					dieResult = result2;
				}
				console.log("wtf");
				foldedToken.text += "[" + result1 + "|" + result2 + "]";
				foldedToken.text += format(dieResult, sidesOnTheDice);				
				foldedToken.value += dieResult; 
			}
			
			if (numberOfDice < 0){			
				foldedToken.value = -1 * foldedToken.value;	// Negatives
			}
			return foldedToken;	
		}

		function _normal(numberOfDice, sidesOnTheDice){	
			// Rolls dice and returns a token with the results.		
				
			var foldedToken = getToken("",0);
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				var dieResult = rollADice(sidesOnTheDice);
				foldedToken.text += format(dieResult, sidesOnTheDice);
				foldedToken.value += dieResult; 
			}
			
			if (numberOfDice < 0){			
				foldedToken.value = -1 * foldedToken.value;	// Negatives
			}
			return foldedToken;
		}
		function _exploding(numberOfDice, sidesOnTheDice){
			// Rolls dice and returns a token with the results.
			// Exploding dice roll again when a max value is rolled.
				
			var foldedToken = getToken("");
			foldedToken.value = 0;
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				do {
					var dieResult = rollADice(sidesOnTheDice);			
					foldedToken.text += format(dieResult, sidesOnTheDice);
					foldedToken.value += dieResult;
				} while (dieResult == sidesOnTheDice);
			}
			
			if (numberOfDice < 0){			
				foldedToken.value = -1 * foldedToken.value;	// Negatives
			}
			return foldedToken;
		}
		function _penetrating (numberOfDice, sidesOnTheDice){
			// Rolls dice and returns a token with the results.	
			// Penetrating dice roll again when a max value is rolled, but...
			// A d100 rerolls as a d20
			// A d20 rerolls as a d6
			// For each additional roll, subtract 1 from the total.
				
			var pt = getToken("");
			pt.value = 0;
			var rollCount = 0;
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				do {
					var dieResult = rollADice(sidesOnTheDice);			
					pt.text += format(dieResult, sidesOnTheDice);
					pt.value += dieResult;
					rollCount++;
				} while (dieResult == sidesOnTheDice);
			}
			
			pt.value -= (rollCount - numberOfDice);
			
			if (numberOfDice < 0){			
				pt.value = -1 * pt.value;	// Negatives
			}
			return pt;
		}
		function _highFudge(numberOfDice, sidesOnTheDice){	
			// Rolls dice and returns a token with the results.	
			// Fudges dice to roll high (over 50%)
				
			var foldedToken = getToken("");
			foldedToken.value = 0;
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				var halfDice = sidesOnTheDice / 2;
				var dieResult = Math.ceil(halfDice + (halfDice * Math.random()));
				foldedToken.text += format(dieResult, sidesOnTheDice);
				foldedToken.value += dieResult; 
			}
			
			if (numberOfDice < 0){			
				foldedToken.value = -1 * foldedToken.value;	// Negatives
			}
			return foldedToken;
		}
		function _lowFudge (numberOfDice, sidesOnTheDice){	
			// Rolls dice and returns a token with the results.		
			// Fudges dice to roll low (under 50%)
				
			var foldedToken = getToken("");
			foldedToken.value = 0;
			for (var i = 0; i < Math.abs(numberOfDice); i++){
				// Roll the dice.
				var dieResult = Math.ceil(sidesOnTheDice / 2 * Math.random());
				foldedToken.text += format(dieResult, sidesOnTheDice);
				foldedToken.value += dieResult; 
			}
			
			if (numberOfDice < 0){			
				foldedToken.value = -1 * foldedToken.value;	// Negatives
			}
			return foldedToken;
		}
		
		return {
			diceOps : diceOps
		};
	}();

	/*	
	 *	DiceRoller.DiceMath
	 *	Methods for adding and subtracting multiplying and dividing.	
	 */
	var _diceMath = function(){
		var mathOps = {
			// Methods for doing math.
			"+": function(x,y) {return x + y;},
			"-": function(x,y) {return x - y;},
			"*": function(x,y) {return x * y;},
			"/": function(x,y) {return x / y;}		
		};	
		function doMath(){
			// Takes the tokens from Tokenizer.diceTokens and reduces.
			// Order of ops: Parenthesis, Dice Rolls, Multiplitave, Additive.
			return _parseParensthesis(_tokenizer.diceTokens);		
		}
			
		var _opDetection = {
			// Methods for determining if a token contains a type of operator.
			additive: function(t) {return t.text == "+";},
			multiplicitave: function(t) {return t.text == "*" || t.text == "/";}
		};		
		function _parseParensthesis(tokens){
			// Breaks the token array up based on parenthesis and evaluates each
			// part seperately, then does the math to put it all back together.
			// returns: A single token that is the result of all the math ops.
			
			// Scan the array for end parenthesis.
			for (var i = 0; i < tokens.length; i++){
				if (!_isTokenIn(")", tokens[i])) {
					continue;
				}
				tokens.splice(i,1);	// remove the end paren.
				
				// Move backwards, building a stack of tokens, till the open 
				// paren is found.
				var parenTokens = [];
				while (i-- > 0) {
					if (!_isTokenIn("(", tokens[i])) {
					
						// Move the token to the parens stack.
						parenTokens.unshift(tokens.splice(i,1)[0]);						
					}
					else {
						tokens.splice(i,1);	// remove the start paren.
						
						// Evaluate the contents of the parenthesis stack.
						tokens.splice(i, 0, _parseMath(parenTokens));
						break;// Start looking for more end parens.
					}
				}		
			}
			
			// Evaluate the contents of everything that's not in parens, and the
			// results of all the parenthesized values.
			return _parseMath(tokens);
		}
		function _parseMath(tokens){
			// Breaks down the math inside parens (or where there are no parens.)
			
			if (!tokens){
				return;	// Return if there's nothing to process.
			}
			
			// Order of operations is:
			tokens = _parseDice(tokens);		
			tokens = _parseOperations(tokens, _opDetection.multiplicitave);
			tokens = _parseOperations(tokens, _opDetection.additive);
			return tokens[0];		
		}
		function _parseDice(tokens){			
			for (var i = 1; i < tokens.length - 1; i++){	
				// If this type of dice roll exists.
				if (_specialDice.diceOps[tokens[i].text]){			
					// And if this is a valid operation... 
					var tSlice = tokens.slice(i - 1, i + 2);
					if (_isValidDiceRoll(tSlice)){
						// Move back one and reduce the next 3
						tokens.splice(--i, 3, _foldDiceTokens(tSlice));
					}
				}
			}
			return tokens;
		}
		function _parseOperations(tokens, typeOfMath){
			// Does all the math of a certian variety.		
			// Run through the tokens.
			
			for (var i = 1; i < tokens.length - 1; i++){	
				// If this is the correct type of math...
				if (typeOfMath(tokens[i])){			
					// And if this is a valid operation... 
					var tSlice = tokens.slice(i - 1, i + 2);
					if (_isValidOperation(tSlice)){
						// Move back one and reduce the next 3
						tokens.splice(--i, 3, _foldMathTokens(tSlice));
					}
				}
			}
			return tokens;
		}
		function _isTokenIn(ops, t){			
			if (t === undefined){
				return false;
			}		
			return (ops == t.text);
		}
		function _isValidOperation(tokenArray){
			// Checks that the operation is in the form of [number][op][number].
			
			if (typeof(mathOps[tokenArray[1].text]) !== 'function'){
				return false;	// Cant evaluate the operation
			}
			else if (!tokenArray[0] || !tokenArray[2]){		
				return false;	// The number tokens are not valid.
			}
			else if (!_isTokenNumeric(tokenArray[0]) || !_isTokenNumeric(tokenArray[2])){	
				return false;	// The tokens contain no numbers to operate on.
			}		
			return true;
		}	
		function _isValidDiceRoll(tokenArray){
			// Checks that the operation is in the form of [number][dice][number] (4d6)
			// or [dice][number] (d20)
			
			if (typeof(_specialDice.diceOps[tokenArray[1].text]) !== 'function'){
				return false;	// Cant evaluate the operation
			}
			else if (!tokenArray[0] || !tokenArray[2]){		
				return false;	// The number tokens are not valid.
			}
			else if (!_isTokenNumeric(tokenArray[0]) || !_isTokenNumeric(tokenArray[2])){	
				return false;	// The tokens contain no numbers to operate on.
			}		
			return true;
		}
		function _isTokenNumeric(t){
			// Determines if a token has a numeric value.
			return t && typeof(t.value) === 'number';
		}
		function _foldDiceTokens(tokens){
			// Takes 3 tokens and makes them 1 
			// ex [3][*][3] returns [9]

			var result = _specialDice.diceOps[tokens[1].text](tokens[0].value, tokens[2].value);
			var txt = _formatResult.formatTokens(tokens[0].text, tokens[1].text, tokens[2].text);
			
			if (typeof(result) === 'number'){	
				// Numerics.
				return _tokenizer.getToken(txt, result);
			}
			else if(typeof(result) === 'object'){ 	
				// Tokens.
				return _tokenizer.getToken(txt + result.text, result.value);
			}
			throw "Unknown result type" + val;
		}
		function _foldMathTokens(tokens){
			// Takes 3 tokens and makes them 1 
			// ex [3][*][3] returns [9]

			var result = mathOps[tokens[1].text](tokens[0].value, tokens[2].value);
			var txt = _formatResult.formatTokens(tokens[0].text, tokens[1].text, tokens[2].text);
			
			if (typeof(result) === 'number'){	
				// Numerics.
				return _tokenizer.getToken(txt, result);
			}
			else if(typeof(result) === 'object'){ 	
				// Tokens.
				return _tokenizer.getToken(txt + result.text, result.value);
			}
			throw "Unknown result type" + val;
		}
		
		return {
			mathOps : mathOps,
			doMath : doMath
		};
	}();

	function init(){
		// DOES NOTHING ANYMORE.
	}
	function roll(diceText){
		diceText = _preProcess.process(diceText);		
		_tokenizer.tokenize(diceText);
		var resultToken = _diceMath.doMath(_tokenizer.diceTokens);
		var resultText = _formatResult.formatAll(resultToken);
		return resultText;
	}

	return {
		init: init,
		roll: roll, 
		macros : _macros.macros,
		setMacros : _macros.setMacros,
		getMacros : _macros.getMacros
	};
}();