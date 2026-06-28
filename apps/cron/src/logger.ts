import pino from "pino";

export const logger = pino({
	base: null,
	browser: {
		asObject: true
	},
	timestamp: pino.stdTimeFunctions.isoTime
});
