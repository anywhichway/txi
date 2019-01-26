var Txi;
if(typeof(module)!=="undefined") {
	Txi = require("../index.js");
}

(async function run() {
	const data = {
			1: {name: "joe", address: "the world", age:27},
			2: "hello",
			3: "hell",
			4: "world",
			5: "get the low down on the world of science",
			6: "have patience",
			8: "hello world"
	};

	let txi;
	if(typeof(localStorage)!=="undefined") {
		async function get(key) {
			const data = localStorage.getItem(key);
			if(data) return JSON.parse(data);
		}
		async function set(key,value) {
			localStorage.setItem(key,JSON.stringify(value));
		}
		async function* keys() {
			for(const i=0;i<localStorage.length;i++) {
				yield localStorage.key(i);
			}
		}
		async function count() {
			return localStorage.length;
		}
		txi = Txi({stems:false,trigrams:true,compressions:true,misspellings:true,storage:{get,set,keys,count}}); //,onchange:(node) => console.log(node)
	} else {
		txi = Txi({stems:false,trigrams:true,compressions:true,misspellings:true});
	}
	
	for(const key in data) {
		await txi.index(key,data[key]);
	}

	console.log("hello results")
	let results = await txi.search("hello");
	results.forEach(item => console.log(data[item.id],item));
	console.log("hellow results")
	results = await txi.search("hello w");
	results.forEach(item => console.log(data[item.id],item));
	console.log("full string match results")
	results = await txi.search("get the low down on the world of science");
	results.forEach(item => console.log(data[item.id],item));
	console.log("existing object results")
	results = await txi.search({name:"jo",address:"world"});
	results.forEach(item => console.log(data[item.id],item));
	console.log("non-existent object results (should be none)")
	results = await txi.search({name:"mark"});
	results.forEach(item => console.log(data[item.id],item));
	results = await txi.search({name:"joe",age:27,address:"world"},{all:true});
	results.forEach(item => console.log(data[item.id],item));
	results = await txi.search({name:"joe",age:28,address:"world"},{all:true});
	results.forEach(item => console.log(data[item.id],item));
	
	txi = Txi();
	
	await txi.index("text1","This has a lot of stop words in it that will be ignored as content");
	await txi.index("text2","However, the storage of meanigful content is far more interesting.");
	await txi.index("object1",{name:"joe",address:{city:"Seattle",state:"WA"}});
	await txi.index("text3","Go Seattle Sea Hawks!");

	console.log(await txi.search("Seatle")); // note the typo
	console.log(await txi.search("Seattle"));
	console.log(await txi.search("meanigful content"));
	
	txi = Txi();
	txi.index("text1","In March, the solidiers marched in solidarity with the peasants against the rich.");
	console.log(txi.getIndex());
	
	if(typeof(localStorage)!=="undefined") {
		txi = Txi();
		const onchange = txi.onchange = async fragment => {
			Object.keys(fragment).forEach(key => {
				const value = fragment[key];
				if(value) {
					localStorage.setItem(key,JSON.stringify(value));
				} else {
					localStorage.removeItem(key);
				}	
			});
			localStorage.setItem("myIndex",JSON.stringify(await txi.getKeys()));
		}
		await txi.index("404","Not Found");
		console.log(txi.getIndex());
		console.log(await txi.search("found"));
		console.log(await txi.search("not found"));
		
		txi = Txi();
		txi.onchange = onchange;
		let keys = JSON.parse(localStorage.getItem("myIndex")),
			index = {};
		Object.keys(keys).forEach(key => {
			index[key] = JSON.parse(localStorage.getItem(key));
		});
		txi.setIndex(index);
		console.log(await txi.search("found"));
		console.log(await txi.search("not found"));
		
		console.log(await txi.getKeys());
		console.log(await txi.getKeyCount());
		txi.remove("404");
		
		txi = Txi();
		txi.onchange = onchange;
		keys = JSON.parse(localStorage.getItem("myIndex")),
			index = {};
		Object.keys(keys).forEach(key => {
			index[key] = JSON.parse(localStorage.getItem(key));
		});
		txi.setIndex(index);
		console.log(await txi.search("found"));
		console.log(await txi.search("not found"));
		
		console.log(await txi.getKeys());
		console.log(await txi.getKeyCount());
		txi.compress();
		console.log(await txi.getKeys());
		console.log(await txi.getKeyCount());
	}
})()
	