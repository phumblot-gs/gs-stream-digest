import { NextRequest, NextResponse } from 'next/server';

// This endpoint receives logs from the frontend and forwards them to the backend
// The backend will then send them to Axiom
export async function POST(request: NextRequest) {
  try {
    const logData = await request.json();
    
    // Forward to backend API if BACKEND_URL is set
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/api/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...logData,
            source: 'frontend',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        // Silently fail - backend might not be available
        console.debug('[Logs API] Failed to forward log to backend:', error);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    );
  }
}

