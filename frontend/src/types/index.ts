export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: Role[];
  created_at?: string;
  updated_at?: string;
}

export interface UserMin {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  start_date: string;
  end_date?: string;
  manager_id?: number;
  manager?: UserMin;
  members: UserMin[];
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  bug_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by_id?: number;
  uploaded_by?: UserMin;
  created_at: string;
}

export interface Bug {
  id: number;
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  module_name?: string;
  browser?: string;
  os?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  severity: 'Minor' | 'Major' | 'Critical' | 'Blocker';
  status: 'New' | 'Open' | 'Assigned' | 'In Progress' | 'Testing' | 'Resolved' | 'Closed' | 'Reopened';
  due_date?: string;
  created_at: string;
  updated_at: string;
  reporter_id?: number;
  reporter?: UserMin;
  assignee_id?: number;
  assignee?: UserMin;
  project_id: number;
  project: {
    id: number;
    name: string;
    status: string;
  };
  attachments: Attachment[];
}

export interface Comment {
  id: number;
  bug_id: number;
  user_id: number;
  user: UserMin;
  content: string;
  created_at: string;
  updated_at: string;
}
