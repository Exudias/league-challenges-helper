// TODO: Implement async/await functionality

// Important constants
const API_KEY = "RGAPI-aa4f17eb-52f6-42e0-83bc-6ef8fc0d0776";

const CHALLENGE_LEVELS = 
[
    "IRON",
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "DIAMOND",
    "MASTER",
    "GRANDMASTER",
    "CHALLENGER"
];

const CHALLENGES_CONFIG_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/config";
const CHALLENGE_PERCENTILES_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/percentiles";
const SUMMONER_BY_NAME_ENDPOINT = ".api.riotgames.com/lol/summoner/v4/summoners/by-name/";
const CHALLENGE_PLAYER_DATA_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/player-data/";

// Functions
async function updateChallengesInformation()
{
    searchButton.disabled = true;
    challengePercentiles = await getChallengePercentilesJSON();
    activeChallenges = getAllActiveChallengesFromConfig(await getChallengeConfigJSON());
    searchButton.disabled = false;
}

async function getChallengeConfigJSON()
{
    const CONFIG_FULL_ENDPOINT = "https://" + currentRegion + CHALLENGES_CONFIG_ENDPOINT;

    return JSON.parse(await makeRequest("GET", CONFIG_FULL_ENDPOINT + "?api_key=" + API_KEY));
}

async function getChallengePercentilesJSON()
{
    const CHALLENGE_PERCENTILES_FULL_ENDPOINT = "https://" + currentRegion + CHALLENGE_PERCENTILES_ENDPOINT;

    return JSON.parse(await makeRequest("GET", CHALLENGE_PERCENTILES_FULL_ENDPOINT + "?api_key=" + API_KEY));
}

async function getChallengeDataFromName(name)
{
    const SUMMONER_BY_NAME_FULL_ENDPOINT = "https://" + currentRegion + SUMMONER_BY_NAME_ENDPOINT + name;

    const summoner = await makeRequest("GET", SUMMONER_BY_NAME_FULL_ENDPOINT + "?api_key=" + API_KEY);

    return await getChallengeDataJSONFromPUUID(JSON.parse(summoner).puuid);
}

async function getChallengeDataJSONFromPUUID(puuid)
{
    const CHALLENGE_PLAYER_DATA_FULL_ENDPOINT = "https://" + currentRegion + CHALLENGE_PLAYER_DATA_ENDPOINT + puuid;

    return JSON.parse(await makeRequest("GET", CHALLENGE_PLAYER_DATA_FULL_ENDPOINT + "?api_key=" + API_KEY));
}

function getMaxThresholdNumeric(challengeThresholds)
{
    let current_max;
    CHALLENGE_LEVELS.forEach(level => {
        if (level in challengeThresholds)
        {
            current_max = level;
        }
    });
    return CHALLENGE_LEVELS.indexOf(current_max);
}

function getAllActiveChallengesFromConfig(config)
{
    result = [];
    config.forEach(challenge => {
        if (challenge.state === "ENABLED")
        {
            activeChallengeObject = 
            {
                name: challenge.localizedNames.en_GB.name,
                id: challenge.id,
                thresholds: challenge.thresholds,
                maxLevel: getMaxThresholdNumeric(challenge.thresholds),
            };
            result.push(activeChallengeObject);
        }
    });
    return result;
}

function initialize()
{
    updateChallengesInformation();
}

