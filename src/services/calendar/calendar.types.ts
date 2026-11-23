export type CalendarEventType = 'SUB_EVENT' | 'EVENT_BOOKING' | 'WORKFLOW_TASK' | 'SHOOT';

export interface CalendarCrewMember {
  id: string;
  name: string;
  role: string;
  profileImage?: string | null;
  email?: string | null;
}

export interface CalendarWorkflowTask {
  id: string;
  type: string;
  status: string;
  dueDate?: Date | null;
  assignedToName?: string | null;
}

export interface CalendarCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface CalendarEventDto {
  id: string;
  type: CalendarEventType;
  title: string;
  subEventName?: string;
  bookingTitle?: string;
  bookingNumber?: string;
  start: Date;
  end: Date;
  startTimeString?: string;
  endTimeString?: string;
  location?: string | null;
  venue?: string | null;
  notes?: string | null;
  status?: string;
  journeyStatus?: string;
  bookingId?: string | null;
  projectId?: string | null;
  customer?: CalendarCustomer | null;
  assignedCrew: CalendarCrewMember[];
  workflowTasks: CalendarWorkflowTask[];
}

export interface GetCalendarEventsOptions {
  startDate?: Date;
  endDate?: Date;
  projectId?: string;
  eventBookingId?: string;
}
