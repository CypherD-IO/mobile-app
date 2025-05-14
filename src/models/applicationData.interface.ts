export interface ApplicationData {
  // Basic Details
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  // Shipping Address
  line1: string;
  line2: string;
  postalCode: string;
  country: string;
  city: string;
  state: string;
  phone: string;
  dialCode: string;
  // Additional Details
  expectedMonthlyVolume: string;
  annualSalary: string;
  occupation: string;
}
