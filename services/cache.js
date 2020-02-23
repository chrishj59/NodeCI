const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");
const keys = require("../config/keys");

//const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec; // reference to the original exec finction

mongoose.Query.prototype.cache = function(options = {}) {
	console.log("call cache function");
	this.useCache = true;
	this.hashKey = JSON.stringify(options.key || ""); //for redis this must be a string or number
	return this; // makes the function chainable
};
mongoose.Query.prototype.exec = async function() {
	if (!this.useCache) {
		// property defined on the Query instance
		return exec.apply(this, arguments);
	}
	//do not use arrow func
	console.log("use cache");
	const key = JSON.stringify(
		Object.assign({}, this.getQuery(), {
			// Safely copy object properties from one object to another
			collection: this.mongooseCollection.name
		})
	);
	const cacheValue = await client.hget(this.hashKey, key);
	if (cacheValue) {
		const doc = JSON.parse(cacheValue);

		// ternery to hydrate model with either array of docs or sinerl don
		return Array.isArray(doc)
			? doc.map(d => new this.model(d)) // map return array of dodocs
			: //not and array sdo pass in simplale doc
			  this.model(doc);
		return doc;
	}
	const result = await exec.apply(this, arguments); // apply used to pass any args passed to overloasded exec
	client.hset(this.hashKey, key, JSON.stringify(result), "EX", 10);
	return result;
};

module.exports = {
	clearHash(hashKey) {
		client.del(JSON.stringify(hashKey));
	}
};
