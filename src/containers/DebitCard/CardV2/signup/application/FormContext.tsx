import React, { createContext, useContext, useState } from 'react';
import { ApplicationData } from '../../../../../models/applicationData.interface';

interface FormContextType {
  formState: ApplicationData;
  setFormState: React.Dispatch<React.SetStateAction<ApplicationData>>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [formState, setFormState] = useState<ApplicationData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    line1: '',
    line2: '',
    postalCode: '',
    country: '',
    city: '',
    state: '',
    phone: '',
    expectedMonthlyVolume: '',
    annualSalary: '',
    occupation: '',
    dialCode: '',
  });

  return (
    <FormContext.Provider value={{ formState, setFormState }}>
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};
