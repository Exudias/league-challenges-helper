async function fetchData(url) 
{
    try 
    {
        const response = await fetch(`/api${url}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9,bg;q=0.8",
                "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://developer.riotgames.com",
                "X-Riot-Token": await fetch('/.netlify/functions/fetchApiKey').then(response => response.json().message)
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

export default fetchData;