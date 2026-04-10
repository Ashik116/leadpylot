import ApiService from './ApiService';

// CDR Record from FreePBX
export interface CDRRecord {
  uniqueId: string;
  callDate: string;
  callerIdName: string;
  source: string;
  destination: string;
  context: string;
  channel: string;
  destinationChannel: string;
  lastApplication: string;
  lastData: string;
  duration: number;
  billableSeconds: number;
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';
  amaFlags: number;
  accountCode: string;
  userField: string;
  recordingFile?: string;
  callerNumber: string;
  callerName: string;
  outboundCallerNumber: string;
  outboundCallerName: string;
  destinationCallerName: string;
  answerTime: string | null;
  endTime: string;
}

// Recording information
export interface RecordingInfo {
  uniqueId: string;
  originalFile: string;
  fullPath: string;
  fileName: string;
  extension: string;
  isCompressed: boolean;
  callDate: string;
  source: string;
  destination: string;
  duration: number;
}

// Recording with stream URLs
export interface RecordingWithUrls {
  uniqueId: string;
  callDate: string;
  source: string;
  destination: string;
  duration: number;
  billableSeconds: number;
  disposition: string;
  recordingFile: string;
  recordingInfo: RecordingInfo | null;
  streamUrls: {
    mp3: string;
    wav: string;
  } | null;
}

// Recording detail response
export interface RecordingDetailResponse {
  status: string;
  data: {
    uniqueId: string;
    recordingInfo: RecordingInfo;
    availability: {
      exists: boolean;
      path: string;
      accessible: boolean;
    };
    streamUrls: {
      mp3: string;
      wav: string;
    };
    callDetails: {
      date: string;
      source: string;
      destination: string;
      duration: number;
      disposition: string;
    };
  };
}

