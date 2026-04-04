import api from "@/lib/api";
import type {
  CreateCustomerPatientRequest,
  CustomerPatientListResponse,
  CustomerPatientRecord,
  PrescriptionRecord,
} from "@/modules/customer-bills/customer-bill.types";

type GetCustomerPatientsParams = {
  page?: number;
  size?: number;
  q?: string;
};

export async function getCustomerPatients(
  customerId: number,
  params: GetCustomerPatientsParams = {},
): Promise<CustomerPatientListResponse> {
  const { data } = await api.get(`/customers/${customerId}/patients`, { params });
  return data;
}

export async function createCustomerPatient(
  customerId: number,
  payload: CreateCustomerPatientRequest,
): Promise<CustomerPatientRecord> {
  const { data } = await api.post(`/customers/${customerId}/patients`, payload);
  return data;
}

export async function getPrescriptionById(id: number): Promise<PrescriptionRecord> {
  const { data } = await api.get(`/prescriptions/${id}`);
  return data;
}
