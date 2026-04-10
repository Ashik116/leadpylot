'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMonitoringOverview } from '@/services/hooks/comm';
import { Cpu, MemoryStick, Wifi, Users, Monitor, X, Radio, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { MonitoringOverview } from '@/services/CommApiService';

const ApexChart = dynamic(() => import('react-apexcharts').then((m) => m.default), { ssr: false });

const MAX_POINTS = 100; // ~5 min at 3s intervals

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function formatBytesPerSec(bytes: number): string {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB/s';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB/s';
  return bytes + ' B/s';
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---- Chart base options (Discord dark theme) ----
const baseChartOpts: any = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
    animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 800 } },
    zoom: { enabled: false },
  },
  theme: { mode: 'dark' as const },
  grid: { borderColor: '#3f4147', strokeDashArray: 3, padding: { left: 8, right: 8 } },
  xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#949ba4', fontSize: '11px' } } },
  stroke: { curve: 'smooth' as const, width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05, shadeIntensity: 1 } },
  tooltip: { theme: 'dark' as const, x: { show: false } },
  legend: { show: false },
};

interface Props {
  onClose: () => void;
}

export default function LiveKitMonitor({ onClose }: Props) {
  const { data, isLoading, isError } = useMonitoringOverview(true);

  // Rolling time-series data
  const cpuHistory = useRef<number[]>([]);
  const ramHistory = useRef<number[]>([]);
  const rxHistory = useRef<number[]>([]);
  const txHistory = useRef<number[]>([]);
  const [, forceRender] = useState(0);

  const appendData = useCallback((overview: MonitoringOverview) => {
    if (overview.system) {
      cpuHistory.current = [...cpuHistory.current, overview.system.cpu.usagePercent].slice(-MAX_POINTS);
      ramHistory.current = [...ramHistory.current, overview.system.memory.usagePercent].slice(-MAX_POINTS);
      rxHistory.current = [...rxHistory.current, overview.system.network.rxBytesPerSec / 1048576].slice(-MAX_POINTS);
      txHistory.current = [...txHistory.current, overview.system.network.txBytesPerSec / 1048576].slice(-MAX_POINTS);
    }
    forceRender((n) => n + 1);
  }, []);

  useEffect(() => {
    if (data) appendData(data);
  }, [data, appendData]);

  const sys = data?.system;
  const rooms = data?.rooms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#2b2d31] border border-[#3f4147] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-[#2b2d31] border-b border-[#3f4147] px-6 py-4">
          <Monitor size={22} className="text-[#5865f2]" />
          <h2 className="text-lg font-bold text-[#f2f3f5]">LiveKit Server Monitor</h2>
          {sys && (
            <span className="ml-2 rounded bg-[#23a55a]/20 px-2 py-0.5 text-[11px] font-semibold text-[#23a55a]">
              Uptime: {formatUptime(sys.uptime)}
            </span>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#949ba4] hover:bg-[#35373c] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading && !data && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#5865f2] border-t-transparent" />
            <span className="ml-3 text-[#949ba4]">Connecting to monitoring agent...</span>
          </div>
        )}

        {isError && !data && (
          <div className="px-6 py-12 text-center">
            <p className="text-[#f23f43] font-medium">Failed to connect to monitoring service</p>
            <p className="mt-1 text-sm text-[#949ba4]">Make sure the stats agent and communication service are running.</p>
          </div>
        )}

        {data && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Top stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<Cpu size={18} />} label="CPU" value={sys ? `${sys.cpu.usagePercent.toFixed(1)}%` : '--'} sub={sys ? `${sys.cpu.cores} cores` : ''} color="#5865f2" />
              <StatCard icon={<MemoryStick size={18} />} label="RAM" value={sys ? `${sys.memory.usagePercent.toFixed(1)}%` : '--'} sub={sys ? `${formatBytes(sys.memory.usedBytes)} / ${formatBytes(sys.memory.totalBytes)}` : ''} color="#eb459e" />
              <StatCard icon={<Users size={18} />} label="Participants" value={rooms ? String(rooms.totalParticipants) : '0'} sub={`${rooms?.totalRooms || 0} active rooms`} color="#23a55a" />
              <StatCard icon={<Radio size={18} />} label="Publishers" value={rooms ? String(rooms.totalPublishers) : '0'} sub="streaming tracks" color="#f0b232" />
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CPU chart */}
              <ChartCard title="CPU Usage" icon={<Cpu size={16} />} color="#5865f2">
                <ApexChart
                  type="area"
                  height={180}
                  series={[{ name: 'CPU %', data: cpuHistory.current }]}
                  options={{
                    ...baseChartOpts,
                    colors: ['#5865f2'],
                    yaxis: { ...baseChartOpts.yaxis, min: 0, max: 100, tickAmount: 4, labels: { ...baseChartOpts.yaxis.labels, formatter: (v: number) => `${v.toFixed(0)}%` } },
                  }}
                />
              </ChartCard>

              {/* RAM chart */}
              <ChartCard title="Memory Usage" icon={<MemoryStick size={16} />} color="#eb459e">
                <ApexChart
                  type="area"
                  height={180}
                  series={[{ name: 'RAM %', data: ramHistory.current }]}
                  options={{
                    ...baseChartOpts,
                    colors: ['#eb459e'],
                    yaxis: { ...baseChartOpts.yaxis, min: 0, max: 100, tickAmount: 4, labels: { ...baseChartOpts.yaxis.labels, formatter: (v: number) => `${v.toFixed(0)}%` } },
                  }}
                />
              </ChartCard>

              {/* Network chart */}
              <ChartCard title="Network Bandwidth" icon={<Wifi size={16} />} color="#23a55a">
                <div className="flex items-center gap-4 mb-1 px-2">
                  <span className="flex items-center gap-1 text-[11px] text-[#949ba4]">
                    <ArrowDownToLine size={12} className="text-[#23a55a]" /> RX: {sys ? formatBytesPerSec(sys.network.rxBytesPerSec) : '--'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#949ba4]">
                    <ArrowUpFromLine size={12} className="text-[#f0b232]" /> TX: {sys ? formatBytesPerSec(sys.network.txBytesPerSec) : '--'}
                  </span>
                </div>
                <ApexChart
                  type="area"
                  height={180}
                  series={[
                    { name: 'RX (MB/s)', data: rxHistory.current },
                    { name: 'TX (MB/s)', data: txHistory.current },
                  ]}
                  options={{
                    ...baseChartOpts,
                    colors: ['#23a55a', '#f0b232'],
                    yaxis: { ...baseChartOpts.yaxis, min: 0, labels: { ...baseChartOpts.yaxis.labels, formatter: (v: number) => `${v.toFixed(1)}` } },
                    legend: { show: true, position: 'top' as const, horizontalAlign: 'right' as const, labels: { colors: '#949ba4' }, fontSize: '11px' },
                  }}
                />
              </ChartCard>

              {/* Active rooms */}
              <ChartCard title="Active Rooms" icon={<Users size={16} />} color="#23a55a">
                {rooms && rooms.rooms.length > 0 ? (
                  <div className="space-y-1.5 max-h-[210px] overflow-y-auto px-1">
                    {rooms.rooms.map((room) => (
                      <div key={room.name} className="flex items-center gap-3 rounded-lg bg-[#1e1f22] px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865f2]/15">
                          <Radio size={14} className="text-[#5865f2]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-[#dbdee1]">{room.name.replace('channel_', '#')}</p>
                          <p className="text-[11px] text-[#949ba4]">{room.participants} participants, {room.publishers} publishing</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-[#23a55a] animate-pulse" />
                          <span className="text-[11px] font-medium text-[#23a55a]">Live</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[180px] items-center justify-center">
                    <p className="text-sm text-[#949ba4]">No active rooms</p>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#1e1f22] border border-[#3f4147]/50 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#f2f3f5]">{value}</p>
      {sub && <p className="text-[11px] text-[#949ba4] mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#1e1f22] border border-[#3f4147]/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-semibold text-[#dbdee1]">{title}</h3>
      </div>
      {children}
    </div>
  );
}
