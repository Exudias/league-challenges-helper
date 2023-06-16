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

// Functions
function updateChallengesInformation()
{
    const CONFIG_FULL_ENDPOINT = "https://" + currentRegion + CHALLENGES_CONFIG_ENDPOINT;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", CONFIG_FULL_ENDPOINT + "?api_key=" + API_KEY);
    xhr.send();

    xhr.onload = () => 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            activeChallenges = getAllActiveChallengesFromConfig(JSON.parse(xhr.response));
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

// Region selection
const regionSelector = document.querySelector("#region");
let currentRegion = regionSelector.value;
regionSelector.addEventListener("change", () => {
    currentRegion = regionSelector.value;
    updateChallengesInformation();
});

initialize();