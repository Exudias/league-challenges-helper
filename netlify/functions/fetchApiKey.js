export const handler = async () => {
  const value = process.env.RIOT_API_KEY;

  return {
    statusCode: 200,
    body: JSON.stringify({ message: value }),
  };  
};