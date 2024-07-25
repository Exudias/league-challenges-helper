// Constants
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
const PARTIAL_PLAYERDATA_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/player-data/";
const PARTIAL_SUMMONERBYID_ENDPOINT = ".api.riotgames.com/riot/account/v1/accounts/by-riot-id/";

const ERROR_PLAYER_NOT_FOUND = "PLAYER NOT FOUND";
const ERROR_DATABASE_NOT_LOADED = "DATABASE NOT LOADED, TRY AGAIN";

const ENGLISH_CODE = "en_GB";

const STATUS_LOADING = "Database loading...";
const STATUS_LOADED = "Search any summoner name for recommendations!";
const STATUS_INVALID_KEY = "Invalid API Key!\n Get one from \nhttps://developer.riotgames.com/";

const DISPLAY_START_AMOUNT = 5;
const DISPLAY_ADD_AMOUNT = 5;

const CHALLENGE_INFO_HIDE_ID = "challenge-full-info-hidden";
const CHALLENGE_INFO_SHOW_ID = "challenge-full-info-shown";

const API_DIALOG_HIDE_ID = "api-key-dialog-hidden";
const API_DIALOG_SHOW_ID = "api-key-dialog-shown";

const ARAM_PREFIX = "101";
const BOT_PREFIX = "120";

