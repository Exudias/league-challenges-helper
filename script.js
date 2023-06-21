// Constants
const API_KEY = "RGAPI-b60d531b-f2ca-4160-8d91-d8004f0214c3";

const LEVEL_INFORMATION = 
{
    NONE: {level: -1, points: 0},
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

// TODO: Fix this, this is awful, integrate with LEVEL_INFORMATION
const POINTS_FROM_LEVEL_ID = 
{
    "-1": 0,
    0: 5,
    1: 10,
    2: 15,
    3: 25,
    4: 40,
    5: 60,
    6: 100,
    7: 100,
    8: 100,
}

const PARTIAL_CONFIG_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/config";
const PARTIAL_PERCENTILES_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/percentiles";
const PARTIAL_SUMMONERBYNAME_ENDPOINT = ".api.riotgames.com/lol/summoner/v4/summoners/by-name/";
const PARTIAL_PLAYERDATA_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/player-data/";

const ERROR_PLAYER_NOT_FOUND = "PLAYER NOT FOUND";
const ERROR_DATABASE_NOT_LOADED = "DATABASE NOT LOADED, TRY AGAIN";

const ENGLISH_CODE = "en_GB";

const STATUS_LOADING = "Status: Loading...";
const STATUS_LOADED = "Status: Loaded!";

const DISPLAY_AMOUNT = 50;

const CHALLENGE_INFO_HIDE_ID = "challenge-full-info-hidden";
const CHALLENGE_INFO_SHOW_ID = "challenge-full-info-shown";

//// Functions
async function initialize()
{
    await getRegionInfoAndLoadGlobals();
}

async function getRegionInfoAndLoadGlobals()
{
    loadingDatabase = true;
    statusText.textContent = STATUS_LOADING;
    const currentRegion = regionDropdown.value;

    const regionInformation = await getRegionInformation(currentRegion);

    await loadChallengeGlobals(regionInformation);
    statusText.textContent = STATUS_LOADED;
    loadingDatabase = false;
}

async function search()
{
    const searchedPlayer = playerNameInput.value;
    if (searchedPlayer === loadedPlayer) return; // Don't overuse API if not necessary...
    errorDisplay.classList.add("hidden");
    errorDisplay.innerText = ERROR_PLAYER_NOT_FOUND;
    // Get player's data
    let playerData;
    try
    {
        playerData = await getPlayerDataJSONFromName(searchedPlayer);
    }
    catch
    {
        errorDisplay.classList.remove("hidden");
        clearColumns();
        playerFullData = undefined;
        loadedPlayer = undefined;
        return;
    }
    loadedPlayer = searchedPlayer;
    // Sample only necessary data
    const challengeData = playerData.challenges;
    // Format data
    const objectifiedData = challengeData.reduce((final, item) => {
        final[item.challengeId] = {
            level: item.level,
            score: item.value
        };
        return final;
    }, {});
    playerFullData = [];
    // Create object of necessary display information
    Object.keys(loadedChallengeInformation).forEach(key => {
        const challInformation = loadedChallengeInformation[key];
        const playerChallData = objectifiedData[key];
        const percentileData = loadedChallengePercentiles[key];

        // Initialize object
        const fullDataItem = {};
        // Basic stuff
        fullDataItem.id = key;
        fullDataItem.name = challInformation.name;
        fullDataItem.description = challInformation.description;
        fullDataItem.thresholds = challInformation.thresholds;
        fullDataItem.maxLevel = LEVEL_INFORMATION[challInformation.maxLevel].level;
        // Player-dependant stuff
        if (playerChallData === undefined)
        {
            fullDataItem.playerLevel = -1;
            fullDataItem.playerScore = 0;
        }
        else
        {
            fullDataItem.playerLevel = LEVEL_INFORMATION[playerChallData.level].level;
            fullDataItem.playerScore = playerChallData.score;
        }
        // Seperately calculated stuff
        for (let i = fullDataItem.playerLevel + 1; i < Object.keys(LEVEL_INFORMATION).length; i++)
        {
            if (challInformation.thresholds[i] === undefined) continue;
            fullDataItem.nextLevel = i;
            break;
        }
        // Don't take into account if maxed/already master level, no points to gain
        if (fullDataItem.nextLevel === undefined || fullDataItem.nextLevel > LEVEL_INFORMATION["MASTER"].level)
        {
            return;
        }
        // Stats for display sorting
        // Points from getting to next level
        const playerPoints = POINTS_FROM_LEVEL_ID[fullDataItem.playerLevel];
        const nextLevelPoints = POINTS_FROM_LEVEL_ID[fullDataItem.nextLevel];
        fullDataItem.pointsFromLevelUp = nextLevelPoints - playerPoints;
        // Percent to next level    
        const scoreForCurrentLevel = fullDataItem.thresholds[fullDataItem.playerLevel] ?? 0;
        const scoreForNextLevel = fullDataItem.thresholds[fullDataItem.nextLevel];
        const playerScore = fullDataItem.playerScore;
        fullDataItem.percentToNextLevel = (playerScore - scoreForCurrentLevel) / (scoreForNextLevel - scoreForCurrentLevel);
        // Next level percentile
        if (percentileData === undefined)
        {
            fullDataItem.nextLevelPercentile = 0;
        }
        else
        {
            fullDataItem.nextLevelPercentile = percentileData[fullDataItem.nextLevel];
        }

        // Add to list
        playerFullData.push(fullDataItem);
    });

    displayInColumns(playerFullData, DISPLAY_AMOUNT);
}

function displayInColumns(data, amountToDisplay)
{
    clearColumns();

    const sortedByEasiest = [...data].sort((a, b) => {
        return b.nextLevelPercentile - a.nextLevelPercentile;
    });

    const sortedByClosest = [...data].sort((a, b) => {
        return b.percentToNextLevel - a.percentToNextLevel;
    });

    const sortedByBiggestIncrease = [...data].sort((a, b) => {
        return b.pointsFromLevelUp - a.pointsFromLevelUp;
    });

    for (let i = 0; i < amountToDisplay; i++)
    {
        easiestEntry = document.createElement("p");
        easiestDesc = document.createElement("p");

        closestEntry = document.createElement("p");
        closestDesc = document.createElement("p");

        increaseEntry = document.createElement("p");
        increaseDesc = document.createElement("p");

        easiestEntry.innerText = sortedByEasiest[i].name;
        closestEntry.innerText = sortedByClosest[i].name;
        increaseEntry.innerText = sortedByBiggestIncrease[i].name;

        const easiestPercent = (sortedByEasiest[i].nextLevelPercentile * 100).toFixed(1);
        const increasePoints = sortedByBiggestIncrease[i].pointsFromLevelUp;

        let easiestText = `${easiestPercent}% of players have the next tier.\n\n${sortedByClosest[i].description}`;
        let closestText = `${sortedByClosest[i].playerScore}/${sortedByClosest[i].thresholds[sortedByClosest[i].nextLevel]}
        \n\n${sortedByClosest[i].description}`;
        let increaseText = `You will get ${increasePoints} points for leveling up.\n\n${sortedByClosest[i].description}`;

        easiestDesc.innerText = easiestText.replace(/<\/?[^>]+(>|$)/g, "");
        closestDesc.innerText = closestText.replace(/<\/?[^>]+(>|$)/g, "");
        increaseDesc.innerText = increaseText.replace(/<\/?[^>]+(>|$)/g, "");

        easiestColumn.appendChild(easiestEntry);
        easiestEntry.appendChild(easiestDesc);

        closestColumn.appendChild(closestEntry);
        closestEntry.appendChild(closestDesc);

        biggestIncreaseColumn.appendChild(increaseEntry);
        increaseEntry.appendChild(increaseDesc);

        easiestEntry.onclick = function(){showChallenge(sortedByEasiest[i].id)};
        closestEntry.onclick = function(){showChallenge(sortedByClosest[i].id)};
        increaseEntry.onclick = function(){showChallenge(sortedByBiggestIncrease[i].id)};
    }
}



function showChallenge(id)
{
    challengeInfoDisplay.id = CHALLENGE_INFO_SHOW_ID;


}

function clearColumns()
{
    closestColumn.innerHTML = "";
    biggestIncreaseColumn.innerHTML = "";
    easiestColumn.innerHTML = "";
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
        let numerifiedThresholds = {};
        Object.keys(item.thresholds).forEach(thresholdsName => {
            numerifiedThresholds[LEVEL_INFORMATION[thresholdsName].level] = item.thresholds[thresholdsName];
        });
        final[item.id] = {
            name: item.localizedNames[ENGLISH_CODE].name, 
            description: item.localizedNames[ENGLISH_CODE].shortDescription,
            thresholds: numerifiedThresholds, 
            maxLevel: getMaxThresholdNumeric(item.thresholds)
        }; 
        return final;
    }, {});
    
    // Percentiles
    let numerifiedPercentiles = {};
    Object.keys(regionInformation.percentiles).forEach(entryId => {
        entry = regionInformation.percentiles[entryId];
        let numerifiedPercentileForEntry = {};
        Object.keys(entry).forEach(thresholdName => {
            numerifiedPercentileForEntry[LEVEL_INFORMATION[thresholdName].level] = regionInformation.percentiles[entryId][thresholdName];
        });
        numerifiedPercentiles[entryId] = numerifiedPercentileForEntry;
    });
    loadedChallengePercentiles = numerifiedPercentiles;
}

