import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
const resolveEnvFileList = (nodeEnv = process.env.NODE_ENV) => {
    const env = nodeEnv || "development";

    return [`.env.${env}`, ".env.worktree", ".env.local"].map(file =>
        path.join(process.cwd(), file),
    );
}

const loadEnvironment = (nodeEnv = process.env.NODE_ENV) => {
    for (const filePath of resolveEnvFileList(nodeEnv)) {
        if (!fs.existsSync(filePath)) {
            continue;
        }
        console.log(`🔍 Loading environment variables from ${filePath}`);
        dotenv.config({
            path: filePath,
            override: true,
        });
    }
}

export { loadEnvironment, resolveEnvFileList }