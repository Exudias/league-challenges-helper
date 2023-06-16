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

// Get information about ALL challenges that currently exist
const CHALLENGES_CONFIG_ENDPOINT_EUW = "https://euw1.api.riotgames.com/lol/challenges/v1/challenges/config";

let challengesConfig;
let activeChallenges;

const xhr = new XMLHttpRequest();
xhr.open("GET", CHALLENGES_CONFIG_ENDPOINT_EUW + "?api_key=" + API_KEY);
xhr.send();
xhr.onload = () => 
{
    if (xhr.readyState == 4 && xhr.status == 200) 
    {
        challengesConfig = JSON.parse(xhr.response);
        getAllActiveChallenges();
    } 
    else 
    {
        alert(`Error: ${xhr.status}`);
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

function getAllActiveChallenges()
{
    activeChallenges = [];
    challengesConfig.forEach(challenge => {
        if (challenge.state === "ENABLED")
        {
            activeChallengeObject = 
            {
                name: challenge.localizedNames.en_GB.name,
                id: challenge.id,
                thresholds: challenge.thresholds,
                maxLevel: getMaxThreshold(challenge.thresholds),
            };
            activeChallenges.push(activeChallengeObject);
        }
    });
}