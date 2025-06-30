const pathToExternalConfig = process.env.FARM_ENV_PATH;

if (!pathToExternalConfig) {
    throw new Error('FARM_ENV_PATH is not defined');
}

// eslint-disable-next-line security/detect-non-literal-require
const configData = require(pathToExternalConfig);

export default configData;
