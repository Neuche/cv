import { NextResponse } from 'next/server';

const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr';

const POPULAR_TOKENS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'XRPUSDT',
  'DOTUSDT',
  'LINKUSDT',
  'LTCUSDT'
];

export const dynamic = 'force-dynamic'; // Disable caching for this route
export const fetchCache = 'force-no-store'; // Prevent caching of fetch requests

export async function GET() {
  try {
    const response = await fetch(BINANCE_API_URL, {
      cache: 'no-store' // Ensure the browser doesn't cache this request
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Binance API: ${response.statusText}`);
    }
    
    const allTokens = await response.json();
    
    // Filter and map the tokens in a single pass
    const filteredTokens = allTokens
      .filter((token: any) => POPULAR_TOKENS.includes(token.symbol))
      .map((token: any) => ({
        symbol: token.symbol,
        price: token.lastPrice,
        priceChangePercent: token.priceChangePercent
      }));

    return new Response(JSON.stringify(filteredTokens), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0' // Prevent client-side caching
      }
    });
  } catch (error) {
    console.error('Error fetching Binance data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch token data' }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}