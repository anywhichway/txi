# `txi`

Small, focused full-text indexing and search for any JavaScript application.

Txi does just two things:

1) It creates a full text index of strings or JavaScript objects passed to it and associated it with an id also passed it.

2) It supports index searching and returns a rank ordered list of matches including the id to be used by the calling application to retrieve the original data.

Txi indexes are just JSON objects that can be saved and restored like any other JSON object.

By default, `txi` minimizes false positives and false negatives by using a scoring mechanism that takes into account stems, misspellings, trigrams, and disemvoweled versions of words. This can be tuned to reduce memory usage if desired.

It doesn't get much simpler than this:

```javascript
const `txi` = Txi();

txi.index("text1","This has a lot of stop words in it that will be ignored as content");

txi.index("text2","However, the storage of meanigful content is far more interesting.");

txi.index("object1",{name:"joe",address:{city:"Seattle",state:"WA"}});

txi.index("text3","Go Seattle Sea Hawks!");

console.log(`txi`.search("Seatle")); // note the typo, it will still be found

console.log("Seatle",`txi`.search("Seattle"));

console.log("Meaningful",`txi`.search("meanigful content"));
```

will print the below for the commented search strings

```javascript
[ { id: 'text3', // Seatle
    score: 1,
    count: 1,
    stems: { seatl: 1 },
    trigrams: {},
    compressions: {} } ]
    
[ { id: 'text3', // Seattle
    score: 1,
    count: 1,
    stems: { seattl: 1 },
    trigrams: {},
    compressions: {} } ]
    
[ { id: 'text2', // meanigful content 
    score: 2,
    count: 2,
    stems: { meanig: 1, content: 1 },
    trigrams: {},
    compressions: {} },
  { id: 'text1',
    score: 1,
    count: 1,
    stems: { content: 1 },
    trigrams: {},
    compressions: {} } ]
```

## API

### Constructor

`Txi({Array stops,boolean stems=true,boolean trigrams=true,boolean compressions=true,boolean misspellings=true})`