// xhr request with promise (from https://stackoverflow.com/a/48969580)
function makeRequest(method, url) {
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

function beginDisplay(amount)
{
    const sortedByLowestTier = [...nonMaxedChallenges].sort((a, b) => {
        return a.playerLevel - b.playerLevel;
    });
    const sortedByTiersToGo = [...nonMaxedChallenges].sort((a, b) => {
        let aTiers = a.maxLevel - a.playerLevel;
        let bTiers = b.maxLevel - b.playerLevel;
        return bTiers - aTiers;
    });
    const sortedByPercentile = [...nonMaxedChallenges].filter(chall => {
        let nextLevel = getNextTierNumber(chall);
        chall.nextLevel = nextLevel;
        return nextLevel !== -1;
    }).sort((a, b) => {
        let aId = a.id;
        let aTierName = CHALLENGE_LEVELS[a.nextLevel];
        let aTierPercentile = getChallengeTierPercentile(aId, aTierName);
        let bId = b.id;
        let bTierName = CHALLENGE_LEVELS[b.nextLevel];
        let bTierPercentile = getChallengeTierPercentile(bId, bTierName);

        a.nextPercentile = aTierPercentile;
        b.nextPercentile = bTierPercentile;

        return bTierPercentile - aTierPercentile;
    });

    clearSuggestions();

    for (let i = 0; i < amount; i++)
    {
        lowestTierEntry = document.createElement("p");
        tiersToGoEntry = document.createElement("p");
        percentileEntry = document.createElement("p");

        const tier = CHALLENGE_LEVELS[sortedByLowestTier[i].playerLevel] ?? "UNRANKED";
        const tiersToGo = (sortedByTiersToGo[i].maxLevel - sortedByTiersToGo[i].playerLevel);
        const nextPercent = (sortedByPercentile[i].nextPercentile * 100).toFixed(1);

        lowestTierEntry.innerText = sortedByLowestTier[i].name + " (" + tier + ")";
        tiersToGoEntry.innerText = sortedByTiersToGo[i].name + " (" + tiersToGo + ")";
        percentileEntry.innerText = sortedByPercentile[i].name + " (" + nextPercent + "% have next tier)";

        lowestTierColumn.appendChild(lowestTierEntry);
        tiersToGoColumn.appendChild(tiersToGoEntry);
        highestPercentileColumn.appendChild(percentileEntry);
    }
}

function clearSuggestions()
{
    lowestTierColumn.innerHTML = "";
    tiersToGoColumn.innerHTML = "";
    highestPercentileColumn.innerHTML = "";
}

function getChallengeTierPercentile(challengeId, challengeTierName)
{
    if (challengePercentiles[challengeId])
    {
        return challengePercentiles[challengeId][challengeTierName];
    }
    else return 0;
}

function getNextTierNumber(challenge)
{
    let playerLevel = challenge.playerLevel;
    let thresholds = challenge.thresholds;

    let result = undefined;

    CHALLENGE_LEVELS.forEach(level => {
        if (result !== undefined) return; 
        const levelIndex = CHALLENGE_LEVELS.indexOf(level);
        if (levelIndex > playerLevel && level in thresholds)
        {
            result = levelIndex;
            return;
        }
    });
    return result;
}

//// BELOW - CALLED ON SCRIPT LOAD!!!

let activeChallenges;
let challengePercentiles;
let currentPlayer;

// Region selection
const regionSelector = document.querySelector("#region");
let currentRegion = regionSelector.value;
regionSelector.addEventListener("change", () => {
    currentRegion = regionSelector.value;
    updateChallengesInformation();
});

// Player search
const resultsBox = document.querySelector("#results");
const searchButton = document.querySelector("#search-button");
const playerNameInput = document.querySelector("#player-name");
let nonMaxedChallenges = [];
searchButton.addEventListener("click", async () => {
    error.classList.add("hidden");
    currentPlayer = playerNameInput.value;
    let playerData;
    try
    {
        playerData = await getChallengeDataFromName(currentPlayer);
    }
    catch
    {
        error.innerText = "PLAYER NOT FOUND";
        clearSuggestions();
        error.classList.remove("hidden");
        return;
    }
    const challengeData = playerData.challenges;
    const playerChallengeIDs = challengeData.map(challenge => challenge.challengeId);
    nonMaxedChallenges = [];
    activeChallenges.forEach(challenge => {
        // Eliminate all yearly challenges for past years
        if (challenge.id > 999999) 
        {
            let idString = challenge.id.toString();
            let currentYearString = new Date().getFullYear().toString();
            if (!idString.startsWith(currentYearString))
            {
                return;
            }
        }
        // Eliminate Crystal and Categories as challenges
        else if (challenge.id < 10)
        {
            return;
        }

        if (playerChallengeIDs.includes(challenge.id))
        {
            const challengeMaxLevelIndex = challenge.maxLevel;
            const currentChallengeData = challengeData.filter(data => {
                return data.challengeId === challenge.id;
            })[0];
            const playerLevel = CHALLENGE_LEVELS.indexOf(currentChallengeData.level);
            challenge.playerLevel = playerLevel;
            if (playerLevel < challengeMaxLevelIndex)
            {
                nonMaxedChallenges.push(challenge);
            }
        }
        else
        {
            challenge.playerLevel = -1;
            nonMaxedChallenges.push(challenge);
        }
    });
    beginDisplay(5);
});

// Challenge display
const challengesBox = document.querySelector("#challenges-box");
const lowestTierColumn = document.querySelector("#lowest-tier");
const tiersToGoColumn = document.querySelector("#tiers-to-go");
const highestPercentileColumn = document.querySelector("#highest-percentile");

// Error display
const errorDiv = document.querySelector("#error");

initialize();