// API response interfaces
export interface CDRResponse {
  status: string;
  data: CDRRecord[];
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

export interface RecordingListResponse {
  status: string;
  data: RecordingWithUrls[];
  meta: {
    count: number;
    limit: number;
    offset: number;
    totalCDRRecords: number;
  };
}

export interface CDRStatisticsResponse {
  status: string;
  data: {
    totalCalls: number;
    answeredCalls: number;
    busyCalls: number;
    noAnswerCalls: number;
    failedCalls: number;
    averageCallDuration: number;
    totalTalkTime: number;
    answerRate: string;
  };
}

// Filter parameters
export interface CDRFilters {
  limit?: number;
  offset?: number;
  extension?: string;
  phone_number?: string;
  disposition?: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';
  start_date?: string;
  end_date?: string;
}

// Dashboard summary data
export interface CallDashboardSummary {
  totalCalls: number;
  totalRecordings: number;
  averageDuration: number;
  answerRate: number;
  callsToday: number;
  recordingsToday: number;
  topDisposition: string;
  peakHour: string;
}

// API functions
export const apiGetRecentCDRRecords = async (filters?: CDRFilters) =>
  ApiService.fetchDataWithAxios<CDRResponse>({
    url: '/cdr/recent',
    method: 'get',
    params: filters,
  });

export const apiGetRecentRecordings = async (filters?: CDRFilters) =>
  ApiService.fetchDataWithAxios<RecordingListResponse>({
    url: '/recordings/list/recent',
    method: 'get',
    params: filters,
  });

export const apiGetRecordingDetail = async (uniqueId: string) =>
  ApiService.fetchDataWithAxios<RecordingDetailResponse>({
    url: `/recordings/${uniqueId}`,
    method: 'get',
  });

export const apiGetCDRStatistics = async (filters?: Omit<CDRFilters, 'limit' | 'offset'>) =>
  ApiService.fetchDataWithAxios<CDRStatisticsResponse>({
    url: '/cdr/statistics',
    method: 'get',
    params: filters,
  });

// Enhanced call data for dashboard table
export interface EnhancedCallData {
  uniqueId: string;
  leadName?: string;
  callDate: string;
  source: string;
  destination: string;
  duration: number;
  billableSeconds: number;
  disposition: string;
  hasRecording: boolean;
  recordingUrls?: {
    mp3: string;
    wav: string;
  };
  callerName: string;
  formattedDuration: string;
  formattedBillableDuration: string;
  answerTime: string | null;
  endTime: string;
  callDirection: 'incoming' | 'outgoing';
}

// Transform CDR data for dashboard
export const transformCDRToCallData = (cdrRecords: CDRRecord[]): EnhancedCallData[] => {
  return cdrRecords.map((record) => ({
    uniqueId: record.uniqueId,
    leadName: record.destinationCallerName || record.callerName || 'Unknown',
    callDate: record.callDate,
    source: record.source,
    destination: record.destination,
    duration: record.duration,
    billableSeconds: record.billableSeconds,
    disposition: record.disposition,
    hasRecording: !!record.recordingFile,
    recordingUrls: record.recordingFile ? {
      mp3: `/recordings/public/stream/${record.uniqueId}.mp3`,
      wav: `/recordings/public/stream/${record.uniqueId}.wav`
    } : undefined,
    callerName: record.callerName,
    formattedDuration: formatDuration(record.duration),
    formattedBillableDuration: formatDuration(record.billableSeconds),
    answerTime: record.answerTime,
    endTime: record.endTime,
    callDirection: record.source.length <= 4 ? 'outgoing' : 'incoming' // Simple heuristic
  }));
};

// Transform recording data for dashboard
export const transformRecordingsToCallData = (recordings: any[]): EnhancedCallData[] => {

  
  const transformed = recordings.map((recording) => {
    const hasRecording = !!(recording.recordingFile || recording.streamUrls);
    

    
    return {
      uniqueId: recording.uniqueId,
      leadName: 'Unknown', // Would need lead lookup
      callDate: recording.callDate,
      source: recording.source,
      destination: recording.destination,
      duration: recording.duration || 0,
      billableSeconds: recording.billableSeconds || 0,
      disposition: recording.disposition,
      hasRecording: hasRecording,
      recordingUrls: recording.streamUrls,
      callerName: recording.source,
      formattedDuration: formatDuration(recording.duration || 0),
      formattedBillableDuration: formatDuration(recording.billableSeconds || 0),
      answerTime: null,
      endTime: '',
      callDirection: (recording.source?.length <= 4 ? 'outgoing' : 'incoming') as 'incoming' | 'outgoing'
    };
  });
  
  return transformed;
};

// Utility function to format duration
const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Calculate dashboard summary from CDR data
export const calculateDashboardSummary = (
  cdrRecords: CDRRecord[], 
  statistics: CDRStatisticsResponse['data']
): CallDashboardSummary => {
  const today = new Date().toDateString();
  const callsToday = cdrRecords.filter(record => 
    new Date(record.callDate).toDateString() === today
  ).length;
  
  const recordingsToday = cdrRecords.filter(record => 
    record.recordingFile && new Date(record.callDate).toDateString() === today
  ).length;

  // Find peak hour (simplified)
  const hourCounts = cdrRecords.reduce((acc, record) => {
    const hour = new Date(record.callDate).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const peakHour = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '0';

  return {
    totalCalls: statistics.totalCalls,
    totalRecordings: cdrRecords.filter(r => r.recordingFile).length,
    averageDuration: statistics.averageCallDuration,
    answerRate: parseFloat(statistics.answerRate),
    callsToday,
    recordingsToday,
    topDisposition: cdrRecords.length > 0 ? 
      Object.entries(cdrRecords.reduce((acc, record) => {
        acc[record.disposition] = (acc[record.disposition] || 0) + 1;
        return acc;
      }, {} as Record<string, number>))
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'UNKNOWN' : 'NO DATA',
    peakHour: `${peakHour}:00`
  };
};
