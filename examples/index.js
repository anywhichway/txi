var Txi;
if(typeof(module)!=="undefined") {
	Txi = require("../index.js");
}


	const data = {
			1: "hello world",
			2: "hello",
			3: "hell",
			4: "world",
			5: "get the low down on the world of science",
			6: "have patience",
			8: {name: "joe", address: "the world"}
	};

	let txi = Txi({stems:false,trigrams:true,compressions:true,misspellings:true}); //,onchange:(node) => console.log(node)

	Object.keys(data).forEach(key => txi.index(key,data[key]));

	console.log("hello results")
	txi.search("hello").forEach(item => console.log(data[item.id],item));
	console.log("hellow results")
	txi.search("hello w").forEach(item => console.log(data[item.id],item));
	console.log("full string match results")
	txi.search("get the low down on the world of science").forEach(item => console.log(data[item.id],item));
	console.log("existing object results")
	txi.search({name:"jo",address:"world"}).forEach(item => console.log(data[item.id],item));
	console.log("non-existent object results (should be none)")
	txi.search({name:"mark"}).forEach(item => console.log(data[item.id],item));
	
	txi = Txi();
	
	txi.index("text1","This has a lot of stop words in it that will be ignored as content");
	txi.index("text2","However, the storage of meanigful content is far more interesting.");
	txi.index("object1",{name:"joe",address:{city:"Seattle",state:"WA"}});
	txi.index("text3","Go Seattle Sea Hawks!");

	console.log(txi.search("Seatle")); // note the typo
	console.log(txi.search("Seattle"));
	console.log(txi.search("meanigful content"));
	
	txi = Txi();
	txi.index("text1","In March, the solidiers marched in solidarity with the peasants against the rich.");
	console.log(txi.getIndex());
	
	if(typeof(localStorage)!=="undefined") {
		txi = Txi();
		const onchange = txi.onchange = fragment => {
			Object.keys(fragment).forEach(key => {
				const value = fragment[key];
				if(value) {
					localStorage.setItem(key,JSON.stringify(value));
				} else {
					localStorage.removeItem(key);
				}	
			});
			localStorage.setItem("myIndex",JSON.stringify(txi.getKeys()));
		}
		txi.index("404","Not Found");
		console.log(txi.getIndex());
		console.log(txi.search("found"));
		console.log(txi.search("not found"));
		
		txi = Txi();
		txi.onchange = onchange;
		let keys = JSON.parse(localStorage.getItem("myIndex")),
			index = {};
		Object.keys(keys).forEach(key => {
			index[key] = JSON.parse(localStorage.getItem(key));
		});
		txi.setIndex(index);
		console.log(txi.search("found"));
		console.log(txi.search("not found"));
		
		console.log(txi.getKeys());
		console.log(txi.getKeyCount());
		txi.remove("404");
		
		txi = Txi();
		txi.onchange = onchange;
		keys = JSON.parse(localStorage.getItem("myIndex")),
			index = {};
		Object.keys(keys).forEach(key => {
			index[key] = JSON.parse(localStorage.getItem(key));
		});
		txi.setIndex(index);
		console.log(txi.search("found"));
		console.log(txi.search("not found"));
		
		console.log(txi.getKeys());
		console.log(txi.getKeyCount());
		txi.compress();
		console.log(txi.getKeys());
		console.log(txi.getKeyCount());
	}
