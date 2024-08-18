// @ts-nocheck
const tips = [
    "Remember to keep your code DRY (Don't Repeat Yourself).",
    "Use meaningful names for your variables and functions.",
    "Keep functions small and focused on a single task.",
    "Comment your code to explain complex logic.",
    "Always test your code thoroughly before deploying.",
    "Refactor regularly to improve code quality."
];

// Create a writable stream to handle console output
class ConsoleTipStream {
    constructor() {
        this.currentLine = '';
    }

    write(message) {
        // Overwrite the current line in the console
        process.stdout.clearLine(); // Clear the current line
        process.stdout.cursorTo(0); // Move cursor to the beginning of the line
        process.stdout.write(message); // Write the new message
        this.currentLine = message;
    }
}

const consoleTipStream = new ConsoleTipStream();

export function startTipStream(minutes = 2) {
    setInterval(() => {
        const randomIndex = Math.floor(Math.random() * tips.length);
        const randomTip = tips[randomIndex];

        consoleTipStream.write(`\x1b[35m[reactive]\x1b[0m \x1b[36m[TIP]\x1b[0m ${randomTip}`);
    }, minutes * 60 * 1000);
}
