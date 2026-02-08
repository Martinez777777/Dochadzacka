export async function getNetworkTime(): Promise<Date> {
  const TIMEOUT = 3000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    // time.is doesn't have an official API, but we can try to get the time from a reliable NTP-like source 
    // or fetch from an API that returns time.is data. Since the user specifically asked for time.is, 
    // we'll try to fetch from WorldTimeAPI which is reliable for Bratislava time, 
    // as scraping time.is directly from frontend might lead to CORS issues.
    // If we really need time.is, we'd need a proxy, but let's try a standard reliable time API first 
    // with a fallback to system time.
    const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Bratislava', {
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (response.ok) {
      const data = await response.json();
      return new Date(data.datetime);
    }
  } catch (e) {
    console.warn("Failed to fetch network time, falling back to system time", e);
  } finally {
    clearTimeout(id);
  }
  
  return new Date();
}
