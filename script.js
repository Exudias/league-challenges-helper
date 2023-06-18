// Constants
const API_KEY = "RGAPI-3e5dd52a-40a2-4d33-8a5c-9f644a037bdb";

const LEVEL_INFORMATION = 
{
    IRON: {level: 0, points: 5},   
    BRONZE: {level: 1, points: 10},   
    SILVER: {level: 2, points: 15},   
    GOLD: {level: 3, points: 25},   
    PLATINUM: {level: 4, points: 40},   
    DIAMOND: {level: 5, points: 60},   
    MASTER: {level: 6, points: 100},   
    GRANDMASTER: {level: 7, points: 100},   
    CHALLENGER: {level: 8, points: 100},   
}

const PARTIAL_CONFIG_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/config";
const PARTIAL_PERCENTILES_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/percentiles";
const PARTIAL_SUMMONERBYNAME_ENDPOINT = ".api.riotgames.com/lol/summoner/v4/summoners/by-name/";
const PARTIAL_PLAYERDATA_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/player-data/";

const BUTTON_LOADING_TEXT = "LOADING...";
const BUTTON_SEARCH_TEXT = "SEARCH";

const ENGLISH_CODE = "en_GB";

//// Functions
async function initialize()
{
    let defaultRegion = regionDropdown.value;

    const regionInformation = await getRegionInformation(defaultRegion);

    loadChallengeGlobals(regionInformation);
}

function loadChallengeGlobals(regionInformation)
{
    // Config information
    const configInformation = [...regionInformation.config];

    // Remove inactive, crystal & capstone challenges, seasonal ones that are over
    const filteredConfigInformation = configInformation.filter(item => {
        const isActive = item.state === "ENABLED";
        const isCrystalOrCapstone = item.id < 10;
        const isYearlyChallenge = item.id > 999999;

        const idString = item.id.toString();
        const currentYearString = new Date().getFullYear().toString();

        const isYearlyFromThisYear = idString.startsWith(currentYearString);

        return (isActive && !isCrystalOrCapstone && (!isYearlyChallenge || (isYearlyChallenge && isYearlyFromThisYear)));
    });

    // Reduce into object with ID key with all relevant info
    loadedChallengeInformation = [...filteredConfigInformation].reduce((final, item) => {
        final[item.id] = {name: item.localizedNames[ENGLISH_CODE].name, 
            description: item.localizedNames[ENGLISH_CODE].shortDescription,
            thresholds: item.thresholds, maxLevel: getMaxThresholdNumeric(item.thresholds)}; 
        return final}
    , {});

    console.log(loadedChallengeInformation);
    
    // Percentiles
    loadedChallengePercentiles = regionInformation.percentiles;
}

async function getRegionInformation(region)
{
    searchButton.disabled = true;
    searchButton.innerText = BUTTON_LOADING_TEXT;

    const challengeConfig = await getRegionChallengeConfigJSON(region);
    const challengePercentiles = await getRegionChallengePercentilesJSON(region);

    searchButton.innerText = BUTTON_SEARCH_TEXT;
    searchButton.disabled = false;

    return {config: challengeConfig, percentiles: challengePercentiles};
}

// GET functions
async function getRegionChallengePercentilesJSON(region) // returns object with ID key
{
    const PERCENTILES_ENDPOINT = "https://" + region + PARTIAL_PERCENTILES_ENDPOINT;

    return JSON.parse(await makeRequest("GET", PERCENTILES_ENDPOINT + "?api_key=" + API_KEY));
}

async function getRegionChallengeConfigJSON(region) // returns list of objects
{
    const CONFIG_ENDPOINT = "https://" + region + PARTIAL_CONFIG_ENDPOINT;

    return JSON.parse(await makeRequest("GET", CONFIG_ENDPOINT + "?api_key=" + API_KEY));
}

/// Helper functions
function makeRequest(method, url) // xhr request with promise (from https://stackoverflow.com/a/48969580)
{
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}

function getMaxThresholdNumeric(challengeThresholds)
{
    return Object.keys(challengeThresholds).reduce((a, b) => {
         return challengeThresholds[a] > challengeThresholds[b] ? a : b });
}

//// DOM references
/// Input
// Region
const regionDropdown = document.querySelector("#region-dropdown");
// Player name
const playerNameInput = document.querySelector("#player-input");
// Display amount
const displayAmountSlider = document.querySelector("#displayamount-slider");
const displayAmountCounter = document.querySelector("#displayamount-counter");
// Submit
const searchButton = document.querySelector("#search-button");

/// Information display
// Recommendation columns
const closestLevelupColumn = document.querySelector("#closest-level-up");
const pointIncreaseColumn = document.querySelector("#point-increase");
const highestPercentileColumn = document.querySelector("#highest-percentile");
// Error display
const errorDisplay = document.querySelector("#error-display");

//// Globals
let loadedChallengeInformation; // ID, name, description
let loadedChallengePercentiles;

initialize();