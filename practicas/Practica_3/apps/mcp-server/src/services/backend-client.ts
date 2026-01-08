import axios from "axios";

export class BackendClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get(endpoint: string) {
    return axios.get(`${this.baseURL}${endpoint}`);
  }

  async post(endpoint: string, data: any) {
    return axios.post(`${this.baseURL}${endpoint}`, data);
  }

  async put(endpoint: string, data: any) {
    return axios.put(`${this.baseURL}${endpoint}`, data);
  }
}
