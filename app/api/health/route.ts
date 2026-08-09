/**
 * Health Check API Endpoint
 * Provides system health status for monitoring and load balancers
 *
 * GET /api/health - Quick health check (always returns 200 if app is running)
 * GET /api/health?detailed=true - Detailed health check with component status
 *
 * The quick health check is designed for:
 * - Load balancer health probes
 * - Deployment verification
 * - Basic uptime monitoring
 *
 * The detailed health check is designed for:
 * - Application monitoring systems
 * - Alerting on degraded performance
 * - Configuration validation
 */

import { NextRequest, NextResponse } from 'next/server';
import featureFlags from '@/lib/featureFlags';

/**
 * Health status type alias
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health status
 */
interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: string;
}

/**
 * Health check response
 */
interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  commit: string;
  builtAt: string;
  uptime: number;
  environment: string;
  components?: ComponentHealth[];
  details?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    featureFlags: {
      enabled: number;
      total: number;
    };
  };
}

/**
 * Get application version from package.json or environment
 */
function getVersion(): string {
  return process.env.OMNIPOST_VERSION || process.env.APP_VERSION || '0.1.0';
}

function getCommit(): string {
  return process.env.OMNIPOST_COMMIT || 'unknown';
}

function getBuiltAt(): string {
  return process.env.OMNIPOST_BUILT_AT || 'unknown';
}

function getEnvironment(): string {
  return process.env.OMNIPOST_ENVIRONMENT || process.env.NODE_ENV || 'development';
}

/**
 * Get uptime in seconds
 */
function getUptime(): number {
  return Math.floor(process.uptime());
}

/**
 * Get feature flag statistics
 * Returns count of total flags and enabled flags
 */
function getFeatureFlagStats(): { total: number; enabled: number } {
  const flags = featureFlags;
  const total = Object.keys(flags).length;
  const enabled = Object.values(flags).filter(flag => {
    if (typeof flag === 'boolean') return flag;
    if (typeof flag === 'object' && flag !== null) return flag.enabled;
    return false;
  }).length;

  return { total, enabled };
}

/**
 * Check feature flags health
 */
function checkFeatureFlags(): ComponentHealth {
  try {
    const { total, enabled } = getFeatureFlagStats();

    return {
      name: 'feature-flags',
      status: 'healthy',
      message: `${enabled}/${total} flags enabled`,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return {
      name: 'feature-flags',
      status: 'unhealthy',
      message: 'Failed to load feature flags',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check memory health
 */
function checkMemory(): ComponentHealth {
  try {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const percentage = Math.round((used.heapUsed / used.heapTotal) * 100);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (percentage > 90) {
      status = 'unhealthy';
    } else if (percentage > 75) {
      status = 'degraded';
    }

    return {
      name: 'memory',
      status,
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${percentage}%)`,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return {
      name: 'memory',
      status: 'unhealthy',
      message: 'Failed to check memory',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check environment configuration
 * @param strict - If true, checks for optional configuration variables
 */
function checkEnvironment(strict: boolean = false): ComponentHealth {
  // No truly required variables for basic health check
  // The app can start and serve requests without JWT_SECRET
  const optionalVars = ['JWT_SECRET', 'NEXT_PUBLIC_API_URL'];
  const missingVars = optionalVars.filter(v => !process.env[v]);

  // In non-strict mode (quick health check), app is healthy if it's running
  if (!strict) {
    return {
      name: 'environment',
      status: 'healthy',
      message:
        missingVars.length > 0
          ? `Running (optional config missing: ${missingVars.join(', ')})`
          : 'All configuration present',
      lastChecked: new Date().toISOString(),
    };
  }

  // In strict mode (detailed health check), report on missing optional config
  if (missingVars.length > 0) {
    return {
      name: 'environment',
      status: 'degraded',
      message: `Optional configuration missing: ${missingVars.join(', ')}`,
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    name: 'environment',
    status: 'healthy',
    message: 'All configuration present',
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Calculate overall status from component health
 */
function calculateOverallStatus(
  components: ComponentHealth[]
): 'healthy' | 'degraded' | 'unhealthy' {
  const hasUnhealthy = components.some(c => c.status === 'unhealthy');
  const hasDegraded = components.some(c => c.status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
}

/**
 * GET /api/health
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  // Quick health check response - lenient, just checks if app is alive
  // This is suitable for load balancers and deployment health checks
  if (!detailed) {
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: getVersion(),
        commit: getCommit(),
        builtAt: getBuiltAt(),
        uptime: getUptime(),
        environment: getEnvironment(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  // Detailed health check - strict, checks all components and configuration
  // This is suitable for monitoring and alerting systems
  const components: ComponentHealth[] = [
    checkFeatureFlags(),
    checkMemory(),
    checkEnvironment(true), // strict mode for detailed check
  ];

  const memoryUsage = process.memoryUsage();
  const { total: totalFlags, enabled: enabledFlags } = getFeatureFlagStats();

  const overallStatus = calculateOverallStatus(components);

  // Determine HTTP status code based on health status
  let statusCode: number;
  if (overallStatus === 'healthy' || overallStatus === 'degraded') {
    statusCode = 200;
  } else {
    statusCode = 503;
  }

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: getVersion(),
      commit: getCommit(),
      builtAt: getBuiltAt(),
      uptime: getUptime(),
      environment: getEnvironment(),
      components,
      details: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
        featureFlags: {
          enabled: enabledFlags,
          total: totalFlags,
        },
      },
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
