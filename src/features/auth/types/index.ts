export interface CurrentUser {
  uid: string;
  name: string;
  roles: string[];
}

export interface SessionData {
  current_user: CurrentUser;
  csrf_token: string;
  logout_token: string;
  access_token: string;
}