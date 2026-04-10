/**
 * Call Diagnostics Component
 * Displays real-time call system health and diagnostics
 */

'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';
import { getCallDiagnostics, callMonitor } from '@/utils/callMonitoring';
import { useSafeJsSIP, CONNECT_STATUS, RegisterStatus } from '@/hooks/useJsSIP';
import { isDev } from '@/utils/utils';

interface DiagnosticsData {
  activeSessions: number;
  callStats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    recentErrors: string[];
  };
  healthScore: number;
}

export const CallDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { connectStatus, registerStatus } = useSafeJsSIP();

  // Update diagnostics every 5 seconds
  useEffect(() => {
    const updateDiagnostics = () => {
      const data = getCallDiagnostics();
      setDiagnostics({
        activeSessions: data.activeSessions,
        callStats: data.callStats,
        healthScore: data.healthScore,
      });
    };

    updateDiagnostics();
    const interval = setInterval(updateDiagnostics, 5000);

    return () => clearInterval(interval);
  }, []);

  const exportDiagnostics = () => {
    const data = callMonitor.exportDiagnostics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `call-diagnostics-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetMonitoring = () => {
    callMonitor.reset();
    setDiagnostics(null);
  };



  const getConnectionStatusColor = (status: string) => {
    if (status === CONNECT_STATUS.CONNECTED) return 'bg-emerald-500';
    if (status === CONNECT_STATUS.WAIT_REQUEST_CONNECT) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getRegistrationStatusColor = (status: string) => {
    if (status === RegisterStatus.REGISTERED) return 'bg-emerald-500';
    if (status === RegisterStatus.UNREGISTERED) return 'bg-red-500';
    return 'bg-amber-500';
  };

  if (!isDev && !isExpanded) return null;

  return (
    <Card className="mt-4 " header={{
      content: (
        <div className="flex justify-between items-center">
          <h4>Call System Diagnostics</h4>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {isExpanded && (
              <>
                <Button size="sm" variant="secondary" onClick={exportDiagnostics}>
                  Export
                </Button>
                <Button size="sm" variant="secondary" onClick={resetMonitoring}>
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>
      )
    }}>
      {!isExpanded ? (
        <div>  </div>
      ) : (
        <div className="space-y-4">
          {/* System Status */}
          <div>
            <h5 className="font-medium mb-2">System Status</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {diagnostics ? diagnostics.healthScore : 0}%
                </div>
                <div className="text-sm text-gray-600">Health Score</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {diagnostics ? diagnostics.activeSessions : 0}
                </div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>

              <div className="text-center">
                <Tag
                  prefix
                  prefixClass={getConnectionStatusColor(connectStatus)}
                >
                  {connectStatus?.toLowerCase()?.replace(/_/g, ' ')}
                </Tag>
                <div className="text-sm text-gray-600 mt-1">SIP Connection</div>
              </div>

              <div className="text-center">
                <Tag
                  prefix
                  prefixClass={getRegistrationStatusColor(registerStatus)}
                >
                  {registerStatus?.toLowerCase()?.replace(/_/g, ' ')}
                </Tag>
                <div className="text-sm text-gray-600 mt-1">Registration</div>
              </div>
            </div>
          </div>

          {/* Call Statistics */}
          {diagnostics && (
            <div>
              <h5 className="font-medium mb-2">Call Statistics</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-semibold">
                    {diagnostics.callStats.totalCalls}
                  </div>
                  <div className="text-sm text-gray-600">Total Calls</div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-semibold text-emerald-600">
                    {diagnostics.callStats.successfulCalls}
                  </div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-semibold text-red-600">
                    {diagnostics.callStats.failedCalls}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-semibold">
                    {Math.floor(diagnostics.callStats.averageDuration / 60)}:
                    {String(diagnostics.callStats.averageDuration % 60).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-600">Avg Duration</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Errors */}
          {diagnostics && diagnostics.callStats.recentErrors.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Recent Errors</h5>
              <div className="space-y-1">
                {diagnostics.callStats.recentErrors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Recommendations */}
          <div>
            <h5 className="font-medium mb-2">System Recommendations</h5>
            <div className="space-y-2">
              {diagnostics && diagnostics.healthScore < 80 && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Call system performance is below optimal. Check network connection and SIP configuration.
                </div>
              )}

              {connectStatus !== CONNECT_STATUS.CONNECTED && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  ❌ SIP connection is not established. Check VoIP server configuration.
                </div>
              )}

              {registerStatus !== RegisterStatus.REGISTERED && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  ❌ SIP registration failed. Verify agent credentials.
                </div>
              )}

              {diagnostics && diagnostics.callStats.failedCalls > diagnostics.callStats.successfulCalls && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  🚨 High call failure rate detected. Review network stability and server configuration.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
