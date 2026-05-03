const getOrThrow = (name: string, errMsg?: string) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			errMsg ? errMsg.toString() : `Environment variable ${name} is required but not set.`,
		);
	}
	return value;
};

export { getOrThrow };
