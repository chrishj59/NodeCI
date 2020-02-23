const { clearHash } = require("../services/cache");

module.exports = async (req, res, next) => {
	// middlewares usually runj before request handler - but clear cache only should run after req handler
	await next(); // waiut for request handler to complete before continuing

	clearHash(req.user.id);
};
