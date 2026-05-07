// Utility function to create a delay
const wait = (seconds: number): Promise<void> => {
	return new Promise(resolve => {
		setTimeout(resolve, seconds * 1000);
	});
};
export { wait };
