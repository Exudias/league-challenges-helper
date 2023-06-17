// Constants
const API_KEY = "RGAPI-126439f7-1dfa-4623-b59a-aa08c640e1d8";

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

const CHALLENGE_POINTS =
{
  IRON: 5,
  BRONZE: 10,
  SILVER: 15,
  GOLD: 25,
  PLATINUM: 40,
  DIAMOND: 60,
  MASTER: 100,
  GRANDMASTER: 100,
  CHALLENGER: 100
};

const CHALLENGES_CONFIG_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/config";
const CHALLENGE_PERCENTILES_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/challenges/percentiles";
const SUMMONER_BY_NAME_ENDPOINT = ".api.riotgames.com/lol/summoner/v4/summoners/by-name/";
const CHALLENGE_PLAYER_DATA_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/player-data/";

// Functions
async function updateChallengesInformation()
{
    searchButton.disabled = true;
    error.classList.remove("hidden");
    error.innerText = "LOADING...";
    challengePercentiles = await getChallengePercentilesJSON();
    activeChallenges = getAllActiveChallengesFromConfig(await getChallengeConfigJSON());
    error.classList.add("hidden");
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

function getPointsFromNextChallengeLevel(challenge)
{
    let currentLevel = challenge.playerLevel;
    let nextLevel = challenge.nextLevel;
    let currentPoints = currentLevel === -1 ? 0 : CHALLENGE_POINTS[CHALLENGE_LEVELS[currentLevel]];
    let nextPoints = nextLevel === -1 ? 0 : CHALLENGE_POINTS[CHALLENGE_LEVELS[nextLevel]]
    return nextPoints - currentPoints;
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

function calculateProgressToNextLevel()
{
    // Filter out challenges you haven't even started
    const progressedActives = [];
    activeChallenges.forEach(chall => {
        const id = chall.id;
        const dataFromId = challengeData.filter(data => {
            return data.challengeId === id;
        })[0];
        if (dataFromId !== undefined)
        {
            progressedActives.push(chall);
        }
    });

    // Create a useful object for calculations
    const thresholdObjects = [...progressedActives].map(chall => {
        return { 
            id: chall.id, 
            thresholds: chall.thresholds, 
            playerScore: challengeData.filter(data => {
                return data.challengeId === chall.id;
            })[0].value
        }});

    filteredThresholds = [];

    thresholdObjects.forEach(object => {
        const thresholds = object.thresholds;
        const lowerUpper = getLowerAndUpperThresholdFromThresholdObject(object);
        const percentage = (lowerUpper.playerScore - lowerUpper.lower) / (lowerUpper.upper - lowerUpper.lower);
        object.progressToNextTier = percentage;
    });

    nonMaxedChallenges.forEach(nonMaxedObj => {
        const thresholdObject = thresholdObjects.filter(thresholdObj => {
            return nonMaxedObj.id === thresholdObj.id;
        })[0];
        if (thresholdObject !== undefined)
        nonMaxedObj.progressToNextTier = thresholdObject.progressToNextTier;
    });
    console.log(nonMaxedChallenges);
}

function getLowerAndUpperThresholdFromThresholdObject(object)
{
    const playerScore = object.playerScore;
    let lower;
    let upper;
    let lastRequirement;
    for (let i = 0; i < CHALLENGE_LEVELS.length; i++)
    {
        const thresholdRequirement = object.thresholds[CHALLENGE_LEVELS[i]];
        if (thresholdRequirement === undefined) continue;
        if (lower === undefined && playerScore >= thresholdRequirement)
        {
            lower = thresholdRequirement;
        }
        if (upper === undefined && playerScore < thresholdRequirement)
        {
            upper = thresholdRequirement;
            lower = lastRequirement;
            break;
        }
        lastRequirement = thresholdRequirement;
    }
    return {lower, upper, playerScore};
} 

function beginDisplay(amount)
{
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
    calculateProgressToNextLevel();
    const sortedByClosestLevelup = [...nonMaxedChallenges].sort((a, b) => {
        const aProgress = a.progressToNextTier ?? -1;
        const bProgress = b.progressToNextTier ?? -1;
        return bProgress - aProgress;
    });
    const sortedByPointIncrease = [...nonMaxedChallenges].sort((a, b) => {
        let aPoints = getPointsFromNextChallengeLevel(a);
        let bPoints = getPointsFromNextChallengeLevel(b);
        a.nextPoints = aPoints;
        b.nextPoints = bPoints;
        return bPoints - aPoints;
    });

    clearSuggestions();

    for (let i = 0; i < amount; i++)
    {
        closestLevelupEntry = document.createElement("p");
        closestLevelupDesc = document.createElement("p");

        pointIncreaseEntry = document.createElement("p");
        pointIncreaseDesc = document.createElement("p");

        percentileEntry = document.createElement("p");
        percentileDesc = document.createElement("p");

        const progress = (sortedByClosestLevelup[i].progressToNextTier * 100).toFixed(1);
        const pointsToGet = sortedByPointIncrease[i].nextPoints;
        const nextPercent = (sortedByPercentile[i].nextPercentile * 100).toFixed(1);

        closestLevelupEntry.innerText = sortedByClosestLevelup[i].name;
        closestLevelupDesc.innerText = "Progress: " + progress + "%";
        pointIncreaseEntry.innerText = sortedByPointIncrease[i].name;
        pointIncreaseDesc.innerText =  "You will get " + pointsToGet + " points for leveling up.";
        percentileEntry.innerText = sortedByPercentile[i].name;
        percentileDesc.innerText = nextPercent + "% of players have the next tier.";

        closestLevelupColumn.appendChild(closestLevelupEntry);
        closestLevelupEntry.appendChild(closestLevelupDesc);
        pointIncreaseColumn.appendChild(pointIncreaseEntry);
        pointIncreaseEntry.appendChild(pointIncreaseDesc);
        highestPercentileColumn.appendChild(percentileEntry);
        percentileEntry.appendChild(percentileDesc);
    }
}

function clearSuggestions()
{
    closestLevelupColumn.innerHTML = "";
    pointIncreaseColumn.innerHTML = "";
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
let challengeData;
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
    challengeData = playerData.challenges;
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
    beginDisplay(amountToDisplay);
});

// Challenge display
const challengesBox = document.querySelector("#challenges-box");
const closestLevelupColumn = document.querySelector("#closest-level-up");
const pointIncreaseColumn = document.querySelector("#point-increase");
const highestPercentileColumn = document.querySelector("#highest-percentile");

const displayAmountSlider = document.querySelector("#display-amount-selector");
const displayAmountCounter = document.querySelector("#display-amount-counter");
let amountToDisplay = displayAmountSlider.value;
displayAmountSlider.addEventListener("change", () => {
    displayAmountCounter.innerText = displayAmountSlider.value;
    amountToDisplay = displayAmountSlider.value;
});

// Error display
const errorDiv = document.querySelector("#error");

// Input
playerNameInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      searchButton.click();
    }
  });

initialize();