Creates a Txi text indexer with default settings. The boolean flags indicate which features of `txi` to turn on. See [ Managing Memory and Accuracy](#managing-memory-and-accuracy) for more details. Using `new` is not required. 

`Array stops` - Replaces the array of stop words, i.e. words that are not added to the index.

### Txi addStops(string word[,...])

Adds the provided words to the internal stops words. Returns the Txi instance.

### Txi compress()

As items are deleted from the index, keys may end-up without id entries. This removes those keys. They are not removed as items are removed because checking to see if there are remaining ids on a key can be expensive. Returns the Txi instance.

### object getIndex() 

Returns a copy of the internal index data structure. See [Index Structure](#index-structure) below for more details.

### integer index(string||number id,string||object data)

Adds the `data` to the index and stores `id` to return when a search matches the data.

### object getKeys()

Returns an object of the form:

```javascript
{[<key>: true[,...]]}
```

For example:

```javascript
{
	march: true,
	mar: true,
	arc: true,
	rch: true
}
```

This function is provide for efficiency. Although the data structure is slightly larger than an array, it can be maintained in a very efficient manner internally and does not require the creation of an array by calling `Object.keys(index)` every time a list of keys is needed.

WARNING: For efficiency, the actual internal `txi` data structure is returned. DO NOT modify it.

### number getKeyCount()

This function is provided for efficiency. Returns the current number of keys.

### Txi setIndex(object initialValues)

Uses `initialValues` to initialize the internal index. Returns the Txi instance. See [Index Structure](#index-structure) below to understand `initialValues` better.

### onchange function callback

Setting the property `onchange` to `callback` causes `callback` to be invoked with all the index changes made every time `index` is called. The `callback` receives an argument that has the same structure as an index. It is provided so that the program using `txi` can store the index updates. Typically, an asynchronous callback should be used to ensure high performance. See [Index Structure](#index-structure) and [Updating an Index](#updating-an-index) below for more details.

### Txi remove(string||number id)

Removes the `id` and its index values from a Txi instance. No-op if the `id` does not exist. Returns the instance. 

### Txi removeStops(string word[,...])

Removes the `word`s provided from the words that are not indexed. Returns the Txi instance.

### [object potentialMatch[,...]] search(string||object criteria,options=defaults)

Search the index using the `criteria` and return a sorted array of potential matches. The `options` default to those values provided during creation of the instance. The `options` flag is used to controll memory useage and the return of false positives or negatives. See the section [Managing Memory and Accuracy](#managing-memory-and-accuracy) below.

A `potentailMatch` has the form:

```javascript
{ id: string||number
  score: number,
  count: number,
  stems: { 
  	[<stem>: number[,...]] // number of times stem occured in item identified by id
  },
  trigrams: {
  	[<trigram>: number[,...]] // number of times trigram occured in item identified by id
  },
  compressions: {
  [<trigram>: number[,...]] // number of times compression occured in item identified by id
  } 
}
```

For example:

Assume the file `404.html` contains the string "Not Found".

A search for "found" returns a single element array like this:

```javascript
[ { id: 404,
    score: 3.25,
    count: 2,
    stems: { found: 1 },
    trigrams: { fou: 0.5, oun: 0.5, und: 0.5 },
    compressions: { fnd: 0.75 } } ]
```

A search for "not found" returns a single element array like this:

```javascript
[ { id: 404,
    score: 8,
    count: 5,
    stems: { not: 2, found: 1 },
    trigrams: { not: 1, otf: 0.5, tfo: 0.5, fou: 0.5, oun: 0.5, und: 0.5 },
    compressions: { nt: 0.75, fnd: 0.75 } } ]
```

## Index Creation Internals

`Txi` creates an index by tokenizing a string and using the stems of non-stop words, the likely misspellings of stems, disemvoweled stems, and trigrams of all the stems concatenated together. The index keeps track of what items are associated with ids passed in during the index process along with their frequency of occurence.

`Txi` searches an index by tokenizing a string and using the stems of non-stop words, the likely misspellings of stems, disemvoweled stems, and trigrams of all the stems concatenated together and using them to look for matches in the index. The total frequency of each item matched item is summed for the match type, e.g. stems are summed separate from trigrams. The sum of all of these in a score for which a higher value indicates a more likely match. Most searches return more than one result and are sorted in a descending manner by score.

Possible misspelling are generated during indexing and added to the index. This is done because reversing out search misspelling would require either a large dictionary. Misspellings are generated through the use of [patterns identified by the Oxford Dictionary](https://en.oxforddictionaries.com/spelling/common-misspellings). 

An additional reason for indexing misspellings is that searches may include atomic typos. These would be impossible to reverse without doing a full semantic and syntactic analysis of the search. 

The most likely impact of misspellings is false positives during search, particularly due to trigram changes. However, by default `txi` uses a scoring algorithm across multiple indexable features, i.e. stem, trigrams, disemvoweled stems, and misspelling, false positives will generally have a lower score and be later in the search results.

A statistical analysis of the effectiveness of `txi` scoring would be interesting, but is beyond the capacity of the package author at this time.

### Index Structure

```javascript
{[<characterSequence>:{<id>:{stems:<count>,trigrams:<count>,compressions:<count>}}[,...]}
```

The `txi` index structure is a JavaScript object the property keys of which are `characterSequences` that contain objects with property keys that point to the item indexed. The `characteSequences` could be any or all of a stem, a trigram, or a compression. The values stored on the ids are counts of the frequency the sequence appeared in the item indexed. Storing the item indexed is beyond the scope of `txi`, it just keeps track of `ids`, the calling program must keep track of the content itself. A common index id is a URL to a web page.

Below is an annotated index for "In March, the solidiers marched in solidarity with the peasants against the rich". Don't worry that it looks so big. There are only 17,526 possible 3 letter combinations. JavaScript engines can handle key look-ups on an object this size quite weel. And, over time the index will not grow as quickly. The big load comes from stems. See Managing Memory and Accuracy for more detail.

```
{ // the word "march" shows up twice, albeit with different meanings
  march: { text1: { stems: 2, trigrams: 0, compressions: 0 } },
  // "solidi" is a stem of the misspelling of "soldiers" as "solidiers"
  solidi: { text1: { stems: 1, trigrams: 0, compressions: 0 } },
  // "solidar" is a stem of "solidarity"
  solidar: { text1: { stems: 1, trigrams: 0, compressions: 0 } },
  peasant: { text1: { stems: 1, trigrams: 0, compressions: 0 } },
  against: { text1: { stems: 1, trigrams: 0, compressions: 0 } },
  rich: { text1: { stems: 1, trigrams: 0, compressions: 0 } },
  mrch: { text1: { stems: 0, trigrams: 0, compressions: 2 } },
  // "sld" is a compression of the stem of "solidarity"
  sld: { text1: { stems: 0, trigrams: 0, compressions: 1 } },
  sldr: { text1: { stems: 0, trigrams: 0, compressions: 1 } },
  psnt: { text1: { stems: 0, trigrams: 0, compressions: 1 } },
  gnst: { text1: { stems: 0, trigrams: 0, compressions: 1 } },
  // "rch" is a trigram in "march", which shows-up twice
  // "rch" is also a compression for "rich", which shows-up once
  rch: { text1: { stems: 0, trigrams: 2, compressions: 1 } },
  // "rch" is a trigram in "march", which shows-up twice
  mar: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  // "arc" is a trigram in "march", which shows-up twice
  arc: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  // "chs" is a trigram in resulting from dropping " the " between "March" and "soldiers"
  // it is also a trigram resulting from stemming and dropping the with "marched in solidarity"
  chs: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  hso: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  // "sol" is a trigram in "solidarity" and "solidiers"
  sol: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  // "oli" is a trigram in "solidarity" and "solidiers"
  oli: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  // "lid" is a trigram in "solidarity" and "solidiers"
  lid: { text1: { stems: 0, trigrams: 2, compressions: 0 } },
  idi: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  dim: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ima: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ida: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  dar: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  arp: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  rpe: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  pea: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  eas: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  asa: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  san: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ant: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  nta: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  tag: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  aga: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  gai: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ain: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ins: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  nst: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  str: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  tri: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ric: { text1: { stems: 0, trigrams: 1, compressions: 0 } },
  ich: { text1: { stems: 0, trigrams: 1, compressions: 0 } } }
  ```

## Storing and Restoring an Index

### Storing

The value returned by `getIndex` is a non-circular JavaScript object that can be safely stored by serializing with `JSON.stringify`. 

For large indexes, you will need to walk the data structure and store components individually. This would typically be done by saving each key/value pair separately followed by all of the keys. For example:

```javascript
const txi = Txi();
txi.index("In March, the solidiers marched in solidarity with the peasants against the rich");
const index = txi.getIndex(),
	keys = txi.getKeys(); // this is faster than Object.keys(index);
keys.forEach(key => {
	setItem(key,JSON.stringify(index[key]));
});
setItem("myIndex",JSON.stringify(keys));

```

### Restoring

```javascript
const keys = JSON.parse(localStorage.getItem("myIndex")),
	index = {};
Object.keys(keys).forEach(key => {
	index[key] = JSON.parse(localStorage.getItem(key));
});
const txi = Txi();
txi.setIndex(index);
```

## Updating an Index

If you set `onupdate` on a `txi` instance to a callback, then every time something is chnaged in an index, the callback will get invoked with an index fragment representing the changes. You can then walk the object and update your index storage, e.g.:

```javascript
const txi = Txi();
txi.onchange = fragment => {
	Object.keys(fragment).forEach(key => {
		localStorage.setItem(key,JSON.stringify(fragment[key]));
	});
	localStorage.setItem("myIndex",JSON.stringify(txi.getKeys()));
}
```


## Managing Memory and Accuracy

Use the following table to assist in tuning a `txi` index during generation or use. Try doing each thing in order. In all cases, false negatives may increase.

| Reduce Memory Usage | Reduce False Positives |
|---------------------|------------------------|
| misspellings=false  | trigrams=false         |
| stems=false         |                        |
| compressions=false  |                        |

Turning off everything except trigrams is very memory efficient because there are a finite number of 3 letter combinations, and even some of these are cast off as stop words. However, trigrams can return a lot of false positives if used alone. Adding compressions back in can make a huge difference.

Note, if you are indexing or searching JavaScript objects, you can't turn off stem indexing because property names with a colon appended are used as index keys. If you try to turn off stem indexing for objects, it wil be automatically turned back on.

## Terminology

atomic typo - An atomic typo occurs when the modification of one character in a string results in a word with a different meaning. Although none of the following match common misspelling patterns, examples of atomic typos include "war", instead of "was"; "bite", instead of "byte"; "massage", instead of "message"; "forman" instead of either "for man" or "foreman". Since the alternate word is actually a word, determining if its presence is a typographical error is not possible without a deep syntatic or semantic analysis.

disemvowel - To remove vowels from a word to make it shorter, but for most people still understandable.

stem - To remove common endings from words where such endings are unlikely to impact search results. Removing the tense of a verb is a stemming operation, e.g. "I will call you" vs "I called you".

tokenize - To remove all punctuation and return an array of words that were separated by spaces.

trigram - The series of all three letter character sequences in a string that has punctuation and spaces removed.

## Updates (reverse chronological order)

2019-01-23 v0.0.2b Documentation updates

2019-01-23 v0.0.1b Initial public release
