//TODO: Convert these tests into official unit tests.
function publishResults(r){
	var results = document.getElementById("results");
	results.innerHTML += r + "<br />";
}
function test(dice){
	var diceRoller = DiceRoller;
	
	publishResults(dice);
	publishResults(diceRoller.roll(dice));
	publishResults("");
}
function testDice(dice, low, high){
	publishResults(dice);
	var r = DiceRoller.roll(dice);
	publishResults(r);
	var val = parseInt(r);
	if (r>high || r<low){
		document.bgColor = "FFAAAA";
	}
}
function testText(dice, result){

	publishResults(dice);
	var r = DiceRoller.roll(dice);
	publishResults(r);
	if (r.indexOf(result) !== 0){	
		console.log(r.indexOf(result));
		document.bgColor = "FFAAAA";
		console.log("Expected:" + result + " got:" + r);
	}
}
function testMath(dice, result){
	test(dice, result.toString())
}
function runTests(){
	document.bgColor = "AAFFAA";
	testDice("1d4", 1, 4);
	testDice("1d6+4", 5, 10);
	testDice("2d6", 2, 12);
	testDice("2d8-3",0,13);
	testDice("1d10+4-1d4",1,13);
	testText("attack: 1d20+4", "attack");
	testMath("-1+2", 1);
	testMath("5/2", 2.5);
	testMath("(5/2)", 2.5);
	testMath("5/(2+2)", 1.25);
	testMath("(5/(2+2)-1)", 0.25);
	testMath("(5/(2+2)-1)*4", 1);
	testMath("4*(5/(2+2)-1)", 1);
	testMath("1-8*(5)", -39);
	testMath("1-8*(5/(2+2)-1)/2+1", -3);
	testMath("1-2*((1+1)*(4/2))/8+1", 0);
	test("dex check");	
	test("spot check");
	test("bluff check");
	test("");
}
function testParse(t){	
	console.log(t);
	var wordFollowedByColon = /\b\w+\b(?=[:])/;
	var p = t.split("?");
	console.log("Label " + p[0].match(wordFollowedByColon) || "");
	if (p[1]){
		var bf = p[1].split(":");
		console.log("True " + bf[0] || "TRUE");
		console.log("False " + bf[1] || "FALSE");
	}
}
function exportJSON(){
	var results = document.getElementById("input_text");
	console.log(DiceRoller.getMacros());
	results.innerHTML = DiceRoller.getMacros();
}
function importJSON(){
	var results = document.getElementById("input_text").value;
	console.log(results);
	DiceRoller.setMacros(results);
}
function clearResults(){
	var results = document.getElementById("results");
	results.innerHTML = "";
}
function testDiceText(){
	var dt = document.getElementById("dice_text").value;
	var diceRoller = DiceRoller;	
	var results = document.getElementById("results");
	results.innerHTML = dt + "<br />" + diceRoller.roll(dt) + "<br />" + results.innerHTML ;	
}
function regexTest(){
	var dice = "(1+d4)*2/4";
	var ops = dice.match(/[+*\/\)\(]/g);
	var exp = dice.split(/[+*\/\(\)]/);
	console.log(dice);
	console.log(ops);
	console.log(exp);
}
