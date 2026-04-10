import { MultiRes } from '@/@types/global';
import ApiService from './ApiService';

export type CreateMeetingRequestProps = {
  start_time: string;
  end_time: string;
  all_day: boolean;
  agent_id: string | null;
  lead_id: string;
  project_id: string;
  videocall_url: string;
  description?: string;
  bookedBy_id?: string | null;
};

type Agent = {
  _id: string;
  login: string;
  role: string;
};

type Lead = {
  _id: string;
  contact_name: string;
  phone: string;
  email_from: string;
};

type Project = {
  _id: string;
  name: string;
};

export type MeetingType = {
  _id: string;
  start_time: string; // ISO date string
  end_time: string; // ISO date string
  all_day: boolean;
  agent: Agent;
  lead: Lead;
  project: Project;
  videocall_url: string;
  description: string;
  active: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};

export type MeetingResponse = MultiRes<MeetingType>;

export async function apiCreateMeeting(data: CreateMeetingRequestProps) {
  return ApiService.fetchDataWithAxios<unknown>({
    url: '/meetings',
    method: 'post',
    data,
  });
}

export async function apiGetMeetings() {
  return ApiService.fetchDataWithAxios<MeetingResponse>({
    url: '/meetings',
    method: 'get',
  });
}

interface MeetingDeactivateResponse {
  message: string;
  meeting: {
    _id: string;
    active: boolean;
  };
}

export async function apiDeleteMeeting(id: string) {
  return ApiService.fetchDataWithAxios<MeetingDeactivateResponse>({
    url: `/meetings/${id}`,
    method: 'delete',
  });
}

export interface UpdateMeetingRequestType {
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  videocall_url?: string;
  description?: string;
}

export async function apiUpdateMeeting(id: string, data: UpdateMeetingRequestType) {
  return ApiService.fetchDataWithAxios({
    url: `/meetings/${id}`,
    method: 'put',
    data,
  });
}