async function getRegionInformation(region)
{
    const challengeConfig = await getRegionChallengeConfigJSON(region);
    const challengePercentiles = await getRegionChallengePercentilesJSON(region);

    return {config: challengeConfig, percentiles: challengePercentiles};
}

// GET from API functions
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

async function getPlayerDataJSONFromName(name)
{
    const currentRegion = regionDropdown.value;
    const SUMMONERBYNAME_ENDPOINT = "https://" + currentRegion + PARTIAL_SUMMONERBYNAME_ENDPOINT + name;

    const summoner = await makeRequest("GET", SUMMONERBYNAME_ENDPOINT + "?api_key=" + API_KEY);

    return await getChallengeDataJSONFromPUUID(JSON.parse(summoner).puuid);
}

async function getChallengeDataJSONFromPUUID(puuid)
{
    const currentRegion = regionDropdown.value;
    const PLAYERDATA_ENDPOINT = "https://" + currentRegion + PARTIAL_PLAYERDATA_ENDPOINT + puuid;

    return JSON.parse(await makeRequest("GET", PLAYERDATA_ENDPOINT + "?api_key=" + API_KEY));
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

/// Information display
// Recommendation columns
const closestColumn = document.querySelector("#closest-column");
const biggestIncreaseColumn = document.querySelector("#biggestincrease-column");
const easiestColumn = document.querySelector("#easiest-column");
// Error display
const errorDisplay = document.querySelector("#error-display");
// Status text
const statusText = document.querySelector("#status");
// Challenge full display
const challengeInfoDisplay = document.querySelector(".challenge-info");

//// Globals
let loadedChallengeInformation; // ID, name, description
let loadedChallengePercentiles;
let playerFullData;
let loadedPlayer;
let loadingDatabase;


//// Events
regionDropdown.addEventListener("change", async () => {
    // void loaded player data
    loadedPlayer = undefined; 
    playerFullData = undefined;
    clearColumns();

    await getRegionInfoAndLoadGlobals();
});

playerNameInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      if (loadingDatabase)
      {
        errorDisplay.classList.remove("hidden");
        errorDisplay.innerText = ERROR_DATABASE_NOT_LOADED;
      }
      else
      {
        search();
      }
    }
});

initialize();