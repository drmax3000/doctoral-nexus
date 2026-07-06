import { getTelemetry } from '@/server/db';

export async function GET(request: Request) {
  try {
    const stats = getTelemetry();
    
    return Response.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in telemetry+api GET:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch telemetry data' },
      { status: 500 }
    );
  }
}