//// Functions
async function fetchData(url) 
{
    let response = await fetch('/.netlify/functions/fetchApiKey').then(response => response.json().message);

    console.log(response);

    try 
    {
        const response = await fetch(`api/${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9,bg;q=0.8",
                "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://developer.riotgames.com",
                "X-Riot-Token": "RGAPI-43548dd7-87db-41ae-9222-230d188b92b3"
            }
        });
        if (!response.ok)
        {
            throw new Error('Network response was not OK');
        }
        const data = await response.json();
        return data;
    }
    catch (error) 
    {
        console.error('Error fetching data: ', error);
        throw error;
    }
}

async function initialize()
{
    APIKey = await fetch('/.netlify/functions/fetchApiKey').then(response => response.json().message);

    displayAmount = DISPLAY_START_AMOUNT;
    try
    {
        await getRegionInfoAndLoadGlobals();
    }
    catch
    {
        informationDisplay.textContent = STATUS_INVALID_KEY;
    }
}

async function getRegionInfoAndLoadGlobals()
{
    loadingDatabase = true;
    informationDisplay.textContent = STATUS_LOADING;
    const currentRegion = regionDropdown.value;

    const regionInformation = await getRegionInformation(currentRegion);

    await loadChallengeGlobals(regionInformation);
    informationDisplay.textContent = STATUS_LOADED;
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
        let splitName = searchedPlayer.split("#");
        let name = splitName[0];
        let tag = splitName[1];
        playerData = await getPlayerDataJSONFromName(name, tag);
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

    displayInColumns(playerFullData, displayAmount);
}

function displayInColumns(data, amountToDisplay)
{
    clearColumns();
    resultsContainer.classList.remove("hidden");
    informationDisplay.classList.add("hidden");

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
        // if no more to show, stop
        if (sortedByEasiest[i] === undefined || sortedByClosest[i] === undefined || sortedByBiggestIncrease[i] === undefined)
        {
            moreButton.classList.add("hidden");
            moreButton.disabled = true;
            return;
        }
        
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

        let easiestText = `${easiestPercent}% of players have the next tier.\n\n${sortedByEasiest[i].description}`;
        let closestText = `${sortedByClosest[i].playerScore}/${sortedByClosest[i].thresholds[sortedByClosest[i].nextLevel]}
        \n\n${sortedByClosest[i].description}`;
        let increaseText = `You will get ${increasePoints} points for leveling up.\n\n${sortedByBiggestIncrease[i].description}`;

        easiestDesc.innerText = easiestText.replace(/<\/?[^>]+(>|$)/g, "");
        closestDesc.innerText = closestText.replace(/<\/?[^>]+(>|$)/g, "");
        increaseDesc.innerText = increaseText.replace(/<\/?[^>]+(>|$)/g, "");

        easiestColumn.appendChild(easiestEntry);
        easiestEntry.appendChild(easiestDesc);

        closestColumn.appendChild(closestEntry);
        closestEntry.appendChild(closestDesc);

        biggestIncreaseColumn.appendChild(increaseEntry);
        increaseEntry.appendChild(increaseDesc);

        easiestEntry.onclick = function(event){event.stopPropagation(); showChallenge(sortedByEasiest[i].id)};
        closestEntry.onclick = function(event){event.stopPropagation(); showChallenge(sortedByClosest[i].id)};
        increaseEntry.onclick = function(event){event.stopPropagation(); showChallenge(sortedByBiggestIncrease[i].id)};
    }
}

const challengeLevelDisplay = document.querySelector("#level-rank");
const challengeLevelPoints = document.querySelector("#rankup-points");
const challengeNameDisplay = document.querySelector("#challenge-name");
const challengeDescriptionDisplay = document.querySelector("#challenge-info-description");
const challengeInfoProgressNumbers = document.querySelector("#challenge-info-progress-numbers"); 
const challengeInfoProgressBar = document.querySelector("#challenge-info-progress-bar"); 

function showChallenge(id)
{
    if (APIDialog.id === API_DIALOG_SHOW_ID)
    {
        hideAPIDialog();
    }
    challengeInfoDisplay.id = CHALLENGE_INFO_SHOW_ID;

    const challToDisplay = playerFullData.filter(data => {
        if (data.id === id) return true;
    })[0];

    const name = challToDisplay.name;
    const desc = challToDisplay.description;
    const pointsDisplay = `${challToDisplay.playerScore}/${challToDisplay.thresholds[challToDisplay.nextLevel]}`;
    const progress = challToDisplay.percentToNextLevel * 100;

    challengeDescriptionDisplay.innerText = "";
    if (id.toString().startsWith(ARAM_PREFIX))
    {
        challengeDescriptionDisplay.innerText = "(ARAM)\n";
    }
    else if (id.toString().startsWith(BOT_PREFIX))
    {
        challengeDescriptionDisplay.innerText = "(BOT)\n";
    }

    const currentRankDisplay = challengeLevelDisplay.children[0];
    const nextRankDisplay = challengeLevelDisplay.children[2];
    currentRankDisplay.src = `images/ranks/${challToDisplay.playerLevel}.png`;
    nextRankDisplay.src = `images/ranks/${challToDisplay.nextLevel}.png`;
    challengeLevelPoints.innerText = `${challToDisplay.pointsFromLevelUp}p`;

    challengeNameDisplay.innerText = name;
    challengeDescriptionDisplay.innerText += desc.replace(/<\/?[^>]+(>|$)/g, "");
    challengeInfoProgressNumbers.innerText = pointsDisplay;
    challengeInfoProgressBar.value = progress;
}

function hideChallenge()
{
    challengeInfoDisplay.id = CHALLENGE_INFO_HIDE_ID;

    challengeNameDisplay.innerText = "";
    challengeDescriptionDisplay.innerText = "";
    challengeInfoProgressNumbers.innerText = "";
    challengeInfoProgressBar.value = 0;
}

let lastAPIDialogValue;

function showAPIDialog()
{
    APIInput.focus();
    if (challengeInfoDisplay.id == CHALLENGE_INFO_SHOW_ID)
    {
        hideChallenge();
    }

    APIDialog.id = API_DIALOG_SHOW_ID;
    APIInput.disabled = false;
    lastAPIDialogValue = APIInput.value;
}

function hideAPIDialog()
{
    APIDialog.id = API_DIALOG_HIDE_ID;
    APIInput.disabled = true;
    APIKey = APIInput.value;   
    if (APIKey !== lastAPIDialogValue) // avoid unnecessary loads
    {
        initialize();
        clearColumns();
    }
}

function clearColumns()
{
    resultsContainer.classList.add("hidden");
    informationDisplay.classList.remove("hidden");
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
    const PERCENTILES_ENDPOINT = region + PARTIAL_PERCENTILES_ENDPOINT;

    return JSON.parse(await fetchData(PERCENTILES_ENDPOINT));
}

async function getRegionChallengeConfigJSON(region) // returns list of objects
{
    const CONFIG_ENDPOINT = region + PARTIAL_CONFIG_ENDPOINT;

    return JSON.parse(await fetchData(CONFIG_ENDPOINT));
}

async function getPlayerDataJSONFromName(name, tag)
{
    const currentRegion = "europe";
    const SUMMONERBYID_ENDPOINT = currentRegion + PARTIAL_SUMMONERBYID_ENDPOINT + name + "/" + tag;

    const summoner = await fetchData(SUMMONERBYID_ENDPOINT);

    return await getChallengeDataJSONFromPUUID(JSON.parse(summoner).puuid);
}

async function getChallengeDataJSONFromPUUID(puuid)
{
    const currentRegion = regionDropdown.value;
    const PLAYERDATA_ENDPOINT = currentRegion + PARTIAL_PLAYERDATA_ENDPOINT + puuid;

    return JSON.parse(await fetchData(PLAYERDATA_ENDPOINT));
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
const resultsContainer = document.querySelector("#results");
const closestColumn = document.querySelector("#closest-column");
const biggestIncreaseColumn = document.querySelector("#biggestincrease-column");
const easiestColumn = document.querySelector("#easiest-column");
const moreButton = document.querySelector("#more-button");
// Error display
const errorDisplay = document.querySelector("#error-display");
// Information display
const informationDisplay = document.querySelector("#information");
// API key display
const APIButton = document.querySelector("#api-button");
const APIDialog = document.querySelector("#api-key-dialog-hidden");
const APIInput = document.querySelector("#api-input");
// Challenge full display
const challengeInfoDisplay = document.querySelector(".challenge-info");
const challengeInfoClose = document.querySelector("#close-button");

//// Globals
let loadedChallengeInformation; // ID, name, description
let loadedChallengePercentiles;
let playerFullData;
let loadedPlayer;
let loadingDatabase;
let displayAmount;

let APIKey = "";

//// Events
regionDropdown.addEventListener("change", async () => {
    // void loaded player data
    loadedPlayer = undefined; 
    playerFullData = undefined;
    clearColumns();

    initialize();
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

challengeInfoClose.addEventListener("click", hideChallenge);

challengeInfoDisplay.addEventListener("click", function(event) {
    event.stopPropagation();
});

APIButton.addEventListener("click", function(event) {
    event.stopPropagation();
    if (APIDialog.id === API_DIALOG_HIDE_ID)
    {
        showAPIDialog();
    }
    else
    {
        hideAPIDialog();
    }
});

APIDialog.addEventListener("click", function(event) {
    event.stopPropagation();
});

APIInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        hideAPIDialog();
    }
});

document.addEventListener("click", () => {
    if (challengeInfoDisplay.id == CHALLENGE_INFO_SHOW_ID)
    {
        hideChallenge();
    }
    if (APIDialog.id === API_DIALOG_SHOW_ID)
    {
        hideAPIDialog();
    }
});

document.addEventListener("keyup", function(event) {
    if (event.key === "Escape") {
        hideChallenge();
    }
}, true);

moreButton.addEventListener("click", () => {
    displayAmount += DISPLAY_ADD_AMOUNT;
    displayInColumns(playerFullData, displayAmount);
});

initialize();