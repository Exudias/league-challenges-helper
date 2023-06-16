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
const SUMMONER_BY_NAME_ENDPOINT = ".api.riotgames.com/lol/summoner/v4/summoners/by-name/";
const CHALLENGE_PLAYER_DATA_ENDPOINT = ".api.riotgames.com/lol/challenges/v1/player-data/";

// Functions
function updateChallengesInformation()
{
    challengeInfodatabaseLoaded = false;
    console.log("[INFO]: LOADING CHALLENGES CONFIG DATABASE...");
    const CONFIG_FULL_ENDPOINT = "https://" + currentRegion + CHALLENGES_CONFIG_ENDPOINT;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", CONFIG_FULL_ENDPOINT + "?api_key=" + API_KEY);
    xhr.send();

    xhr.onload = () => 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            activeChallenges = getAllActiveChallengesFromConfig(JSON.parse(xhr.response));
            challengeInfodatabaseLoaded = true;
            console.log("[INFO]: CHALLENGES CONFIG DATABASE LOADED!");
        } 
        else 
        {
            alert(`Error: ${xhr.status}`);
        }
    }
}

function getChallengeDataFromName(name)
{
    const SUMMONER_BY_NAME_FULL_ENDPOINT = "https://" + currentRegion + SUMMONER_BY_NAME_ENDPOINT + name;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", SUMMONER_BY_NAME_FULL_ENDPOINT + "?api_key=" + API_KEY);
    xhr.send();

    xhr.onload = () => 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            return getChallengeDataFromPUUID(JSON.parse(xhr.response).puuid);
        } 
        else 
        {
            alert(`Error: ${xhr.status}`);
        }
    }
}

function getChallengeDataFromPUUID(puuid)
{
    const CHALLENGE_PLAYER_DATA_FULL_ENDPOINT = "https://" + currentRegion + CHALLENGE_PLAYER_DATA_ENDPOINT + puuid;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", CHALLENGE_PLAYER_DATA_FULL_ENDPOINT + "?api_key=" + API_KEY);
    xhr.send();

    xhr.onload = () => 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            return JSON.parse(xhr.response);
        } 
        else 
        {
            alert(`Error: ${xhr.status}`);
        }
    }
}

function getMaxThreshold(challengeThresholds)
{
    let current_max;
    CHALLENGE_LEVELS.forEach(level => {
        if (level in challengeThresholds)
        {
            current_max = level;
        }
    });
    return current_max;
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
                maxLevel: getMaxThreshold(challenge.thresholds),
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

//// BELOW - CALLED ON SCRIPT LOAD!!!

let activeChallenges;
let currentPlayer;
let challengeInfodatabaseLoaded = false;

// Region selection
const regionSelector = document.querySelector("#region");
let currentRegion = regionSelector.value;
regionSelector.addEventListener("change", () => {
    currentRegion = regionSelector.value;
    updateChallengesInformation();
});

// Player search
const searchButton = document.querySelector("#search-button");
const playerNameInput = document.querySelector("#player-name");
searchButton.addEventListener("click", async () => {
    currentPlayer = playerNameInput.value;
    const challengeData = getChallengeDataFromName(currentPlayer);
});

initialize();